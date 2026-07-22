import logging
from typing import List, Dict, Any, Optional
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from sqlalchemy.engine import Connection
from app.exceptions.category_exceptions import CategoryInUseException

logger = logging.getLogger(__name__)

class CategoryRepository:
    def get_all_categories(self, conn: Connection) -> List[Dict[str, Any]]:
        try:
            query = text("SELECT id, name FROM categories ORDER BY name ASC")
            rows = conn.execute(query).mappings().all()
            return [dict(r) for r in rows]
        except SQLAlchemyError as e:
            logger.exception("Error fetching categories")
            raise

    def get_category_by_name(self, conn: Connection, name: str) -> Optional[Dict[str, Any]]:
        try:
            query = text("SELECT id, name FROM categories WHERE name = :name")
            row = conn.execute(query, {"name": name}).mappings().first()
            return dict(row) if row else None
        except SQLAlchemyError as e:
            logger.error(f"Error fetching category by name {name}: {e}")
            raise

    def get_category_by_id(self, conn: Connection, category_id: int) -> Optional[Dict[str, Any]]:
        try:
            query = text("SELECT id, name FROM categories WHERE id = :id")
            row = conn.execute(query, {"id": category_id}).mappings().first()
            return dict(row) if row else None
        except SQLAlchemyError as e:
            logger.error(f"Error fetching category by id {category_id}: {e}")
            raise

    def insert_category(self, conn: Connection, name: str) -> int:
        try:
            query = text("INSERT INTO categories (name) VALUES (:name)")
            result = conn.execute(query, {"name": name})
            return result.lastrowid
        except SQLAlchemyError as e:
            logger.error(f"Error inserting category {name}: {e}")
            raise

    def update_category(self, conn: Connection, category_id: int, name: str) -> None:
        try:
            query = text("UPDATE categories SET name = :name WHERE id = :id")
            conn.execute(query, {"name": name, "id": category_id})
        except SQLAlchemyError as e:
            logger.error(f"Error updating category {category_id}: {e}")
            raise

    def delete_category(self, conn: Connection, category_id: int) -> bool:
        try:
            query = text("DELETE FROM categories WHERE id = :id")
            result = conn.execute(query, {"id": category_id})
            return result.rowcount > 0
        except IntegrityError:
            logger.warning(f"IntegrityError deleting category {category_id}")
            raise CategoryInUseException(
                "No se puede eliminar: hay preguntas (activas o de evaluaciones historicas) que usan esta categoria."
            )
        except SQLAlchemyError as e:
            logger.error(f"Error deleting category {category_id}: {e}")
            raise
