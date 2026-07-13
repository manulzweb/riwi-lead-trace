from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.schemas.form_template import FormTemplateOut
from app.services import form_service
from app.deps import get_current_user

router = APIRouter()

@router.get("/forms", response_model=FormTemplateOut)
def get_form_template(
    target_role: str = Query(..., description="El rol para el cual se requiere el formulario (ej. team_leader, tutor)"),
    current_user: dict = Depends(get_current_user)
):
    """Obtiene la plantilla del formulario para un rol específico."""
    template = form_service.get_form_template_by_role(target_role)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró una plantilla de formulario para el rol '{target_role}'"
        )
    return template
