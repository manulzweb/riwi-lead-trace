from sqlalchemy import MetaData, Table, Column, Integer, String, Date, Boolean

metadata = MetaData()

periods_table = Table(
    "periods",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("name", String(60), nullable=False),
    Column("starts_at", Date, nullable=False),
    Column("ends_at", Date, nullable=False),
    Column("is_active", Boolean, nullable=False, default=False),
)
