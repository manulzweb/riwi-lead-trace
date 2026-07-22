import logging
from typing import List, Dict, Any, Optional
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.engine import Connection
from app.exceptions.period_exceptions import PeriodHasEvaluationsException
from app.repositories.base_repository import BaseRepository

logger = logging.getLogger(__name__)

class PeriodRepository(BaseRepository):
    def get_periods(self, conn: Connection) -> List[Dict[str, Any]]:
        query = text("SELECT id, name, starts_at, ends_at, is_active FROM periods ORDER BY starts_at DESC")
        return self.fetch_all(conn, query)

    def get_period_by_id(self, conn: Connection, period_id: int) -> Optional[Dict[str, Any]]:
        query = text("SELECT id, name, starts_at, ends_at, is_active FROM periods WHERE id = :id")
        return self.fetch_one(conn, query, {"id": period_id})

    def get_period_name(self, conn: Connection, period_id: int) -> Optional[str]:
        query = text("SELECT name FROM periods WHERE id = :id")
        return self.fetch_scalar(conn, query, {"id": period_id})

    def deactivate_other_periods(self, conn: Connection, period_id_to_keep: int) -> None:
        query = text("UPDATE periods SET is_active = FALSE WHERE id != :id AND is_active = TRUE")
        self.execute(conn, query, {"id": period_id_to_keep})

    def insert_period(self, conn: Connection, period_data: Dict[str, Any]) -> int:
        query = text("""
            INSERT INTO periods (name, starts_at, ends_at, is_active)
            VALUES (:name, :starts_at, :ends_at, :is_active)
        """)
        return self.execute(conn, query, period_data).lastrowid

    def update_period(self, conn: Connection, period_id: int, values: Dict[str, Any]) -> None:
        if not values:
            return
        set_clause = ", ".join(f"{col} = :{col}" for col in values)
        query = text(f"UPDATE periods SET {set_clause} WHERE id = :id")
        self.execute(conn, query, {**values, "id": period_id})

    def delete_period(self, conn: Connection, period_id: int) -> bool:
        query = text("DELETE FROM periods WHERE id = :id")
        try:
            return self.execute(conn, query, {"id": period_id}).rowcount > 0
        except IntegrityError:
            logger.warning("Periodo %s con evaluaciones, no se puede borrar", period_id)
            raise PeriodHasEvaluationsException("No se puede eliminar: ya existen evaluaciones registradas en este periodo.")
