from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def health_check():
    """Endpoint de health check (L7) para validación del proxy inverso o load balancer."""
    return {"status": "ok"}
