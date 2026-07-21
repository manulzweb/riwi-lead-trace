"""
Fixtures compartidas para las pruebas.

Estas pruebas son de INTEGRACION: usan una base de datos MySQL real, no
mocks. Pero usan la base de datos de PRUEBAS (`backend/.env.test`), nunca la
que apunta `backend/.env`.

Por que existe esta separacion: antes `conftest.py` importaba la conexion de
`app.config.database` tal cual, que lee `.env`. Como ese `.env` apunta a la
BD compartida del equipo, correr `pytest` escribia en produccion -- y
`test_periods.py`, al activar su periodo temporal, disparaba
`deactivate_other_periods` y CERRABA el periodo activo real. Pasó de verdad.

Preparar el entorno (una sola vez):
    cp backend/.env.test.example backend/.env.test   # y ajusta DATABASE_URL
    cd backend && python tests/bootstrap_test_db.py
"""
# ---------------------------------------------------------------------------
# ORDEN CRITICO: esto va ANTES de importar nada de `app`.
#
# `app.config.config` instancia `Settings()` en tiempo de import, y
# `app.config.database` abre el engine con esa URL tambien en tiempo de
# import. Si `from app.main import app` corriera primero, la conexion ya
# estaria abierta contra la BD de `.env` y cambiar el entorno despues no
# serviria de nada.
#
# `load_dotenv(override=True)` escribe en os.environ, y pydantic-settings da
# precedencia a las variables de entorno sobre el `env_file`, asi que esto
# gana sobre `.env` sin tener que tocar `app/config/config.py`.
# ---------------------------------------------------------------------------
import os
from pathlib import Path
from urllib.parse import urlparse

import pytest
from dotenv import load_dotenv

_BACKEND_DIR = Path(__file__).resolve().parents[1]
_ENV_TEST = _BACKEND_DIR / ".env.test"

if not _ENV_TEST.exists():
    raise RuntimeError(
        f"Falta {_ENV_TEST}.\n"
        "Las pruebas NO corren contra la BD de desarrollo: necesitan su propia BD.\n"
        "  1) cp backend/.env.test.example backend/.env.test\n"
        "  2) ajusta DATABASE_URL (el nombre de la BD debe terminar en '_test')\n"
        "  3) cd backend && python tests/bootstrap_test_db.py"
    )

load_dotenv(_ENV_TEST, override=True)

# Guard: la ultima linea de defensa. Un `.env.test` mal copiado (apuntando a
# la BD real) haria que las pruebas borren datos de produccion en el teardown.
# Exigir el sufijo `_test` es una regla tonta a proposito: es imposible
# cumplirla por accidente apuntando a la BD equivocada.
_DB_NAME = urlparse(os.environ.get("DATABASE_URL", "").replace("mysql+pymysql://", "mysql://")).path.lstrip("/")

if not _DB_NAME.endswith("_test"):
    raise RuntimeError(
        f"ABORTADO: DATABASE_URL de las pruebas apunta a la BD '{_DB_NAME}', "
        f"que no termina en '_test'.\n"
        "Las pruebas insertan y BORRAN filas; correrlas contra una BD real "
        "destruye datos.\n"
        f"Revisa {_ENV_TEST}."
    )

# A partir de aqui ya es seguro importar la app: el engine se abrira contra
# la BD de pruebas.
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402

from app.main import app  # noqa: E402
from app.config.database import conn  # noqa: E402

# IDs de los usuarios semilla de database/02_dml.sql
ADMIN_ID = 1
TEAM_LEADER_ID = 2
TUTOR_ID = 5
CODER_ID = 8


@pytest.fixture
def client():
    return TestClient(app)


def _make_temp_period(is_active: bool):
    result = conn.execute(text("""
        INSERT INTO periods (name, starts_at, ends_at, is_active)
        VALUES ('TEST-pytest', '2030-01-01', '2030-02-01', :is_active)
    """), {"is_active": is_active})
    conn.commit()
    period_id = result.lastrowid

    yield period_id

    conn.execute(
        text("DELETE FROM evaluation_details WHERE evaluation_id IN "
             "(SELECT id FROM evaluations WHERE period_id = :id)"),
        {"id": period_id}
    )
    conn.execute(
        text("DELETE FROM evaluation_submissions WHERE evaluation_id IN "
             "(SELECT id FROM evaluations WHERE period_id = :id)"),
        {"id": period_id}
    )
    conn.execute(text("DELETE FROM evaluations WHERE period_id = :id"), {"id": period_id})
    conn.execute(text("DELETE FROM periods WHERE id = :id"), {"id": period_id})
    conn.commit()


@pytest.fixture
def temp_period():
    """Periodo de prueba ACTIVO (para probar reglas que requieren poder crear evaluaciones)."""
    yield from _make_temp_period(is_active=True)


@pytest.fixture
def temp_inactive_period():
    """Periodo de prueba CERRADO (para probar que el backend rechaza evaluaciones sin periodo activo)."""
    yield from _make_temp_period(is_active=False)
