from fastapi import APIRouter, Query
from app.services import metrics_service, ai_service

router = APIRouter()

@router.get("/metrics/summary")
def get_metrics_summary(period_id: int = Query(..., description="ID del periodo a consultar")):
    """Obtiene un resumen global de las métricas (KPIs y promedios por persona) en un periodo."""
    return metrics_service.get_metrics_summary(period_id)

@router.get("/metrics/ai-summary")
def get_ai_summary(
    evaluatee_id: int = Query(..., description="ID del evaluado"),
    period_id: int = Query(..., description="ID del periodo")
):
    """Obtiene o genera un resumen de feedback con Claude IA para un evaluado en un periodo."""
    summary = ai_service.get_or_generate_ai_summary(evaluatee_id, period_id)
    return {"summary": summary}