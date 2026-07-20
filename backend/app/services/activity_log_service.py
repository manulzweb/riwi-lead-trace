from typing import List, Dict, Any, Optional
from sqlalchemy.engine import Connection
from app.config.database import engine
from app.repositories.activity_log_repository import ActivityLogRepository

class ActivityLogService:
    def __init__(self, repository: ActivityLogRepository = None):
        self.repo = repository or ActivityLogRepository()

    def log_action(self, conn: Connection, admin_id: Optional[int], action: str, target_type: str, target_id: Optional[int] = None, detail: Optional[str] = None) -> None:
        """Inserta una fila de bitacora usando la MISMA conexion/transaccion de la
        operacion que se esta registrando (conn.begin() del caller)."""
        log_data = {
            "admin_id": admin_id,
            "action": action,
            "target_type": target_type,
            "target_id": target_id,
            "detail": detail,
        }
        self.repo.insert_log(conn, log_data)

    def get_recent_activity(self, limit: int = 50) -> List[Dict[str, Any]]:
        with engine.connect() as conn:
            return self.repo.get_recent_activity(conn, limit)

activity_log_service = ActivityLogService()

def log_action(conn: Connection, admin_id: Optional[int], action: str, target_type: str, target_id: Optional[int] = None, detail: Optional[str] = None):
    activity_log_service.log_action(conn, admin_id, action, target_type, target_id, detail)

def get_recent_activity(limit: int = 50):
    return activity_log_service.get_recent_activity(limit)
