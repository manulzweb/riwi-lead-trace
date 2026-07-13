from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.schemas.user import UserCreate, UserUpdate, UserOut
from app.services import user_service
from app.deps import get_current_user, require_role

router = APIRouter()

@router.get("/users", response_model=List[UserOut])
def get_users(current_user: dict = Depends(get_current_user)):
    """Obtiene todos los usuarios (ej. para elegir a quién evaluar)."""
    return user_service.get_users()

@router.get("/users/{user_id}", response_model=UserOut)
def get_user(user_id: int, current_user: dict = Depends(get_current_user)):
    """Obtiene un usuario por ID."""
    user = user_service.get_user(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    return user

@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(user: UserCreate, current_user: dict = Depends(require_role("admin"))):
    """Crea un nuevo usuario (solo Admin)."""
    return user_service.create_user(user)

@router.put("/users/{user_id}", response_model=UserOut)
def update_user(user_id: int, user: UserUpdate, current_user: dict = Depends(require_role("admin"))):
    """Actualiza un usuario por ID (solo Admin)."""
    updated = user_service.update_user(user_id, user)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    return updated

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, current_user: dict = Depends(require_role("admin"))):
    """Elimina un usuario por ID (solo Admin)."""
    deleted = user_service.delete_user(user_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    return None
