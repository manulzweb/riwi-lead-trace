from fastapi import APIRouter, status
from typing import List
import logging
from app.schemas.category import CategoryCreate, CategoryOut, CategoryUpdate
from app.services.category_service import category_service

from app.exceptions.base import ApplicationException

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get(
    "/categories", 
    response_model=List[CategoryOut],
    summary="Listar categorías",
    response_description="Lista completa de categorías disponibles"
)
def get_categories():
    """Consulta de lectura total sobre la entidad `categories`."""
    return category_service.get_categories()

@router.post(
    "/categories", 
    response_model=CategoryOut, 
    status_code=status.HTTP_201_CREATED,
    summary="Crear categoría",
    response_description="La categoría recién creada"
)
def create_category(payload: CategoryCreate):
    """Inserta una nueva categoría en la base de datos."""
    try:
        return category_service.create_category(payload.name)
    except ApplicationException:
        # Se re-lanza para que la traduzca el handler global leyendo su
        # http_status. Este `except` existe solo porque el bloque `try` tiene
        # otro proposito; si algun dia se anade aqui un `except Exception`,
        # este DEBE seguir yendo antes o capturaria el dominio como 500.
        raise

@router.put(
    "/categories/{category_id}", 
    response_model=CategoryOut,
    summary="Actualizar categoría (PUT)",
    response_description="La categoría actualizada",
    responses={404: {"description": "Categoría no encontrada"}}
)
def put_category(category_id: int, payload: CategoryUpdate):
    """Actualiza el campo `name` de una categoría existente de manera total."""
    try:
        return category_service.update_category(category_id, payload.name)
    except ApplicationException:
        # Se re-lanza para que la traduzca el handler global leyendo su
        # http_status. Este `except` existe solo porque el bloque `try` tiene
        # otro proposito; si algun dia se anade aqui un `except Exception`,
        # este DEBE seguir yendo antes o capturaria el dominio como 500.
        raise

@router.patch(
    "/categories/{category_id}", 
    response_model=CategoryOut,
    summary="Actualizar categoría (PATCH)",
    response_description="La categoría actualizada",
    responses={404: {"description": "Categoría no encontrada"}}
)
def update_category(category_id: int, payload: CategoryUpdate):
    """Actualiza el campo `name` de una categoría existente de manera parcial."""
    try:
        return category_service.update_category(category_id, payload.name)
    except ApplicationException:
        # Se re-lanza para que la traduzca el handler global leyendo su
        # http_status. Este `except` existe solo porque el bloque `try` tiene
        # otro proposito; si algun dia se anade aqui un `except Exception`,
        # este DEBE seguir yendo antes o capturaria el dominio como 500.
        raise

@router.delete(
    "/categories/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar categoría",
    description="Ejecuta la eliminación física de una categoría en la base de datos previa validación de que no tenga preguntas asociadas (FK restriction).",
    responses={
        204: {"description": "Categoría eliminada exitosamente"},
        404: {"description": "Categoría no encontrada"},
        409: {"description": "No se puede eliminar la categoría porque tiene preguntas vinculadas"}
    }
)
def delete_category(category_id: int, admin_id: int = None):
    """Ejecuta un hard delete sobre la entidad `categories`. Valida restricciones de FK."""
    try:
        category_service.delete_category(category_id, admin_id)
        return None
    except ApplicationException:
        # Se re-lanza para que la traduzca el handler global leyendo su
        # http_status. Este `except` existe solo porque el bloque `try` tiene
        # otro proposito; si algun dia se anade aqui un `except Exception`,
        # este DEBE seguir yendo antes o capturaria el dominio como 500.
        raise
