from sqlalchemy import text
from app.config.database import engine

MIN_EVALUATIONS = 3
UMBRAL_EN_RIESGO = 60
UMBRAL_SOLIDO = 80


def classify_status(average_score):
    if average_score is None:
        return "Datos insuficientes"
    if average_score < UMBRAL_EN_RIESGO:
        return "En riesgo"
    if average_score >= UMBRAL_SOLIDO:
        return "Sólido"
    return "Estable"


def calculate_average_score(evaluatee_id: int, period_id: int):
    with engine.connect() as conn:
        count_query = text("""
            SELECT COUNT(DISTINCT id) FROM evaluations
            WHERE evaluatee_id = :evaluatee_id AND period_id = :period_id AND status = 'submitted'
        """)
        n_evals = conn.execute(count_query, {"evaluatee_id": evaluatee_id, "period_id": period_id}).scalar() or 0

        if n_evals < MIN_EVALUATIONS:
            return {"average_score": None, "n_evals": n_evals}

        per_question_query = text("""
            SELECT a.question_id, q.weight_percent, AVG(a.score) AS avg_score
            FROM evaluation_answers a
            JOIN questions q ON a.question_id = q.id
            JOIN evaluations e ON a.evaluation_id = e.id
            WHERE e.evaluatee_id = :evaluatee_id
              AND e.period_id = :period_id
              AND e.status = 'submitted'
              AND q.input_type = 'scale'
              AND a.score IS NOT NULL
            GROUP BY a.question_id, q.weight_percent
        """)
        rows = conn.execute(per_question_query, {"evaluatee_id": evaluatee_id, "period_id": period_id}).all()

        if not rows:
            return {"average_score": None, "n_evals": n_evals}

        total_weight = sum(float(weight) for _, weight, _ in rows)

        if total_weight > 0:
            avg_1_5 = sum(float(avg_score) * float(weight) for _, weight, avg_score in rows) / total_weight
        else:
            avg_1_5 = sum(float(avg_score) for _, _, avg_score in rows) / len(rows)

        average_score = round((avg_1_5 - 1) / 4 * 100)

        return {"average_score": average_score, "n_evals": n_evals}

def get_score_history(evaluatee_id: int):
    """Serie del ICP de una persona a traves de todos los periodos donde tuvo
    evaluaciones suficientes (>= MIN_EVALUATIONS). Reutiliza calculate_average_score
    en vez de duplicar la formula de ponderacion."""
    with engine.connect() as conn:
        periods_query = text("SELECT id, name, starts_at FROM periods ORDER BY starts_at ASC")
        periods = conn.execute(periods_query).mappings().all()

    history = []
    for period in periods:
        score_info = calculate_average_score(evaluatee_id, period["id"])
        if score_info["average_score"] is not None:
            history.append({
                "period_id": period["id"],
                "period_name": period["name"],
                "starts_at": period["starts_at"],
                "average_score": score_info["average_score"],
            })
    return history


def get_metrics_summary(period_id: int):
    with engine.connect() as conn:
        total_eval_query = text("""
            SELECT COUNT(DISTINCT id) FROM evaluations WHERE period_id = :period_id AND status = 'submitted'
        """)
        total_evaluations = conn.execute(total_eval_query, {"period_id": period_id}).scalar() or 0

        users_query = text("""
            SELECT u.id, u.full_name AS name, u.email, r.name AS role,
                   COALESCE(
                       tutor_clan.name,
                       tl_clans.clan_names
                   ) AS clan_name
            FROM users u
            JOIN user_roles ur ON u.id = ur.user_id
            JOIN roles r ON ur.role_id = r.id
            LEFT JOIN clans tutor_clan ON tutor_clan.id = u.clan_id
            LEFT JOIN (
                SELECT tlc.user_id, GROUP_CONCAT(c.name SEPARATOR ', ') AS clan_names
                FROM team_leader_clans tlc
                JOIN clans c ON c.id = tlc.clan_id
                GROUP BY tlc.user_id
            ) tl_clans ON tl_clans.user_id = u.id
            WHERE r.name IN ('team_leader', 'tutor')
            GROUP BY u.id, r.name
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

        total_coders_query = text("""
            SELECT COUNT(DISTINCT u.id) 
            FROM users u 
            JOIN user_roles ur ON u.id = ur.user_id 
            WHERE ur.role_id = 1 AND u.is_active = TRUE
        """)
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
