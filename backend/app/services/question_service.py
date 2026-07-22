from typing import List, Dict, Any, Optional
from app.config.database import engine
from app.schemas.question import QuestionCreate, WeightsUpdate
from app.services.ai_service import check_question_category_coherence
from app.services import activity_log_service
from app.repositories.question_repository import QuestionRepository
from app.services.settings_service import settings_service
from app.constants.form_constants import resolve_weight_tolerance
from app.exceptions.question_exceptions import (
    ActivePeriodExistsException, QuestionNotFoundException, QuestionAlreadyReplacedException,
    InvalidQuestionTypeException, SemanticsNotCoherentException, FormNotFoundException,
    CategoryNotFoundException, InvalidWeightsException
)

class QuestionService:
    def __init__(self, repository: QuestionRepository = None):
        self.repo = repository or QuestionRepository()

    def _assert_no_active_period(self, conn, form_id: int):
        from sqlalchemy import text
        query = text("SELECT is_template FROM forms WHERE id = :form_id")
        result = conn.execute(query, {"form_id": form_id}).fetchone()

        # Solo el instrumento VIVO esta protegido (regla 6): editarlo con un
        # periodo abierto dejaria respuestas ya enviadas atadas a preguntas o
        # pesos distintos. Una plantilla es inerte, asi que se edita cuando sea.
        if result and not result[0]:
            if self.repo.has_active_period(conn):
                raise ActivePeriodExistsException("No se pueden editar preguntas mientras haya un periodo activo. Cierra el periodo primero.")

    def get_question(self, question_id: int) -> Optional[Dict[str, Any]]:
        with engine.connect() as conn:
            return self.repo.get_question_by_id(conn, question_id)

    def get_questions_by_form(self, form_id: int, only_active: bool = True) -> List[Dict[str, Any]]:
        with engine.connect() as conn:
            return self.repo.get_questions_by_form(conn, form_id, only_active)

    def version_question_text(self, question_id: int, new_text: str, confirm: bool, admin_id: int = None) -> Dict[str, Any]:
        with engine.begin() as conn:
            original = self.repo.get_question_by_id(conn, question_id)
            if original is None:
                raise QuestionNotFoundException("Pregunta no encontrada.")
            
            self._assert_no_active_period(conn, original["form_id"])

            if not original["is_active"]:
                raise QuestionAlreadyReplacedException("Esta pregunta ya fue reemplazada por una version mas nueva.")
            if original["input_type"] not in ["scale", "text"]:
                raise InvalidQuestionTypeException("Tipo de pregunta invalido.")

            if not confirm:
                is_coherent = check_question_category_coherence(new_text, original["category"])
                if not is_coherent:
                    raise SemanticsNotCoherentException(
                        f"La IA no esta segura de que este texto siga encajando en la categoria '{original['category']}'. "
                        "Si de verdad quieres guardarlo asi, reenvia la peticion con confirm=true."
                    )

            self.repo.deactivate_question(conn, question_id)

            question_data = {
                "form_id": original["form_id"],
                "text": new_text,
                "category_id": original["category_id"],
                "input_type": original["input_type"],
                "sort_order": original["sort_order"],
                "weight_percent": original["weight_percent"],
            }
            new_id = self.repo.insert_question(conn, question_data)

            activity_log_service.log_action(
                conn, admin_id,
                action="question_text_edited",
                target_type="question",
                target_id=new_id,
                detail=f'"{original["text"]}" -> "{new_text}"'[:255],
            )
            
            return self.repo.get_question_by_id(conn, new_id)

    def create_question(self, payload: QuestionCreate) -> Dict[str, Any]:
        with engine.begin() as conn:
            if not self.repo.form_exists(conn, payload.form_id):
                raise FormNotFoundException("Plantilla no encontrada.")

            self._assert_no_active_period(conn, payload.form_id)

            if not self.repo.category_exists(conn, payload.category_id):
                raise CategoryNotFoundException("Categoria no encontrada.")

            next_sort_order = self.repo.get_next_sort_order(conn, payload.form_id)

            # ADMIN-02: los pesos de las preguntas de escala ACTIVAS de un form
            # deben sumar 100. Antes se insertaba `payload.weight_percent` tal
            # cual, asi que crear una pregunta de escala dejaba la suma en 100+N
            # en silencio y el ICP quedaba ponderado sobre una base equivocada.
            #
            # Se entra SIEMPRE con peso 0 (sumar 0 no altera el total, luego el
            # invariante no se rompe) y el admin reequilibra despues con
            # PUT /questions/weights, que es el unico punto donde se valida la
            # suma. Alternativas descartadas:
            #   - Exigir que la suma resultante sea 100 aqui: imposible agregar
            #     una pregunta a un form que ya suma 100 sin bajar antes otra, y
            #     rompe el flujo del front (crea las preguntas una a una y
            #     reequilibra al final).
            #   - Dejar crear y solo reportar el descuadre: no arregla nada,
            #     la BD queda invalida igual.
            # Efecto: la pregunta se responde pero pesa 0 en el ICP hasta que se
            # reponderen los pesos. Es recuperable y no distorsiona a las demas.
            weight = 0

            question_data = {
                "form_id": payload.form_id,
                "text": payload.text,
                "category_id": payload.category_id,
                "input_type": payload.input_type,
                "sort_order": next_sort_order,
                "weight_percent": weight,
            }
            new_id = self.repo.insert_question(conn, question_data)
            
            return self.repo.get_question_by_id(conn, new_id)

    def delete_question(self, question_id: int) -> bool:
        # LIMITACION CONOCIDA: desactivar una pregunta de escala baja la suma de
        # pesos activos por debajo de 100 y no se valida aqui. Es deliberado y
        # coherente con create_question: el front borra, crea y recien al final
        # reequilibra con PUT /questions/weights, que es el unico punto donde se
        # exige la suma 100. Rechazar el borrado que descuadra romperia ese
        # flujo. El descuadre solo persiste si el admin abandona la edicion a
        # medias -- reportado al equipo, no se arregla por cuenta propia.
        with engine.begin() as conn:
            existing = self.repo.get_question_by_id(conn, question_id)
            if existing is None:
                return False
                
            self._assert_no_active_period(conn, existing["form_id"])
                
            if existing["is_active"]:
                self.repo.deactivate_question(conn, question_id)
                
        return True

    def update_weights(self, payload: WeightsUpdate) -> List[Dict[str, Any]]:
        # Se lee ANTES de abrir la conexion: settings_service abre la suya y
        # anidar dos checkouts del pool en la misma peticion lo agota.
        tolerance = resolve_weight_tolerance(settings_service.get_settings())

        with engine.begin() as conn:
            self._assert_no_active_period(conn, payload.form_id)

            current = self.repo.get_questions_by_form(conn, payload.form_id, only_active=True)
            current_scale = {q["id"] for q in current if q["input_type"] == "scale"}

            sent_ids = {w.question_id for w in payload.weights}
            if sent_ids != current_scale:
                import logging
                logging.error(f"Mismatch! sent_ids: {sent_ids}, current_scale: {current_scale}")
                raise InvalidWeightsException(
                    "El listado de pesos debe incluir exactamente todas las preguntas de escala "
                    "activas del template, ni de mas ni de menos."
                )

            total = sum(w.weight_percent for w in payload.weights)
            if abs(total - 100) > tolerance:
                raise InvalidWeightsException(f"Los pesos deben sumar 100 (suma actual: {total}).")

            weights_data = [{"weight_percent": w.weight_percent, "id": w.question_id} for w in payload.weights]
            self.repo.update_weights_batch(conn, weights_data)

            activity_log_service.log_action(
                conn, payload.admin_id,
                action="question_weights_updated",
                target_type="form",
                target_id=payload.form_id,
                detail=f"{len(payload.weights)} pregunta(s) reponderadas",
            )
            
            return self.repo.get_questions_by_form(conn, payload.form_id, only_active=True)

question_service = QuestionService()

def get_question(question_id: int):
    return question_service.get_question(question_id)

def get_questions_by_form(form_id: int, only_active: bool = True):
    return question_service.get_questions_by_form(form_id, only_active)

def version_question_text(question_id: int, new_text: str, confirm: bool, admin_id: int = None):
    return question_service.version_question_text(question_id, new_text, confirm, admin_id)

def create_question(payload: QuestionCreate):
    return question_service.create_question(payload)

def delete_question(question_id: int):
    return question_service.delete_question(question_id)

def update_weights(payload: WeightsUpdate):
    return question_service.update_weights(payload)

# This was used in form_service. We provide a bridge for backwards compat if needed,
# though form_service now has its own logic or can be updated.
# However, form_service is already updated and doesn't import _assert_no_active_period from here.
