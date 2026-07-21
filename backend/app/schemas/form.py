from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

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
    target_role_id: int
    is_active: bool
    is_form: bool = False
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
    target_role: str = Field(
        title="Rol Objetivo",
        description="'team_leader' o 'tutor' -- los unicos roles evaluables",
        examples=["team_leader"]
    )
    is_form: bool = Field(
        default=False,
        title="Es Plantilla Base",
        description="Indica si este formulario es solo una base (true) o un formulario activo para recibir respuestas (false)"
    )
    questions: List[QuestionCreateItem] = Field(
        min_length=1,
        title="Preguntas",
        description="Lista de preguntas que componen el formulario"
    )


class FormUpdate(BaseModel):
    """Body de PUT /forms/{id}: solo metadata (titulo/descripcion). Las
    preguntas se agregan/quitan/editan con los endpoints de /questions.
    """
    title: Optional[str] = Field(default=None, min_length=3, max_length=120)
    description: Optional[str] = Field(default=None, max_length=255)
