"""Helpers compartidos por los repositorios.

Contiene SOLO mecanica de acceso a datos: ejecutar una sentencia y normalizar
el resultado. Sin logica de negocio, sin estado y sin ORM -- las consultas
siguen siendo `text()` escritas a mano en cada repositorio, que es la decision
de arquitectura del proyecto (ver CLAUDE.md).

Por que existe: los 10 repositorios repetian las mismas cuatro formas de
consumir un `Result` (~50 veces). El patron era identico y la unica variacion
estaba en el SQL, que se queda donde estaba.

Por que NO captura excepciones: un `except SQLAlchemyError` que solo loguea y
vuelve a lanzar la misma excepcion no maneja nada -- deja el error igual y
duplica el registro en los logs. Se deja subir hasta la capa que tiene el
contexto para reportarlo. Los unicos `try/except` que sobreviven en los
repositorios son los que traducen un `IntegrityError` a una excepcion del
dominio (ej. `CategoryInUseException`), porque ahi si hay una decision.
"""
from typing import Any, Dict, List, Optional

from sqlalchemy.engine import Connection, Result


class BaseRepository:
    """Mixin sin estado. Todos los metodos son estaticos a proposito: los
    repositorios lo heredan para tenerlos a mano, pero no comparten nada mas
    -- cada uno sigue siendo dueño de su SQL y de su tabla.
    """

    @staticmethod
    def execute(conn: Connection, stmt, params: Optional[Any] = None) -> Result:
        """Ejecuta y devuelve el `Result` crudo.

        Para INSERT/UPDATE/DELETE, y para cuando hace falta `.lastrowid` o
        `.rowcount`. `params` tambien acepta una LISTA de dicts (executemany
        de SQLAlchemy); por eso no se anota como `Dict`.
        """
        return conn.execute(stmt, params if params is not None else {})

    @staticmethod
    def fetch_one(conn: Connection, stmt, params: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        """Primera fila como dict, o None si no hay ninguna."""
        row = conn.execute(stmt, params or {}).mappings().first()
        return dict(row) if row else None

    @staticmethod
    def fetch_all(conn: Connection, stmt, params: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Todas las filas como lista de dicts (vacia si no hay ninguna)."""
        rows = conn.execute(stmt, params or {}).mappings().all()
        return [dict(r) for r in rows]

    @staticmethod
    def fetch_scalar(conn: Connection, stmt, params: Optional[Dict[str, Any]] = None) -> Any:
        """Primera columna de la primera fila, o None.

        Ojo: `.scalar()` no distingue "no hay fila" de "la fila trae NULL".
        Donde esa diferencia importe, usar `fetch_one`.
        """
        return conn.execute(stmt, params or {}).scalar()
