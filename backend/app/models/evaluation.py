from sqlalchemy import Boolean, Column, ForeignKey, Integer, SmallInteger, String, Text, TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Evaluation(Base):
    __tablename__ = "evaluations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    # NULL cuando is_anonymous=True — anonimato real: nunca se persiste el evaluador
    evaluator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    evaluatee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    template_id = Column(Integer, ForeignKey("form_templates.id"), nullable=False)
    period_id = Column(Integer, ForeignKey("periods.id"), nullable=False)
    is_anonymous = Column(Boolean, nullable=False, default=False)
    # 'draft' | 'submitted' — el CHECK constraint vive en el schema SQL
    status = Column(String(20), nullable=False, default="draft")
    submitted_at = Column(TIMESTAMP, nullable=True)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())

    evaluator = relationship("User", foreign_keys=[evaluator_id])
    evaluatee = relationship("User", foreign_keys=[evaluatee_id])
    template = relationship("FormTemplate")
    period = relationship("Period")
    answers = relationship("EvaluationAnswer", back_populates="evaluation", cascade="all, delete-orphan")


class EvaluationAnswer(Base):
    __tablename__ = "evaluation_answers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    evaluation_id = Column(Integer, ForeignKey("evaluations.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    # NULL cuando input_type='text'
    score = Column(SmallInteger, nullable=True)
    comment = Column(Text, nullable=True)

    evaluation = relationship("Evaluation", back_populates="answers")
    question = relationship("Question")
