"""
Reglas de negocio de POST /evaluations:
1. El evaluador es el del token, nunca el que mande el cliente en el body.
2. No se puede evaluar dos veces a la misma persona en el mismo periodo,
   ni siquiera marcando la evaluacion como anonima.
"""

# IDs de los datos semilla de database/schema.sql
TEAM_LEADER_ID = 2       # teamleader@riwi.edu
TEMPLATE_TEAM_LEADER = 1  # plantilla "Evaluacion de Team Leader"
SCALE_QUESTION_ID = 1     # primera pregunta tipo 'scale' de esa plantilla

CODER_ID_FROM_TOKEN = 1  # debe coincidir con CODER_ID en conftest.py


def _payload(period_id, is_anonymous=False, evaluator_id_spoof=None):
    payload = {
        "evaluatee_id": TEAM_LEADER_ID,
        "template_id": TEMPLATE_TEAM_LEADER,
        "period_id": period_id,
        "is_anonymous": is_anonymous,
        "status": "submitted",
        "answers": [{"question_id": SCALE_QUESTION_ID, "score": 5, "comment": None}]
    }
    if evaluator_id_spoof is not None:
        # El schema ya no acepta este campo, pero lo mandamos igual para
        # comprobar que el backend lo ignora en vez de usarlo.
        payload["evaluator_id"] = evaluator_id_spoof
    return payload


def test_evaluator_id_se_toma_del_token_no_del_body(client, coder_headers, temp_period):
    response = client.post(
        "/evaluations",
        json=_payload(temp_period, evaluator_id_spoof=999),
        headers=coder_headers
    )
    assert response.status_code == 201
    assert response.json()["evaluator_id"] == CODER_ID_FROM_TOKEN


def test_no_se_puede_evaluar_dos_veces_en_el_mismo_periodo(client, coder_headers, temp_period):
    primera = client.post("/evaluations", json=_payload(temp_period), headers=coder_headers)
    assert primera.status_code == 201

    segunda = client.post("/evaluations", json=_payload(temp_period), headers=coder_headers)
    assert segunda.status_code == 409


def test_duplicado_no_se_salta_marcando_anonima(client, coder_headers, temp_period):
    primera = client.post("/evaluations", json=_payload(temp_period), headers=coder_headers)
    assert primera.status_code == 201

    segunda_anonima = client.post(
        "/evaluations",
        json=_payload(temp_period, is_anonymous=True),
        headers=coder_headers
    )
    assert segunda_anonima.status_code == 409


def test_evaluado_puede_ver_su_propio_historial(client, coder_headers, team_leader_headers, temp_period):
    creada = client.post("/evaluations", json=_payload(temp_period), headers=coder_headers)
    assert creada.status_code == 201

    response = client.get(f"/evaluations?evaluatee_id={TEAM_LEADER_ID}", headers=team_leader_headers)
    assert response.status_code == 200
    assert len(response.json()) >= 1


def test_evaluado_no_puede_ver_historial_de_otra_persona(client, team_leader_headers):
    # El TL (id=2) intenta ver el historial del Tutor (id=3): no es ni admin ni el mismo.
    response = client.get("/evaluations?evaluatee_id=3", headers=team_leader_headers)
    assert response.status_code == 403


def test_evaluado_no_ve_quien_lo_evaluo_ni_en_no_anonimas(
    client, coder_headers, team_leader_headers, admin_headers, temp_period
):
    creada = client.post(
        "/evaluations",
        json=_payload(temp_period, is_anonymous=False),
        headers=coder_headers
    )
    assert creada.status_code == 201
    assert creada.json()["evaluator_id"] == CODER_ID_FROM_TOKEN  # se guardo el id real

    como_evaluado = client.get(f"/evaluations?evaluatee_id={TEAM_LEADER_ID}", headers=team_leader_headers)
    assert como_evaluado.json()[0]["evaluator_id"] is None  # el TL nunca lo ve

    como_admin = client.get(f"/evaluations?evaluatee_id={TEAM_LEADER_ID}", headers=admin_headers)
    assert como_admin.json()[0]["evaluator_id"] == CODER_ID_FROM_TOKEN  # el admin si
