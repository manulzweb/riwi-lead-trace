from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from app.config.database import engine
from app.schemas.period import PeriodCreate, PeriodUpdate
from app.services import activity_log_service

def get_periods():
    with engine.connect() as conn:
        query = text("SELECT id, name, starts_at, ends_at, is_active FROM periods ORDER BY starts_at DESC")
        result = conn.execute(query)
        return [dict(row) for row in result.mappings()]

def get_period(period_id: int):
    with engine.connect() as conn:
        query = text("SELECT id, name, starts_at, ends_at, is_active FROM periods WHERE id = :id")
        result = conn.execute(query, {"id": period_id}).mappings().first()
        return dict(result) if result else None

def _deactivate_other_periods(conn, period_id_to_keep):
    query = text("UPDATE periods SET is_active = FALSE WHERE id != :id AND is_active = TRUE")
    conn.execute(query, {"id": period_id_to_keep})

def create_period(period: PeriodCreate):
    with engine.begin() as conn:
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
            _deactivate_other_periods(conn, new_id)
            
    return get_period(new_id)

def update_period(period_id: int, period: PeriodUpdate):
    admin_id = period.admin_id
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

    with engine.begin() as conn:
        set_clause = ", ".join(f"{column} = :{column}" for column in values)
        query = text(f"UPDATE periods SET {set_clause} WHERE id = :id")
        conn.execute(query, {**values, "id": period_id})
        if values.get("is_active") is True:
            _deactivate_other_periods(conn, period_id)

        if "is_active" in values:
            period_name = values.get("name")
            if period_name is None:
                period_name = conn.execute(
                    text("SELECT name FROM periods WHERE id = :id"), {"id": period_id}
                ).scalar()
            activity_log_service.log_action(
                conn, admin_id,
                action="period_opened" if values["is_active"] else "period_closed",
                target_type="period",
                target_id=period_id,
                detail=period_name,
            )

    return get_period(period_id)

def delete_period(period_id: int):
    with engine.begin() as conn:
        try:
            query = text("DELETE FROM periods WHERE id = :id")
            result = conn.execute(query, {"id": period_id})
        except IntegrityError:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="No se puede eliminar: ya existen evaluaciones registradas en este periodo."
            )
        if result.rowcount == 0:
            return False
    return True
