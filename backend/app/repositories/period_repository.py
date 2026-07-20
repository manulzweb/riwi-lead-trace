import logging
from typing import List, Dict, Any, Optional
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from sqlalchemy.engine import Connection
from app.exceptions.period_exceptions import PeriodHasEvaluationsException

logger = logging.getLogger(__name__)

class PeriodRepository:
    def get_periods(self, conn: Connection) -> List[Dict[str, Any]]:
        try:
            query = text("SELECT id, name, starts_at, ends_at, is_active FROM periods ORDER BY starts_at DESC")
            rows = conn.execute(query).mappings().all()
            return [dict(r) for r in rows]
        except SQLAlchemyError as e:
            logger.error(f"Error fetching periods: {e}")
            raise

    def get_period_by_id(self, conn: Connection, period_id: int) -> Optional[Dict[str, Any]]:
        try:
            query = text("SELECT id, name, starts_at, ends_at, is_active FROM periods WHERE id = :id")
            row = conn.execute(query, {"id": period_id}).mappings().first()
            return dict(row) if row else None
        except SQLAlchemyError as e:
            logger.error(f"Error fetching period {period_id}: {e}")
            raise

    def get_period_name(self, conn: Connection, period_id: int) -> Optional[str]:
        try:
            query = text("SELECT name FROM periods WHERE id = :id")
            return conn.execute(query, {"id": period_id}).scalar()
        except SQLAlchemyError as e:
            logger.error(f"Error fetching period name for {period_id}: {e}")
            raise

    def deactivate_other_periods(self, conn: Connection, period_id_to_keep: int) -> None:
        try:
            query = text("UPDATE periods SET is_active = FALSE WHERE id != :id AND is_active = TRUE")
            conn.execute(query, {"id": period_id_to_keep})
        except SQLAlchemyError as e:
            logger.error(f"Error deactivating other periods: {e}")
            raise

    def insert_period(self, conn: Connection, period_data: Dict[str, Any]) -> int:
        try:
            query = text("""
                INSERT INTO periods (name, starts_at, ends_at, is_active)
                VALUES (:name, :starts_at, :ends_at, :is_active)
            """)
            result = conn.execute(query, period_data)
            return result.lastrowid
        except SQLAlchemyError as e:
            logger.error(f"Error inserting period: {e}")
            raise

    def update_period(self, conn: Connection, period_id: int, values: Dict[str, Any]) -> None:
        if not values:
            return
        try:
            set_clause = ", ".join(f"{col} = :{col}" for col in values)
            query = text(f"UPDATE periods SET {set_clause} WHERE id = :id")
            conn.execute(query, {**values, "id": period_id})
        except SQLAlchemyError as e:
            logger.error(f"Error updating period {period_id}: {e}")
            raise

    def delete_period(self, conn: Connection, period_id: int) -> bool:
        try:
            query = text("DELETE FROM periods WHERE id = :id")
            result = conn.execute(query, {"id": period_id})
            return result.rowcount > 0
        except IntegrityError:
            logger.warning(f"IntegrityError deleting period {period_id}")
            raise PeriodHasEvaluationsException("No se puede eliminar: ya existen evaluaciones registradas en este periodo.")
        except SQLAlchemyError as e:
            logger.error(f"Error deleting period {period_id}: {e}")
            raise
