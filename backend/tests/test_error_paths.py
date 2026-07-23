"""Caminos de ERROR de la API: cada excepcion de dominio con su codigo HTTP.

Por que existe este archivo (paso 3 del plan en
`docs/superpowers/specs/2026-07-22-exception-handlers-plan.md`):

La migracion a Exception Handlers globales mueve el mapeo excepcion->HTTP desde
34 bloques `try/except` dispersos en los routes a un handler unico. Sin estas
pruebas, ese refactor se haria A CIEGAS: la suite pasaria igual aunque un
endpoint empezara a devolver 500 donde antes daba 409, porque nadie compraba
esos caminos.

De los 49 caminos de error declarados en `routes/`, 24 ya estaban cubiertos por
las otras suites. Aqui se cubren los 25 restantes.

OJO con `InvalidRoleException`: existen DOS clases distintas con ese nombre
(`form_exceptions` y `evaluation_exceptions`) y mapean a codigos DISTINTOS
-- 422 y 403. Es el conflicto que bloquea una migracion ingenua "por nombre",
y por eso ambos casos se prueban por separado aqui.
"""
import pytest
from sqlalchemy import text

from app.config.database import conn

SEED_ACTIVE_PERIOD_ID = 5
TUTOR_FORM_ID = 2
INEXISTENTE = 999999


def _cerrar_periodos():
    conn.execute(text("UPDATE periods SET is_active = FALSE"))
    conn.commit()


def _reabrir_periodo_semilla():
    conn.execute(text("UPDATE periods SET is_active = TRUE WHERE id = :id"), {"id": SEED_ACTIVE_PERIOD_ID})
    conn.commit()


@pytest.fixture
def evaluacion_temporal():
    """Crea una evaluacion con su participacion y la limpia al terminar.

    Se crea aqui en vez de depender del seed: `02_dml.sql` no siembra
    evaluaciones (eso lo hace `03_mock_history.sql`, que es opcional). Sin esto,
    los tests que necesitan historial se SALTABAN -- y un test saltado se ve
    verde sin cubrir nada, que es peor que no tenerlo.
    """
    evaluador = conn.execute(text("""
        SELECT u.id FROM users u
        JOIN user_roles ur ON ur.user_id = u.id
        JOIN roles r ON r.id = ur.role_id
        WHERE r.name = 'coder' LIMIT 1
    """)).scalar()
    evaluado = conn.execute(text("""
        SELECT u.id FROM users u
        JOIN user_roles ur ON ur.user_id = u.id
        JOIN roles r ON r.id = ur.role_id
        WHERE r.name = 'tutor' LIMIT 1
    """)).scalar()

    period_id = conn.execute(text("""
        INSERT INTO periods (name, starts_at, ends_at, is_active)
        VALUES ('TEST-error-paths', '2031-01-01', '2031-02-01', FALSE)
    """)).lastrowid
    evaluation_id = conn.execute(text("""
        INSERT INTO evaluations (evaluatee_id, form_id, period_id, status)
        VALUES (:e, :f, :p, 'submitted')
    """), {"e": evaluado, "f": TUTOR_FORM_ID, "p": period_id}).lastrowid
    conn.execute(text("""
        INSERT INTO evaluation_submissions (evaluator_id, evaluatee_id, period_id, evaluation_id)
        VALUES (:ev, :e, :p, :eid)
    """), {"ev": evaluador, "e": evaluado, "p": period_id, "eid": evaluation_id})
    conn.commit()

    yield {"evaluator_id": evaluador, "period_id": period_id, "evaluation_id": evaluation_id}

    conn.execute(text("DELETE FROM evaluation_submissions WHERE evaluation_id = :id"), {"id": evaluation_id})
    conn.execute(text("DELETE FROM evaluations WHERE id = :id"), {"id": evaluation_id})
    conn.execute(text("DELETE FROM periods WHERE id = :id"), {"id": period_id})
    conn.commit()


@pytest.fixture
def periodo_cerrado():
    """Cierra TODOS los periodos y los restaura al terminar.

    Se cierran todos y no solo el sembrado porque otras suites crean periodos
    propios; basta uno abierto para que las reglas de instrumento respondan 409
    y el resultado dependeria del orden de ejecucion.
    """
    _cerrar_periodos()
    yield
    _reabrir_periodo_semilla()


# --- /users -----------------------------------------------------------------

def test_crear_usuario_con_email_repetido_da_409(client):
    existente = conn.execute(text("SELECT email FROM users LIMIT 1")).scalar()
    response = client.post("/users", json={
        "name": "Duplicado pytest", "email": existente,
        "password": "Riwi2026!", "role_ids": [1],
    })
    assert response.status_code == 409


def test_actualizar_usuario_inexistente_da_404(client):
    assert client.put(f"/users/{INEXISTENTE}", json={"name": "No existe"}).status_code == 404
    assert client.patch(f"/users/{INEXISTENTE}", json={"name": "No existe"}).status_code == 404


def test_actualizar_usuario_con_email_de_otro_da_409(client):
    """El UNIQUE de `users.email` sube como IntegrityError y el servicio lo
    traduce; sin esa traduccion esto seria un 500."""
    dos = conn.execute(text("SELECT id, email FROM users ORDER BY id LIMIT 2")).mappings().all()
    victima_id, ajeno_email = dos[0]["id"], dos[1]["email"]
    # PUT y PATCH comparten servicio pero son handlers distintos en el route:
    # cada uno mapea la excepcion por su cuenta y hay que fijar los dos.
    assert client.put(f"/users/{victima_id}", json={"email": ajeno_email}).status_code == 409
    assert client.patch(f"/users/{victima_id}", json={"email": ajeno_email}).status_code == 409


def test_borrar_usuario_inexistente_da_404(client):
    assert client.delete(f"/users/{INEXISTENTE}").status_code == 404


def test_borrar_usuario_con_historial_da_409(client, evaluacion_temporal):
    """Las FK hacia evaluations/evaluation_submissions son RESTRICT a proposito:
    borrar en cascada destruiria el historico. Es conflicto de estado, no 500."""
    assert client.delete(f"/users/{evaluacion_temporal['evaluator_id']}").status_code == 409


# --- /categories ------------------------------------------------------------

def test_actualizar_categoria_inexistente_da_404(client):
    assert client.put(f"/categories/{INEXISTENTE}", json={"name": "No existe"}).status_code == 404


def test_renombrar_categoria_a_una_ya_existente_da_409(client):
    nombres = conn.execute(text("SELECT id, name FROM categories ORDER BY id LIMIT 2")).mappings().all()
    origen, destino = nombres[0], nombres[1]
    assert client.put(f"/categories/{origen['id']}", json={"name": destino["name"]}).status_code == 409
    assert client.patch(f"/categories/{origen['id']}", json={"name": destino["name"]}).status_code == 409


# --- /periods ---------------------------------------------------------------

def test_actualizar_periodo_inexistente_da_404(client):
    assert client.put(f"/periods/{INEXISTENTE}", json={"name": "No existe"}).status_code == 404
    assert client.patch(f"/periods/{INEXISTENTE}", json={"name": "No existe"}).status_code == 404


def test_borrar_periodo_inexistente_da_404(client):
    assert client.delete(f"/periods/{INEXISTENTE}").status_code == 404


def test_borrar_periodo_con_evaluaciones_da_409(client, evaluacion_temporal):
    assert client.delete(f"/periods/{evaluacion_temporal['period_id']}").status_code == 409


# --- /forms -----------------------------------------------------------------

def test_borrar_formulario_inexistente_da_404(client, periodo_cerrado):
    assert client.delete(f"/forms/{INEXISTENTE}").status_code == 404


def test_editar_o_borrar_formulario_vivo_con_periodo_activo_da_409(client):
    """Regla 6: el instrumento VIVO no se toca con un periodo abierto -- las
    respuestas ya enviadas quedarian atadas a preguntas o pesos distintos."""
    assert client.put(f"/forms/{TUTOR_FORM_ID}", json={"title": "No deberia"}).status_code == 409
    assert client.delete(f"/forms/{TUTOR_FORM_ID}").status_code == 409


# --- /questions -------------------------------------------------------------

def test_crear_pregunta_con_periodo_activo_da_409(client):
    general = conn.execute(text("SELECT id FROM categories WHERE name = 'General'")).scalar()
    response = client.post("/questions", json={
        "form_id": TUTOR_FORM_ID, "text": "No deberia crearse",
        "category_id": general, "input_type": "text", "weight_percent": 0,
    })
    assert response.status_code == 409


def test_borrar_pregunta_con_periodo_activo_da_409(client):
    pregunta = conn.execute(
        text("SELECT id FROM questions WHERE form_id = :f AND is_active = TRUE LIMIT 1"),
        {"f": TUTOR_FORM_ID},
    ).scalar()
    assert client.delete(f"/questions/{pregunta}").status_code == 409


def test_editar_texto_de_pregunta_inexistente_da_404(client, periodo_cerrado):
    response = client.patch(f"/questions/{INEXISTENTE}", json={"text": "Texto nuevo cualquiera", "confirm": True})
    assert response.status_code == 404


def test_editar_texto_de_pregunta_yes_no_da_400(client, periodo_cerrado):
    """Solo 'scale' y 'text' se versionan; 'yes_no' se rechaza con 400.

    Se crea la pregunta para no depender de que el seed traiga una de ese tipo.
    """
    general = conn.execute(text("SELECT id FROM categories WHERE name = 'General'")).scalar()
    creada = client.post("/questions", json={
        "form_id": TUTOR_FORM_ID, "text": "Pregunta si/no de pytest",
        "category_id": general, "input_type": "yes_no", "weight_percent": 0,
    })
    assert creada.status_code == 201
    qid = creada.json()["id"]
    try:
        response = client.patch(f"/questions/{qid}", json={"text": "Texto reformulado", "confirm": True})
        assert response.status_code == 400
    finally:
        conn.execute(text("DELETE FROM questions WHERE id = :id"), {"id": qid})
        conn.commit()


# --- /evaluations: los dos 403 -----------------------------------------------

def _coder_con_clan():
    return conn.execute(text("""
        SELECT u.id, u.clan_id FROM users u
        JOIN user_roles ur ON ur.user_id = u.id
        JOIN roles r ON r.id = ur.role_id
        WHERE r.name = 'coder' AND u.clan_id IS NOT NULL
        LIMIT 1
    """)).mappings().first()


def test_evaluar_a_alguien_que_no_es_evaluable_da_403(client, temp_period):
    """InvalidRoleException de `evaluation_exceptions` -> 403.

    OJO: la clase homonima de `form_exceptions` mapea a 422. Son clases
    distintas con el mismo nombre; este test fija el 403 de esta rama.
    """
    coder = _coder_con_clan()
    otro_coder = conn.execute(text("""
        SELECT u.id FROM users u
        JOIN user_roles ur ON ur.user_id = u.id
        JOIN roles r ON r.id = ur.role_id
        WHERE r.name = 'coder' AND u.id != :yo LIMIT 1
    """), {"yo": coder["id"]}).scalar()

    response = client.post("/evaluations", json={
        "evaluator_id": coder["id"], "evaluatee_id": otro_coder,
        "form_id": TUTOR_FORM_ID, "period_id": temp_period,
        "is_anonymous": False, "status": "submitted",
        "answers": [{"question_id": 1, "score": 5, "comment": None}],
    })
    assert response.status_code == 403


def test_evaluar_a_un_tutor_de_otro_clan_da_403(client, temp_period):
    """InvalidClanException -> 403. Es la regla de clan aplicada en el servidor."""
    coder = _coder_con_clan()
    tutor_ajeno = conn.execute(text("""
        SELECT u.id FROM users u
        JOIN user_roles ur ON ur.user_id = u.id
        JOIN roles r ON r.id = ur.role_id
        WHERE r.name = 'tutor' AND u.clan_id IS NOT NULL AND u.clan_id != :clan
        LIMIT 1
    """), {"clan": coder["clan_id"]}).scalar()
    if tutor_ajeno is None:
        pytest.skip("El seed no tiene tutores fuera del clan del coder")

    response = client.post("/evaluations", json={
        "evaluator_id": coder["id"], "evaluatee_id": tutor_ajeno,
        "form_id": TUTOR_FORM_ID, "period_id": temp_period,
        "is_anonymous": False, "status": "submitted",
        "answers": [{"question_id": 1, "score": 5, "comment": None}],
    })
    assert response.status_code == 403


# --- /metrics/ai-summary ----------------------------------------------------

def test_ai_summary_sin_comentarios_da_400(client):
    """InsufficientDataException -> 400: no hay nada que resumir.

    No llama a Gemini: el servicio corta antes, al no encontrar comentarios.
    """
    sin_feedback = conn.execute(text("""
        SELECT u.id FROM users u
        JOIN user_roles ur ON ur.user_id = u.id
        JOIN roles r ON r.id = ur.role_id
        WHERE r.name IN ('team_leader','tutor')
          AND u.id NOT IN (SELECT evaluatee_id FROM evaluations)
        LIMIT 1
    """)).scalar()
    if sin_feedback is None:
        pytest.skip("Todos los evaluables tienen evaluaciones en el seed")

    response = client.get(f"/metrics/ai-summary?evaluatee_id={sin_feedback}&period_id={SEED_ACTIVE_PERIOD_ID}")
    assert response.status_code == 400


def test_ai_summary_con_el_servicio_caido_da_503(client, monkeypatch):
    """AIServiceUnavailableException -> 503.

    Se fuerza el fallo en el servicio: sin esto el camino solo se ejercitaria
    con la API de Gemini realmente caida, que no es reproducible.
    """
    from app.services import ai_service as modulo_ai
    from app.exceptions.ai_exceptions import AIServiceUnavailableException

    def caido(*args, **kwargs):
        raise AIServiceUnavailableException("Servicio de IA no disponible")

    monkeypatch.setattr(modulo_ai.ai_service, "get_or_generate_ai_summary", caido)

    # Los ids no importan: el route llama al servicio de inmediato, sin validar
    # nada antes, y el parche lanza en cuanto entra.
    response = client.get(f"/metrics/ai-summary?evaluatee_id=1&period_id={SEED_ACTIVE_PERIOD_ID}")
    assert response.status_code == 503
