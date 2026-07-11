from sqlalchemy.orm import Session

from app.models.period import Period


def list_periods(db: Session) -> list[Period]:
    return db.query(Period).order_by(Period.starts_at.desc()).all()
