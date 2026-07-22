from fastapi import APIRouter, HTTPException, status
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
    try:
        return category_service.get_categories()
    except Exception:
        logger.exception("Error fetching categories")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno al listar categorías")

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
        # Excepcion de dominio: la traduce el handler global leyendo su
        # http_status. El `raise` pelado va ANTES del `except Exception`:
        # sin el, el generico la capturaria y la volveria un 500.
        raise
    except Exception:
        logger.exception("Error creating category")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno al crear categoría")

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
        # Excepcion de dominio: la traduce el handler global leyendo su
        # http_status. El `raise` pelado va ANTES del `except Exception`:
        # sin el, el generico la capturaria y la volveria un 500.
        raise
    except Exception:
        logger.exception("Error updating category %s", category_id)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno al actualizar categoría")

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
        # Excepcion de dominio: la traduce el handler global leyendo su
        # http_status. El `raise` pelado va ANTES del `except Exception`:
        # sin el, el generico la capturaria y la volveria un 500.
        raise
    except Exception:
        logger.exception("Error patching category %s", category_id)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno al parchear categoría")

@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: int, admin_id: int = None):
    """Ejecuta un hard delete sobre la entidad `categories`. Valida restricciones de FK."""
    try:
        category_service.delete_category(category_id, admin_id)
        return None
    except ApplicationException:
        # Excepcion de dominio: la traduce el handler global leyendo su
        # http_status. El `raise` pelado va ANTES del `except Exception`:
        # sin el, el generico la capturaria y la volveria un 500.
        raise
    except Exception:
        logger.exception("Error deleting category %s", category_id)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno al eliminar categoría")
