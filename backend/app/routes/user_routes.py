from fastapi import APIRouter, HTTPException, Query, status
from typing import List, Optional
import logging
from app.schemas.user import UserCreate, UserUpdate, UserOut
from app.services.user_service import user_service

from app.exceptions.base import ApplicationException

logger = logging.getLogger(__name__)
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

@router.get(
    "/evaluables",
    response_model=List[UserOut],
    summary="Listar usuarios evaluables",
    description="Consulta y resuelve usuarios evaluables (Team Leaders y Tutores). Si se envía evaluator_id, excluye al usuario para evitar autoevaluación.",
    response_description="Lista de usuarios evaluables"
)
def get_evaluables(evaluator_id: Optional[int] = Query(None, description="Si se envía, excluye de la lista al propio usuario aunque tenga otro ID (por email)")):
    """Consulta filtrada con un array `IN` sobre `role_id` para resolver entidades evaluables (`team_leader`, `tutor`)."""
    return user_service.get_evaluables(evaluator_id)

@router.get(
    "/users/{user_id}",
    response_model=UserOut,
    summary="Obtener detalle de un usuario",
    description="Consulta la información detallada y roles asignados a un usuario específico por su ID.",
    response_description="Información detallada del usuario",
    responses={404: {"description": "Usuario no encontrado"}}
)
def get_user(user_id: int):
    """Resolución de entidad `users` por su Primary Key (`id`)."""
    try:
        user = user_service.get_user(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
        return user
    except HTTPException:
        raise

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
    try:
        return user_service.create_user(user)
    except ApplicationException:
        # Se re-lanza para que la traduzca el handler global leyendo su
        # http_status. Este `except` existe solo porque el bloque `try` tiene
        # otro proposito; si algun dia se anade aqui un `except Exception`,
        # este DEBE seguir yendo antes o capturaria el dominio como 500.
        raise

@router.put(
    "/users/{user_id}", 
    response_model=UserOut,
    summary="Actualizar usuario (PUT)",
    response_description="El usuario actualizado completamente",
    responses={404: {"description": "Usuario no encontrado"}}
)
def update_user(user_id: int, user: UserUpdate):
    """Operación PUT (Reemplazo total) sobre `users` y recálculo/reemplazo de entradas en `user_roles`."""
    try:
        return user_service.update_user(user_id, user)
    except ApplicationException:
        # Se re-lanza para que la traduzca el handler global leyendo su
        # http_status. Este `except` existe solo porque el bloque `try` tiene
        # otro proposito; si algun dia se anade aqui un `except Exception`,
        # este DEBE seguir yendo antes o capturaria el dominio como 500.
        raise

@router.patch("/users/{user_id}", response_model=UserOut)
def patch_user(user_id: int, user: UserUpdate):
    """Operación PATCH (Reemplazo parcial) sobre `users`. Muta únicamente los campos proporcionados en el payload sin afectar la entidad completa."""
    try:
        return user_service.update_user(user_id, user)
    except ApplicationException:
        # Se re-lanza para que la traduzca el handler global leyendo su
        # http_status. Este `except` existe solo porque el bloque `try` tiene
        # otro proposito; si algun dia se anade aqui un `except Exception`,
        # este DEBE seguir yendo antes o capturaria el dominio como 500.
        raise

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int):
    """Hard delete sobre `users`.

    Devuelve 409 si el usuario tiene evaluaciones o participaciones: las FK son
    RESTRICT para no perder historico, asi que el flujo correcto es desactivarlo
    (`is_active = FALSE`) en vez de borrarlo.
    """
    try:
        user_service.delete_user(user_id)
        return None
    except ApplicationException:
        # Se re-lanza para que la traduzca el handler global leyendo su
        # http_status. Este `except` existe solo porque el bloque `try` tiene
        # otro proposito; si algun dia se anade aqui un `except Exception`,
        # este DEBE seguir yendo antes o capturaria el dominio como 500.
        raise
