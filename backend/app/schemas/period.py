from pydantic import BaseModel
from datetime import date
from typing import Optional

class PeriodBase(BaseModel):
    name: str = Field(
        title="Nombre del Período",
        description="Nombre identificador para el período de evaluación",
        examples=["Q3 2026"]
    )
    starts_at: date = Field(
        title="Fecha de Inicio",
        description="Fecha en la que inicia el período",
        examples=["2026-07-01"]
    )
    ends_at: date = Field(
        title="Fecha de Fin",
        description="Fecha en la que termina el período",
        examples=["2026-09-30"]
    )
    is_active: bool = Field(
        default=False,
        title="Está Activo",
        description="Indica si el período está actualmente abierto para recibir evaluaciones",
        examples=[True]
    )

class PeriodCreate(PeriodBase):
    pass

class PeriodUpdate(BaseModel):
    name: Optional[str] = None
    starts_at: Optional[date] = None
    ends_at: Optional[date] = None
    is_active: Optional[bool] = None

class PeriodOut(PeriodBase):
    id: int

    class Config:
        from_attributes = True
