from sqlalchemy import create_engine
from app.config.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,      # Verifica que la conexión está viva antes de usarla
    pool_recycle=1800,       # Recicla conexiones con más de 30 minutos (ideal para Railway)
    pool_size=10,            # Mantiene un pool base de 10 conexiones simultáneas
    max_overflow=20,         # Permite hasta 20 conexiones extras en picos de tráfico
    echo=False               # Desactiva logs de SQL en producción
)
