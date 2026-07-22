import logging
from typing import List, Dict, Any, Optional
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.engine import Connection
from app.exceptions.category_exceptions import CategoryInUseException
from app.repositories.base_repository import BaseRepository

logger = logging.getLogger(__name__)

class CategoryRepository(BaseRepository):
    def get_all_categories(self, conn: Connection) -> List[Dict[str, Any]]:
        query = text("SELECT id, name FROM categories ORDER BY name ASC")
        return self.fetch_all(conn, query)

    def get_category_by_name(self, conn: Connection, name: str) -> Optional[Dict[str, Any]]:
        query = text("SELECT id, name FROM categories WHERE name = :name")
        return self.fetch_one(conn, query, {"name": name})

    def get_category_by_id(self, conn: Connection, category_id: int) -> Optional[Dict[str, Any]]:
        query = text("SELECT id, name FROM categories WHERE id = :id")
        return self.fetch_one(conn, query, {"id": category_id})

    def insert_category(self, conn: Connection, name: str) -> int:
        query = text("INSERT INTO categories (name) VALUES (:name)")
        return self.execute(conn, query, {"name": name}).lastrowid

    def update_category(self, conn: Connection, category_id: int, name: str) -> None:
        query = text("UPDATE categories SET name = :name WHERE id = :id")
        self.execute(conn, query, {"name": name, "id": category_id})

    def delete_category(self, conn: Connection, category_id: int) -> bool:
        query = text("DELETE FROM categories WHERE id = :id")
        try:
            return self.execute(conn, query, {"id": category_id}).rowcount > 0
        except IntegrityError:
            # Se conserva: NO re-lanza la misma excepcion, la traduce a una del
            # dominio que el route mapea a 409. La FK fk_question_category es
            # ON DELETE RESTRICT, asi que la BD es quien decide (ver CLAUDE.md).
            # `warning` y no `exception`: es un rechazo esperado, no un fallo.
            logger.warning("Categoria %s en uso, no se puede borrar", category_id)
            raise CategoryInUseException(
                "No se puede eliminar: hay preguntas (activas o de evaluaciones historicas) que usan esta categoria."
            )
