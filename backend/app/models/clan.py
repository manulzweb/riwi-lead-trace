from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class Clan(Base):
    __tablename__ = "clans"

    id = Column(Integer, primary_key=True, autoincrement=True)
    cohort_id = Column(Integer, ForeignKey("cohorts.id"), nullable=False)
    number = Column(Integer, nullable=False)
    name = Column(String(80), nullable=False)

    cohort = relationship("Cohort")
