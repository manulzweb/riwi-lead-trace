from typing import List

from fastapi import APIRouter, HTTPException, Query, status
from app.schemas.form_template import FormTemplateOut, TemplateCreate, TemplateUpdate
from app.services import form_service

router = APIRouter()

@router.get("/forms", response_model=List[FormTemplateOut])
def get_form_templates(
    target_role: str = Query(..., description="El rol para el cual se requiere el formulario (ej. team_leader, tutor)")
):
    """
    Resuelve la jerarquía de plantillas (`form_templates`). Devuelve la plantilla activa que coincide con el `target_role_id` (Team Leader o Tutor) y hace inner join con preguntas activas.
    """
    templates = form_service.get_form_templates_by_role(target_role)
    return templates


@router.post(
    "/forms", 
    response_model=FormTemplateOut, 
    status_code=status.HTTP_201_CREATED,
    summary="Crear una nueva plantilla",
    response_description="La plantilla recién creada junto con sus preguntas iniciales",
    responses={
        201: {"description": "Plantilla creada exitosamente"},
        422: {"description": "Error de validación (ej. pesos de preguntas 'scale' no suman 100)"},
        409: {"description": "No se puede editar/crear mientras haya un período activo"}
    }
)
def create_form_template(payload: TemplateCreate):
    """Transacción compuesta: inserta `form_templates` y realiza bulk insert de esquemas hijos (`questions`). Valida constraint `is_active`."""
    return form_service.create_template(payload)


@router.put("/forms/{form_id}", response_model=FormTemplateOut)
def update_form_template(form_id: int, payload: TemplateUpdate):
    """Mutación parcial (PATCH) sobre `form_templates.title` o `description`. Exclusivo estado cerrado."""
    updated = form_service.update_template(form_id, payload)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plantilla no encontrada.")
    return updated


@router.delete("/forms/{form_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_form_template(form_id: int):
    """Soft delete transaccional (`is_active = FALSE`) sobre la plantilla. Las referencias FK en evaluaciones pasadas persisten."""
    deleted = form_service.delete_template(form_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plantilla no encontrada.")
    return None
