from sqlalchemy import MetaData, Table, Column, Integer, String, Text, Boolean, ForeignKey, TIMESTAMP, SmallInteger

metadata_obj = MetaData()

evaluations_table = Table(
    "evaluations",
    metadata_obj,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("evaluator_id", Integer, ForeignKey("users.id"), nullable=True),
    Column("evaluatee_id", Integer, ForeignKey("users.id"), nullable=False),
    Column("template_id", Integer, ForeignKey("form_templates.id"), nullable=False),
    Column("period_id", Integer, ForeignKey("periods.id"), nullable=False),
    Column("is_anonymous", Boolean, nullable=False, default=False),
    Column("status", String(20), nullable=False, default="draft"),
    Column("submitted_at", TIMESTAMP, nullable=True),
)

evaluation_answers_table = Table(
    "evaluation_answers",
    metadata_obj,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("evaluation_id", Integer, ForeignKey("evaluations.id"), nullable=False),
    Column("question_id", Integer, ForeignKey("questions.id"), nullable=False),
    Column("score", SmallInteger, nullable=True),
    Column("comment", Text, nullable=True),
)
