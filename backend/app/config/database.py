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

# Conexion persistente aparte del pool que usan los services (que abren/cierran
# con `with engine.connect()` por request). Solo la usan las pruebas de
# integracion (tests/conftest.py y tests/test_*.py) para sembrar/leer/limpiar
# datos. En AUTOCOMMIT para que cada SELECT vea de inmediato lo que escribio
# la API (una conexion distinta, del pool de `engine`) sin depender de que
# cada test recuerde hacer `conn.commit()` antes de leer -- con el
# aislamiento REPEATABLE READ por defecto de MySQL, una lectura sin commit
# previo puede quedarse con una foto vieja y no ver cambios ya confirmados
# por otra conexion.
conn = engine.connect().execution_options(isolation_level="AUTOCOMMIT")
