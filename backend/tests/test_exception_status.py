"""`http_status` de cada excepcion == el codigo que el route le asigna hoy.

Paso 2 del plan (`docs/superpowers/specs/2026-07-22-exception-handlers-plan.md`).

Este test es la RED DE SEGURIDAD del paso 2, y por eso no compara contra una
tabla escrita a mano: extrae el mapeo REAL de `app/routes/` con AST y lo
contrasta con el atributo de clase. Una tabla copiada a mano solo probaria que
copie dos veces lo mismo.

Para que sirve: mientras los routes sigan traduciendo a mano, este test detecta
cualquier divergencia. Cuando se haga el paso 4 (handler global y routes
vacios), el test se queda sin fuente que leer -- ver la nota al final del
archivo sobre que hacer entonces.
"""
import ast
import importlib
import pathlib
import re

import pytest

from app.exceptions.base import ApplicationException

RAIZ_APP = pathlib.Path(__file__).resolve().parents[1] / "app"


def _mapeo_real_de_los_routes():
    """[(modulo_excepcion, clase, codigo)] tal como lo asignan los routes."""
    encontrados = []
    for archivo in sorted((RAIZ_APP / "routes").glob("*.py")):
        arbol = ast.parse(archivo.read_text(encoding="utf-8"))

        # De que modulo viene cada excepcion importada: hay CINCO nombres
        # duplicados entre modulos, asi que el nombre solo no identifica la clase.
        origen = {}
        for nodo in ast.walk(arbol):
            if isinstance(nodo, ast.ImportFrom) and nodo.module and "exceptions" in nodo.module:
                for alias in nodo.names:
                    origen[alias.name] = nodo.module

        for handler in ast.walk(arbol):
            if not isinstance(handler, ast.ExceptHandler) or handler.type is None:
                continue
            tipos = (
                [ast.unparse(e) for e in handler.type.elts]
                if isinstance(handler.type, ast.Tuple)
                else [ast.unparse(handler.type)]
            )
            cuerpo = " ".join(ast.unparse(s) for s in handler.body)
            codigo = re.search(r"HTTP_(\d{3})", cuerpo)
            if not codigo:
                continue
            for nombre in tipos:
                if nombre in ("Exception", "HTTPException"):
                    continue
                if nombre in origen:
                    encontrados.append((origen[nombre], nombre, int(codigo.group(1))))
    return encontrados


MAPEO_REAL = _mapeo_real_de_los_routes()


def test_se_encontro_el_mapeo():
    """Guard del propio analisis: si el AST dejara de encontrar handlers, los
    tests de abajo pasarian por vacio y no probarian nada."""
    assert len(MAPEO_REAL) >= 45, f"Solo se extrajeron {len(MAPEO_REAL)} mapeos; se esperaban ~49"


@pytest.mark.parametrize("modulo,clase,codigo_del_route", MAPEO_REAL)
def test_http_status_coincide_con_el_route(modulo, clase, codigo_del_route):
    excepcion = getattr(importlib.import_module(modulo), clase)
    assert excepcion.http_status == codigo_del_route, (
        f"{modulo}.{clase} declara http_status={excepcion.http_status} "
        f"pero el route responde {codigo_del_route}"
    )


def test_todas_las_excepciones_heredan_de_ApplicationException():
    """El handler global del paso 4 se registrara sobre ApplicationException:
    una excepcion fuera de esa jerarquia se escaparia y saldria como 500."""
    huerfanas = []
    for archivo in sorted((RAIZ_APP / "exceptions").glob("*.py")):
        if archivo.stem in ("base", "__init__"):
            continue
        modulo = importlib.import_module(f"app.exceptions.{archivo.stem}")
        for nombre in dir(modulo):
            obj = getattr(modulo, nombre)
            if isinstance(obj, type) and issubclass(obj, Exception) and obj is not ApplicationException:
                if not issubclass(obj, ApplicationException):
                    huerfanas.append(f"{archivo.stem}.{nombre}")
    assert not huerfanas, f"Fuera de la jerarquia: {huerfanas}"


def test_las_clases_base_se_quedan_en_500():
    """No se lanzan nunca directamente: son agrupadores. Si una llegara a un
    handler seria por una subclase nueva sin mapear, y 500 es la respuesta
    honesta -- un codigo inventado ocultaria el olvido."""
    from app.exceptions.form_exceptions import FormException
    from app.exceptions.user_exceptions import UserException
    from app.exceptions.evaluation_exceptions import EvaluationException

    for base in (FormException, UserException, EvaluationException):
        assert base.http_status == 500


def test_el_nombre_duplicado_conserva_codigos_distintos():
    """El conflicto que bloquea una migracion "por nombre": dos clases
    distintas llamadas igual, con codigos distintos. Si alguien las unifica al
    hacer el paso 4, este test se pone rojo."""
    from app.exceptions.form_exceptions import InvalidRoleException as InvalidRoleForm
    from app.exceptions.evaluation_exceptions import InvalidRoleException as InvalidRoleEval

    assert InvalidRoleForm is not InvalidRoleEval
    assert InvalidRoleForm.http_status == 422
    assert InvalidRoleEval.http_status == 403


# NOTA PARA EL PASO 4
# -------------------
# Al vaciar los routes, `_mapeo_real_de_los_routes()` devolvera menos entradas y
# `test_se_encontro_el_mapeo` fallara. Es intencional: obliga a no borrar esta
# verificacion por descuido. En ese momento la fuente de verdad pasa a ser
# `tests/test_error_paths.py`, que comprueba los codigos por HTTP de punta a
# punta y no depende de como esten escritos los routes.
