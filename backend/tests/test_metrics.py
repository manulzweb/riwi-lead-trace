"""
ICP (metrics_service.calculate_average_score): sin evaluaciones suficientes
no se calcula nada, y con suficientes da un puntaje entre 0 y 100.
"""
from sqlalchemy import text

from app.config.database import conn
from app.services.metrics_service import calculate_average_score, classify_status, MIN_EVALUATIONS

TEAM_LEADER_ID = 2
TEMPLATE_TEAM_LEADER = 1
SCALE_QUESTION_ID = 1
# 3 evaluadores distintos (usuarios semilla: coder, tutor, admin) para
# respetar el indice unico (evaluator_id, evaluatee_id, period_id) de
# database/schema.sql: no se puede insertar dos evaluaciones del mismo
# evaluador a la misma persona en el mismo periodo.
EVALUATOR_IDS = [1, 3, 4]


def test_classify_status_por_umbral():
    assert classify_status(None) == "Datos insuficientes"
    assert classify_status(59) == "En riesgo"
    assert classify_status(60) == "Estable"
    assert classify_status(79) == "Estable"
    assert classify_status(80) == "Sólido"


def test_datos_insuficientes_si_no_hay_evaluaciones(temp_period):
    resultado = calculate_average_score(TEAM_LEADER_ID, temp_period)
    assert resultado["average_score"] is None
    assert resultado["n_evals"] == 0


def test_score_entre_0_y_100_con_evaluaciones_suficientes(temp_period):
    assert len(EVALUATOR_IDS) == MIN_EVALUATIONS

    for evaluator_id in EVALUATOR_IDS:
        result = conn.execute(text("""
            INSERT INTO evaluations (evaluator_id, evaluatee_id, template_id, period_id, is_anonymous, status)
            VALUES (:evaluator_id, :evaluatee_id, :template_id, :period_id, FALSE, 'submitted')
        """), {
            "evaluator_id": evaluator_id,
            "evaluatee_id": TEAM_LEADER_ID,
            "template_id": TEMPLATE_TEAM_LEADER,
            "period_id": temp_period
        })
        conn.execute(text("""
            INSERT INTO evaluation_answers (evaluation_id, question_id, score, comment)
            VALUES (:evaluation_id, :question_id, 4, NULL)
        """), {"evaluation_id": result.lastrowid, "question_id": SCALE_QUESTION_ID})
    conn.commit()

    resultado = calculate_average_score(TEAM_LEADER_ID, temp_period)
    assert resultado["n_evals"] == MIN_EVALUATIONS
    assert resultado["average_score"] is not None
    assert 0 <= resultado["average_score"] <= 100
    # Puntaje 4 en escala 1-5 -> (4-1)/4*100 = 75
    assert resultado["average_score"] == 75
