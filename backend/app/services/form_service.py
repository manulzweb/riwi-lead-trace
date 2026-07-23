import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.exc import IntegrityError
from app.config.database import engine
from app.schemas.form import FormCreate, FormUpdate
from app.repositories.form_repository import FormRepository
from app.services.settings_service import settings_service
from app.constants.form_constants import EVALUABLE_ROLES, resolve_weight_tolerance
from app.exceptions.form_exceptions import (
    ActivePeriodExistsException, InvalidRoleException, InvalidWeightException, 
    CategoryNotFoundException, FormNotFoundException
)

logger = logging.getLogger(__name__)


class FormService:
    def __init__(self, repository: FormRepository = None):
        self.repo = repository or FormRepository()

    def _assert_no_active_period(self, conn):
        if self.repo.has_active_period(conn):
            raise ActivePeriodExistsException("No se puede editar/crear plantillas mientras haya un periodo activo.")

    def _attach_questions(self, conn, forms: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        form_ids = [f["id"] for f in forms]
        if not form_ids:
            return forms
        
        questions = self.repo.get_questions_for_forms(conn, form_ids)
        questions_map = {fid: [] for fid in form_ids}
        for q in questions:
            questions_map[q["form_id"]].append(q)
            
        for f in forms:
            f["questions"] = questions_map[f["id"]]
            
        return forms

    def get_forms(
        self,
        role_name: Optional[str] = None,
        kind: str = "form",
        include_archived: bool = False,
    ) -> List[Dict[str, Any]]:
        """Lista formularios. Los defaults son los del Coder (solo el vivo y
        activo, sin archivados); el Admin pide explicitamente kind='all'."""
        with engine.connect() as conn:
            role_id = None
            if role_name:
                role_id = self.repo.get_role_id_by_name(conn, role_name)
                if not role_id:
                    return []

            forms = self.repo.get_forms(conn, role_id=role_id, kind=kind, include_archived=include_archived)
            return self._attach_questions(conn, forms)

    def get_form(self, form_id: int) -> Optional[Dict[str, Any]]:
        with engine.connect() as conn:
            form_dict = self.repo.get_form_by_id(conn, form_id)
            if not form_dict:
                return None
            return self._attach_questions(conn, [form_dict])[0]

    def _validate_creation_payload(self, payload: FormCreate, tolerance: float):
        # target_role es opcional SOLO en plantillas. La combinacion invalida
        # (formulario vivo sin rol) ya la rechaza FormCreate con un 422; aqui
        # se valida el valor cuando viene, para no depender solo del schema.
        if payload.target_role is not None and payload.target_role not in EVALUABLE_ROLES:
            raise InvalidRoleException(f"target_role debe ser uno de {EVALUABLE_ROLES}.")
        if not payload.is_template and payload.target_role is None:
            raise InvalidRoleException("Un formulario vivo requiere target_role; solo una plantilla puede omitirlo.")

        # La suma 100 se exige igual en plantillas: asi instanciar una plantilla
        # produce un formulario valido sin que el admin tenga que reponderar.
        scale_weights = [q.weight_percent for q in payload.questions if q.input_type == "scale"]
        if scale_weights:
            total = sum(scale_weights)
            if abs(total - 100) > tolerance:
                raise InvalidWeightException(f"Los pesos de las preguntas de escala deben sumar 100 (suma actual: {total}).")

    def create_form(self, payload: FormCreate) -> Dict[str, Any]:
        # Se lee ANTES de abrir la conexion: settings_service abre la suya y
        # anidar dos checkouts del pool en la misma peticion lo agota.
        tolerance = resolve_weight_tolerance(settings_service.get_settings())
        self._validate_creation_payload(payload, tolerance)

        with engine.begin() as conn:
            # Crear tambien modifica el instrumento: deactivate_forms_for_role retira
            # la plantilla que los coders puedan estar respondiendo ahora mismo. Por eso
            # exige periodo cerrado igual que update_form y delete_form (regla 6).
            # Crear un formulario vivo tambien modifica el instrumento:
            # deactivate_forms_for_role retira el que los coders puedan estar
            # respondiendo ahora. Por eso exige periodo cerrado (regla 6).
            # Una plantilla es inerte, asi que se puede crear en cualquier momento.
            # Los formularios vivos ahora se crean como inactivos por defecto,
            # por lo que no compiten con el periodo actual y se pueden crear libremente.

            # Una plantilla generica no tiene rol (target_role_id NULL).
            role_id = None
            if payload.target_role is not None:
                role_id = self.repo.get_role_id_by_name(conn, payload.target_role)
                if not role_id:
                    raise InvalidRoleException(f"Rol '{payload.target_role}' no existe en BD.")

            form_data = {
                "title": payload.title,
                "description": payload.description,
                "target_role_id": role_id,
                "is_template": payload.is_template
            }
            form_id = self.repo.insert_form(conn, form_data)

            category_ids = list({q.category_id for q in payload.questions})
            existing_cats = self.repo.get_existing_category_ids(conn, category_ids)
            for cid in category_ids:
                if cid not in existing_cats:
                    raise CategoryNotFoundException(f"Categoria {cid} no encontrada.")

            questions_data = [
                {
                    "form_id": form_id,
                    "text": q.text,
                    "category_id": q.category_id,
                    "input_type": q.input_type,
                    "sort_order": index,
                    "weight_percent": q.weight_percent if q.input_type == "scale" else 0,
                }
                for index, q in enumerate(payload.questions)
            ]
            self.repo.insert_questions(conn, questions_data)
            
            form_dict = self.repo.get_form_by_id(conn, form_id)
            return self._attach_questions(conn, [form_dict])[0]

    def update_form(self, form_id: int, payload: FormUpdate) -> Optional[Dict[str, Any]]:
        with engine.begin() as conn:
            existing = self.repo.get_form_by_id(conn, form_id)
            if not existing:
                raise FormNotFoundException("Plantilla no encontrada.")

            if not existing["is_template"] and existing["is_active"]:
                self._assert_no_active_period(conn)

            values = {}
            if payload.title is not None: values["title"] = payload.title
            if payload.description is not None: values["description"] = payload.description
            
            if values:
                self.repo.update_form(conn, form_id, values)
                existing = self.repo.get_form_by_id(conn, form_id)

            return self._attach_questions(conn, [existing])[0]

    def delete_form(self, form_id: int) -> Dict[str, Any]:
        """Elimina un formulario SIN perder su historial.

        Dos caminos, y quien decide es la base de datos, no este conteo:
        - sin evaluaciones -> borrado DURO (preguntas + formulario). Desaparece.
        - con evaluaciones -> ARCHIVADO. Sale de la grilla del admin, pero las
          evaluaciones y sus respuestas siguen intactas y consultables.

        El conteo previo solo elige el camino esperado. Si el DELETE viola una
        FK igual (una pregunta versionada con respuestas, o una carrera entre el
        SELECT y el DELETE), se captura IntegrityError y se archiva. Mismo
        criterio que la regla 2 con uq_submission_once: la BD es la autoridad
        final. El peor caso posible es "se archivo cuando esperabas un borrado",
        nunca "se perdio historial".

        Devuelve que ocurrio, para que la UI pueda decirlo con precision en vez
        de mostrar un generico que a veces seria falso.
        """
        with engine.begin() as conn:
            existing = self.repo.get_form_by_id(conn, form_id)
            if not existing:
                raise FormNotFoundException("Formulario no encontrado.")

            # Retirar el formulario vivo con un periodo abierto dejaria a los
            # coders sin instrumento a mitad de la ventana (regla 6).
            if not existing["is_template"]:
                self._assert_no_active_period(conn)

            usage = self.repo.count_evaluations_for_form(conn, form_id)

            if usage == 0:
                try:
                    # Savepoint anidado: si el DELETE viola una FK, revierte
                    # SOLO este intento y deja la transaccion externa viva para
                    # poder archivar. Sin esto la conexion quedaria inutilizable.
                    with conn.begin_nested():
                        self.repo.delete_questions_for_form(conn, form_id)
                        self.repo.delete_form(conn, form_id)
                    return {"action": "deleted", "evaluations_count": 0}
                except IntegrityError:
                    # Hay historial que el conteo no vio. Archivar es lo correcto.
                    logger.warning(
                        f"Borrado duro del formulario {form_id} rechazado por FK pese a "
                        f"count_evaluations = 0; se archiva en su lugar."
                    )

            self.repo.archive_form(conn, form_id)
            return {"action": "archived", "evaluations_count": usage}

    def activate_form(self, form_id: int) -> Dict[str, Any]:
        with engine.begin() as conn:
            existing = self.repo.get_form_by_id(conn, form_id)
            if not existing:
                raise FormNotFoundException("Formulario no encontrado.")
            if existing["is_template"]:
                raise InvalidRoleException("No se puede activar una plantilla inerte. Debe ser un formulario vivo.")
            
            self._assert_no_active_period(conn)
            
            self.repo.deactivate_forms_for_role(conn, existing["target_role_id"])
            self.repo.update_form(conn, form_id, {"is_active": True})
            
            updated = self.repo.get_form_by_id(conn, form_id)
            return self._attach_questions(conn, [updated])[0]

    def deactivate_form(self, form_id: int) -> Dict[str, Any]:
        with engine.begin() as conn:
            existing = self.repo.get_form_by_id(conn, form_id)
            if not existing:
                raise FormNotFoundException("Formulario no encontrado.")
            
            self._assert_no_active_period(conn)
            
            self.repo.deactivate_form(conn, form_id)
            
            updated = self.repo.get_form_by_id(conn, form_id)
            return self._attach_questions(conn, [updated])[0]

form_service = FormService()
