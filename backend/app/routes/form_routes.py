from typing import List

from fastapi import APIRouter, HTTPException, Query, status
from app.schemas.form_template import FormTemplateOut, TemplateCreate, TemplateUpdate
from app.services import form_service

router = APIRouter()

@router.get("/forms", response_model=List[FormTemplateOut])
def get_form_templates(
    target_role: str = Query(..., description="El rol para el cual se requiere el formulario (ej. team_leader, tutor)")
):
    """Lista las plantillas activas para un rol especifico (en la practica,
    a lo sumo una: solo puede haber una plantilla activa por rol a la vez).
    Devuelve un arreglo (vacio si no hay ninguna) en vez de un objeto suelto,
    para ser consistente con el resto de la API al filtrar una coleccion.
    """
    templates = form_service.get_form_templates_by_role(target_role)
    if not templates:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró una plantilla de formulario para el rol '{target_role}'"
        )
    return templates


@router.post("/forms", response_model=FormTemplateOut, status_code=status.HTTP_201_CREATED)
def create_form_template(payload: TemplateCreate):
    """Crea una plantilla nueva con sus preguntas iniciales (constructor del Admin). Solo con periodo cerrado."""
    return form_service.create_template(payload)


@router.put("/forms/{template_id}", response_model=FormTemplateOut)
def update_form_template(template_id: int, payload: TemplateUpdate):
    """Actualiza titulo/descripcion de una plantilla. Solo con periodo cerrado."""
    updated = form_service.update_template(template_id, payload)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plantilla no encontrada.")
    return updated


@router.delete("/forms/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_form_template(template_id: int):
    """Desactiva una plantilla. Solo con periodo cerrado."""
    deleted = form_service.delete_template(template_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plantilla no encontrada.")
    return None
