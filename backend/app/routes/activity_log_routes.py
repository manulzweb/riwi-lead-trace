from fastapi import APIRouter, Query
from app.services import activity_log_service

router = APIRouter()


@router.get(
    "/activity-log",
    summary="Bitacora de acciones administrativas",
    response_description="Ultimas acciones registradas (abrir/cerrar periodo, editar preguntas, borrar categorias)"
)
def get_activity_log(limit: int = Query(50, ge=1, le=200)):
    """Lectura simple de `admin_activity_log`, mas reciente primero. Ver CLAUDE.md
    seccion 'Roles del sistema': admin_id es el que manda el propio front, no
    hay verificacion criptografica de sesion (no hay JWT en este MVP)."""
    return activity_log_service.get_recent_activity(limit)
