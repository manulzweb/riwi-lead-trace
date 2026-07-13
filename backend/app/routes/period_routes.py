from fastapi import APIRouter, HTTPException, status
from typing import List
from app.schemas.period import PeriodCreate, PeriodUpdate, PeriodOut
from app.services import period_service

router = APIRouter()

@router.get("/periods", response_model=List[PeriodOut])
def get_periods():
    """Obtiene todos los periodos de evaluación."""
    return period_service.get_periods()

@router.get("/periods/{period_id}", response_model=PeriodOut)
def get_period(period_id: int):
    """Obtiene un periodo por ID."""
    period = period_service.get_period(period_id)
    if not period:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Periodo no encontrado")
    return period

@router.post("/periods", response_model=PeriodOut, status_code=status.HTTP_201_CREATED)
def create_period(period: PeriodCreate):
    """Crea un nuevo periodo."""
    return period_service.create_period(period)

@router.put("/periods/{period_id}", response_model=PeriodOut)
def update_period(period_id: int, period: PeriodUpdate):
    """Actualiza un periodo por ID."""
    updated = period_service.update_period(period_id, period)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Periodo no encontrado")
    return updated

@router.delete("/periods/{period_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_period(period_id: int):
    """Elimina un periodo por ID."""
    deleted = period_service.delete_period(period_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Periodo no encontrado")
    return None
