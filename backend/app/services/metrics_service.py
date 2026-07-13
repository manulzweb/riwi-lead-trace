from sqlalchemy import select, insert, text, and_
from fastapi import HTTPException, status
from typing import Optional
from app.config.database import conn
from app.models.evaluation import evaluations_table, evaluation_answers_table
from app.models.form_template import form_templates_table, questions_table
from app.models.period import periods_table
from app.models.user import users_table
from app.models.role import roles_table
from app.models.ai_feedback_cache import ai_feedback_cache_table
from app.config.config import settings
import anthropic

MIN_EVALUATIONS = 3

def calculate_average_score(evaluatee_id: int, period_id: int):
    """Calcula el promedio simple (0-100) de los puntajes recibidos por una persona en un periodo."""
    count_stmt = select(text("COUNT(DISTINCT id)")).select_from(evaluations_table).where(
        and_(
            evaluations_table.c.evaluatee_id == evaluatee_id,
            evaluations_table.c.period_id == period_id,
            evaluations_table.c.status == "submitted"
        )
    )
    n_evals = conn.execute(count_stmt).scalar() or 0

    if n_evals < MIN_EVALUATIONS:
        return {"average_score": None, "n_evals": n_evals}

    scores_stmt = select(evaluation_answers_table.c.score).select_from(
        evaluation_answers_table
    ).join(
        questions_table, evaluation_answers_table.c.question_id == questions_table.c.id
    ).join(
        evaluations_table, evaluation_answers_table.c.evaluation_id == evaluations_table.c.id
    ).where(
        and_(
            evaluations_table.c.evaluatee_id == evaluatee_id,
            evaluations_table.c.period_id == period_id,
            evaluations_table.c.status == "submitted",
            questions_table.c.input_type == "scale",
            evaluation_answers_table.c.score != None
        )
    )
    scores = [row[0] for row in conn.execute(scores_stmt).all()]

    if not scores:
        return {"average_score": None, "n_evals": n_evals}

    avg = sum(scores) / len(scores)
    average_score = round((avg - 1) / 4 * 100)

    return {"average_score": average_score, "n_evals": n_evals}

def get_metrics_summary(period_id: int):
    """Obtiene los KPIs globales y el listado de personas con su promedio de evaluacion."""
    total_eval_stmt = select(text("COUNT(DISTINCT id)")).select_from(evaluations_table).where(
        and_(
            evaluations_table.c.period_id == period_id,
            evaluations_table.c.status == "submitted"
        )
    )
    total_evaluations = conn.execute(total_eval_stmt).scalar() or 0

    users_stmt = select(
        users_table.c.id,
        users_table.c.full_name.label("name"),
        users_table.c.email,
        roles_table.c.name.label("role")
    ).select_from(users_table).join(
        roles_table, users_table.c.role_id == roles_table.c.id
    ).where(
        roles_table.c.name.in_(["team_leader", "tutor"])
    )
    evaluatees_rows = conn.execute(users_stmt).mappings().all()

    evaluatees = []
    scores = []
    for row in evaluatees_rows:
        user_dict = dict(row)
        score_info = calculate_average_score(user_dict["id"], period_id)
        user_dict.update(score_info)
        evaluatees.append(user_dict)
        if score_info["average_score"] is not None:
            scores.append(score_info["average_score"])

    average_score_global = round(sum(scores) / len(scores)) if scores else 0

    total_coders_stmt = select(text("COUNT(*)")).select_from(users_table).where(
        and_(users_table.c.role_id == 1, users_table.c.is_active == True)
    )
    total_coders = conn.execute(total_coders_stmt).scalar() or 0

    possible_evaluations = total_coders * 2
    participation_rate = round((total_evaluations / possible_evaluations) * 100) if possible_evaluations else 0
    participation_rate = min(participation_rate, 100)

    return {
        "kpis": {
            "total_evaluations": total_evaluations,
            "average_score": average_score_global,
            "participation_rate": participation_rate
        },
        "evaluatees": evaluatees
    }

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

    comments_stmt = select(evaluation_answers_table.c.comment).select_from(
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
    comments = [row[0] for row in conn.execute(comments_stmt).all()]

    user_stmt = select(users_table.c.full_name, roles_table.c.name).select_from(users_table).join(
        roles_table, users_table.c.role_id == roles_table.c.id
    ).where(users_table.c.id == evaluatee_id)
    user_row = conn.execute(user_stmt).first()
    name = user_row[0] if user_row else "Persona"
    role = user_row[1] if user_row else "Rol"

    period_name_stmt = select(periods_table.c.name).where(periods_table.c.id == period_id)
    period_name = conn.execute(period_name_stmt).scalar() or "Periodo"

    average_score = score_info["average_score"]
    n_evals = score_info["n_evals"]
    comments_str = chr(10).join([f"- {c}" for c in comments]) if comments else "No hay comentarios de texto."
    prompt = f"""Eres un asistente de IA para Riwi LeadTrace. Tu tarea es generar un resumen ejecutivo constructivo y profesional del feedback recibido por {name} ({role}) en el periodo {period_name}.

Aqui tienes las metricas agregadas:
- Puntaje promedio de las evaluaciones: {average_score}/100
- Numero de evaluaciones recibidas: {n_evals}

Comentarios de los evaluadores:
{comments_str}

Por favor, proporciona un resumen estructurado con un tono constructivo y profesional, estructurado en las siguientes secciones:
1. Fortalezas (que hace bien)
2. Areas de oportunidad (que puede mejorar)
3. Recomendaciones de accion (pasos practicos para el evaluado)"""

    if not settings.ANTHROPIC_API_KEY:
        return "[Servicio de IA deshabilitado: ANTHROPIC_API_KEY no configurado en el archivo .env]"

    try:
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1000,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        summary = message.content[0].text
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Error al conectar con el servicio de IA de Claude: {str(e)}"
        )

    cache_insert = insert(ai_feedback_cache_table).values(
        evaluatee_id=evaluatee_id,
        period_id=period_id,
        summary=summary,
        model="claude-haiku-4-5-20251001"
    )
    conn.execute(cache_insert)
    conn.commit()

    return summary
