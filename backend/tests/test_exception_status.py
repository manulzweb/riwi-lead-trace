"""Contrato de `http_status` y del handler global de excepciones.

## Cambio de fuente de verdad (paso 4 del plan)

ANTES de la migracion este archivo extraia con AST el mapeo excepcion->HTTP de
los `try/except` de `routes/` y lo comparaba contra el atributo de clase. Esa
fuente YA NO EXISTE: los routes delegan en el handler global y no declaran
codigos, asi que el analisis devolvia 0 mapeos y los 49 tests parametrizados
desaparecian en silencio -- pasando la suite sin probar nada.

No se borro esa verificacion para que la suite pasara. Se sustituyo por
comprobaciones EQUIVALENTES de comportamiento:

    Antes:  AST sobre routes            -> valida el mapeo escrito a mano
    Ahora:  tests/test_error_paths.py   -> valida el codigo HTTP real,
                                           de punta a punta, en los 49 caminos
            este archivo                -> valida el contrato de las clases y
                                           que el handler lea `http_status`

`test_error_paths.py` es ahora la autoridad sobre los codigos. Este archivo
cubre lo que aquel no puede ver: que el handler no decida por tipo, que ninguna
excepcion se quede fuera de la jerarquia y que los nombres duplicados
conserven codigos distintos.
"""
import asyncio
import importlib
import json
import pathlib
import re

import pytest

from app.exceptions.base import ApplicationException

RAIZ = pathlib.Path(__file__).resolve().parents[1]


def _todas_las_excepciones():
    """Las clases concretas (no las bases) de todos los modulos de excepciones."""
    encontradas = []
    for archivo in sorted((RAIZ / "app" / "exceptions").glob("*.py")):
        if archivo.stem in ("base", "__init__"):
            continue
        modulo = importlib.import_module(f"app.exceptions.{archivo.stem}")
        for nombre in dir(modulo):
            obj = getattr(modulo, nombre)
            if not (isinstance(obj, type) and issubclass(obj, ApplicationException)):
                continue
            if obj is ApplicationException:
                continue
            # las bases de modulo terminan en "Exception" a secas y heredan
            # directo de ApplicationException
            es_base = obj.__bases__ == (ApplicationException,)
            encontradas.append((archivo.stem, nombre, obj, es_base))
    return encontradas


EXCEPCIONES = _todas_las_excepciones()
CONCRETAS = [(m, n, o) for m, n, o, base in EXCEPCIONES if not base]
BASES = [(m, n, o) for m, n, o, base in EXCEPCIONES if base]


# --- El handler lee el atributo, no decide por tipo --------------------------

def test_el_handler_devuelve_el_http_status_de_la_excepcion():
    """La regla arquitectonica: el codigo pertenece a la clase.

    Se usa una excepcion INVENTADA con un codigo que no aparece en ningun
    route. Si el handler tuviera un `if isinstance(...)` en vez de leer el
    atributo, no sabria que responder y este test lo delataria.
    """
    from app.main import application_exception_handler

    class ExcepcionDePrueba(ApplicationException):
        http_status = 418

    respuesta = asyncio.run(application_exception_handler(None, ExcepcionDePrueba("soy una tetera")))
    assert respuesta.status_code == 418


def test_el_handler_conserva_el_formato_de_respuesta():
    """`{"detail": "<mensaje>"}` es lo que producia HTTPException en cada route.

    Cambiarlo romperia el contrato: el front lee `err.detail` (ver
    `api.service.js`) y varias vistas lo muestran tal cual al usuario.
    """
    from app.main import application_exception_handler

    class ExcepcionDePrueba(ApplicationException):
        http_status = 404

    respuesta = asyncio.run(application_exception_handler(None, ExcepcionDePrueba("Mensaje exacto")))
    assert json.loads(respuesta.body) == {"detail": "Mensaje exacto"}
    assert respuesta.headers["content-type"].startswith("application/json")


# --- Contrato de las clases -------------------------------------------------

@pytest.mark.parametrize("modulo,nombre,clase", CONCRETAS, ids=[f"{m}.{n}" for m, n, _ in CONCRETAS])
def test_cada_excepcion_declara_su_propio_http_status(modulo, nombre, clase):
    """Una excepcion concreta que herede el 500 de la base es una sin mapear.

    Es el reemplazo del antiguo chequeo contra los routes: ya no se puede
    comparar contra ellos, pero SI se puede exigir que ninguna clase se quede
    sin declarar su codigo. Sin esto, una excepcion nueva saldria como 500 y
    nadie se enteraria hasta produccion.
    """
    assert "http_status" in clase.__dict__, (
        f"{modulo}.{nombre} no declara http_status propio: heredaria "
        f"{clase.http_status} de su clase base"
    )
    assert 400 <= clase.http_status <= 599, (
        f"{modulo}.{nombre} declara http_status={clase.http_status}, "
        "que no es un codigo de error"
    )


def test_las_clases_base_se_quedan_en_500():
    """No se lanzan nunca: son agrupadores. Si una llegara al handler seria por
    una subclase nueva sin mapear, y 500 es la respuesta honesta -- un codigo
    inventado ocultaria el olvido."""
    for modulo, nombre, clase in BASES:
        assert clase.http_status == 500, f"{modulo}.{nombre} no deberia declarar codigo propio"


def test_todas_las_excepciones_heredan_de_ApplicationException():
    """El handler global esta registrado sobre ApplicationException: una
    excepcion fuera de esa jerarquia se escaparia y saldria como 500."""
    huerfanas = []
    for archivo in sorted((RAIZ / "app" / "exceptions").glob("*.py")):
        if archivo.stem in ("base", "__init__"):
            continue
        modulo = importlib.import_module(f"app.exceptions.{archivo.stem}")
        for nombre in dir(modulo):
            obj = getattr(modulo, nombre)
            if isinstance(obj, type) and issubclass(obj, Exception) and obj is not ApplicationException:
                if not issubclass(obj, ApplicationException):
                    huerfanas.append(f"{archivo.stem}.{nombre}")
    assert not huerfanas, f"Fuera de la jerarquia: {huerfanas}"


def test_el_nombre_duplicado_conserva_codigos_distintos():
    """El conflicto que bloqueaba una migracion "por nombre": dos clases
    distintas llamadas igual, con codigos distintos. Si alguien las unifica,
    este test se pone rojo."""
    from app.exceptions.form_exceptions import InvalidRoleException as InvalidRoleForm
    from app.exceptions.evaluation_exceptions import InvalidRoleException as InvalidRoleEval

    assert InvalidRoleForm is not InvalidRoleEval
    assert InvalidRoleForm.http_status == 422
    assert InvalidRoleEval.http_status == 403


# --- Guard de la NUEVA fuente de verdad -------------------------------------

def test_los_caminos_de_error_siguen_cubiertos_end_to_end():
    """Reemplaza a `test_se_encontro_el_mapeo`.

    Aquel comprobaba que el analisis AST encontrara handlers en los routes;
    esa fuente ya no existe. Su PROPOSITO -- que la verificacion no pase por
    vacio -- se conserva aqui, ahora sobre la fuente nueva: si alguien vaciara
    `test_error_paths.py`, la suite dejaria de cubrir los codigos HTTP y nadie
    lo notaria.
    """
    contenido = (RAIZ / "tests" / "test_error_paths.py").read_text(encoding="utf-8")
    aserciones = len(re.findall(r"status_code\s*==\s*\d{3}", contenido))
    assert aserciones >= 25, (
        f"test_error_paths.py solo tiene {aserciones} aserciones de status; "
        "es la fuente de verdad de los codigos HTTP y no puede vaciarse"
    )


def test_no_quedan_mapeos_manuales_en_los_routes():
    """Tras el paso 4 ningun route deberia traducir excepciones de dominio a
    mano. Los `except Exception` genericos SI siguen (son del paso 5)."""
    import ast

    manuales = []
    for archivo in sorted((RAIZ / "app" / "routes").glob("*.py")):
        arbol = ast.parse(archivo.read_text(encoding="utf-8"))
        for h in ast.walk(arbol):
            if not isinstance(h, ast.ExceptHandler) or h.type is None:
                continue
            tipos = (
                [ast.unparse(e) for e in h.type.elts]
                if isinstance(h.type, ast.Tuple)
                else [ast.unparse(h.type)]
            )
            for t in tipos:
                if t in ("Exception", "HTTPException", "ApplicationException"):
                    continue
                manuales.append(f"{archivo.name}:{h.lineno} except {t}")
    assert not manuales, f"Mapeos manuales que deberian haber migrado: {manuales}"
