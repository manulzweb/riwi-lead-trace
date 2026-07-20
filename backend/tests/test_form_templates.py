"""
Constructor de plantillas del Admin (POST/PUT/DELETE /forms, POST/DELETE
/questions, CRUD /categories): crear/quitar plantillas, preguntas y
categorias nuevas, sin romper las reglas ADMIN-02 ya existentes (periodo
cerrado, versionado, pesos, RESTRICT al borrar una categoria en uso).
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


def _delete_template_and_questions(form_id):
    conn.execute(text("DELETE FROM questions WHERE form_id = :id"), {"id": form_id})
    conn.execute(text("DELETE FROM forms WHERE id = :id"), {"id": form_id})
    conn.commit()


def _general_category_id():
    """La categoria 'General' viene sembrada en schema.sql; se busca por
    nombre en vez de asumir un id fijo (no depende del orden de insercion).
    """
    return conn.execute(text("SELECT id FROM categories WHERE name = 'General'")).scalar()


def _make_payload(**overrides):
    general_id = _general_category_id()
    payload = {
        "title": "Plantilla de prueba",
        "description": "Solo para pytest",
        "target_role": "team_leader",
        "questions": [
            {"text": "Pregunta de escala uno", "category_id": general_id, "input_type": "scale", "weight_percent": 60},
            {"text": "Pregunta de escala dos", "category_id": general_id, "input_type": "scale", "weight_percent": 40},
            {"text": "Comentario libre", "category_id": general_id, "input_type": "text", "weight_percent": 0},
        ],
    }
    payload.update(overrides)
    return payload


def test_no_se_crea_plantilla_con_periodo_activo(client):
    response = client.post("/forms", json=_make_payload())
    assert response.status_code == 409


def test_target_role_invalido_es_rechazado(client):
    _close_seed_period()
    try:
        response = client.post("/forms", json=_make_payload(target_role="coder"))
        assert response.status_code == 422
    finally:
        _reopen_seed_period()


def test_pesos_de_escala_deben_sumar_100_al_crear(client):
    _close_seed_period()
    try:
        general_id = _general_category_id()
        payload = _make_payload(questions=[
            {"text": "Pregunta uno", "category_id": general_id, "input_type": "scale", "weight_percent": 50},
            {"text": "Pregunta dos", "category_id": general_id, "input_type": "scale", "weight_percent": 40},
        ])
        response = client.post("/forms", json=payload)
        assert response.status_code == 422
    finally:
        _reopen_seed_period()


def test_categoria_inexistente_es_rechazada_al_crear_plantilla(client):
    _close_seed_period()
    try:
        payload = _make_payload(questions=[
            {"text": "Pregunta uno", "category_id": 999999, "input_type": "scale", "weight_percent": 100},
        ])
        response = client.post("/forms", json=payload)
        assert response.status_code == 404
    finally:
        _reopen_seed_period()


def test_crear_plantilla_ok_y_desactiva_la_anterior_del_mismo_rol(client):
    _close_seed_period()
    new_id = None
    try:
        response = client.post("/forms", json=_make_payload())
        assert response.status_code == 201
        body = response.json()
        new_id = body["id"]

        assert body["is_active"] is True
        assert body["target_role_id"] == 2  # team_leader
        assert len(body["questions"]) == 3
        assert body["questions"][0]["category"] == "General"  # nombre resuelto, no solo el id

        # 'yes_no'/'text' quedan en weight 0 aunque no se haya mandado nada raro.
        texto = next(q for q in body["questions"] if q["input_type"] == "text")
        assert texto["sort_order"] == 2  # se preserva el orden enviado

        # La plantilla vieja de team_leader (id=1, sembrada) queda desactivada.
        vieja = conn.execute(text("SELECT is_active FROM forms WHERE id = 1")).scalar()
        assert not vieja
    finally:
        if new_id is not None:
            _delete_template_and_questions(new_id)
        conn.execute(text("UPDATE forms SET is_active = TRUE WHERE id = 1"))
        conn.commit()
        _reopen_seed_period()


def test_tipo_yes_no_se_acepta_y_no_entra_al_icp(client):
    _close_seed_period()
    new_id = None
    try:
        general_id = _general_category_id()
        # weight_percent manda 50 (dentro del rango 0-100 que ya valida el
        # schema para CUALQUIER input_type) a proposito para probar que el
        # backend lo ignora y lo fuerza a 0 igual para 'yes_no' -- un valor
        # fuera de rango (ej. 999) ya lo rechaza el schema con 422 antes de
        # llegar a esa logica, sin importar el input_type.
        payload = _make_payload(questions=[
            {"text": "Pregunta de escala", "category_id": general_id, "input_type": "scale", "weight_percent": 100},
            {"text": "¿Cumplio el objetivo?", "category_id": general_id, "input_type": "yes_no", "weight_percent": 50},
        ])
        response = client.post("/forms", json=payload)
        assert response.status_code == 201
        body = response.json()
        new_id = body["id"]

        yes_no_q = next(q for q in body["questions"] if q["input_type"] == "yes_no")
        # weight_percent no viaja en QuestionOut de /forms; se verifica en BD
        # que el 50 enviado se forzo a 0 (yes_no nunca entra al ICP ponderado).
        db_weight = conn.execute(
            text("SELECT weight_percent FROM questions WHERE id = :id"), {"id": yes_no_q["id"]}
        ).scalar()
        assert float(db_weight) == 0.0
    finally:
        if new_id is not None:
            _delete_template_and_questions(new_id)
        conn.execute(text("UPDATE forms SET is_active = TRUE WHERE id = 1"))
        conn.commit()
        _reopen_seed_period()


def test_actualizar_metadata_de_plantilla(client):
    _close_seed_period()
    try:
        response = client.put(f"/forms/{TUTOR_TEMPLATE_ID}", json={"description": "Nueva descripcion de prueba"})
        assert response.status_code == 200
        assert response.json()["description"] == "Nueva descripcion de prueba"
    finally:
        conn.execute(text("UPDATE forms SET description = NULL WHERE id = :id"), {"id": TUTOR_TEMPLATE_ID})
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
        created = client.post("/forms", json=_make_payload()).json()
        new_id = created["id"]

        response = client.delete(f"/forms/{new_id}")
        assert response.status_code == 204

        row = conn.execute(text("SELECT is_active FROM forms WHERE id = :id"), {"id": new_id}).scalar()
        assert not row  # sigue en la tabla, solo desactivada
    finally:
        if new_id is not None:
            _delete_template_and_questions(new_id)
        conn.execute(text("UPDATE forms SET is_active = TRUE WHERE id = 1"))
        conn.commit()
        _reopen_seed_period()


def test_agregar_pregunta_a_plantilla_existente(client):
    _close_seed_period()
    new_question_id = None
    try:
        payload = {
            "form_id": TUTOR_TEMPLATE_ID,
            "text": "Pregunta agregada por pytest",
            "category_id": _general_category_id(),
            "input_type": "text",
            "weight_percent": 0,
        }
        response = client.post("/questions", json=payload)
        assert response.status_code == 201
        body = response.json()
        new_question_id = body["id"]

        assert body["form_id"] == TUTOR_TEMPLATE_ID
        assert body["is_active"] is True
        assert body["category"] == "General"
    finally:
        if new_question_id is not None:
            conn.execute(text("DELETE FROM questions WHERE id = :id"), {"id": new_question_id})
            conn.commit()
        _reopen_seed_period()


def test_agregar_pregunta_a_plantilla_inexistente_da_404(client):
    _close_seed_period()
    try:
        payload = {
            "form_id": 999999,
            "text": "No deberia crearse",
            "category_id": _general_category_id(),
            "input_type": "text",
            "weight_percent": 0,
        }
        response = client.post("/questions", json=payload)
        assert response.status_code == 404
    finally:
        _reopen_seed_period()


def test_agregar_pregunta_con_categoria_inexistente_da_404(client):
    _close_seed_period()
    try:
        payload = {
            "form_id": TUTOR_TEMPLATE_ID,
            "text": "No deberia crearse",
            "category_id": 999999,
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
            "form_id": TUTOR_TEMPLATE_ID,
            "text": "Pregunta a borrar",
            "category_id": _general_category_id(),
            "input_type": "text",
            "weight_percent": 0,
        }).json()
        new_question_id = created["id"]

        first = client.delete(f"/questions/{new_question_id}")
        assert first.status_code == 204

        second = client.delete(f"/questions/{new_question_id}")
        assert second.status_code == 204  # ya estaba desactivada, no es error

        row = conn.execute(text("SELECT is_active FROM questions WHERE id = :id"), {"id": new_question_id}).scalar()
        assert not row
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


# --- /categories -----------------------------------------------------------

def test_listar_categorias_incluye_las_sembradas(client):
    response = client.get("/categories")
    assert response.status_code == 200
    names = {c["name"] for c in response.json()}
    assert "General" in names
    assert "Comunicación efectiva" in names


def test_crear_categoria(client):
    new_id = None
    try:
        response = client.post("/categories", json={"name": "Categoria pytest"})
        assert response.status_code == 201
        new_id = response.json()["id"]
        assert response.json()["name"] == "Categoria pytest"
    finally:
        if new_id is not None:
            conn.execute(text("DELETE FROM categories WHERE id = :id"), {"id": new_id})
            conn.commit()


def test_crear_categoria_duplicada_da_409(client):
    response = client.post("/categories", json={"name": "General"})
    assert response.status_code == 409


def test_renombrar_categoria(client):
    new_id = conn.execute(text("INSERT INTO categories (name) VALUES ('Temporal pytest')")).lastrowid
    conn.commit()
    try:
        response = client.patch(f"/categories/{new_id}", json={"name": "Renombrada pytest"})
        assert response.status_code == 200
        assert response.json()["name"] == "Renombrada pytest"
    finally:
        conn.execute(text("DELETE FROM categories WHERE id = :id"), {"id": new_id})
        conn.commit()


def test_renombrar_categoria_inexistente_da_404(client):
    response = client.patch("/categories/999999", json={"name": "No existe"})
    assert response.status_code == 404


def test_borrar_categoria_sin_uso_funciona(client):
    new_id = conn.execute(text("INSERT INTO categories (name) VALUES ('Para borrar pytest')")).lastrowid
    conn.commit()

    response = client.delete(f"/categories/{new_id}")
    assert response.status_code == 204

    row = conn.execute(text("SELECT id FROM categories WHERE id = :id"), {"id": new_id}).first()
    assert row is None  # esta si se borra fisicamente: nunca tuvo preguntas


def test_borrar_categoria_en_uso_da_409_restrict(client):
    """La regla que pediste: no se puede borrar una categoria mientras una
    pregunta (activa o de una evaluacion historica) la use -- lo aplica la
    FK fk_question_category (ON DELETE RESTRICT) en la base de datos, no
    una validacion aparte en Python.
    """
    general_id = _general_category_id()
    response = client.delete(f"/categories/{general_id}")
    assert response.status_code == 409

    # sigue existiendo, no se borro nada
    row = conn.execute(text("SELECT id FROM categories WHERE id = :id"), {"id": general_id}).first()
    assert row is not None


def test_borrar_categoria_inexistente_da_404(client):
    response = client.delete("/categories/999999")
    assert response.status_code == 404
