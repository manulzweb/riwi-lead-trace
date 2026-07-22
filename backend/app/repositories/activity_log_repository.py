from typing import List, Dict, Any
from sqlalchemy import text
from sqlalchemy.engine import Connection

from app.repositories.base_repository import BaseRepository


class ActivityLogRepository(BaseRepository):
    def insert_log(self, conn: Connection, log_data: Dict[str, Any]) -> None:
        query = text("""
            INSERT INTO admin_activity_log (admin_id, action, target_type, target_id, detail)
            VALUES (:admin_id, :action, :target_type, :target_id, :detail)
        """)
        self.execute(conn, query, log_data)

    def get_recent_activity(self, conn: Connection, limit: int) -> List[Dict[str, Any]]:
        query = text("""
            SELECT l.id, l.admin_id, u.full_name AS admin_name, l.action,
                   l.target_type, l.target_id, l.detail, l.created_at
            FROM admin_activity_log l
            LEFT JOIN users u ON u.id = l.admin_id
            ORDER BY l.created_at DESC
            LIMIT :limit
        """)
        return self.fetch_all(conn, query, {"limit": limit})
