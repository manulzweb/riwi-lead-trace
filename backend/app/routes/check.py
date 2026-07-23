from fastapi import APIRouter

router = APIRouter()

@router.get(
    "/",
    summary="Health Check del servidor",
    description="Endpoint de diagnóstico L7 para validación de disponibilidad del servidor web por parte del proxy inverso o balanceador de carga.",
    response_description="Objeto JSON confirmando estado activo {'status': 'ok'}"
)
def health_check():
    """Endpoint de health check (L7) para validación del proxy inverso o Load Balancer."""
    return {"status": "ok"}
