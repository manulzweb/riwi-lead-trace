from sqlalchemy import Column, ForeignKey, Integer, String, Text, TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class AiFeedbackCache(Base):
    __tablename__ = "ai_feedback_cache"

    id = Column(Integer, primary_key=True, autoincrement=True)
    evaluatee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    period_id = Column(Integer, ForeignKey("periods.id"), nullable=False)
    summary = Column(Text, nullable=False)
    model = Column(String(40), nullable=False)
    generated_at = Column(TIMESTAMP, nullable=False, server_default=func.now())

    evaluatee = relationship("User")
    period = relationship("Period")
