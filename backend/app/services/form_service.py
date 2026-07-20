from typing import List, Dict, Any, Optional
from app.config.database import engine
from app.schemas.form_template import TemplateCreate, TemplateUpdate
from app.repositories.form_repository import FormRepository
from app.constants.form_constants import EVALUABLE_ROLES, WEIGHT_SUM_TOLERANCE
from app.exceptions.form_exceptions import (
    ActivePeriodExistsException, InvalidRoleException, InvalidWeightException, 
    CategoryNotFoundException, FormNotFoundException
)

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

    def get_forms_by_role(self, role_name: str) -> List[Dict[str, Any]]:
        with engine.connect() as conn:
            role_id = self.repo.get_role_id_by_name(conn, role_name)
            if not role_id:
                return []
                
            forms = self.repo.get_forms_by_role_id(conn, role_id)
            return self._attach_questions(conn, forms)

    def get_template(self, form_id: int) -> Optional[Dict[str, Any]]:
        with engine.connect() as conn:
            form_dict = self.repo.get_form_by_id(conn, form_id)
            if not form_dict:
                return None
            return self._attach_questions(conn, [form_dict])[0]

    def _validate_creation_payload(self, payload: TemplateCreate):
        if payload.target_role not in EVALUABLE_ROLES:
            raise InvalidRoleException(f"target_role debe ser uno de {EVALUABLE_ROLES}.")

        scale_weights = [q.weight_percent for q in payload.questions if q.input_type == "scale"]
        if scale_weights:
            total = sum(scale_weights)
            if abs(total - 100) > WEIGHT_SUM_TOLERANCE:
                raise InvalidWeightException(f"Los pesos de las preguntas de escala deben sumar 100 (suma actual: {total}).")

    def create_template(self, payload: TemplateCreate) -> Dict[str, Any]:
        self._validate_creation_payload(payload)

        with engine.begin() as conn:
            self._assert_no_active_period(conn)
            
            role_id = self.repo.get_role_id_by_name(conn, payload.target_role)
            if not role_id:
                raise InvalidRoleException(f"Rol '{payload.target_role}' no existe en BD.")

            self.repo.deactivate_forms_for_role(conn, role_id)

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

    def update_template(self, form_id: int, payload: TemplateUpdate) -> Optional[Dict[str, Any]]:
        with engine.begin() as conn:
            self._assert_no_active_period(conn)

            existing = self.repo.get_form_by_id(conn, form_id)
            if not existing:
                raise FormNotFoundException("Plantilla no encontrada.")

            values = {}
            if payload.title is not None: values["title"] = payload.title
            if payload.description is not None: values["description"] = payload.description
            
            if values:
                self.repo.update_form(conn, form_id, values)
                existing = self.repo.get_form_by_id(conn, form_id)

            return self._attach_questions(conn, [existing])[0]

    def delete_template(self, form_id: int) -> bool:
        with engine.begin() as conn:
            self._assert_no_active_period(conn)
            
            existing = self.repo.get_form_by_id(conn, form_id)
            if not existing:
                raise FormNotFoundException("Plantilla no encontrada.")
                
            if existing["is_active"]:
                self.repo.deactivate_form(conn, form_id)
                
        return True

form_service = FormService()

def get_forms_by_role(role_name: str):
    return form_service.get_forms_by_role(role_name)

def get_template(form_id: int):
    return form_service.get_template(form_id)

def create_template(payload: TemplateCreate):
    return form_service.create_template(payload)

def update_template(form_id: int, payload: TemplateUpdate):
    return form_service.update_template(form_id, payload)

def delete_template(form_id: int):
    return form_service.delete_template(form_id)
