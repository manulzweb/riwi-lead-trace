from pydantic import BaseModel
from datetime import date
from typing import Optional

class PeriodBase(BaseModel):
    name: str
    starts_at: date
    ends_at: date
    is_active: bool = False

class PeriodCreate(PeriodBase):
    pass

class PeriodUpdate(BaseModel):
    name: Optional[str] = None
    starts_at: Optional[date] = None
    ends_at: Optional[date] = None
    is_active: Optional[bool] = None

class PeriodOut(PeriodBase):
    id: int

    class Config:
        from_attributes = True
