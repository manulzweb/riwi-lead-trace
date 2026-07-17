"""
Constructor de plantillas del Admin (POST/PUT/DELETE /forms, POST/DELETE
/questions): crear/quitar plantillas y preguntas nuevas, sin romper las
reglas ADMIN-02 ya existentes (periodo cerrado, versionado, pesos).
"""
from sqlalchemy import text

from app.config.database import conn

SEED_ACTIVE_PERIOD_ID = 1
TUTOR_TEMPLATE_ID = 2  # 'Evaluación a Tutor' en database/schema.sql


def _close_seed_period():
    conn.execute(text("UPDATE periods SET is_active = FALSE WHERE id = :id"), {"id": SEED_ACTIVE_PERIOD_ID})
    conn.commit()


def _reopen_seed_period():
    conn.execute(text("UPDATE periods SET is_active = TRUE WHERE id = :id"), {"id": SEED_ACTIVE_PERIOD_ID})
    conn.commit()


def _delete_template_and_questions(template_id):
    conn.execute(text("DELETE FROM questions WHERE template_id = :id"), {"id": template_id})
    conn.execute(text("DELETE FROM form_templates WHERE id = :id"), {"id": template_id})
    conn.commit()


VALID_PAYLOAD = {
    "title": "Plantilla de prueba",
    "description": "Solo para pytest",
    "target_role": "team_leader",
    "questions": [
        {"text": "Pregunta de escala uno", "category": "General", "input_type": "scale", "weight_percent": 60},
        {"text": "Pregunta de escala dos", "category": "General", "input_type": "scale", "weight_percent": 40},
        {"text": "Comentario libre", "category": "General", "input_type": "text", "weight_percent": 0},
    ],
}


def test_no_se_crea_plantilla_con_periodo_activo(client):
    response = client.post("/forms", json=VALID_PAYLOAD)
    assert response.status_code == 409


def test_target_role_invalido_es_rechazado(client):
    _close_seed_period()
    try:
        payload = {**VALID_PAYLOAD, "target_role": "coder"}
        response = client.post("/forms", json=payload)
        assert response.status_code == 422
    finally:
        _reopen_seed_period()


def test_pesos_de_escala_deben_sumar_100_al_crear(client):
    _close_seed_period()
    try:
        payload = {
            **VALID_PAYLOAD,
            "questions": [
                {"text": "Pregunta uno", "category": "General", "input_type": "scale", "weight_percent": 50},
                {"text": "Pregunta dos", "category": "General", "input_type": "scale", "weight_percent": 40},
            ],
        }
        response = client.post("/forms", json=payload)
        assert response.status_code == 422
    finally:
        _reopen_seed_period()


def test_crear_plantilla_ok_y_desactiva_la_anterior_del_mismo_rol(client):
    _close_seed_period()
    new_id = None
    try:
        response = client.post("/forms", json=VALID_PAYLOAD)
        assert response.status_code == 201
        body = response.json()
        new_id = body["id"]

        assert body["is_active"] is True
        assert body["target_role_id"] == 2  # team_leader
        assert len(body["questions"]) == 3

        # 'yes_no'/'text' quedan en weight 0 aunque no se haya mandado nada raro.
        texto = next(q for q in body["questions"] if q["input_type"] == "text")
        assert texto["sort_order"] == 2  # se preserva el orden enviado

        # La plantilla vieja de team_leader (id=1, sembrada) queda desactivada.
        vieja = conn.execute(text("SELECT is_active FROM form_templates WHERE id = 1")).scalar()
        assert vieja is False
    finally:
        if new_id is not None:
            _delete_template_and_questions(new_id)
        conn.execute(text("UPDATE form_templates SET is_active = TRUE WHERE id = 1"))
        conn.commit()
        _reopen_seed_period()


def test_tipo_yes_no_se_acepta_y_no_entra_al_icp(client):
    _close_seed_period()
    new_id = None
    try:
        payload = {
            **VALID_PAYLOAD,
            "questions": [
                {"text": "Pregunta de escala", "category": "General", "input_type": "scale", "weight_percent": 100},
                {"text": "¿Cumplio el objetivo?", "category": "General", "input_type": "yes_no", "weight_percent": 999},
            ],
        }
        response = client.post("/forms", json=payload)
        assert response.status_code == 201
        body = response.json()
        new_id = body["id"]

        yes_no_q = next(q for q in body["questions"] if q["input_type"] == "yes_no")
        # weight_percent no viaja en QuestionOut de /forms, pero el valor absurdo (999)
        # no debio pasar la validacion de weight_percent<=100 salvo por forzarse a 0:
        db_weight = conn.execute(
            text("SELECT weight_percent FROM questions WHERE id = :id"), {"id": yes_no_q["id"]}
        ).scalar()
        assert float(db_weight) == 0.0
    finally:
        if new_id is not None:
            _delete_template_and_questions(new_id)
        conn.execute(text("UPDATE form_templates SET is_active = TRUE WHERE id = 1"))
        conn.commit()
        _reopen_seed_period()


def test_actualizar_metadata_de_plantilla(client):
    _close_seed_period()
    try:
        response = client.put(f"/forms/{TUTOR_TEMPLATE_ID}", json={"description": "Nueva descripcion de prueba"})
        assert response.status_code == 200
        assert response.json()["description"] == "Nueva descripcion de prueba"
    finally:
        conn.execute(text("UPDATE form_templates SET description = NULL WHERE id = :id"), {"id": TUTOR_TEMPLATE_ID})
        conn.commit()
        _reopen_seed_period()


def test_actualizar_plantilla_inexistente_da_404(client):
    _close_seed_period()
    try:
        response = client.put("/forms/999999", json={"title": "No existe"})
        assert response.status_code == 404
    finally:
        _reopen_seed_period()


def test_borrar_plantilla_la_desactiva_sin_borrarla_fisicamente(client):
    _close_seed_period()
    new_id = None
    try:
        created = client.post("/forms", json=VALID_PAYLOAD).json()
        new_id = created["id"]

        response = client.delete(f"/forms/{new_id}")
        assert response.status_code == 204

        row = conn.execute(text("SELECT is_active FROM form_templates WHERE id = :id"), {"id": new_id}).scalar()
        assert row is False  # sigue en la tabla, solo desactivada
    finally:
        if new_id is not None:
            _delete_template_and_questions(new_id)
        conn.execute(text("UPDATE form_templates SET is_active = TRUE WHERE id = 1"))
        conn.commit()
        _reopen_seed_period()


def test_agregar_pregunta_a_plantilla_existente(client):
    _close_seed_period()
    new_question_id = None
    try:
        payload = {
            "template_id": TUTOR_TEMPLATE_ID,
            "text": "Pregunta agregada por pytest",
            "category": "General",
            "input_type": "text",
            "weight_percent": 0,
        }
        response = client.post("/questions", json=payload)
        assert response.status_code == 201
        body = response.json()
        new_question_id = body["id"]

        assert body["template_id"] == TUTOR_TEMPLATE_ID
        assert body["is_active"] is True
    finally:
        if new_question_id is not None:
            conn.execute(text("DELETE FROM questions WHERE id = :id"), {"id": new_question_id})
            conn.commit()
        _reopen_seed_period()


def test_agregar_pregunta_a_plantilla_inexistente_da_404(client):
    _close_seed_period()
    try:
        payload = {
            "template_id": 999999,
            "text": "No deberia crearse",
            "category": "General",
            "input_type": "text",
            "weight_percent": 0,
        }
        response = client.post("/questions", json=payload)
        assert response.status_code == 404
    finally:
        _reopen_seed_period()


def test_borrar_pregunta_es_idempotente(client):
    _close_seed_period()
    new_question_id = None
    try:
        created = client.post("/questions", json={
            "template_id": TUTOR_TEMPLATE_ID,
            "text": "Pregunta a borrar",
            "category": "General",
            "input_type": "text",
            "weight_percent": 0,
        }).json()
        new_question_id = created["id"]

        first = client.delete(f"/questions/{new_question_id}")
        assert first.status_code == 204

        second = client.delete(f"/questions/{new_question_id}")
        assert second.status_code == 204  # ya estaba desactivada, no es error

        row = conn.execute(text("SELECT is_active FROM questions WHERE id = :id"), {"id": new_question_id}).scalar()
        assert row is False
    finally:
        if new_question_id is not None:
            conn.execute(text("DELETE FROM questions WHERE id = :id"), {"id": new_question_id})
            conn.commit()
        _reopen_seed_period()


def test_borrar_pregunta_inexistente_da_404(client):
    _close_seed_period()
    try:
        response = client.delete("/questions/999999")
        assert response.status_code == 404
    finally:
        _reopen_seed_period()
