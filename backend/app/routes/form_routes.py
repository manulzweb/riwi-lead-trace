from typing import List, Literal, Optional
import logging
from fastapi import APIRouter, HTTPException, Query, status
from app.schemas.form import FormOut, FormCreate, FormUpdate, FormDeleteResult
from app.services.form_service import form_service
from app.exceptions.form_exceptions import (
    ActivePeriodExistsException, InvalidRoleException, InvalidWeightException, 
    CategoryNotFoundException, FormNotFoundException
)

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/forms", response_model=List[FormOut])
def get_forms(
    target_role: Optional[str] = Query(
        None,
        description="Filtra por rol evaluado (team_leader | tutor). Omitirlo lista todos los roles; necesario para ver plantillas genéricas, que no tienen rol."
    ),
    kind: Literal["form", "template", "all"] = Query(
        "form",
        description="'form' (default) = solo el formulario VIVO y ACTIVO, lo que responde el Coder. 'template' = solo plantillas. 'all' = ambos, para la grilla del Admin."
    ),
    archived: Literal["exclude", "include"] = Query(
        "exclude",
        description="'exclude' (default) oculta los archivados. 'include' los trae, necesario para que el historial del Coder conserve los títulos."
    ),
):
    """Lista formularios y plantillas, con filtros **seguros por defecto**.

    Los defaults (`kind=form`, `archived=exclude`) devuelven exactamente lo que
    necesita el Coder: el formulario vivo y activo del rol. Es deliberado --
    quien olvide pasar los parámetros obtiene la respuesta más restrictiva,
    nunca una plantilla ni un formulario archivado.
    """
    try:
        return form_service.get_forms(
            role_name=target_role,
            kind=kind,
            include_archived=(archived == "include"),
        )
    except Exception as e:
        logger.error(f"Error fetching forms: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno al consultar formularios")

@router.post(
    "/forms", 
    response_model=FormOut, 
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
def create_form(payload: FormCreate):
    """Transacción compuesta: inserta `forms` y realiza bulk insert de esquemas hijos (`questions`). Valida constraint `is_active`."""
    try:
        return form_service.create_form(payload)
    except ActivePeriodExistsException as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except (InvalidRoleException, InvalidWeightException) as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except CategoryNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating form form: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno al crear plantilla")

@router.put("/forms/{form_id}", response_model=FormOut)
def update_form(form_id: int, payload: FormUpdate):
    """Mutación parcial (PATCH) sobre `forms.title` o `description`. Exclusivo estado cerrado."""
    try:
        return form_service.update_form(form_id, payload)
    except FormNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ActivePeriodExistsException as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating form form {form_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno")

@router.delete(
    "/forms/{form_id}",
    response_model=FormDeleteResult,
    summary="Eliminar un formulario sin perder su historial",
    responses={
        200: {"description": "`action: deleted` si no tenía uso; `action: archived` si tenía evaluaciones"},
        409: {"description": "Hay un periodo activo y el formulario es el vivo"},
        404: {"description": "Formulario no encontrado"},
    },
)
def delete_form(form_id: int):
    """Elimina un formulario **preservando siempre el historial**.

    Sin evaluaciones se borra de verdad (preguntas + formulario). Con
    evaluaciones se archiva: sale de la grilla del Admin, pero las respuestas
    siguen intactas — las FKs `ON DELETE RESTRICT` hacen que borrarlas sea
    físicamente imposible.

    Devuelve `200` con el resultado en vez de `204` porque la UI necesita saber
    cuál de los dos caminos ocurrió para no mostrar un mensaje falso.
    """
    try:
        return form_service.delete_form(form_id)
    except FormNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ActivePeriodExistsException as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except Exception as e:
        logger.error(f"Error deleting form form {form_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno")
