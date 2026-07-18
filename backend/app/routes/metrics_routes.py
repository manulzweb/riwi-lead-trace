from fastapi import APIRouter, Query
from app.services import metrics_service, ai_service

router = APIRouter()

@router.get("/metrics/summary")
def get_metrics_summary(period_id: int = Query(..., description="ID del periodo a consultar")):
    """Agrega y normaliza las métricas de ICP on-read basándose en el conteo y los pesos (`weight_percent`) de las respuestas. Omite muestras que no alcanzan el MIN_EVALUATIONS."""
    return metrics_service.get_metrics_summary(period_id)

@router.get("/metrics/ai-summary")
def get_ai_summary(
    evaluatee_id: int = Query(..., description="ID del evaluado"),
    period_id: int = Query(..., description="ID del periodo")
):
    """Solicita un análisis semántico del feedback al modelo NLP (Gemini). Recupera del caché relacional (`ai_feedback_cache`) si ya existe para evitar re-procesamiento."""
    summary = ai_service.get_or_generate_ai_summary(evaluatee_id, period_id)
    return {"summary": summary}