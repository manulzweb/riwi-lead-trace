from fastapi import APIRouter, HTTPException, status
import logging
from app.schemas.auth import LoginRequest, LoginResponse
from app.services.auth_service import auth_service
from app.exceptions.base import ApplicationException

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post(
    "/auth/login", 
    response_model=LoginResponse,
    summary="Iniciar sesión",
    response_description="Datos del usuario autenticado",
    responses={
        401: {"description": "Credenciales inválidas o usuario inactivo"},
        404: {"description": "Usuario no encontrado"}
    }
)
def login(credentials: LoginRequest):
    """Verifica credenciales contra el hash bcrypt de la base de datos. Retorna el payload del usuario (stateless). No implementa JWT."""
    try:
        return auth_service.login(credentials.email, credentials.password)
    except ApplicationException:
        # Excepcion de dominio: la traduce el handler global leyendo su
        # http_status. El `raise` pelado es IMPRESCINDIBLE y va ANTES del
        # `except Exception`: sin el, el generico de abajo la capturaria y la
        # convertiria en 500 antes de que el handler llegue a verla.
        raise
    except Exception:
        logger.exception("Error during login")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno")
