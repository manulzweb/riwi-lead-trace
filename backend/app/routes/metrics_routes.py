from fastapi import APIRouter, Query
from app.services import metrics_service, ai_service

router = APIRouter()

@router.get(
    "/metrics/summary",
    summary="Obtener resumen de métricas",
    response_description="Resultados agregados (promedios, radares, distribución) por evaluado"
)
def get_metrics_summary(period_id: int = Query(..., description="ID del periodo a consultar")):
    """Agrega y normaliza las métricas de ICP on-read basándose en el conteo y los pesos (`weight_percent`) de las respuestas. Omite muestras que no alcanzan el MIN_EVALUATIONS."""
    return metrics_service.get_metrics_summary(period_id)

@router.get(
    "/metrics/history",
    summary="Historial de ICP de una persona a traves de periodos",
    response_description="Serie de ICP por periodo (solo periodos con evaluaciones suficientes)"
)
def get_score_history(evaluatee_id: int = Query(..., description="ID de la persona evaluada")):
    """Recorre todos los periodos y calcula el ICP ponderado en cada uno (calculate_average_score),
    omitiendo los que no alcanzan MIN_EVALUATIONS. No persiste tendencia -- se recalcula on-read."""
    return metrics_service.get_score_history(evaluatee_id)

@router.get(
    "/metrics/ai-summary",
    summary="Generar resumen de IA (NLP)",
    response_description="El texto de resumen generado por Gemini a partir del feedback escrito"
)
def get_ai_summary(
    evaluatee_id: int = Query(..., description="ID del evaluado"),
    period_id: int = Query(..., description="ID del periodo")
):
    """Solicita un análisis semántico del feedback al modelo NLP (Gemini). Recupera del caché relacional (`ai_feedback_cache`) si ya existe para evitar re-procesamiento."""
    summary = ai_service.get_or_generate_ai_summary(evaluatee_id, period_id)
    return {"summary": summary}