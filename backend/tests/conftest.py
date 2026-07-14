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
from app.config.security import create_access_token

# IDs de los usuarios semilla de database/schema.sql (coder@riwi.edu, admin@riwi.edu)
CODER_ID = 1
ADMIN_ID = 4


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def coder_headers():
    token = create_access_token({"sub": str(CODER_ID), "role": "coder"})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_headers():
    token = create_access_token({"sub": str(ADMIN_ID), "role": "admin"})
    return {"Authorization": f"Bearer {token}"}


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
