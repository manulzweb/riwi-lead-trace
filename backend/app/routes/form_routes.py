from typing import List
import logging
from fastapi import APIRouter, HTTPException, Query, status
from app.schemas.form_template import FormTemplateOut, TemplateCreate, TemplateUpdate
from app.services.form_service import form_service
from app.exceptions.form_exceptions import (
    ActivePeriodExistsException, InvalidRoleException, InvalidWeightException, 
    CategoryNotFoundException, FormNotFoundException
)

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/forms", response_model=List[FormTemplateOut])
def get_form_templates(
    target_role: str = Query(..., description="El rol para el cual se requiere el formulario (ej. team_leader, tutor)")
):
    """
    Resuelve la jerarquía de plantillas (`forms`). Devuelve la plantilla activa que coincide con el `target_role_id` (Team Leader o Tutor) y hace inner join con preguntas activas.
    """
    try:
        return form_service.get_forms_by_role(target_role)
    except Exception as e:
        logger.error(f"Error fetching form templates: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno al consultar plantillas")

@router.post(
    "/forms", 
    response_model=FormTemplateOut, 
    status_code=status.HTTP_201_CREATED,
    summary="Crear una nueva plantilla",
    response_description="La plantilla recién creada junto con sus preguntas iniciales",
    responses={
        201: {"description": "Plantilla creada exitosamente"},
        422: {"description": "Error de validación (ej. pesos de preguntas 'scale' no suman 100)"},
        409: {"description": "No se puede editar/crear mientras haya un período activo"},
        404: {"description": "Categoría o rol no encontrados"}
    }
)
def create_form_template(payload: TemplateCreate):
    """Transacción compuesta: inserta `forms` y realiza bulk insert de esquemas hijos (`questions`). Valida constraint `is_active`."""
    try:
        return form_service.create_template(payload)
    except ActivePeriodExistsException as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except (InvalidRoleException, InvalidWeightException) as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except CategoryNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating form template: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno al crear plantilla")

@router.put("/forms/{form_id}", response_model=FormTemplateOut)
def update_form_template(form_id: int, payload: TemplateUpdate):
    """Mutación parcial (PATCH) sobre `forms.title` o `description`. Exclusivo estado cerrado."""
    try:
        return form_service.update_template(form_id, payload)
    except FormNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ActivePeriodExistsException as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating form template {form_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno")

@router.delete("/forms/{form_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_form_template(form_id: int):
    """Soft delete transaccional (`is_active = FALSE`) sobre la plantilla. Las referencias FK en evaluaciones pasadas persisten."""
    try:
        form_service.delete_template(form_id)
        return None
    except FormNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ActivePeriodExistsException as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except Exception as e:
        logger.error(f"Error deleting form template {form_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno")
