import logging
from typing import List, Dict, Any, Optional
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.engine import Connection

logger = logging.getLogger(__name__)

class FormRepository:
    def get_role_id_by_name(self, conn: Connection, role_name: str) -> Optional[int]:
        try:
            query = text("SELECT id FROM roles WHERE name = :name")
            return conn.execute(query, {"name": role_name}).scalar()
        except SQLAlchemyError as e:
            logger.error(f"Error fetching role {role_name}: {e}")
            raise

    def get_forms_by_role_id(self, conn: Connection, role_id: int) -> List[Dict[str, Any]]:
        try:
            query = text("""
                SELECT id, title, description, target_role_id, is_active, is_form, created_at
                FROM forms
                WHERE target_role_id = :role_id
                ORDER BY id DESC
            """)
            rows = conn.execute(query, {"role_id": role_id}).mappings().all()
            return [dict(r) for r in rows]
        except SQLAlchemyError as e:
            logger.error(f"Error fetching forms for role_id {role_id}: {e}")
            raise

    def get_form_by_id(self, conn: Connection, form_id: int) -> Optional[Dict[str, Any]]:
        try:
            query = text("""
                SELECT id, title, description, target_role_id, is_active, is_form, created_at
                FROM forms
                WHERE id = :id
            """)
            row = conn.execute(query, {"id": form_id}).mappings().first()
            return dict(row) if row else None
        except SQLAlchemyError as e:
            logger.error(f"Error fetching form {form_id}: {e}")
            raise

    def get_questions_for_forms(self, conn: Connection, form_ids: List[int]) -> List[Dict[str, Any]]:
        if not form_ids:
            return []
        try:
            query = text("""
                SELECT q.id, q.form_id, q.text, q.category_id, c.name AS category, q.input_type, q.sort_order, q.weight_percent
                FROM questions q
                JOIN categories c ON q.category_id = c.id
                WHERE q.form_id IN :form_ids AND q.is_active = TRUE
                ORDER BY q.sort_order ASC
            """)
            rows = conn.execute(query, {"form_ids": tuple(form_ids)}).mappings().all()
            return [dict(r) for r in rows]
        except SQLAlchemyError as e:
            logger.error(f"Error fetching questions for forms {form_ids}: {e}")
            raise

    def deactivate_forms_for_role(self, conn: Connection, role_id: int) -> None:
        try:
            query = text("UPDATE forms SET is_active = FALSE WHERE target_role_id = :role_id")
            conn.execute(query, {"role_id": role_id})
        except SQLAlchemyError as e:
            logger.error(f"Error deactivating forms for role {role_id}: {e}")
            raise

    def insert_form(self, conn: Connection, form_data: Dict[str, Any]) -> int:
        try:
            query = text("""
                INSERT INTO forms (title, description, target_role_id, is_active, is_form)
                VALUES (:title, :description, :target_role_id, TRUE, :is_form)
            """)
            result = conn.execute(query, form_data)
            return result.lastrowid
        except SQLAlchemyError as e:
            logger.error(f"Error inserting form: {e}")
            raise

    def get_existing_category_ids(self, conn: Connection, category_ids: List[int]) -> set:
        if not category_ids:
            return set()
        try:
            query = text("SELECT id FROM categories WHERE id IN :ids")
            rows = conn.execute(query, {"ids": tuple(category_ids)}).all()
            return {r[0] for r in rows}
        except SQLAlchemyError as e:
            logger.error(f"Error fetching categories {category_ids}: {e}")
            raise

    def insert_questions(self, conn: Connection, questions_data: List[Dict[str, Any]]) -> None:
        if not questions_data:
            return
        try:
            query = text("""
                INSERT INTO questions (form_id, text, category_id, input_type, sort_order, weight_percent, is_active)
                VALUES (:form_id, :text, :category_id, :input_type, :sort_order, :weight_percent, TRUE)
            """)
            conn.execute(query, questions_data)
        except SQLAlchemyError as e:
            logger.error(f"Error inserting questions: {e}")
            raise

    def update_form(self, conn: Connection, form_id: int, values: Dict[str, Any]) -> None:
        if not values:
            return
        try:
            set_clause = ", ".join(f"{col} = :{col}" for col in values)
            query = text(f"UPDATE forms SET {set_clause} WHERE id = :id")
            conn.execute(query, {**values, "id": form_id})
        except SQLAlchemyError as e:
            logger.error(f"Error updating form {form_id}: {e}")
            raise

    def deactivate_form(self, conn: Connection, form_id: int) -> None:
        try:
            query = text("UPDATE forms SET is_active = FALSE WHERE id = :id")
            conn.execute(query, {"id": form_id})
        except SQLAlchemyError as e:
            logger.error(f"Error deactivating form {form_id}: {e}")
            raise

    def has_active_period(self, conn: Connection) -> bool:
        try:
            query = text("SELECT 1 FROM periods WHERE is_active = TRUE LIMIT 1")
            result = conn.execute(query).first()
            return bool(result)
        except SQLAlchemyError as e:
            logger.error(f"Error checking active periods: {e}")
            raise
