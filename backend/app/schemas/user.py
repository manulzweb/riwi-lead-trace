from pydantic import BaseModel, EmailStr
from typing import List, Optional

class UserBase(BaseModel):
    name: str
    email: EmailStr
    role_ids: List[int]
    clan_id: Optional[int] = None
    is_active: bool = True

class UserCreate(UserBase):
    password: str

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
