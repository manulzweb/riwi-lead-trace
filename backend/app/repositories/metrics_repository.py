import logging
from typing import List, Dict, Any, Optional
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.engine import Connection

logger = logging.getLogger(__name__)

class MetricsRepository:
    def get_total_evaluations(self, conn: Connection, period_id: int) -> int:
        try:
            query = text("SELECT COUNT(DISTINCT id) FROM evaluations WHERE period_id = :period_id AND status = 'submitted'")
            return conn.execute(query, {"period_id": period_id}).scalar() or 0
        except SQLAlchemyError as e:
            logger.error(f"Error getting total evaluations for period {period_id}: {e}")
            raise

    def get_total_active_coders(self, conn: Connection) -> int:
        try:
            query = text("""
                SELECT COUNT(DISTINCT u.id) 
                FROM users u 
                JOIN user_roles ur ON u.id = ur.user_id 
                JOIN roles r ON ur.role_id = r.id
                WHERE r.name = 'coder' AND u.is_active = TRUE
            """)
            return conn.execute(query).scalar() or 0
        except SQLAlchemyError as e:
            logger.error(f"Error getting total coders: {e}")
            raise

    def get_evaluatees_with_metrics(self, conn: Connection, period_id: int) -> List[Dict[str, Any]]:
        try:
            # We use the new views to resolve all complexity in a single query
            query = text("""
                SELECT 
                    e.id, 
                    e.name, 
                    e.email, 
                    e.role, 
                    e.clan_name,
                    m.average_score,
                    COALESCE(m.n_evals, 0) as n_evals
                FROM vw_evaluatees_summary e
                LEFT JOIN vw_period_metrics m 
                       ON e.id = m.evaluatee_id AND m.period_id = :period_id
            """)
            rows = conn.execute(query, {"period_id": period_id}).mappings().all()
            return [dict(r) for r in rows]
        except SQLAlchemyError as e:
            logger.error(f"Error fetching evaluatees metrics for period {period_id}: {e}")
            raise

    def get_score_history_for_user(self, conn: Connection, evaluatee_id: int) -> List[Dict[str, Any]]:
        try:
            query = text("""
                SELECT 
                    p.id as period_id, 
                    p.name as period_name, 
                    p.starts_at, 
                    m.average_score
                FROM vw_period_metrics m
                JOIN periods p ON m.period_id = p.id
                WHERE m.evaluatee_id = :evaluatee_id
                ORDER BY p.starts_at ASC
            """)
            rows = conn.execute(query, {"evaluatee_id": evaluatee_id}).mappings().all()
            return [dict(r) for r in rows]
        except SQLAlchemyError as e:
            logger.error(f"Error fetching score history for user {evaluatee_id}: {e}")
            raise
