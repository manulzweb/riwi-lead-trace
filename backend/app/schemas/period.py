from pydantic import BaseModel, Field
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
    # Quien hace la peticion, para la bitacora (admin_activity_log). Sin JWT,
    # es el id que manda el propio front -- mismo tradeoff de confianza que
    # evaluator_id en evaluation_submissions (ver CLAUDE.md). No se persiste
    # en `periods`.
    admin_id: Optional[int] = None

class PeriodOut(PeriodBase):
    id: int

    class Config:
        from_attributes = True
