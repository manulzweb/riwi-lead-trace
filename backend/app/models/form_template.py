from sqlalchemy import MetaData, Table, Column, Integer, String, Boolean, ForeignKey

metadata_obj = MetaData()

form_templates_table = Table(
    "form_templates",
    metadata_obj,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("title", String(120), nullable=False),
    Column("target_role_id", Integer, ForeignKey("roles.id"), nullable=False),
    Column("is_active", Boolean, nullable=False, default=True),
)

questions_table = Table(
    "questions",
    metadata_obj,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("template_id", Integer, ForeignKey("form_templates.id"), nullable=False),
    Column("text", String(255), nullable=False),
    Column("category", String(60), nullable=False),
    Column("input_type", String(20), nullable=False, default="scale"),
    Column("sort_order", Integer, nullable=False, default=0),
)
