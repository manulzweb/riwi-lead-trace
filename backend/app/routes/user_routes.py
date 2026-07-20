from fastapi import APIRouter, HTTPException, Query, status
from typing import List, Optional
from app.schemas.user import UserCreate, UserUpdate, UserOut
from app.services import user_service

router = APIRouter()

@router.get(
    "/users", 
    response_model=List[UserOut],
    summary="Listar usuarios",
    response_description="Lista de usuarios filtrada (opcionalmente por rol)"
)
def get_users(role: Optional[str] = Query(None, description="Filtrar por rol (ej. team_leader, tutor)")):
    """Consulta indexada sobre la tabla `users` mediante el campo `role_id`."""
    return user_service.get_users(role)

@router.get("/evaluables", response_model=List[UserOut])
def get_evaluables():
    """Consulta filtrada con un array `IN` sobre `role_id` para resolver entidades evaluables (`team_leader`, `tutor`)."""
    return user_service.get_evaluables()

@router.get("/users/{user_id}", response_model=UserOut)
def get_user(user_id: int):
    """Resolución de entidad `users` por su Primary Key (`id`)."""
    user = user_service.get_user(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    return user

@router.post(
    "/users", 
    response_model=UserOut, 
    status_code=status.HTTP_201_CREATED,
    summary="Crear usuario",
    response_description="El usuario recién creado",
    responses={409: {"description": "El email ya está registrado"}}
)
def create_user(user: UserCreate):
    """Inserta un registro transaccional en `users` (aplica hash bcrypt sincrónico al password) y asocia FK en `user_roles`."""
    return user_service.create_user(user)

@router.put(
    "/users/{user_id}", 
    response_model=UserOut,
    summary="Actualizar usuario (PUT)",
    response_description="El usuario actualizado completamente",
    responses={404: {"description": "Usuario no encontrado"}}
)
def update_user(user_id: int, user: UserUpdate):
    """Operación PUT (Reemplazo total) sobre `users` y recálculo/reemplazo de entradas en `user_roles`."""
    updated = user_service.update_user(user_id, user)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    return updated

@router.patch("/users/{user_id}", response_model=UserOut)
def patch_user(user_id: int, user: UserUpdate):
    """Operación PATCH (Reemplazo parcial) sobre `users`. Muta únicamente los campos proporcionados en el payload sin afectar la entidad completa."""
    updated = user_service.update_user(user_id, user)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    return updated

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int):
    """Hard delete sobre `users`. Falla si existen dependencias referenciales en cascada no manejadas (e.g., evaluaciones existentes)."""
    deleted = user_service.delete_user(user_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    return None
