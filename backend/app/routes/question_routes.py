from fastapi import APIRouter, HTTPException, Query, status
from typing import List
import logging
from app.schemas.question import QuestionCreate, QuestionOut, QuestionTextPatch, WeightsUpdate
from app.services.question_service import question_service

from app.exceptions.base import ApplicationException

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get(
    "/questions", 
    response_model=List[QuestionOut],
    summary="Obtener preguntas de una plantilla",
    response_description="Lista de preguntas de la plantilla"
)
def get_questions(
    form_id: int = Query(..., description="ID del form"),
    include_inactive: bool = Query(False, description="Incluir preguntas inactivas"),
):
    """Consulta anidada sobre `questions` filtrando por `form_id`."""
    try:
        return question_service.get_questions_by_form(form_id, only_active=not include_inactive)
    except Exception:
        logger.exception("Error fetching questions")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno")

@router.post(
    "/questions", 
    response_model=QuestionOut, 
    status_code=status.HTTP_201_CREATED,
    summary="Añadir una pregunta nueva",
    response_description="La pregunta creada"
)
def post_question(payload: QuestionCreate):
    """Inserta una nueva tupla en `questions` y la asocia al form. Valida el state del periodo global (debe estar inactivo)."""
    try:
        return question_service.create_question(payload)
    except ApplicationException:
        # Excepcion de dominio: la traduce el handler global leyendo su
        # http_status. El `raise` pelado va ANTES del `except Exception`:
        # sin el, el generico la capturaria y la volveria un 500.
        raise
    except Exception:
        logger.exception("Error creating question")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno")

@router.delete("/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(question_id: int):
    """Desactiva (`is_active=False`) una pregunta. Precondición: periodo global cerrado."""
    try:
        deleted = question_service.delete_question(question_id)
        if not deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pregunta no encontrada.")
        return None
    except HTTPException as e:
        raise e
    except ApplicationException:
        # Excepcion de dominio: la traduce el handler global leyendo su
        # http_status. El `raise` pelado va ANTES del `except Exception`:
        # sin el, el generico la capturaria y la volveria un 500.
        raise
    except Exception:
        logger.exception("Error deleting question %s", question_id)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno")

@router.patch(
    "/questions/{question_id}", 
    response_model=QuestionOut,
    summary="Editar texto de una pregunta (versionado)",
    response_description="La nueva versión de la pregunta"
)
def patch_question_text(question_id: int, payload: QuestionTextPatch):
    """Genera una nueva versión de la pregunta y desactiva la anterior. Valida coherencia semántica (NLP) contra su categoría original. Precondición: periodo cerrado."""
    try:
        return question_service.version_question_text(question_id, payload.text, payload.confirm, payload.admin_id)
    except ApplicationException:
        # Excepcion de dominio: la traduce el handler global leyendo su
        # http_status. El `raise` pelado va ANTES del `except Exception`:
        # sin el, el generico la capturaria y la volveria un 500.
        raise
    except Exception:
        logger.exception("Error patching question %s", question_id)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno")

@router.put(
    "/questions/weights", 
    response_model=List[QuestionOut],
    summary="Actualizar pesos de preguntas (escala)",
    response_description="La lista de preguntas con los pesos actualizados",
    responses={422: {"description": "Los pesos no suman 100 o faltan preguntas"}}
)
def put_question_weights(payload: WeightsUpdate):
    """Mutación masiva de la columna `weight_percent` para preguntas de escala. Transaccional. Constraint: la suma debe ser exactamente 100.0."""
    try:
        return question_service.update_weights(payload)
    except ApplicationException:
        # Excepcion de dominio: la traduce el handler global leyendo su
        # http_status. El `raise` pelado va ANTES del `except Exception`:
        # sin el, el generico la capturaria y la volveria un 500.
        raise
    except Exception:
        logger.exception("Error updating weights")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno")
