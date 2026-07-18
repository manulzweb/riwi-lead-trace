from fastapi import APIRouter, HTTPException, status
from typing import List

from app.schemas.category import CategoryCreate, CategoryOut, CategoryUpdate
from app.services import category_service

router = APIRouter()


@router.get("/categories", response_model=List[CategoryOut])
def get_categories():
    """Consulta de lectura total sobre la entidad `categories`."""
    return category_service.get_categories()


@router.post("/categories", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(payload: CategoryCreate):
    """Inserta una nueva categoría en la base de datos."""
    return category_service.create_category(payload.name)


@router.patch("/categories/{category_id}", response_model=CategoryOut)
def update_category(category_id: int, payload: CategoryUpdate):
    """Actualiza el campo `name` de una categoría existente."""
    updated = category_service.update_category(category_id, payload.name)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoria no encontrada.")
    return updated


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: int):
    """Ejecuta un hard delete sobre la entidad `categories`. Valida restricciones de FK; retorna HTTP 409 si existe constraint violation (uso en preguntas históricas o activas)."""
    deleted = category_service.delete_category(category_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoria no encontrada.")
    return None
