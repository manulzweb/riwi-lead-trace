from sqlalchemy import Boolean, Column, Date, Integer, String

from app.core.database import Base


class Period(Base):
    __tablename__ = "periods"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(60), nullable=False)
    starts_at = Column(Date, nullable=False)
    ends_at = Column(Date, nullable=False)
    is_active = Column(Boolean, nullable=False, default=False)
