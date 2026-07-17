from pydantic import BaseModel, Field
from typing import List, Optional


class QuestionOut(BaseModel):
    id: int
    template_id: int
    text: str
    category: str
    input_type: str
    sort_order: int
    weight_percent: float
    is_active: bool

    class Config:
        from_attributes = True


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
    template_id: int
    weights: List[WeightItem]
