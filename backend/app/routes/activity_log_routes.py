from datetime import date

from fastapi import APIRouter, Query
from fastapi.responses import Response

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


@router.get(
    "/activity-log/export",
    summary="Exporta la bitacora administrativa como CSV",
    response_description="Archivo CSV con las acciones registradas, mas reciente primero"
)
def export_activity_log():
    """Descarga de `admin_activity_log` en CSV. El armado del CSV vive en
    `activity_log_service`; aqui solo se envuelve en la respuesta HTTP."""
    csv_content = activity_log_service.export_activity_log_csv()
    filename = f"bitacora-auditoria-{date.today().isoformat()}.csv"
    # El BOM inicial hace que Excel abra el archivo como UTF-8 y no rompa los acentos.
    return Response(
        content=csv_content,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
