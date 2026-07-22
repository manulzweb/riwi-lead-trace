from fastapi import APIRouter, HTTPException, status, BackgroundTasks
from typing import List
import logging
from app.schemas.period import PeriodCreate, PeriodUpdate, PeriodOut
from app.services.period_service import period_service
from app.exceptions.period_exceptions import PeriodNotFoundException, PeriodHasEvaluationsException

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get(
    "/periods", 
    response_model=List[PeriodOut],
    summary="Listar períodos",
    response_description="Lista completa del historial de períodos de evaluación"
)
def get_periods():
    """Consulta de la tabla `periods`. Retorna el historial completo de ciclos."""
    try:
        return period_service.get_periods()
    except Exception:
        logger.exception("Error fetching periods")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno")

@router.get("/periods/{period_id}", response_model=PeriodOut)
def get_period(period_id: int):
    """Consulta por Primary Key (`id`) sobre `periods`."""
    try:
        period = period_service.get_period(period_id)
        if not period:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Periodo no encontrado")
        return period
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error fetching period %s", period_id)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno")

@router.post(
    "/periods", 
    response_model=PeriodOut, 
    status_code=status.HTTP_201_CREATED,
    summary="Crear nuevo período",
    response_description="El período creado"
)
def create_period(period: PeriodCreate):
    """Inserta un nuevo ciclo. Implementa un trigger lógico en el servicio para hacer toggle (desactivar) los periodos previos si `is_active` es verdadero."""
    try:
        return period_service.create_period(period)
    except Exception:
        logger.exception("Error creating period")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno")

@router.put(
    "/periods/{period_id}", 
    response_model=PeriodOut,
    summary="Actualizar período (PUT)",
    response_description="El período actualizado",
    responses={404: {"description": "Período no encontrado"}}
)
def update_period(period_id: int, period: PeriodUpdate, background_tasks: BackgroundTasks):
    """Mutación completa de la entidad `periods`. Dispara reconciliación de la bandera `is_active` si se establece en true."""
    try:
        return period_service.update_period(period_id, period, background_tasks)
    except PeriodNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception:
        logger.exception("Error updating period %s", period_id)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno")

@router.patch(
    "/periods/{period_id}", 
    response_model=PeriodOut,
    summary="Actualizar período parcialmente (PATCH)",
    response_description="El período actualizado",
    responses={404: {"description": "Período no encontrado"}}
)
def patch_period(period_id: int, period: PeriodUpdate, background_tasks: BackgroundTasks):
    """Mutación parcial de la entidad `periods`."""
    try:
        return period_service.update_period(period_id, period, background_tasks)
    except PeriodNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception:
        logger.exception("Error patching period %s", period_id)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno")

@router.delete("/periods/{period_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_period(period_id: int):
    """Hard delete de un periodo por su PK."""
    try:
        period_service.delete_period(period_id)
        return None
    except PeriodNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except PeriodHasEvaluationsException as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except Exception:
        logger.exception("Error deleting period %s", period_id)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno")
