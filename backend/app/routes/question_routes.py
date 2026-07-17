from fastapi import APIRouter, HTTPException, Query, status
from typing import List

from app.schemas.question import QuestionOut, QuestionTextPatch, WeightsUpdate
from app.services import question_service

router = APIRouter()


@router.get("/questions", response_model=List[QuestionOut])
def get_questions(
    template_id: int = Query(..., description="ID del template (form_templates.id)"),
):
    """Lista las preguntas activas de un template (para la UI de admin de pesos/edicion)."""
    return question_service.get_questions_by_template(template_id, only_active=True)


@router.patch("/questions/{question_id}", response_model=QuestionOut)
def patch_question_text(question_id: int, payload: QuestionTextPatch):
    """Edita el texto de una pregunta (siempre versiona). Solo con periodo cerrado."""
    return question_service.version_question_text(question_id, payload.text, payload.confirm)


@router.put("/questions/weights", response_model=List[QuestionOut])
def put_question_weights(payload: WeightsUpdate):
    """Actualiza los pesos de las preguntas de escala de un template. Deben sumar 100."""
    return question_service.update_weights(payload)
