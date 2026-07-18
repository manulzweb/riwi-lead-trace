import threading

from sqlalchemy import create_engine

from app.config.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,      # Protege de desconexiones
    pool_recycle=1800,       # Recicla cada 30 minutos (recomendado en Railway)
    pool_size=10,            # Soporta 10 peticiones concurrentes a la vez
    max_overflow=20,         # Soporta picos de hasta 30 peticiones concurrentes
    echo=False               # Sin logs de SQL para ahorrar recursos
)

_local = threading.local()


class _ScopedConnection:
    """Proxy que le da a cada hilo su propia Connection de SQLAlchemy.

    Antes `conn` era una unica Connection abierta una vez a nivel de modulo
    y compartida por TODA la app. FastAPI corre los endpoints sync (todos
    los de este proyecto lo son) en un threadpool: dos requests concurrentes
    caian en hilos distintos pero ejecutando conn.execute()/conn.commit()
    sobre el MISMO objeto Connection al mismo tiempo. SQLAlchemy no
    garantiza que una Connection sea segura para usar desde varios hilos a
    la vez, asi que eso podia mezclar el estado de una transaccion con el
    de otra request bajo carga concurrente real (dos coders enviando
    evaluaciones al mismo tiempo, por ejemplo).

    Esta clase resuelve eso sin tocar ningun `service` (todos siguen
    haciendo `conn.execute(...)` / `conn.commit()` igual que antes): cada
    atributo que se le pide se resuelve contra la Connection del hilo
    actual, creandola la primera vez que ese hilo la necesita y
    reutilizandola despues (no se abre una conexion nueva en cada
    execute/commit -- eso partiria en pedazos una misma transaccion,
    porque los `service` hacen varios execute() y un commit() al final
    asumiendo que comparten una sola conexion).
    """

    def _get(self):
        conn = getattr(_local, "conn", None)
        if conn is None or conn.closed:
            conn = engine.connect()
            _local.conn = conn
        return conn

    def __getattr__(self, name):
        return getattr(self._get(), name)


conn = _ScopedConnection()
