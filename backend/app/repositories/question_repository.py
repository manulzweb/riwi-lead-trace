from typing import List, Dict, Any, Optional
from sqlalchemy import text
from sqlalchemy.engine import Connection

from app.repositories.base_repository import BaseRepository


class QuestionRepository(BaseRepository):
    def _base_query(self) -> str:
        return """
            SELECT q.id, q.form_id, q.text, q.category_id, c.name AS category,
                   q.input_type, q.sort_order, q.weight_percent, q.is_active
            FROM questions q
            JOIN categories c ON q.category_id = c.id
        """

    def has_active_period(self, conn: Connection) -> bool:
        query = text("SELECT 1 FROM periods WHERE is_active = TRUE LIMIT 1")
        return bool(self.execute(conn, query).first())

    def is_template_form(self, conn: Connection, form_id: int) -> Optional[bool]:
        """Si el formulario es plantilla. None cuando el formulario no existe.

        Se distinguen los tres casos a proposito: `_assert_no_active_period`
        solo protege el instrumento VIVO, y con un formulario inexistente debe
        dejar pasar para que la validacion de "no encontrado" que viene despues
        sea la que responda (404), no un 409 enganoso.
        """
        query = text("SELECT is_template FROM forms WHERE id = :form_id")
        row = self.execute(conn, query, {"form_id": form_id}).first()
        return bool(row[0]) if row else None

    def get_question_by_id(self, conn: Connection, question_id: int) -> Optional[Dict[str, Any]]:
        query = text(self._base_query() + " WHERE q.id = :id")
        return self.fetch_one(conn, query, {"id": question_id})

    def get_questions_by_form(self, conn: Connection, form_id: int, only_active: bool) -> List[Dict[str, Any]]:
        query_str = self._base_query() + " WHERE q.form_id = :form_id"
        if only_active:
            query_str += " AND q.is_active = TRUE"
        query_str += " ORDER BY q.sort_order ASC"

        return self.fetch_all(conn, text(query_str), {"form_id": form_id})

    def deactivate_question(self, conn: Connection, question_id: int) -> None:
        query = text("UPDATE questions SET is_active = FALSE WHERE id = :id")
        self.execute(conn, query, {"id": question_id})

    def insert_question(self, conn: Connection, question_data: Dict[str, Any]) -> int:
        query = text("""
            INSERT INTO questions (form_id, text, category_id, input_type, sort_order, weight_percent, is_active)
            VALUES (:form_id, :text, :category_id, :input_type, :sort_order, :weight_percent, TRUE)
        """)
        return self.execute(conn, query, question_data).lastrowid

    def form_exists(self, conn: Connection, form_id: int) -> bool:
        query = text("SELECT 1 FROM forms WHERE id = :id")
        return bool(self.execute(conn, query, {"id": form_id}).first())

    def category_exists(self, conn: Connection, category_id: int) -> bool:
        query = text("SELECT 1 FROM categories WHERE id = :id")
        return bool(self.execute(conn, query, {"id": category_id}).first())

    def get_next_sort_order(self, conn: Connection, form_id: int) -> int:
        query = text("SELECT COALESCE(MAX(sort_order), -1) + 1 FROM questions WHERE form_id = :form_id")
        return self.fetch_scalar(conn, query, {"form_id": form_id})

    def update_weights_batch(self, conn: Connection, weights_data: List[Dict[str, Any]]) -> None:
        if not weights_data:
            return
        query = text("UPDATE questions SET weight_percent = :weight_percent WHERE id = :id")
        # weights_data es una LISTA de dicts -> executemany de SQLAlchemy.
        self.execute(conn, query, weights_data)
