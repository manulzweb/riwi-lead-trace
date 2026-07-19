from pydantic import BaseModel, Field
from typing import List, Optional

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

class FormTemplateOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    target_role_id: int
    is_active: bool
    questions: List[QuestionOut] = []

    class Config:
        from_attributes = True


class QuestionCreateItem(BaseModel):
    """Una pregunta dentro del payload de creacion de una plantilla nueva."""
    text: str = Field(min_length=3, max_length=255)
    category_id: int
    input_type: str = Field(pattern="^(scale|text|yes_no)$")
    # Solo aplica a 'scale' (ver weight_percent en questions); en 'text'/'yes_no' se ignora y queda en 0.
    weight_percent: float = Field(default=0, ge=0, le=100)


class TemplateCreate(BaseModel):
    """Body de POST /forms: crea una plantilla nueva con sus preguntas iniciales.

    A diferencia de PATCH /questions/{id} (que versiona una pregunta ya
    existente), esto es instrumento nuevo: no hay historial que preservar.
    """
    title: str = Field(min_length=3, max_length=120)
    description: Optional[str] = Field(default=None, max_length=255)
    target_role: str = Field(description="'team_leader' o 'tutor' -- los unicos roles evaluables")
    questions: List[QuestionCreateItem] = Field(min_length=1)


class TemplateUpdate(BaseModel):
    """Body de PUT /forms/{id}: solo metadata (titulo/descripcion). Las
    preguntas se agregan/quitan/editan con los endpoints de /questions.
    """
    title: Optional[str] = Field(default=None, min_length=3, max_length=120)
    description: Optional[str] = Field(default=None, max_length=255)
