from fastapi import APIRouter, HTTPException, Query, status
from app.schemas.form_template import FormTemplateOut, TemplateCreate, TemplateUpdate
from app.services import form_service

router = APIRouter()

@router.get("/forms", response_model=FormTemplateOut)
def get_form_template(
    target_role: str = Query(..., description="El rol para el cual se requiere el formulario (ej. team_leader, tutor)")
):
    """Obtiene la plantilla del formulario para un rol específico."""
    template = form_service.get_form_template_by_role(target_role)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró una plantilla de formulario para el rol '{target_role}'"
        )
    return template


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
