from sqlalchemy import MetaData, Table, Column, Integer, String, Text, TIMESTAMP, ForeignKey

metadata_obj = MetaData()

ai_feedback_cache_table = Table(
    "ai_feedback_cache",
    metadata_obj,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("evaluatee_id", Integer, ForeignKey("users.id"), nullable=False),
    Column("period_id", Integer, ForeignKey("periods.id"), nullable=False),
    Column("summary", Text, nullable=False),
    Column("model", String(40), nullable=False),
    Column("generated_at", TIMESTAMP, nullable=True),
)
