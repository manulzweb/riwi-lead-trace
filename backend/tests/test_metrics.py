"""
ICP (metrics_service.get_score_history): sin evaluaciones suficientes
no se calcula nada, y con suficientes da un puntaje entre 0 y 100.
"""
from sqlalchemy import text
from app.config.database import conn
from app.services.metrics_service import metrics_service, get_score_history, DEFAULT_REQUIRED_EVALUATIONS

TEAM_LEADER_ID = 2
FORM_TEAM_LEADER = 1
SCALE_QUESTION_ID = 1
EVALUATOR_IDS = [1, 3, 4]


def test_classify_status_por_umbral():
    assert metrics_service.classify_status(None) == "Datos insuficientes"
    assert metrics_service.classify_status(59) == "En riesgo"
    assert metrics_service.classify_status(60) == "Estable"
    assert metrics_service.classify_status(79) == "Estable"
    assert metrics_service.classify_status(80) == "Sólido"


def test_datos_insuficientes_si_no_hay_evaluaciones(temp_period):
    historial = get_score_history(TEAM_LEADER_ID)
    resultado = next((p for p in historial if p["period_id"] == temp_period), None)
    # The history view now excludes periods without enough evaluations entirely!
    assert resultado is None


def test_score_entre_0_y_100_con_evaluaciones_suficientes(temp_period):
    assert len(EVALUATOR_IDS) == DEFAULT_REQUIRED_EVALUATIONS

    for evaluator_id in EVALUATOR_IDS:
        result = conn.execute(text("""
            INSERT INTO evaluations (evaluatee_id, form_id, period_id, is_anonymous, status)
            VALUES (:evaluatee_id, :form_id, :period_id, FALSE, 'submitted')
        """), {
            "evaluatee_id": TEAM_LEADER_ID,
            "form_id": FORM_TEAM_LEADER,
            "period_id": temp_period
        })
        conn.execute(text("""
            INSERT INTO evaluation_submissions (evaluator_id, evaluatee_id, period_id, evaluation_id)
            VALUES (:evaluator_id, :evaluatee_id, :period_id, :evaluation_id)
        """), {
            "evaluator_id": evaluator_id,
            "evaluatee_id": TEAM_LEADER_ID,
            "period_id": temp_period,
            "evaluation_id": result.lastrowid
        })
        conn.execute(text("""
            INSERT INTO detalles_evaluacion (evaluation_id, question_id, score, comment)
            VALUES (:evaluation_id, :question_id, 4, NULL)
        """), {"evaluation_id": result.lastrowid, "question_id": SCALE_QUESTION_ID})
    conn.commit()

    historial = get_score_history(TEAM_LEADER_ID)
    resultado = next((p for p in historial if p["period_id"] == temp_period), None)
    assert resultado is not None
    assert resultado["average_score"] is not None
    assert 0 <= resultado["average_score"] <= 100
    # Puntaje 4 en escala 1-5 -> (4-1)/4*100 = 75
    assert resultado["average_score"] == 75
