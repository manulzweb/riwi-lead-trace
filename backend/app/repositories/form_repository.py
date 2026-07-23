from typing import List, Dict, Any, Optional
from sqlalchemy import text
from sqlalchemy.engine import Connection

from app.repositories.base_repository import BaseRepository


class FormRepository(BaseRepository):
    def get_role_id_by_name(self, conn: Connection, role_name: str) -> Optional[int]:
        query = text("SELECT id FROM roles WHERE name = :name")
        return self.fetch_scalar(conn, query, {"name": role_name})

    # Columnas que se devuelven en todo SELECT de forms (evita repetir la lista).
    _COLUMNS = "id, title, description, target_role_id, is_active, is_template, archived_at, created_at"

    def get_forms(
        self,
        conn: Connection,
        role_id: Optional[int] = None,
        kind: str = "form",
        include_archived: bool = False,
    ) -> List[Dict[str, Any]]:
        """Lista formularios con filtros SEGUROS POR DEFECTO.

        Los defaults (`kind="form"`, `include_archived=False`) devuelven lo que
        necesita el Coder: solo el formulario VIVO y ACTIVO. Es deliberado --
        quien olvide pasar los parametros obtiene la respuesta mas restrictiva,
        nunca una plantilla ni un archivado. Antes este metodo no filtraba nada
        y una plantilla recien creada (id mas alto) se convertia en el
        formulario que respondian los coders.

        - kind="form"     -> is_template = FALSE AND is_active = TRUE
        - kind="template" -> is_template = TRUE
        - kind="all"      -> ambos, sin filtrar is_active
        """
        clauses = []
        params: Dict[str, Any] = {}

        if role_id is not None:
            clauses.append("target_role_id = :role_id")
            params["role_id"] = role_id

        if kind == "form":
            clauses.append("is_template = FALSE")
            clauses.append("is_active = TRUE")
        elif kind == "template":
            clauses.append("is_template = TRUE")
        # kind == "all": sin restriccion de tipo ni de is_active

        if not include_archived:
            clauses.append("archived_at IS NULL")

        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        query = text(f"SELECT {self._COLUMNS} FROM forms {where} ORDER BY id DESC")
        return self.fetch_all(conn, query, params)

    def get_form_by_id(self, conn: Connection, form_id: int) -> Optional[Dict[str, Any]]:
        query = text(f"SELECT {self._COLUMNS} FROM forms WHERE id = :id")
        return self.fetch_one(conn, query, {"id": form_id})

    def get_questions_for_forms(self, conn: Connection, form_ids: List[int]) -> List[Dict[str, Any]]:
        if not form_ids:
            return []
        query = text("""
            SELECT q.id, q.form_id, q.text, q.category_id, c.name AS category, q.input_type, q.sort_order, q.weight_percent
            FROM questions q
            JOIN categories c ON q.category_id = c.id
            WHERE q.form_id IN :form_ids AND q.is_active = TRUE
            ORDER BY q.sort_order ASC
        """)
        return self.fetch_all(conn, query, {"form_ids": tuple(form_ids)})

    def deactivate_forms_for_role(self, conn: Connection, role_id: int) -> None:
        """Retira el formulario vivo anterior del rol. NO toca plantillas
        (is_template = TRUE): una plantilla es inerte y no compite por ser el
        formulario activo."""
        query = text("UPDATE forms SET is_active = FALSE WHERE target_role_id = :role_id AND is_template = FALSE")
        self.execute(conn, query, {"role_id": role_id})

    def insert_form(self, conn: Connection, form_data: Dict[str, Any]) -> int:
        query = text("""
            INSERT INTO forms (title, description, target_role_id, is_active, is_template)
            VALUES (:title, :description, :target_role_id, FALSE, :is_template)
        """)
        return self.execute(conn, query, form_data).lastrowid

    def get_existing_category_ids(self, conn: Connection, category_ids: List[int]) -> set:
        if not category_ids:
            return set()
        # Devuelve tuplas de una columna, no filas con nombre: fetch_all no
        # aporta nada aqui y obligaria a un dict intermedio inutil.
        query = text("SELECT id FROM categories WHERE id IN :ids")
        rows = self.execute(conn, query, {"ids": tuple(category_ids)}).all()
        return {r[0] for r in rows}

    def insert_questions(self, conn: Connection, questions_data: List[Dict[str, Any]]) -> None:
        if not questions_data:
            return
        query = text("""
            INSERT INTO questions (form_id, text, category_id, input_type, sort_order, weight_percent, is_active)
            VALUES (:form_id, :text, :category_id, :input_type, :sort_order, :weight_percent, TRUE)
        """)
        # questions_data es una LISTA de dicts -> executemany de SQLAlchemy.
        self.execute(conn, query, questions_data)

    def update_form(self, conn: Connection, form_id: int, values: Dict[str, Any]) -> None:
        if not values:
            return
        set_clause = ", ".join(f"{col} = :{col}" for col in values)
        query = text(f"UPDATE forms SET {set_clause} WHERE id = :id")
        self.execute(conn, query, {**values, "id": form_id})

    def deactivate_form(self, conn: Connection, form_id: int) -> None:
        query = text("UPDATE forms SET is_active = FALSE WHERE id = :id")
        self.execute(conn, query, {"id": form_id})

    def count_evaluations_for_form(self, conn: Connection, form_id: int) -> int:
        """Cuantas evaluaciones referencian este formulario. Decide si se puede
        borrar de verdad o hay que archivarlo. NO es la autoridad final: el
        DELETE puede fallar igual por la FK, y form_service lo contempla."""
        query = text("SELECT COUNT(*) FROM evaluations WHERE form_id = :id")
        return int(self.fetch_scalar(conn, query, {"id": form_id}) or 0)

    def delete_questions_for_form(self, conn: Connection, form_id: int) -> None:
        """Borra las preguntas del formulario. Necesario ANTES de delete_form:
        questions.form_id es ON DELETE RESTRICT, asi que sin esto ni un
        formulario sin usar se puede borrar. Si alguna pregunta tiene respuestas
        (evaluation_details.question_id, tambien RESTRICT) esto lanza
        IntegrityError -- que es exactamente lo que queremos: es la senal de que
        hay historial y el formulario debe archivarse en vez de borrarse."""
        query = text("DELETE FROM questions WHERE form_id = :id")
        self.execute(conn, query, {"id": form_id})

    def delete_form(self, conn: Connection, form_id: int) -> None:
        """Borrado DURO. Solo valido si el formulario no tiene evaluaciones ni
        preguntas con respuestas; en cualquier otro caso la FK lo rechaza."""
        query = text("DELETE FROM forms WHERE id = :id")
        self.execute(conn, query, {"id": form_id})

    def archive_form(self, conn: Connection, form_id: int) -> None:
        """Retira el formulario de la grilla del admin SIN tocar su historial.
        Es lo maximo que se puede hacer con un formulario ya respondido: las FKs
        (evaluations.form_id, evaluation_details.question_id) hacen que borrarlo
        sea fisicamente imposible."""
        query = text("UPDATE forms SET archived_at = NOW(), is_active = FALSE WHERE id = :id")
        self.execute(conn, query, {"id": form_id})

    def has_active_period(self, conn: Connection) -> bool:
        query = text("SELECT 1 FROM periods WHERE is_active = TRUE LIMIT 1")
        return bool(self.execute(conn, query).first())
