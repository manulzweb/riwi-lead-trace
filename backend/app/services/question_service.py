from typing import List, Dict, Any, Optional
from app.config.database import engine
from app.schemas.question import QuestionCreate, WeightsUpdate
from app.services.ai_service import check_question_category_coherence
from app.services import activity_log_service
from app.repositories.question_repository import QuestionRepository
from app.constants.form_constants import WEIGHT_SUM_TOLERANCE
from app.exceptions.question_exceptions import (
    ActivePeriodExistsException, QuestionNotFoundException, QuestionAlreadyReplacedException,
    InvalidQuestionTypeException, SemanticsNotCoherentException, FormNotFoundException,
    CategoryNotFoundException, InvalidWeightsException
)

class QuestionService:
    def __init__(self, repository: QuestionRepository = None):
        self.repo = repository or QuestionRepository()

    def _assert_no_active_period(self, conn):
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
            self._assert_no_active_period(conn)

            original = self.repo.get_question_by_id(conn, question_id)
            if original is None:
                raise QuestionNotFoundException("Pregunta no encontrada.")
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
            self._assert_no_active_period(conn)

            if not self.repo.form_exists(conn, payload.form_id):
                raise FormNotFoundException("Plantilla no encontrada.")

            if not self.repo.category_exists(conn, payload.category_id):
                raise CategoryNotFoundException("Categoria no encontrada.")

            next_sort_order = self.repo.get_next_sort_order(conn, payload.form_id)
            weight = payload.weight_percent if payload.input_type == "scale" else 0

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
        with engine.begin() as conn:
            self._assert_no_active_period(conn)
            
            existing = self.repo.get_question_by_id(conn, question_id)
            if existing is None:
                return False
                
            if existing["is_active"]:
                self.repo.deactivate_question(conn, question_id)
                
        return True

    def update_weights(self, payload: WeightsUpdate) -> List[Dict[str, Any]]:
        with engine.begin() as conn:
            self._assert_no_active_period(conn)

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
            if abs(total - 100) > WEIGHT_SUM_TOLERANCE:
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
