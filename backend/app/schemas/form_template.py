from pydantic import BaseModel
from typing import List

class QuestionOut(BaseModel):
    id: int
    text: str
    category: str
    input_type: str
    sort_order: int
    weight: int

    class Config:
        from_attributes = True

class FormTemplateOut(BaseModel):
    id: int
    title: str
    target_role_id: int
    is_active: bool
    questions: List[QuestionOut] = []

    class Config:
        from_attributes = True
