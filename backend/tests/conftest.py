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

# IDs de los usuarios semilla de database/schema.sql
CODER_ID = 1
TEAM_LEADER_ID = 2
TUTOR_ID = 3
ADMIN_ID = 4


@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def temp_period():
    """Crea un periodo de prueba y lo borra al final, para no tocar datos reales."""
    result = conn.execute(text("""
        INSERT INTO periods (name, starts_at, ends_at, is_active)
        VALUES ('TEST-pytest', '2030-01-01', '2030-02-01', FALSE)
    """))
    conn.commit()
    period_id = result.lastrowid

    yield period_id

    conn.execute(
        text("DELETE FROM evaluation_answers WHERE evaluation_id IN "
             "(SELECT id FROM evaluations WHERE period_id = :id)"),
        {"id": period_id}
    )
    conn.execute(text("DELETE FROM evaluations WHERE period_id = :id"), {"id": period_id})
    conn.execute(text("DELETE FROM periods WHERE id = :id"), {"id": period_id})
    conn.commit()
