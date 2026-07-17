"""
Regla de negocio ADMIN-01: solo puede haber un periodo activo a la vez.
Activar un periodo (por creacion o por PUT) debe desactivar cualquier otro
que estuviera activo.
"""
from sqlalchemy import text

from app.config.database import conn

SEED_ACTIVE_PERIOD_ID = 1  # '2026-T1' en database/schema.sql, is_active=TRUE


def test_activar_un_periodo_desactiva_los_demas(client, temp_period):
    try:
        # El periodo semilla (id=1) empieza activo.
        seed_antes = client.get(f"/periods/{SEED_ACTIVE_PERIOD_ID}").json()
        assert seed_antes["is_active"] is True

        # Activar el periodo de prueba (que arranca inactivo).
        response = client.put(f"/periods/{temp_period}", json={"is_active": True})
        assert response.status_code == 200
        assert response.json()["is_active"] is True

        # El periodo semilla debe haber quedado desactivado.
        seed_despues = client.get(f"/periods/{SEED_ACTIVE_PERIOD_ID}").json()
        assert seed_despues["is_active"] is False
    finally:
        # Dejar la BD de desarrollo como estaba (el periodo semilla activo).
        conn.execute(
            text("UPDATE periods SET is_active = TRUE WHERE id = :id"),
            {"id": SEED_ACTIVE_PERIOD_ID}
        )
        conn.commit()


def test_crear_periodo_activo_desactiva_los_demas(client):
    created_id = None
    try:
        response = client.post("/periods", json={
            "name": "TEST-nuevo-activo",
            "starts_at": "2031-01-01",
            "ends_at": "2031-02-01",
            "is_active": True
        })
        assert response.status_code == 201
        created_id = response.json()["id"]
        assert response.json()["is_active"] is True

        seed_despues = client.get(f"/periods/{SEED_ACTIVE_PERIOD_ID}").json()
        assert seed_despues["is_active"] is False
    finally:
        if created_id is not None:
            conn.execute(text("DELETE FROM periods WHERE id = :id"), {"id": created_id})
        conn.execute(
            text("UPDATE periods SET is_active = TRUE WHERE id = :id"),
            {"id": SEED_ACTIVE_PERIOD_ID}
        )
        conn.commit()


def test_actualizar_otro_campo_no_toca_el_periodo_activo(client, temp_period):
    """Un PUT que no toca is_active no debe desactivar nada de rebote."""
    response = client.put(f"/periods/{temp_period}", json={"name": "TEST-renombrado"})
    assert response.status_code == 200
    assert response.json()["name"] == "TEST-renombrado"

    seed = client.get(f"/periods/{SEED_ACTIVE_PERIOD_ID}").json()
    assert seed["is_active"] is True
