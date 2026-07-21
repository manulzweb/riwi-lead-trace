from pydantic import BaseModel, Field
from typing import List, Literal, Optional
from datetime import datetime

class EvaluationAnswerCreate(BaseModel):
    question_id: int
    score: Optional[int] = Field(None, ge=1, le=5)
    comment: Optional[str] = None

class EvaluationCreate(BaseModel):
    evaluator_id: int = Field(
        title="ID del Evaluador",
        description=(
            "ID del usuario que realiza la evaluación. Lo manda el front (sin JWT "
            "no hay otra forma). Se persiste en `evaluation_submissions`, NO en "
            "`evaluations`: si `is_anonymous` es True el vínculo con el contenido "
            "nunca llega a guardarse."
        ),
        examples=[1]
    )
    evaluatee_id: int = Field(
        title="ID del Evaluado",
        description="ID del usuario que está siendo evaluado",
        examples=[2]
    )
    form_id: int = Field(
        title="ID del Formulario",
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
    status: Literal["draft", "submitted"] = Field(
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
    """Una evaluación vista desde el lado del EVALUADO (o del admin).

    `evaluator_id` ya no es una columna de `evaluations`: se resuelve vía
    `evaluation_submissions` y solo para el admin en evaluaciones no anónimas.
    Es None si la evaluación fue anónima (el dato no existe en la BD) o si quien
    consulta no es admin (regla 8).
    """
    id: int
    evaluator_id: Optional[int] = None
    evaluatee_id: int
    form_id: int
    period_id: int
    is_anonymous: bool
    status: str
    created_at: datetime
    submitted_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class EvaluationDetailOut(EvaluationOut):
    answers: List[EvaluationAnswerOut] = []

class EvaluationHistoryOut(BaseModel):
    """Una participación vista desde el lado del EVALUADOR (su historial).

    El contenido viene poblado también en las anónimas: el evaluador puede releer
    lo que escribió (regla 1). Los campos opcionales solo quedan en None si la
    evaluación fue borrada, en cuyo caso la FK deja `evaluation_id` en NULL.
    """
    participation_id: int = Field(description="ID de la fila en evaluation_submissions")
    evaluatee_id: int
    period_id: int
    is_anonymous: bool = Field(description="True => el evaluado no sabe quién evaluó")
    created_at: datetime = Field(description="Cuándo participó el evaluador")

    evaluation_id: Optional[int] = Field(default=None, description="None solo si la evaluación fue borrada")
    form_id: Optional[int] = None
    status: Optional[str] = None
    submitted_at: Optional[datetime] = None
    answers: List[EvaluationAnswerOut] = []

    class Config:
        from_attributes = True
