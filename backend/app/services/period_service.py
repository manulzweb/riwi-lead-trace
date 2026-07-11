from sqlalchemy.orm import Session

from app.models.period import Period
from app.repositories import period_repository


def get_periods(db: Session) -> list[Period]:
    return period_repository.list_periods(db)
