from fastapi import APIRouter

from app.schemas.auth import LoginRequest, LoginResponse
from app.services import auth_service

router = APIRouter()


@router.post("/auth/login", response_model=LoginResponse)
def login(credentials: LoginRequest):
    """Verifica credenciales contra el hash bcrypt de la base de datos. Retorna el payload del usuario (stateless). No implementa JWT."""
    return auth_service.login(credentials.email, credentials.password)
