from sqlalchemy import select, text, and_
from app.config.database import conn
from app.models.evaluation import evaluations_table, evaluation_answers_table
from app.models.form_template import questions_table
from app.models.user import users_table
from app.models.role import roles_table

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
