from sqlalchemy import MetaData, Table, Column, Integer, String

metadata_obj = MetaData()

roles_table = Table(
    "roles",
    metadata_obj,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("name", String(30), nullable=False, unique=True),
)
