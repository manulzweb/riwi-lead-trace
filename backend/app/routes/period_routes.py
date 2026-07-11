from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.deps import get_db
from app.models.period import PeriodOut
from app.services import period_service

router = APIRouter()


@router.get("/periods", response_model=list[PeriodOut])
def get_periods(db: Session = Depends(get_db)):
    return period_service.get_periods(db)
