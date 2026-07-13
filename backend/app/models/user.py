from sqlalchemy import MetaData, Table, Column, Integer, String, Boolean

metadata = MetaData()

users_table = Table(
    "users",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("full_name", String(120), nullable=False),
    Column("email", String(150), nullable=False, unique=True),
    Column("password_hash", String(255), nullable=False),
    Column("role_id", Integer, nullable=False),
    Column("clan_id", Integer, nullable=True),
    Column("is_active", Boolean, nullable=False, default=True),
)
