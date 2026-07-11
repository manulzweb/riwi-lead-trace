from sqlalchemy import Column, Integer, String

from app.core.database import Base


class Cohort(Base):
    __tablename__ = "cohorts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    number = Column(Integer, nullable=False, unique=True)
    name = Column(String(80), nullable=False)
    city = Column(String(80), nullable=True)
