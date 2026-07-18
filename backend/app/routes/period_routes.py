from fastapi import APIRouter, HTTPException, status
from typing import List
from app.schemas.period import PeriodCreate, PeriodUpdate, PeriodOut
from app.services import period_service

router = APIRouter()

@router.get("/periods", response_model=List[PeriodOut])
def get_periods():
    """Consulta de la tabla `periods`. Retorna el historial completo de ciclos."""
    return period_service.get_periods()

@router.get("/periods/{period_id}", response_model=PeriodOut)
def get_period(period_id: int):
    """Consulta por Primary Key (`id`) sobre `periods`."""
    period = period_service.get_period(period_id)
    if not period:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Periodo no encontrado")
    return period

@router.post("/periods", response_model=PeriodOut, status_code=status.HTTP_201_CREATED)
def create_period(period: PeriodCreate):
    """Inserta un nuevo ciclo. Implementa un trigger lógico en el servicio para hacer toggle (desactivar) los periodos previos si `is_active` es verdadero, asegurando la regla de negocio de un único periodo activo."""
    return period_service.create_period(period)

@router.put("/periods/{period_id}", response_model=PeriodOut)
def update_period(period_id: int, period: PeriodUpdate):
    """Mutación completa de la entidad `periods`. Dispara reconciliación de la bandera `is_active` si se establece en true."""
    updated = period_service.update_period(period_id, period)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Periodo no encontrado")
    return updated

@router.delete("/periods/{period_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_period(period_id: int):
    """Hard delete de un periodo por su PK."""
    deleted = period_service.delete_period(period_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Periodo no encontrado")
    return None
