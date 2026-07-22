from fastapi import APIRouter, Query, HTTPException, status
import logging
from app.services.metrics_service import metrics_service
from app.services.ai_service import ai_service

from app.exceptions.base import ApplicationException

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get(
    "/metrics/summary",
    summary="Obtener resumen de métricas",
    response_description="Resultados agregados (promedios, radares, distribución) por evaluado"
)
def get_metrics_summary(period_id: int = Query(..., description="ID del periodo a consultar")):
    """Agrega y normaliza las métricas de ICP on-read basándose en vistas pre-calculadas en BD."""
    try:
        return metrics_service.get_metrics_summary(period_id)
    except Exception:
        logger.exception("Error fetching metrics summary for period %s", period_id)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error al generar métricas")

@router.get(
    "/metrics/history",
    summary="Historial de ICP de una persona a traves de periodos",
    response_description="Serie de ICP por periodo (solo periodos con evaluaciones suficientes)"
)
def get_score_history(evaluatee_id: int = Query(..., description="ID de la persona evaluada")):
    """Consulta el historial de puntuaciones utilizando las vistas pre-calculadas de la BD."""
    try:
        return metrics_service.get_score_history(evaluatee_id)
    except Exception:
        logger.exception("Error fetching score history for user %s", evaluatee_id)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error al obtener historial")

@router.get(
    "/metrics/ai-summary",
    summary="Generar resumen de IA (NLP)",
    response_description="El texto de resumen generado por Gemini a partir del feedback escrito"
)
def get_ai_summary(
    evaluatee_id: int = Query(..., description="ID del evaluado"),
    period_id: int = Query(..., description="ID del periodo")
):
    """Solicita un análisis semántico del feedback al modelo NLP (Gemini)."""
    try:
        summary = ai_service.get_or_generate_ai_summary(evaluatee_id, period_id)
        return {"summary": summary}
    except ApplicationException:
        # Excepcion de dominio: la traduce el handler global leyendo su
        # http_status. El `raise` pelado va ANTES del `except Exception`:
        # sin el, el generico la capturaria y la volveria un 500.
        raise
    except Exception:
        logger.exception("Error generating AI summary")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error generando resumen IA")
