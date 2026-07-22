from fastapi import APIRouter, HTTPException, Query, status
from typing import List, Optional, Union
import logging
from app.schemas.evaluation_details import EvaluationCreate, EvaluationDetailOut, EvaluationHistoryOut
from app.services.evaluation_service import evaluation_service

from app.exceptions.base import ApplicationException

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post(
    "/evaluations", 
    response_model=EvaluationDetailOut, 
    status_code=status.HTTP_201_CREATED,
    summary="Crear evaluación",
    response_description="La evaluación recién enviada",
    responses={
        201: {"description": "Evaluación guardada con éxito"},
        409: {"description": "El evaluador ya evaluó a este usuario en este periodo"}
    }
)
def create_evaluation(evaluation: EvaluationCreate):
    """Inserción transaccional de una evaluación: contenido en `evaluations` y participación
    del evaluador en `evaluation_submissions`, ambas en la misma transacción. Devuelve 409 si
    el evaluador ya participó en ese periodo (constraint `uq_submission_once`) o si el periodo
    no está activo."""
    try:
        return evaluation_service.create_evaluation(evaluation)
    except ApplicationException:
        # Excepcion de dominio: la traduce el handler global leyendo su
        # http_status. El `raise` pelado va ANTES del `except Exception`:
        # sin el, el generico la capturaria y la volveria un 500.
        raise
    except Exception:
        logger.exception("Internal error creating evaluation")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno al guardar la evaluación.")

@router.get(
    "/evaluations",
    response_model=Union[List[EvaluationHistoryOut], List[EvaluationDetailOut]],
    summary="Consultar evaluaciones",
    response_description=(
        "Con `evaluator_id`: historial de participación (EvaluationHistoryOut; las anónimas "
        "llegan sin contenido). Con `evaluatee_id`: evaluaciones recibidas (EvaluationDetailOut)."
    ),
)
def get_evaluations(
    evaluator_id: Optional[int] = Query(None, description="Filtrar por el ID del evaluador"),
    evaluatee_id: Optional[int] = Query(None, description="Filtrar por el ID del evaluado"),
    period_id: Optional[int] = Query(None, description="Filtrar por periodo (solo con evaluatee_id)"),
    viewer_role: Optional[str] = Query(None, description="Rol de quien consulta, lo manda el front (no se verifica en el servidor)"),
    skip: int = Query(0, ge=0, description="Número de registros a omitir (para paginación)"),
    limit: int = Query(100, ge=1, le=1000, description="Número máximo de registros a devolver")
):
    """Consulta evaluaciones con paginación (`skip`, `limit`) y filtrado por entidad.

    La forma de la respuesta depende del filtro: `evaluator_id` devuelve participaciones
    (sin contenido para las anónimas), `evaluatee_id` devuelve evaluaciones recibidas con
    el `evaluator_id` enmascarado salvo que `viewer_role=admin` y la evaluación no sea anónima.
    """
    try:
        if evaluator_id is not None:
            return evaluation_service.get_evaluations_by_evaluator(evaluator_id, skip=skip, limit=limit)
        elif evaluatee_id is not None:
            return evaluation_service.get_evaluations_by_evaluatee(
                evaluatee_id, period_id, hide_evaluator=(viewer_role != "admin"), skip=skip, limit=limit
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Debe proporcionar al menos evaluator_id o evaluatee_id"
            )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Internal error fetching evaluations")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno al consultar las evaluaciones.")
