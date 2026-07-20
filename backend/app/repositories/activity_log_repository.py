import logging
from typing import List, Dict, Any, Optional
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.engine import Connection

logger = logging.getLogger(__name__)

class ActivityLogRepository:
    def insert_log(self, conn: Connection, log_data: Dict[str, Any]) -> None:
        try:
            query = text("""
                INSERT INTO admin_activity_log (admin_id, action, target_type, target_id, detail)
                VALUES (:admin_id, :action, :target_type, :target_id, :detail)
            """)
            conn.execute(query, log_data)
        except SQLAlchemyError as e:
            logger.error(f"Error inserting activity log: {e}")
            raise

    def get_recent_activity(self, conn: Connection, limit: int) -> List[Dict[str, Any]]:
        try:
            query = text("""
                SELECT l.id, l.admin_id, u.full_name AS admin_name, l.action,
                       l.target_type, l.target_id, l.detail, l.created_at
                FROM admin_activity_log l
                LEFT JOIN users u ON u.id = l.admin_id
                ORDER BY l.created_at DESC
                LIMIT :limit
            """)
            rows = conn.execute(query, {"limit": limit}).mappings().all()
            return [dict(r) for r in rows]
        except SQLAlchemyError as e:
            logger.error(f"Error fetching recent activity log: {e}")
            raise
