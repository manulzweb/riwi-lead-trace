from fastapi import APIRouter, HTTPException, status
from typing import List

from app.schemas.category import CategoryCreate, CategoryOut, CategoryUpdate
from app.services import category_service

router = APIRouter()


@router.get("/categories", response_model=List[CategoryOut])
def get_categories():
    """Lista todas las categorias de pregunta."""
    return category_service.get_categories()


@router.post("/categories", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(payload: CategoryCreate):
    """Crea una categoria nueva."""
    return category_service.create_category(payload.name)


@router.patch("/categories/{category_id}", response_model=CategoryOut)
def update_category(category_id: int, payload: CategoryUpdate):
    """Renombra una categoria existente."""
    updated = category_service.update_category(category_id, payload.name)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoria no encontrada.")
    return updated


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: int):
    """Elimina una categoria. Rechaza con 409 si alguna pregunta (activa o historica) la usa."""
    deleted = category_service.delete_category(category_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoria no encontrada.")
    return None
