from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def health_check():
    """Ruta de salud para verificar si el backend está activo."""
    return {"status": "ok"}
