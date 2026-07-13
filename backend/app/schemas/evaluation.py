from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class EvaluationAnswerCreate(BaseModel):
    question_id: int
    score: Optional[int] = Field(None, ge=1, le=5)
    comment: Optional[str] = None

class EvaluationCreate(BaseModel):
    evaluator_id: Optional[int] = None
    evaluatee_id: int
    template_id: int
    period_id: int
    is_anonymous: bool = False
    status: str = "draft"  # "draft" o "submitted"
    answers: List[EvaluationAnswerCreate]

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
