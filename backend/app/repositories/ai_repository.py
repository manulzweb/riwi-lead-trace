from typing import List, Optional, Tuple
from sqlalchemy import text
from sqlalchemy.engine import Connection

from app.repositories.base_repository import BaseRepository


class AIRepository(BaseRepository):
    def get_cached_summary(self, conn: Connection, evaluatee_id: int, period_id: int) -> Optional[str]:
        query = text("""
            SELECT summary FROM ai_feedback_cache
            WHERE evaluatee_id = :evaluatee_id AND period_id = :period_id
        """)
        return self.fetch_scalar(conn, query, {"evaluatee_id": evaluatee_id, "period_id": period_id})

    def get_anonymized_comments(self, conn: Connection, evaluatee_id: int, period_id: int) -> List[str]:
        query = text("""
            SELECT a.comment
            FROM evaluation_details a
            JOIN evaluations e ON a.evaluation_id = e.id
            JOIN questions q ON a.question_id = q.id
            WHERE e.evaluatee_id = :evaluatee_id
              AND e.period_id = :period_id
              AND e.status = 'submitted'
              AND q.input_type = 'text'
              AND a.comment IS NOT NULL
              AND a.comment != ''
        """)
        result = self.execute(conn, query, {"evaluatee_id": evaluatee_id, "period_id": period_id})
        return [row[0] for row in result.all()]

    def get_evaluatee_info(self, conn: Connection, evaluatee_id: int) -> Tuple[str, str]:
        query = text("SELECT name, roles FROM vw_users_with_roles WHERE id = :id")
        row = self.execute(conn, query, {"id": evaluatee_id}).first()
        return (row[0], row[1]) if row else ("Persona", "Rol")

    def get_period_name(self, conn: Connection, period_id: int) -> str:
        query = text("SELECT name FROM periods WHERE id = :id")
        return self.fetch_scalar(conn, query, {"id": period_id}) or "Periodo"

    def cache_summary(self, conn: Connection, evaluatee_id: int, period_id: int, summary: str, model: str) -> None:
        query = text("""
            INSERT INTO ai_feedback_cache (evaluatee_id, period_id, summary, model)
            VALUES (:evaluatee_id, :period_id, :summary, :model)
        """)
        self.execute(conn, query, {
            "evaluatee_id": evaluatee_id,
            "period_id": period_id,
            "summary": summary,
            "model": model
        })
