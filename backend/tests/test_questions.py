"""
Reglas de negocio ADMIN-02 (integridad del instrumento):
1. Las preguntas (texto o pesos) solo se editan con el periodo cerrado.
2. Editar el texto versiona (fila nueva + desactiva la anterior); nunca
   sobrescribe, category/input_type/sort_order/weight_percent se conservan.
3. Si la IA marca que el texto ya no encaja en la categoria, hace falta
   confirm=true para guardar igual.
4. Los pesos de las preguntas de escala activas de un template deben
   cubrir exactamente ese conjunto y sumar 100.
"""
from sqlalchemy import text

from app.config.database import conn
from app.services import question_service

TL_TEMPLATE_ID = 1
FIRST_TL_SCALE_QUESTION_ID = 1  # 'Comunicación efectiva', weight_percent=10.00
SEED_ACTIVE_PERIOD_ID = 1


def _close_seed_period():
    conn.execute(text("UPDATE periods SET is_active = FALSE WHERE id = :id"), {"id": SEED_ACTIVE_PERIOD_ID})
    conn.commit()


def _reopen_seed_period():
    conn.execute(text("UPDATE periods SET is_active = TRUE WHERE id = :id"), {"id": SEED_ACTIVE_PERIOD_ID})
    conn.commit()


def test_no_se_edita_texto_con_periodo_activo(client):
    # El periodo semilla arranca activo (no se toca en este test).
    response = client.patch(f"/questions/{FIRST_TL_SCALE_QUESTION_ID}", json={"text": "Texto nuevo cualquiera"})
    assert response.status_code == 409


def test_no_se_actualizan_pesos_con_periodo_activo(client):
    response = client.put("/questions/weights", json={
        "template_id": TL_TEMPLATE_ID,
        "weights": [{"question_id": FIRST_TL_SCALE_QUESTION_ID, "weight_percent": 10}]
    })
    assert response.status_code == 409


def test_editar_texto_versiona_sin_sobrescribir(client):
    _close_seed_period()
    new_question_id = None
    try:
        nuevo_texto = "¿Tu Team Leader comunica con claridad los cambios de alcance?"
        response = client.patch(
            f"/questions/{FIRST_TL_SCALE_QUESTION_ID}",
            json={"text": nuevo_texto, "confirm": True}
        )
        assert response.status_code == 200
        body = response.json()
        new_question_id = body["id"]

        assert new_question_id != FIRST_TL_SCALE_QUESTION_ID
        assert body["text"] == nuevo_texto
        assert body["is_active"] is True
        assert body["category"] == "Comunicación efectiva"  # no se toca
        assert body["input_type"] == "scale"                 # no se toca
        assert float(body["weight_percent"]) == 10.0          # se hereda, no se toca

        original = question_service.get_question(FIRST_TL_SCALE_QUESTION_ID)
        assert original["is_active"] is False  # la version vieja queda desactivada, no borrada

        activas = question_service.get_questions_by_template(TL_TEMPLATE_ID, only_active=True)
        active_ids = {q["id"] for q in activas}
        assert FIRST_TL_SCALE_QUESTION_ID not in active_ids
        assert new_question_id in active_ids
    finally:
        if new_question_id is not None:
            conn.execute(text("DELETE FROM questions WHERE id = :id"), {"id": new_question_id})
        conn.execute(text("UPDATE questions SET is_active = TRUE WHERE id = :id"), {"id": FIRST_TL_SCALE_QUESTION_ID})
        conn.commit()
        _reopen_seed_period()


def test_editar_pregunta_ya_reemplazada_da_409(client):
    _close_seed_period()
    try:
        conn.execute(text("UPDATE questions SET is_active = FALSE WHERE id = :id"), {"id": FIRST_TL_SCALE_QUESTION_ID})
        conn.commit()

        response = client.patch(
            f"/questions/{FIRST_TL_SCALE_QUESTION_ID}",
            json={"text": "Cualquier texto", "confirm": True}
        )
        assert response.status_code == 409
    finally:
        conn.execute(text("UPDATE questions SET is_active = TRUE WHERE id = :id"), {"id": FIRST_TL_SCALE_QUESTION_ID})
        conn.commit()
        _reopen_seed_period()


def test_editar_texto_pide_confirmacion_si_ia_dice_que_no_coincide(client, monkeypatch):
    _close_seed_period()
    confirmado = None
    try:
        monkeypatch.setattr(question_service, "check_question_category_coherence", lambda text, category: False)

        sin_confirmar = client.patch(
            f"/questions/{FIRST_TL_SCALE_QUESTION_ID}",
            json={"text": "¿Cual es tu comida favorita?", "confirm": False}
        )
        assert sin_confirmar.status_code == 409

        # Con confirm=true se guarda igual (el admin asumio el riesgo).
        confirmado = client.patch(
            f"/questions/{FIRST_TL_SCALE_QUESTION_ID}",
            json={"text": "¿Cual es tu comida favorita?", "confirm": True}
        )
        assert confirmado.status_code == 200
    finally:
        if confirmado is not None and confirmado.status_code == 200:
            conn.execute(text("DELETE FROM questions WHERE id = :id"), {"id": confirmado.json()["id"]})
        conn.execute(text("UPDATE questions SET is_active = TRUE WHERE id = :id"), {"id": FIRST_TL_SCALE_QUESTION_ID})
        conn.commit()
        _reopen_seed_period()


def test_pesos_deben_sumar_100(client):
    _close_seed_period()
    try:
        activas = question_service.get_questions_by_template(TL_TEMPLATE_ID, only_active=True)
        scale_ids = [q["id"] for q in activas if q["input_type"] == "scale"]
        # 10 preguntas a 9.00 cada una = 90, no 100.
        weights = [{"question_id": qid, "weight_percent": 9} for qid in scale_ids]

        response = client.put("/questions/weights", json={"template_id": TL_TEMPLATE_ID, "weights": weights})
        assert response.status_code == 422
    finally:
        _reopen_seed_period()


def test_pesos_deben_cubrir_todas_las_preguntas_activas(client):
    _close_seed_period()
    try:
        activas = question_service.get_questions_by_template(TL_TEMPLATE_ID, only_active=True)
        scale_ids = [q["id"] for q in activas if q["input_type"] == "scale"]
        # Falta la ultima pregunta de escala.
        weights = [{"question_id": qid, "weight_percent": round(100 / (len(scale_ids) - 1), 2)}
                   for qid in scale_ids[:-1]]

        response = client.put("/questions/weights", json={"template_id": TL_TEMPLATE_ID, "weights": weights})
        assert response.status_code == 422
    finally:
        _reopen_seed_period()


def test_actualizar_pesos_ok_y_se_reflejan(client):
    _close_seed_period()
    original = question_service.get_questions_by_template(TL_TEMPLATE_ID, only_active=True)
    original_weights = {q["id"]: float(q["weight_percent"]) for q in original if q["input_type"] == "scale"}
    try:
        scale_ids = list(original_weights.keys())
        # Un peso distinto para la primera, el resto reparte lo que sobra.
        weights = [{"question_id": scale_ids[0], "weight_percent": 19.0}]
        resto = round(81.0 / (len(scale_ids) - 1), 2)
        for qid in scale_ids[1:]:
            weights.append({"question_id": qid, "weight_percent": resto})
        # Ajuste fino para que la suma de redondeo caiga exacto en 100.
        suma = sum(w["weight_percent"] for w in weights)
        weights[-1]["weight_percent"] = round(weights[-1]["weight_percent"] + (100 - suma), 2)

        response = client.put("/questions/weights", json={"template_id": TL_TEMPLATE_ID, "weights": weights})
        assert response.status_code == 200

        actualizadas = question_service.get_questions_by_template(TL_TEMPLATE_ID, only_active=True)
        nuevo_peso = next(q["weight_percent"] for q in actualizadas if q["id"] == scale_ids[0])
        assert float(nuevo_peso) == 19.0
    finally:
        for qid, weight in original_weights.items():
            conn.execute(text("UPDATE questions SET weight_percent = :w WHERE id = :id"), {"w": weight, "id": qid})
        conn.commit()
        _reopen_seed_period()
