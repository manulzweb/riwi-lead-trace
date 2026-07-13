from sqlalchemy import Boolean, Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class FormTemplate(Base):
    __tablename__ = "form_templates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(120), nullable=False)
    target_role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)

    target_role = relationship("Role")
    questions = relationship("Question", back_populates="template", order_by="Question.sort_order")


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    template_id = Column(Integer, ForeignKey("form_templates.id"), nullable=False)
    text = Column(String(255), nullable=False)
    category = Column(String(60), nullable=False)
    # 'scale' | 'text' — el CHECK constraint vive en el schema SQL
    input_type = Column(String(20), nullable=False, default="scale")
    sort_order = Column(Integer, nullable=False, default=0)

    template = relationship("FormTemplate", back_populates="questions")
