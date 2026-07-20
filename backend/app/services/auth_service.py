from fastapi import HTTPException, status

from app.config.security import verify_password
from app.schemas.auth import LoginResponse
from app.schemas.user import UserOut
from app.services.user_service import get_user_by_email


def login(email: str, password: str) -> LoginResponse:
    user = get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="El correo no está registrado")
    
    if not verify_password(password, user["password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Contraseña incorrecta")
        
    if not user["is_active"]:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario inactivo")

    return LoginResponse(user=UserOut(**user))
