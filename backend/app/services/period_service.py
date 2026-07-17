from sqlalchemy import text
from app.config.database import conn
from app.schemas.period import PeriodCreate, PeriodUpdate

def get_periods():
    """Obtiene todos los periodos, del mas reciente al mas viejo."""
    query = text("SELECT id, name, starts_at, ends_at, is_active FROM periods ORDER BY starts_at DESC")
    result = conn.execute(query)
    return [dict(row) for row in result.mappings()]

def get_period(period_id: int):
    """Obtiene un periodo por ID."""
    query = text("SELECT id, name, starts_at, ends_at, is_active FROM periods WHERE id = :id")
    result = conn.execute(query, {"id": period_id}).mappings().first()
    return dict(result) if result else None

def _deactivate_other_periods(period_id_to_keep):
    """Regla de negocio (ADMIN-01): solo puede haber un periodo activo a la vez.

    Se llama siempre ANTES de dejar un periodo en is_active=TRUE, dentro de
    la misma transaccion que ese insert/update, para que nunca quede un
    estado intermedio con dos periodos activos.
    """
    query = text("UPDATE periods SET is_active = FALSE WHERE id != :id AND is_active = TRUE")
    conn.execute(query, {"id": period_id_to_keep})

def create_period(period: PeriodCreate):
    """Crea un periodo nuevo."""
    query = text("""
        INSERT INTO periods (name, starts_at, ends_at, is_active)
        VALUES (:name, :starts_at, :ends_at, :is_active)
    """)
    result = conn.execute(query, {
        "name": period.name,
        "starts_at": period.starts_at,
        "ends_at": period.ends_at,
        "is_active": period.is_active
    })
    new_id = result.lastrowid
    if period.is_active:
        _deactivate_other_periods(new_id)
    conn.commit()
    return get_period(new_id)

def update_period(period_id: int, period: PeriodUpdate):
    """Actualiza solo los campos de periodo que vengan con valor."""
    values = {}
    if period.name is not None:
        values["name"] = period.name
    if period.starts_at is not None:
        values["starts_at"] = period.starts_at
    if period.ends_at is not None:
        values["ends_at"] = period.ends_at
    if period.is_active is not None:
        values["is_active"] = period.is_active

    if not values:
        return get_period(period_id)

    # values solo trae claves que nosotros mismos definimos arriba (nunca
    # nombres de columna que vengan del cliente), asi que armar el SET a
    # partir de sus claves es seguro.
    set_clause = ", ".join(f"{column} = :{column}" for column in values)
    query = text(f"UPDATE periods SET {set_clause} WHERE id = :id")
    conn.execute(query, {**values, "id": period_id})
    if values.get("is_active") is True:
        _deactivate_other_periods(period_id)
    conn.commit()
    return get_period(period_id)

def delete_period(period_id: int):
    """Elimina un periodo por ID."""
    period = get_period(period_id)
    if not period:
        return False
    query = text("DELETE FROM periods WHERE id = :id")
    conn.execute(query, {"id": period_id})
    conn.commit()
    return True
