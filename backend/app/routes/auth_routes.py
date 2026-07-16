from fastapi import APIRouter

from app.schemas.auth import LoginRequest, LoginResponse
from app.services import auth_service

router = APIRouter()


@router.post("/auth/login", response_model=LoginResponse)
def login(credentials: LoginRequest):
    """Autentica al usuario y devuelve un JWT."""
    return auth_service.login(credentials.email, credentials.password)
