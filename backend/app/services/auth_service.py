from app.config.security import verify_password
from app.schemas.auth import LoginResponse
from app.schemas.user import UserOut
from app.services.user_service import user_service
from app.exceptions.auth_exceptions import (
    UserNotFoundAuthException, InvalidCredentialsException, InactiveUserException
)

class AuthService:
    def login(self, email: str, password: str) -> LoginResponse:
        user = user_service.get_user_by_email(email)
        
        if not user:
            raise UserNotFoundAuthException("El correo no está registrado")
        
        if not verify_password(password, user["password"]):
            raise InvalidCredentialsException("Contraseña incorrecta")
            
        if not user["is_active"]:
            raise InactiveUserException("Usuario inactivo")

        return LoginResponse(user=UserOut(**user))

auth_service = AuthService()
