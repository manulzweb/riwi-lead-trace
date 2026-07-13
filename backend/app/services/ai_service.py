from sqlalchemy import select, insert, and_
from fastapi import HTTPException, status
import anthropic

from app.config.database import conn
from app.config.config import settings
from app.models.evaluation import evaluations_table, evaluation_answers_table
from app.models.form_template import questions_table
from app.models.period import periods_table
from app.models.user import users_table
from app.models.role import roles_table
from app.models.ai_feedback_cache import ai_feedback_cache_table
from app.services.metrics_service import calculate_average_score, MIN_EVALUATIONS

AI_MODEL = "claude-haiku-4-5-20251001"


def get_or_generate_ai_summary(evaluatee_id: int, period_id: int):
    """Genera u obtiene de cache el resumen ejecutivo por IA para un evaluado."""
    cache_stmt = select(ai_feedback_cache_table.c.summary).where(
        and_(
            ai_feedback_cache_table.c.evaluatee_id == evaluatee_id,
            ai_feedback_cache_table.c.period_id == period_id
        )
    )
    cached = conn.execute(cache_stmt).scalar()
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
    stmt = select(evaluation_answers_table.c.comment).select_from(
        evaluation_answers_table
    ).join(
        evaluations_table, evaluation_answers_table.c.evaluation_id == evaluations_table.c.id
    ).join(
        questions_table, evaluation_answers_table.c.question_id == questions_table.c.id
    ).where(
        and_(
            evaluations_table.c.evaluatee_id == evaluatee_id,
            evaluations_table.c.period_id == period_id,
            evaluations_table.c.status == "submitted",
            questions_table.c.input_type == "text",
            evaluation_answers_table.c.comment != None,
            evaluation_answers_table.c.comment != ""
        )
    )
    return [row[0] for row in conn.execute(stmt).all()]


def _get_evaluatee_name_and_role(evaluatee_id: int) -> tuple[str, str]:
    stmt = select(users_table.c.full_name, roles_table.c.name).select_from(users_table).join(
        roles_table, users_table.c.role_id == roles_table.c.id
    ).where(users_table.c.id == evaluatee_id)
    row = conn.execute(stmt).first()
    return (row[0], row[1]) if row else ("Persona", "Rol")


def _get_period_name(period_id: int) -> str:
    stmt = select(periods_table.c.name).where(periods_table.c.id == period_id)
    return conn.execute(stmt).scalar() or "Periodo"


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
    stmt = insert(ai_feedback_cache_table).values(
        evaluatee_id=evaluatee_id,
        period_id=period_id,
        summary=summary,
        model=AI_MODEL
    )
    conn.execute(stmt)
    conn.commit()
