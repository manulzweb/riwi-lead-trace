from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.schemas.period import PeriodCreate, PeriodUpdate, PeriodOut
from app.services import period_service
from app.deps import get_current_user, require_role

router = APIRouter()

@router.get("/periods", response_model=List[PeriodOut])
def get_periods(current_user: dict = Depends(get_current_user)):
    """Obtiene todos los periodos de evaluación."""
    return period_service.get_periods()

@router.get("/periods/{period_id}", response_model=PeriodOut)
def get_period(period_id: int, current_user: dict = Depends(get_current_user)):
    """Obtiene un periodo por ID."""
    period = period_service.get_period(period_id)
    if not period:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Periodo no encontrado")
    return period

@router.post("/periods", response_model=PeriodOut, status_code=status.HTTP_201_CREATED)
def create_period(period: PeriodCreate, current_user: dict = Depends(require_role("admin"))):
    """Crea un nuevo periodo (solo Admin)."""
    return period_service.create_period(period)

@router.put("/periods/{period_id}", response_model=PeriodOut)
def update_period(period_id: int, period: PeriodUpdate, current_user: dict = Depends(require_role("admin"))):
    """Actualiza un periodo por ID (solo Admin)."""
    updated = period_service.update_period(period_id, period)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Periodo no encontrado")
    return updated

@router.delete("/periods/{period_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_period(period_id: int, current_user: dict = Depends(require_role("admin"))):
    """Elimina un periodo por ID (solo Admin)."""
    deleted = period_service.delete_period(period_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Periodo no encontrado")
    return None
