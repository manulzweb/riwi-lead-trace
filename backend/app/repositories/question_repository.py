import logging
from typing import List, Dict, Any, Optional
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.engine import Connection

logger = logging.getLogger(__name__)

class QuestionRepository:
    def _base_query(self) -> str:
        return """
            SELECT q.id, q.form_id, q.text, q.category_id, c.name AS category,
                   q.input_type, q.sort_order, q.weight_percent, q.is_active
            FROM questions q
            JOIN categories c ON q.category_id = c.id
        """

    def has_active_period(self, conn: Connection) -> bool:
        try:
            query = text("SELECT 1 FROM periods WHERE is_active = TRUE LIMIT 1")
            result = conn.execute(query).first()
            return bool(result)
        except SQLAlchemyError as e:
            logger.error(f"Error checking active periods: {e}")
            raise

    def get_question_by_id(self, conn: Connection, question_id: int) -> Optional[Dict[str, Any]]:
        try:
            query = text(self._base_query() + " WHERE q.id = :id")
            row = conn.execute(query, {"id": question_id}).mappings().first()
            return dict(row) if row else None
        except SQLAlchemyError as e:
            logger.error(f"Error fetching question {question_id}: {e}")
            raise

    def get_questions_by_form(self, conn: Connection, form_id: int, only_active: bool) -> List[Dict[str, Any]]:
        try:
            query_str = self._base_query() + " WHERE q.form_id = :form_id"
            if only_active:
                query_str += " AND q.is_active = TRUE"
            query_str += " ORDER BY q.sort_order ASC"
            
            rows = conn.execute(text(query_str), {"form_id": form_id}).mappings().all()
            return [dict(r) for r in rows]
        except SQLAlchemyError as e:
            logger.error(f"Error fetching questions for form {form_id}: {e}")
            raise

    def deactivate_question(self, conn: Connection, question_id: int) -> None:
        try:
            query = text("UPDATE questions SET is_active = FALSE WHERE id = :id")
            conn.execute(query, {"id": question_id})
        except SQLAlchemyError as e:
            logger.error(f"Error deactivating question {question_id}: {e}")
            raise

    def insert_question(self, conn: Connection, question_data: Dict[str, Any]) -> int:
        try:
            query = text("""
                INSERT INTO questions (form_id, text, category_id, input_type, sort_order, weight_percent, is_active)
                VALUES (:form_id, :text, :category_id, :input_type, :sort_order, :weight_percent, TRUE)
            """)
            result = conn.execute(query, question_data)
            return result.lastrowid
        except SQLAlchemyError as e:
            logger.error(f"Error inserting question: {e}")
            raise

    def form_exists(self, conn: Connection, form_id: int) -> bool:
        try:
            query = text("SELECT 1 FROM forms WHERE id = :id")
            result = conn.execute(query, {"id": form_id}).first()
            return bool(result)
        except SQLAlchemyError as e:
            logger.error(f"Error checking form {form_id}: {e}")
            raise

    def category_exists(self, conn: Connection, category_id: int) -> bool:
        try:
            query = text("SELECT 1 FROM categories WHERE id = :id")
            result = conn.execute(query, {"id": category_id}).first()
            return bool(result)
        except SQLAlchemyError as e:
            logger.error(f"Error checking category {category_id}: {e}")
            raise

    def get_next_sort_order(self, conn: Connection, form_id: int) -> int:
        try:
            query = text("SELECT COALESCE(MAX(sort_order), -1) + 1 FROM questions WHERE form_id = :form_id")
            return conn.execute(query, {"form_id": form_id}).scalar()
        except SQLAlchemyError as e:
            logger.error(f"Error getting next sort order for form {form_id}: {e}")
            raise

    def update_weights_batch(self, conn: Connection, weights_data: List[Dict[str, Any]]) -> None:
        if not weights_data:
            return
        try:
            query = text("UPDATE questions SET weight_percent = :weight_percent WHERE id = :id")
            conn.execute(query, weights_data)
        except SQLAlchemyError as e:
            logger.error(f"Error batch updating weights: {e}")
            raise
