from fastapi import APIRouter, HTTPException, status
import logging
from app.schemas.auth import LoginRequest, LoginResponse
from app.services.auth_service import auth_service
from app.exceptions.auth_exceptions import (
    UserNotFoundAuthException, InvalidCredentialsException, InactiveUserException
)

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
    except UserNotFoundAuthException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except (InvalidCredentialsException, InactiveUserException) as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except Exception as e:
        logger.error(f"Error during login: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno")
