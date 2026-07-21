from pydantic import BaseModel

class SystemSettingsOut(BaseModel):
    ai_temperature: float
    ai_auto_summary: bool
    score_risk_threshold: float
    score_excellent_threshold: float
    weight_tolerance: float
    strict_entity_lock: bool
    required_evaluations: int
    log_retention_days: int

class SystemSettingsUpdate(BaseModel):
    ai_temperature: float
    ai_auto_summary: bool
    score_risk_threshold: float
    score_excellent_threshold: float
    weight_tolerance: float
    strict_entity_lock: bool
    required_evaluations: int
    log_retention_days: int
