from pydantic import BaseModel, EmailStr
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field

class UserBase(BaseModel):
    name: str = Field(
        title="Nombre del Usuario",
        description="Nombre completo del usuario",
        examples=["Juan Pérez"]
    )
    email: EmailStr = Field(
        title="Correo Electrónico",
        description="Correo institucional o personal del usuario",
        examples=["juan.perez@riwi.io"]
    )
    role_ids: List[int] = Field(
        title="IDs de Roles",
        description="Lista de IDs numéricos de los roles asignados al usuario",
        examples=[[1, 2]]
    )
    clan_id: Optional[int] = Field(
        default=None,
        title="ID del Clan",
        description="ID del clan al que pertenece el usuario (si aplica)",
        examples=[3]
    )
    is_active: bool = Field(
        default=True,
        title="Está Activo",
        description="Indica si el usuario tiene acceso al sistema",
        examples=[True]
    )

class UserCreate(UserBase):
    password: str = Field(
        title="Contraseña",
        description="Contraseña en texto plano (será encriptada por el backend)",
        examples=["SecurePass123!"]
    )

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role_ids: Optional[List[int]] = None
    clan_id: Optional[int] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

class UserOut(BaseModel):
    id: str
    name: str
    email: str
    roles: List[str]
    clan_id: Optional[int] = None
    is_active: bool

    class Config:
        from_attributes = True
