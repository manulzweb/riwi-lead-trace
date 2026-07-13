from sqlalchemy import create_engine

from app.config.config import settings

engine = create_engine(settings.DATABASE_URL)
conn = engine.connect()
