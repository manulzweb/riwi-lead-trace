from fastapi import APIRouter
from app.schemas.settings import SystemSettingsOut, SystemSettingsUpdate
from app.services.settings_service import settings_service

router = APIRouter(prefix="/settings", tags=["settings"])

@router.get(
    "",
    response_model=SystemSettingsOut,
    summary="Obtener configuración global",
    description="Devuelve los parámetros activos de configuración global (umbrales de riesgo y excelencia del ICP, tolerancia de pesos y mínimo de evaluaciones requeridas).",
    response_description="Objeto de configuración global del sistema"
)
def get_settings():
    return settings_service.get_settings()

@router.get(
    "/defaults",
    response_model=SystemSettingsOut,
    summary="Obtener valores por defecto de fábrica",
    description="Devuelve los valores predeterminados de configuración sin alterar los almacenados en la base de datos.",
    response_description="Objeto con la configuración por defecto de fábrica"
)
def get_default_settings():
    """Valores de fabrica. NO modifica la configuracion guardada: el front los
    pinta en el formulario y el admin decide si los guarda con PUT /settings."""
    return settings_service.get_defaults()

@router.put(
    "",
    response_model=SystemSettingsOut,
    summary="Actualizar configuración global",
    description="Modifica los parámetros globales del sistema (umbrales de ICP, tolerancias y requisitos de muestra).",
    response_description="Objeto de configuración global actualizado"
)
def update_settings(payload: SystemSettingsUpdate):
    return settings_service.update_settings(payload.model_dump())
