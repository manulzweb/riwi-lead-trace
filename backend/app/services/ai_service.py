from sqlalchemy import text
from fastapi import HTTPException, status
import anthropic

from app.config.database import conn
from app.config.config import settings
from app.services.metrics_service import calculate_average_score, MIN_EVALUATIONS

AI_MODEL = "claude-haiku-4-5-20251001"


def get_or_generate_ai_summary(evaluatee_id: int, period_id: int):
    """Genera u obtiene de cache el resumen ejecutivo por IA para un evaluado."""
    cache_query = text("""
        SELECT summary FROM ai_feedback_cache
        WHERE evaluatee_id = :evaluatee_id AND period_id = :period_id
    """)
    cached = conn.execute(cache_query, {"evaluatee_id": evaluatee_id, "period_id": period_id}).scalar()
    if cached:
        return cached

    score_info = calculate_average_score(evaluatee_id, period_id)
    if score_info["average_score"] is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Datos insuficientes para generar resumen con IA (se necesitan al menos {MIN_EVALUATIONS} evaluaciones enviadas)."
        )

    comments = _get_anonymized_comments(evaluatee_id, period_id)
    name, role = _get_evaluatee_name_and_role(evaluatee_id)
    period_name = _get_period_name(period_id)

    prompt = _build_prompt(
        name=name,
        role=role,
        period_name=period_name,
        average_score=score_info["average_score"],
        n_evals=score_info["n_evals"],
        comments=comments,
    )

    summary = _ask_claude(prompt)
    _cache_summary(evaluatee_id, period_id, summary)
    return summary


def _get_anonymized_comments(evaluatee_id: int, period_id: int) -> list[str]:
    """Solo texto y agregados, nunca el evaluator_id (privacidad de IA)."""
    query = text("""
        SELECT a.comment
        FROM evaluation_answers a
        JOIN evaluations e ON a.evaluation_id = e.id
        JOIN questions q ON a.question_id = q.id
        WHERE e.evaluatee_id = :evaluatee_id
          AND e.period_id = :period_id
          AND e.status = 'submitted'
          AND q.input_type = 'text'
          AND a.comment IS NOT NULL
          AND a.comment != ''
    """)
    result = conn.execute(query, {"evaluatee_id": evaluatee_id, "period_id": period_id})
    return [row[0] for row in result.all()]


def _get_evaluatee_name_and_role(evaluatee_id: int) -> tuple[str, str]:
    query = text("""
        SELECT u.full_name, GROUP_CONCAT(r.name) as role
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        WHERE u.id = :id
        GROUP BY u.id
    """)
    row = conn.execute(query, {"id": evaluatee_id}).first()
    return (row[0], row[1]) if row else ("Persona", "Rol")


def _get_period_name(period_id: int) -> str:
    query = text("SELECT name FROM periods WHERE id = :id")
    return conn.execute(query, {"id": period_id}).scalar() or "Periodo"


def _build_prompt(name, role, period_name, average_score, n_evals, comments: list[str]) -> str:
    comments_str = chr(10).join([f"- {c}" for c in comments]) if comments else "No hay comentarios de texto."
    return f"""Eres un asistente de IA para Riwi LeadTrace. Tu tarea es generar un resumen ejecutivo constructivo y profesional del feedback recibido por {name} ({role}) en el periodo {period_name}.

Aqui tienes las metricas agregadas:
- Puntaje promedio de las evaluaciones: {average_score}/100
- Numero de evaluaciones recibidas: {n_evals}

Comentarios de los evaluadores:
{comments_str}

Por favor, proporciona un resumen estructurado con un tono constructivo y profesional, estructurado en las siguientes secciones:
1. Fortalezas (que hace bien)
2. Areas de oportunidad (que puede mejorar)
3. Recomendaciones de accion (pasos practicos para el evaluado)"""


def _ask_claude(prompt: str) -> str:
    if not settings.ANTHROPIC_API_KEY:
        return "[Servicio de IA deshabilitado: ANTHROPIC_API_KEY no configurado en el archivo .env]"

    try:
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        message = client.messages.create(
            model=AI_MODEL,
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}]
        )
        return message.content[0].text
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Error al conectar con el servicio de IA de Claude: {str(e)}"
        )


def _cache_summary(evaluatee_id: int, period_id: int, summary: str) -> None:
    query = text("""
        INSERT INTO ai_feedback_cache (evaluatee_id, period_id, summary, model)
        VALUES (:evaluatee_id, :period_id, :summary, :model)
    """)
    conn.execute(query, {
        "evaluatee_id": evaluatee_id,
        "period_id": period_id,
        "summary": summary,
        "model": AI_MODEL
    })
    conn.commit()
