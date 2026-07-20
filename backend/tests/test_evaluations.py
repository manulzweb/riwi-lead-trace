"""
Reglas de negocio de POST /evaluations:
1. El evaluador es el que mande el cliente en el body (evaluator_id).
2. No se puede evaluar dos veces a la misma persona en el mismo periodo,
   ni siquiera marcando la evaluacion como anonima.
3. Sin periodo activo (ADMIN-01), el backend rechaza con 409 -- la SPA
   nunca es la autoridad.
"""

# IDs de los datos semilla de database/02_dml.sql
EVALUATEE_ID = 5       # mvasquez@riwi.io, tutor, clan_id=1
TEMPLATE_EVAL = 2  # plantilla "Evaluacion de Tutor"
SCALE_QUESTION_ID = 12     # primera pregunta tipo 'scale' de esa plantilla

CODER_ID_FROM_TOKEN = 8  # sebastian@riwi.io, coder, mismo clan_id=1 que EVALUATEE_ID

def _payload(period_id, evaluator_id=CODER_ID_FROM_TOKEN, is_anonymous=False):
    return {
        "evaluatee_id": EVALUATEE_ID,
        "form_id": TEMPLATE_EVAL,
        "period_id": period_id,
        "is_anonymous": is_anonymous,
        "status": "submitted",
        "evaluator_id": evaluator_id,
        "answers": [{"question_id": SCALE_QUESTION_ID, "score": 5, "comment": None}]
    }


def test_no_se_puede_evaluar_dos_veces_en_el_mismo_periodo(client, temp_period):
    primera = client.post("/evaluations", json=_payload(temp_period))
    assert primera.status_code == 201

    segunda = client.post("/evaluations", json=_payload(temp_period))
    assert segunda.status_code == 409


def test_duplicado_no_se_salta_marcando_anonima(client, temp_period):
    primera = client.post("/evaluations", json=_payload(temp_period))
    assert primera.status_code == 201

    segunda_anonima = client.post(
        "/evaluations",
        json=_payload(temp_period, is_anonymous=True)
    )
    assert segunda_anonima.status_code == 409


def test_evaluado_puede_ver_su_propio_historial(client, temp_period):
    creada = client.post("/evaluations", json=_payload(temp_period))
    assert creada.status_code == 201

    response = client.get(f"/evaluations?evaluatee_id={EVALUATEE_ID}")
    assert response.status_code == 200
    assert len(response.json()) >= 1


def test_no_se_crea_evaluacion_sin_periodo_activo(client, temp_inactive_period):
    response = client.post("/evaluations", json=_payload(temp_inactive_period))
    assert response.status_code == 409


def test_no_se_crea_evaluacion_con_periodo_inexistente(client):
    response = client.post("/evaluations", json=_payload(999999))
    assert response.status_code == 404


def test_evaluado_no_ve_quien_lo_evaluo_ni_en_no_anonimas(client, temp_period):
    creada = client.post(
        "/evaluations",
        json=_payload(temp_period, is_anonymous=False)
    )
    assert creada.status_code == 201
    assert creada.json()["evaluator_id"] == CODER_ID_FROM_TOKEN  # se guardo el id real

    como_evaluado = client.get(f"/evaluations?evaluatee_id={EVALUATEE_ID}")
    assert como_evaluado.json()[0]["evaluator_id"] is None  # el TL nunca lo ve

    como_admin = client.get(f"/evaluations?evaluatee_id={EVALUATEE_ID}&viewer_role=admin")
    assert como_admin.json()[0]["evaluator_id"] == CODER_ID_FROM_TOKEN  # el admin si