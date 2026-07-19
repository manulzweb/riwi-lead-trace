from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class EvaluationAnswerCreate(BaseModel):
    question_id: int
    score: Optional[int] = Field(None, ge=1, le=5)
    comment: Optional[str] = None

class EvaluationCreate(BaseModel):
    evaluator_id: int = Field(
        title="ID del Evaluador",
        description="ID del usuario que realiza la evaluación",
        examples=[1]
    )
    evaluatee_id: int = Field(
        title="ID del Evaluado",
        description="ID del usuario que está siendo evaluado",
        examples=[2]
    )
    template_id: int = Field(
        title="ID de la Plantilla",
        description="ID del formulario base usado",
        examples=[1]
    )
    period_id: int = Field(
        title="ID del Período",
        description="ID del período activo de evaluación",
        examples=[1]
    )
    is_anonymous: bool = Field(
        default=False,
        title="Es Anónima",
        description="Si es True, el evaluado no sabrá quién lo evaluó"
    )
    status: str = Field(
        default="draft",
        title="Estado",
        description="'draft' (borrador) o 'submitted' (enviada definitiva)",
        examples=["draft"]
    )
    answers: List[EvaluationAnswerCreate] = Field(
        title="Respuestas",
        description="Lista de respuestas para cada pregunta de la plantilla"
    )

class EvaluationAnswerOut(BaseModel):
    id: int
    question_id: int
    score: Optional[int]
    comment: Optional[str]

    class Config:
        from_attributes = True

class EvaluationOut(BaseModel):
    id: int
    evaluator_id: Optional[int]
    evaluatee_id: int
    template_id: int
    period_id: int
    is_anonymous: bool
    status: str
    submitted_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class EvaluationDetailOut(EvaluationOut):
    answers: List[EvaluationAnswerOut] = []
