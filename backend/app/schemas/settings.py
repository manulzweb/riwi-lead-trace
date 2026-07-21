from pydantic import BaseModel, Field, model_validator


class SystemSettingsOut(BaseModel):
    """Configuracion global tal como sale de `system_settings` (fila unica id=1)."""

    ai_temperature: float
    ai_auto_summary: bool
    score_risk_threshold: float
    score_excellent_threshold: float
    weight_tolerance: float
    strict_entity_lock: bool
    required_evaluations: int
    log_retention_days: int


class SystemSettingsUpdate(BaseModel):
    """Payload de `PUT /settings`.

    Los rangos replican los CHECK de `system_settings` en `01_ddl.sql`. Sin ellos
    un valor fuera de rango llega hasta MySQL y sale como 500 opaco en vez de un
    422 que diga que campo esta mal.
    """

    ai_temperature: float = Field(ge=0, le=1)
    ai_auto_summary: bool
    score_risk_threshold: float = Field(ge=0, le=100)
    score_excellent_threshold: float = Field(ge=0, le=100)
    weight_tolerance: float = Field(ge=0)
    strict_entity_lock: bool
    required_evaluations: int = Field(ge=1)
    log_retention_days: int = Field(ge=1)

    @model_validator(mode="after")
    def check_thresholds_ordered(self):
        # Los umbrales parten el ICP en riesgo / normal / excelente. Invertidos, la
        # franja intermedia desaparece y classify_status deja de tener sentido.
        if self.score_risk_threshold >= self.score_excellent_threshold:
            raise ValueError(
                "score_risk_threshold debe ser menor que score_excellent_threshold."
            )
        return self
