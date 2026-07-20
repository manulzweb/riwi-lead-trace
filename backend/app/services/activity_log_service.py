from sqlalchemy import text
from app.config.database import engine


def log_action(conn, admin_id, action, target_type, target_id=None, detail=None):
    """Inserta una fila de bitacora usando la MISMA conexion/transaccion de la
    operacion que se esta registrando (conn.begin() del caller), para que el
    log quede consistente con el cambio real: si la operacion falla, no se
    graba el log tampoco. No abre su propia transaccion."""
    conn.execute(text("""
        INSERT INTO admin_activity_log (admin_id, action, target_type, target_id, detail)
        VALUES (:admin_id, :action, :target_type, :target_id, :detail)
    """), {
        "admin_id": admin_id,
        "action": action,
        "target_type": target_type,
        "target_id": target_id,
        "detail": detail,
    })


def get_recent_activity(limit: int = 50):
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT l.id, l.admin_id, u.full_name AS admin_name, l.action,
                   l.target_type, l.target_id, l.detail, l.created_at
            FROM admin_activity_log l
            LEFT JOIN users u ON u.id = l.admin_id
            ORDER BY l.created_at DESC
            LIMIT :limit
        """), {"limit": limit}).mappings().all()
        return [dict(row) for row in rows]
