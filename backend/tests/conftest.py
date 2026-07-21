"""
Fixtures compartidas para las pruebas.

Estas pruebas son de integracion: usan la misma base de datos MySQL local
que usa la app en desarrollo (la que apunta tu .env), no una base de datos
falsa ni mocks. Por eso cada fixture que crea datos tambien los borra al
terminar (yield + limpieza), para no dejar basura en tu BD local.

Requisitos para correrlas: MySQL corriendo y un .env valido (igual que
para levantar la app con uvicorn).
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.main import app
from app.config.database import conn

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
