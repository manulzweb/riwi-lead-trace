from pydantic import BaseModel, Field, model_validator
from typing import List, Literal, Optional
from datetime import datetime

from app.constants.form_constants import EVALUABLE_ROLES

class QuestionOut(BaseModel):
    id: int
    text: str
    category_id: int
    category: str  # nombre de la categoria (join contra categories)
    input_type: str
    sort_order: int
    weight_percent: float

    class Config:
        from_attributes = True

class FormOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    # None solo en plantillas genericas (ver chk_form_role_required en el DDL).
    target_role_id: Optional[int] = None
    is_active: bool
    is_template: bool = False
    archived_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    questions: List[QuestionOut] = []

    class Config:
        from_attributes = True


class QuestionCreateItem(BaseModel):
    """Una pregunta dentro del payload de creacion de una plantilla nueva."""
    text: str = Field(
        min_length=3, 
        max_length=255,
        title="Texto de la Pregunta",
        description="El enunciado o texto de la pregunta a evaluar",
        examples=["¿El líder se comunica de manera efectiva?"]
    )
    category_id: int = Field(
        title="ID de Categoría",
        description="El identificador numérico de la categoría a la que pertenece la pregunta",
        examples=[1]
    )
    input_type: str = Field(
        pattern="^(scale|text|yes_no)$",
        title="Tipo de Entrada",
        description="Define cómo se responderá la pregunta: con escala (scale), texto abierto (text) o sí/no (yes_no)",
        examples=["scale"]
    )
    # Solo aplica a 'scale' (ver weight_percent en questions); en 'text'/'yes_no' se ignora y queda en 0.
    weight_percent: float = Field(
        default=0, 
        ge=0, 
        le=100,
        title="Peso Porcentual",
        description="El porcentaje de peso de esta pregunta sobre el total (solo aplica para 'scale')",
        examples=[50.0]
    )


class FormCreate(BaseModel):
    """Body de POST /forms: crea una plantilla nueva con sus preguntas iniciales.

    A diferencia de PATCH /questions/{id} (que versiona una pregunta ya
    existente), esto es instrumento nuevo: no hay historial que preservar.
    """
    title: str = Field(
        min_length=3, 
        max_length=120,
        title="Título de la Plantilla",
        description="Nombre representativo del formulario de evaluación",
        examples=["Evaluación Mensual de Liderazgo"]
    )
    description: Optional[str] = Field(
        default=None, 
        max_length=255,
        title="Descripción",
        description="Detalles o instrucciones sobre el formulario",
        examples=["Formulario para evaluar el desempeño en el mes de Julio"]
    )
    target_role: Optional[str] = Field(
        default=None,
        title="Rol Objetivo",
        description=(
            "'team_leader' o 'tutor' -- los unicos roles evaluables. "
            "Obligatorio en un formulario vivo; opcional en una plantilla "
            "(una plantilla generica sirve para cualquier rol)."
        ),
        examples=["team_leader"]
    )
    is_template: bool = Field(
        default=False,
        title="Es Plantilla Base",
        description="TRUE = plantilla base reutilizable (inerte, nunca recibe respuestas). FALSE = formulario vivo."
    )
    questions: List[QuestionCreateItem] = Field(
        min_length=1,
        title="Preguntas",
        description="Lista de preguntas que componen el formulario"
    )

    @model_validator(mode="after")
    def _validate_target_role(self):
        """Espeja chk_form_role_required del DDL: un formulario vivo SIEMPRE
        necesita rol; una plantilla puede no tenerlo.

        Se valida aqui ademas de en la BD para devolver un 422 con mensaje util
        en vez de dejar que MySQL responda con un IntegrityError opaco. La BD
        sigue siendo la autoridad: esto es conveniencia, no la barrera.
        """
        if self.target_role is not None and self.target_role not in EVALUABLE_ROLES:
            raise ValueError(f"target_role debe ser uno de {EVALUABLE_ROLES}.")
        if not self.is_template and self.target_role is None:
            raise ValueError("Un formulario vivo requiere target_role; solo una plantilla puede omitirlo.")
        return self


class FormDeleteResult(BaseModel):
    """Respuesta de DELETE /forms/{id}. La UI la usa para decir con precision
    que ocurrio: un formulario sin uso desaparece, uno con historial se archiva.
    """
    action: Literal["deleted", "archived"] = Field(
        title="Qué ocurrió",
        description="'deleted' = se borró de verdad (no tenía uso). 'archived' = se retiró de la grilla pero su historial sigue intacto.",
        examples=["archived"]
    )
    evaluations_count: int = Field(
        title="Evaluaciones asociadas",
        description="Cuántas evaluaciones referencian este formulario. Si es > 0, el borrado real es imposible por FK.",
        examples=[24]
    )


class FormUpdate(BaseModel):
    """Body de PUT /forms/{id}: solo metadata (titulo/descripcion). Las
    preguntas se agregan/quitan/editan con los endpoints de /questions.
    """
    title: Optional[str] = Field(default=None, min_length=3, max_length=120)
    description: Optional[str] = Field(default=None, max_length=255)
