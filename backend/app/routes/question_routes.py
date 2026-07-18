from fastapi import APIRouter, HTTPException, Query, status
from typing import List

from app.schemas.question import QuestionCreate, QuestionOut, QuestionTextPatch, WeightsUpdate
from app.services import question_service

router = APIRouter()


@router.get("/questions", response_model=List[QuestionOut])
def get_questions(
    template_id: int = Query(..., description="ID del template (form_templates.id)"),
):
    """Consulta anidada sobre `questions` filtrando por `template_id` e `is_active=TRUE`."""
    return question_service.get_questions_by_template(template_id, only_active=True)


@router.post("/questions", response_model=QuestionOut, status_code=status.HTTP_201_CREATED)
def post_question(payload: QuestionCreate):
    """Inserta una nueva tupla en `questions` y la asocia al template. Valida el state del periodo global (debe estar inactivo)."""
    return question_service.create_question(payload)


@router.delete("/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(question_id: int):
    """Desactiva (`is_active=False`) una pregunta. Precondición: periodo global cerrado."""
    deleted = question_service.delete_question(question_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pregunta no encontrada.")
    return None


@router.patch("/questions/{question_id}", response_model=QuestionOut)
def patch_question_text(question_id: int, payload: QuestionTextPatch):
    """Genera una nueva versión de la pregunta y desactiva la anterior. Valida coherencia semántica (NLP) contra su categoría original. Precondición: periodo cerrado."""
    return question_service.version_question_text(question_id, payload.text, payload.confirm)


@router.put("/questions/weights", response_model=List[QuestionOut])
def put_question_weights(payload: WeightsUpdate):
    """Mutación masiva de la columna `weight_percent` para preguntas de escala. Transaccional. Constraint: la suma debe ser exactamente 100.0."""
    return question_service.update_weights(payload)
