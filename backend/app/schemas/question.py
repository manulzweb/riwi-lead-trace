from pydantic import BaseModel, Field
from typing import List, Optional


class QuestionOut(BaseModel):
    id: int
    form_id: int
    text: str
    category_id: int
    category: str  # nombre de la categoria (join contra categories), no editable directo
    input_type: str
    sort_order: int
    weight_percent: float
    is_active: bool

    class Config:
        from_attributes = True


class QuestionCreate(BaseModel):
    """Body de POST /questions: agrega una pregunta nueva a una plantilla
    ya existente (fuera del flujo de creacion de plantilla en POST /forms).

    No exige que los pesos de escala sumen 100 en el momento: al agregar
    una pregunta sola es normal que el total quede descuadrado; el admin
    lo reequilibra despues con PUT /questions/weights.
    """
    form_id: int = Field(
        title="ID de la Plantilla",
        description="ID de la plantilla a la que se agregará la pregunta",
        examples=[1]
    )
    text: str = Field(
        min_length=3, 
        max_length=255,
        title="Texto de la Pregunta",
        description="Enunciado de la pregunta",
        examples=["¿El líder es comunicativo?"]
    )
    category_id: int = Field(
        title="ID de la Categoría",
        description="Categoría a la que pertenece",
        examples=[1]
    )
    input_type: str = Field(
        pattern="^(scale|text|yes_no)$",
        title="Tipo de Entrada",
        description="Tipo de respuesta esperada",
        examples=["scale"]
    )
    weight_percent: float = Field(
        default=0, 
        ge=0, 
        le=100,
        title="Peso Porcentual",
        description="Peso de la pregunta (solo si es scale)",
        examples=[20.0]
    )


class QuestionTextPatch(BaseModel):
    """Body de PATCH /questions/{id}: reformular el texto de una pregunta.

    Editar el texto SIEMPRE versiona (fila nueva + desactiva la anterior),
    nunca sobrescribe -- ver regla de negocio ADMIN-02 en CLAUDE.md.
    """
    text: str = Field(min_length=3, max_length=255)
    # El admin confirma explicitamente cuando la IA marca que el texto ya
    # no coincide con la categoria (anti deriva semantica).
    confirm: bool = False


class WeightItem(BaseModel):
    question_id: int
    weight_percent: float = Field(ge=0, le=100)


class WeightsUpdate(BaseModel):
    form_id: int
    weights: List[WeightItem]
