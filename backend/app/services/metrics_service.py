from sqlalchemy import text
from app.config.database import conn

MIN_EVALUATIONS = 3

# Umbrales del estado del ICP: son constantes fijas en codigo (sustentables
# en la defensa), el admin no las puede editar desde la UI.
UMBRAL_EN_RIESGO = 60
UMBRAL_SOLIDO = 80


def classify_status(average_score):
    """Clasifica el ICP en un estado simple segun umbrales fijos.

    No compara contra el periodo anterior (no hay tendencia): es solo el
    puntaje actual contra dos umbrales.
    """
    if average_score is None:
        return "Datos insuficientes"
    if average_score < UMBRAL_EN_RIESGO:
        return "En riesgo"
    if average_score >= UMBRAL_SOLIDO:
        return "Sólido"
    return "Estable"


def calculate_average_score(evaluatee_id: int, period_id: int):
    """Calcula el promedio simple (0-100) de los puntajes recibidos por una persona en un periodo."""
    count_query = text("""
        SELECT COUNT(DISTINCT id) FROM evaluations
        WHERE evaluatee_id = :evaluatee_id AND period_id = :period_id AND status = 'submitted'
    """)
    n_evals = conn.execute(count_query, {"evaluatee_id": evaluatee_id, "period_id": period_id}).scalar() or 0

    if n_evals < MIN_EVALUATIONS:
        return {"average_score": None, "n_evals": n_evals}

    scores_query = text("""
        SELECT a.score
        FROM evaluation_answers a
        JOIN questions q ON a.question_id = q.id
        JOIN evaluations e ON a.evaluation_id = e.id
        WHERE e.evaluatee_id = :evaluatee_id
          AND e.period_id = :period_id
          AND e.status = 'submitted'
          AND q.input_type = 'scale'
          AND a.score IS NOT NULL
    """)
    scores = [row[0] for row in conn.execute(scores_query, {"evaluatee_id": evaluatee_id, "period_id": period_id}).all()]

    if not scores:
        return {"average_score": None, "n_evals": n_evals}

    avg = sum(scores) / len(scores)
    average_score = round((avg - 1) / 4 * 100)

    return {"average_score": average_score, "n_evals": n_evals}

def get_metrics_summary(period_id: int):
    """Obtiene los KPIs globales y el listado de personas con su promedio de evaluacion."""
    total_eval_query = text("""
        SELECT COUNT(DISTINCT id) FROM evaluations WHERE period_id = :period_id AND status = 'submitted'
    """)
    total_evaluations = conn.execute(total_eval_query, {"period_id": period_id}).scalar() or 0

    users_query = text("""
        SELECT u.id, u.full_name AS name, u.email, r.name AS role
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE r.name IN ('team_leader', 'tutor')
    """)
    evaluatees_rows = conn.execute(users_query).mappings().all()

    evaluatees = []
    scores = []
    for row in evaluatees_rows:
        user_dict = dict(row)
        score_info = calculate_average_score(user_dict["id"], period_id)
        user_dict.update(score_info)
        user_dict["status"] = classify_status(score_info["average_score"])
        evaluatees.append(user_dict)
        if score_info["average_score"] is not None:
            scores.append(score_info["average_score"])

    average_score_global = round(sum(scores) / len(scores)) if scores else 0

    total_coders_query = text("SELECT COUNT(*) FROM users WHERE role_id = 1 AND is_active = TRUE")
    total_coders = conn.execute(total_coders_query).scalar() or 0

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
