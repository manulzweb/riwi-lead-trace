from fastapi import APIRouter
from app.schemas.settings import SystemSettingsOut, SystemSettingsUpdate
from app.services.settings_service import settings_service

router = APIRouter(prefix="/settings", tags=["settings"])

@router.get("", response_model=SystemSettingsOut)
def get_settings():
    return settings_service.get_settings()

@router.get("/defaults", response_model=SystemSettingsOut)
def get_default_settings():
    """Valores de fabrica. NO modifica la configuracion guardada: el front los
    pinta en el formulario y el admin decide si los guarda con PUT /settings."""
    return settings_service.get_defaults()

@router.put("", response_model=SystemSettingsOut)
def update_settings(payload: SystemSettingsUpdate):
    return settings_service.update_settings(payload.model_dump())
