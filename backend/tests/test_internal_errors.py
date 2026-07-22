"""Errores INESPERADOS (500): contrato de respuesta y no filtracion.

Cubre el hueco que hacia arriesgado el paso 5: los 49 caminos de error de
NEGOCIO estaban probados (`test_error_paths.py`), pero ningun test tocaba los
500. Se podian eliminar los `except Exception` de los routers y la suite
pasaria igual aunque la respuesta cambiara de forma o filtrara el mensaje
interno.

## Que se afirma aqui y por que

Estos tests fijan solo lo que debe ser CIERTO ANTES Y DESPUES de retirar los
`except Exception`:

  - el status es 500
  - el cuerpo es JSON con `detail`
  - el mensaje interno de la excepcion NO aparece en la respuesta

Deliberadamente NO se afirma el texto exacto de `detail` ni la presencia de
`error_id`: hoy cada router devuelve su propio mensaje ("Error interno al
consultar formularios") y al centralizar pasara al generico del handler con
`error_id`. Fijar eso ahora obligaria a reescribir los tests en el mismo commit
que hace el cambio, que es justo cuando menos se quiere tocar la red.
Las aserciones de `error_id` se anaden cuando el cambio este hecho.

## raise_server_exceptions=False

TestClient RE-LANZA por defecto las excepciones del servidor en vez de
devolver la respuesta del handler. Sin este flag, en cuanto los routers dejen
de capturar, estos tests explotarian con la excepcion original en vez de
comprobar el 500. Es el flag que hace que la prueba siga siendo valida a ambos
lados de la migracion.
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app

# Texto que solo existe dentro de la excepcion simulada. Si aparece en la
# respuesta HTTP es que el backend esta filtrando detalle interno al cliente.
FUGA = "detalle-interno-que-no-debe-salir-al-cliente"


@pytest.fixture
def client_500():
    """Cliente que DEVUELVE la respuesta de error en vez de re-lanzarla."""
    return TestClient(app, raise_server_exceptions=False)


def _reventar(*args, **kwargs):
    """Fallo inesperado: una excepcion cualquiera, NO de dominio.

    Se usa RuntimeError a proposito: no hereda de ApplicationException, asi que
    recorre el mismo camino que un bug real o una caida de la BD.
    """
    raise RuntimeError(FUGA)


# (nombre, modulo del servicio, atributo del singleton, metodo, verbo, url)
CASOS = [
    ("category",   "app.services.category_service",   "category_service",   "get_categories",              "get",  "/categories"),
    ("user",       "app.services.user_service",       "user_service",       "get_users",                   "get",  "/users"),
    ("form",       "app.services.form_service",       "form_service",       "get_forms",                   "get",  "/forms"),
    ("question",   "app.services.question_service",   "question_service",   "get_questions_by_form",       "get",  "/questions?form_id=1"),
    ("evaluation", "app.services.evaluation_service", "evaluation_service", "get_evaluations_by_evaluator","get",  "/evaluations?evaluator_id=1"),
    ("period",     "app.services.period_service",     "period_service",     "get_periods",                 "get",  "/periods"),
    ("metrics",    "app.services.metrics_service",    "metrics_service",    "get_metrics_summary",         "get",  "/metrics/summary?period_id=1"),
]


@pytest.mark.parametrize("nombre,modulo,singleton,metodo,verbo,url", CASOS, ids=[c[0] for c in CASOS])
def test_un_fallo_inesperado_responde_500_sin_filtrar(nombre, modulo, singleton, metodo, verbo, url, client_500, monkeypatch):
    import importlib
    servicio = getattr(importlib.import_module(modulo), singleton)
    monkeypatch.setattr(servicio, metodo, _reventar)

    respuesta = getattr(client_500, verbo)(url)

    assert respuesta.status_code == 500, f"{nombre}: se esperaba 500"
    cuerpo = respuesta.json()
    assert "detail" in cuerpo, f"{nombre}: la respuesta debe llevar 'detail'"
    assert FUGA not in respuesta.text, (
        f"{nombre}: el mensaje interno de la excepcion se filtro al cliente"
    )
    # error_id: lo unico que permite correlacionar el reporte de un usuario
    # con la linea exacta del log. Antes de centralizar no existia, porque cada
    # router devolvia su propio HTTPException(500) sin pasar por el handler.
    assert "error_id" in cuerpo, f"{nombre}: falta error_id para poder rastrear el fallo"
    assert len(cuerpo["error_id"]) == 36, f"{nombre}: error_id no parece un UUID"


def test_login_con_fallo_inesperado_responde_500_sin_filtrar(client_500, monkeypatch):
    """auth va aparte: es POST y necesita cuerpo."""
    from app.services.auth_service import auth_service
    monkeypatch.setattr(auth_service, "login", _reventar)

    respuesta = client_500.post("/auth/login", json={"email": "admin@riwi.io", "password": "x"})

    assert respuesta.status_code == 500
    assert "detail" in respuesta.json()
    assert "error_id" in respuesta.json()
    assert FUGA not in respuesta.text


def test_cada_error_500_lleva_un_error_id_distinto(client_500, monkeypatch):
    """Dos fallos distintos no pueden compartir id: seria imposible saber a
    cual de los dos reportes corresponde una linea del log."""
    from app.services.category_service import category_service
    monkeypatch.setattr(category_service, "get_categories", _reventar)

    primero = client_500.get("/categories").json()["error_id"]
    segundo = client_500.get("/categories").json()["error_id"]
    assert primero != segundo


def test_la_respuesta_500_no_expone_traceback_ni_sql(client_500, monkeypatch):
    """El handler global NO debe devolver diagnostico al cliente.

    Antes existia un `error_hint: str(exc)` que en un error de SQLAlchemy
    filtraba la query completa. Se retiro, y este test impide que vuelva.
    """
    from app.services.category_service import category_service

    def reventar_como_sqlalchemy(*a, **k):
        raise RuntimeError('(pymysql.err.OperationalError) SELECT id, name FROM categories')

    monkeypatch.setattr(category_service, "get_categories", reventar_como_sqlalchemy)
    respuesta = client_500.get("/categories")

    assert respuesta.status_code == 500
    texto = respuesta.text.lower()
    for prohibido in ("select", "traceback", "pymysql", "file \"", "line "):
        assert prohibido not in texto, f"La respuesta 500 filtra '{prohibido}'"


def test_una_excepcion_de_dominio_no_se_confunde_con_un_500(client_500, monkeypatch):
    """Frontera entre los dos handlers: una ApplicationException debe salir con
    SU codigo, no como 500. Es lo que se rompe si un `except Exception` la
    captura antes de que llegue al handler global."""
    from app.services.category_service import category_service
    from app.exceptions.category_exceptions import CategoryNotFoundException

    def no_encontrada(*a, **k):
        raise CategoryNotFoundException("Categoria no encontrada.")

    monkeypatch.setattr(category_service, "get_categories", no_encontrada)
    respuesta = client_500.get("/categories")

    assert respuesta.status_code == 404, (
        "Una excepcion de dominio salio como 500: algun `except Exception` la "
        "esta capturando antes del handler global"
    )
    assert respuesta.json()["detail"] == "Categoria no encontrada."
