from pydantic import BaseModel, EmailStr, Field

from app.schemas.user import UserOut

class LoginRequest(BaseModel):
    email: EmailStr = Field(
        title="Correo",
        description="Correo registrado del usuario",
        examples=["juan.perez@riwi.io"]
    )
    password: str = Field(
        title="Contraseña",
        description="Contraseña en texto plano",
        examples=["SecurePass123!"]
    )

class LoginResponse(BaseModel):
    user: UserOut