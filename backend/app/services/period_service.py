from sqlalchemy import select, insert, update, delete
from app.config.database import conn
from app.models.period import periods_table
from app.schemas.period import PeriodCreate, PeriodUpdate

def get_periods():
    """Obtiene todos los periodos usando consultas SQLAlchemy."""
    stmt = select(periods_table).order_by(periods_table.c.starts_at.desc())
    result = conn.execute(stmt)
    return [dict(row) for row in result.mappings()]

def get_period(period_id: int):
    """Obtiene un periodo por ID."""
    stmt = select(periods_table).where(periods_table.c.id == period_id)
    result = conn.execute(stmt).mappings().first()
    return dict(result) if result else None

def create_period(period: PeriodCreate):
    """Crea un periodo usando consultas SQLAlchemy."""
    stmt = insert(periods_table).values(
        name=period.name,
        starts_at=period.starts_at,
        ends_at=period.ends_at,
        is_active=period.is_active
    )
    result = conn.execute(stmt)
    conn.commit()
    return get_period(result.lastrowid)

def update_period(period_id: int, period: PeriodUpdate):
    """Actualiza un periodo usando consultas SQLAlchemy."""
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

    stmt = update(periods_table).where(periods_table.c.id == period_id).values(**values)
    conn.execute(stmt)
    conn.commit()
    return get_period(period_id)

def delete_period(period_id: int):
    """Elimina un periodo por ID."""
    period = get_period(period_id)
    if not period:
        return False
    stmt = delete(periods_table).where(periods_table.c.id == period_id)
    conn.execute(stmt)
    conn.commit()
    return True
