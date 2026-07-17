from fastapi import HTTPException, status

from app.config.security import verify_password
from app.schemas.auth import LoginResponse
from app.schemas.user import UserOut
from app.services.user_service import get_user_by_email


def login(email: str, password: str) -> LoginResponse:
    user = get_user_by_email(email)
    if not user or not verify_password(password, user["password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales invalidas")
    if not user["is_active"]:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario inactivo")

    return LoginResponse(user=UserOut(**user))
