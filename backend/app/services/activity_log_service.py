import csv
import io
from typing import List, Dict, Any, Optional
from sqlalchemy.engine import Connection
from app.config.database import engine
from app.repositories.activity_log_repository import ActivityLogRepository

# Tope duro de filas exportadas: es la UNICA proteccion real contra que un export
# cargue una tabla enorme en memoria.
#
# OJO: la purga por `log_retention_days` (system_settings) NO esta implementada.
# Ese ajuste se persiste y se lee, pero no tiene ningun consumidor: nada borra
# nunca filas de la bitacora, asi que la tabla crece de forma indefinida y este
# tope SI se puede alcanzar. Al alcanzarlo el export se trunca en silencio a las
# 10000 filas mas recientes.
#
# La purga no se implementa aqui a proposito: borrar registros de auditoria de
# forma automatica es destructivo e irreversible, y es una decision del equipo.
EXPORT_MAX_ROWS = 10000

# Orden y encabezados del CSV. Se declara aparte para que el orden de columnas
# del archivo no dependa del orden en que el repositorio devuelva las claves.
_EXPORT_COLUMNS = [
    ("id", "id"),
    ("created_at", "fecha"),
    ("admin_id", "admin_id"),
    ("admin_name", "admin"),
    ("action", "accion"),
    ("target_type", "tipo_objetivo"),
    ("target_id", "id_objetivo"),
    ("detail", "detalle"),
]

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

    def export_activity_log_csv(self) -> str:
        """Serializa la bitacora a CSV (mas reciente primero). Reutiliza la
        misma query del repositorio que usa la vista de bitacora: la capa de
        datos no cambia, aqui solo se le da formato."""
        rows = self.get_recent_activity(EXPORT_MAX_ROWS)

        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow([header for _, header in _EXPORT_COLUMNS])
        for row in rows:
            writer.writerow([
                "" if row.get(key) is None else row.get(key)
                for key, _ in _EXPORT_COLUMNS
            ])
        return buffer.getvalue()

activity_log_service = ActivityLogService()

def log_action(conn: Connection, admin_id: Optional[int], action: str, target_type: str, target_id: Optional[int] = None, detail: Optional[str] = None):
    activity_log_service.log_action(conn, admin_id, action, target_type, target_id, detail)

def get_recent_activity(limit: int = 50):
    return activity_log_service.get_recent_activity(limit)

def export_activity_log_csv():
    return activity_log_service.export_activity_log_csv()
