import logging
from typing import List, Optional, Tuple
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.engine import Connection

logger = logging.getLogger(__name__)

class AIRepository:
    def get_cached_summary(self, conn: Connection, evaluatee_id: int, period_id: int) -> Optional[str]:
        try:
            query = text("""
                SELECT summary FROM ai_feedback_cache
                WHERE evaluatee_id = :evaluatee_id AND period_id = :period_id
            """)
            return conn.execute(query, {"evaluatee_id": evaluatee_id, "period_id": period_id}).scalar()
        except SQLAlchemyError as e:
            logger.error(f"Error fetching cached AI summary: {e}")
            raise

    def get_anonymized_comments(self, conn: Connection, evaluatee_id: int, period_id: int) -> List[str]:
        try:
            query = text("""
                SELECT a.comment
                FROM detalles_evaluacion a
                JOIN evaluations e ON a.evaluation_id = e.id
                JOIN questions q ON a.question_id = q.id
                WHERE e.evaluatee_id = :evaluatee_id
                  AND e.period_id = :period_id
                  AND e.status = 'submitted'
                  AND q.input_type = 'text'
                  AND a.comment IS NOT NULL
                  AND a.comment != ''
            """)
            result = conn.execute(query, {"evaluatee_id": evaluatee_id, "period_id": period_id})
            return [row[0] for row in result.all()]
        except SQLAlchemyError as e:
            logger.error(f"Error fetching comments: {e}")
            raise

    def get_evaluatee_info(self, conn: Connection, evaluatee_id: int) -> Tuple[str, str]:
        try:
            query = text("SELECT name, roles FROM vw_users_with_roles WHERE id = :id")
            row = conn.execute(query, {"id": evaluatee_id}).first()
            return (row[0], row[1]) if row else ("Persona", "Rol")
        except SQLAlchemyError as e:
            logger.error(f"Error fetching evaluatee info: {e}")
            raise

    def get_period_name(self, conn: Connection, period_id: int) -> str:
        try:
            query = text("SELECT name FROM periods WHERE id = :id")
            return conn.execute(query, {"id": period_id}).scalar() or "Periodo"
        except SQLAlchemyError as e:
            logger.error(f"Error fetching period name: {e}")
            raise

    def cache_summary(self, conn: Connection, evaluatee_id: int, period_id: int, summary: str, model: str) -> None:
        try:
            query = text("""
                INSERT INTO ai_feedback_cache (evaluatee_id, period_id, summary, model)
                VALUES (:evaluatee_id, :period_id, :summary, :model)
            """)
            conn.execute(query, {
                "evaluatee_id": evaluatee_id,
                "period_id": period_id,
                "summary": summary,
                "model": model
            })
        except SQLAlchemyError as e:
            logger.error(f"Error caching AI summary: {e}")
            raise
