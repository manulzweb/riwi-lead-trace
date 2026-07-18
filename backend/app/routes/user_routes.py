from fastapi import APIRouter, HTTPException, Query, status
from typing import List, Optional
from app.schemas.user import UserCreate, UserUpdate, UserOut
from app.services import user_service

router = APIRouter()

@router.get("/users", response_model=List[UserOut])
def get_users(role: Optional[str] = Query(None, description="Filtrar por rol (ej. team_leader, tutor)")):
    """Obtiene los usuarios, opcionalmente filtrados por rol (ej. para elegir a quién evaluar)."""
    return user_service.get_users(role)

@router.get("/evaluables", response_model=List[UserOut])
def get_evaluables():
    """Obtiene la lista de Team Leaders y Tutores evaluables."""
    return user_service.get_evaluables()

@router.get("/users/{user_id}", response_model=UserOut)
def get_user(user_id: int):
    """Obtiene un usuario por ID."""
    user = user_service.get_user(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    return user

@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(user: UserCreate):
    """Crea un nuevo usuario (solo Admin)."""
    return user_service.create_user(user)

@router.put("/users/{user_id}", response_model=UserOut)
def update_user(user_id: int, user: UserUpdate):
    """Actualiza un usuario por ID (solo Admin)."""
    updated = user_service.update_user(user_id, user)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    return updated

@router.patch("/users/{user_id}", response_model=UserOut)
def patch_user(user_id: int, user: UserUpdate):
    """Actualiza parcialmente un usuario por ID (solo Admin)."""
    updated = user_service.update_user(user_id, user)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    return updated

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int):
    """Elimina un usuario por ID (solo Admin)."""
    deleted = user_service.delete_user(user_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    return None
