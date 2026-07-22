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
        try:
            query = text(f"SELECT {self._COLUMNS} FROM forms {where} ORDER BY id DESC")
            rows = conn.execute(query, params).mappings().all()
            return [dict(r) for r in rows]
        except SQLAlchemyError as e:
            logger.error(f"Error fetching forms (role_id={role_id}, kind={kind}): {e}")
            raise

    def get_form_by_id(self, conn: Connection, form_id: int) -> Optional[Dict[str, Any]]:
        try:
            query = text(f"SELECT {self._COLUMNS} FROM forms WHERE id = :id")
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
        """Retira el formulario vivo anterior del rol. NO toca plantillas
        (is_template = TRUE): una plantilla es inerte y no compite por ser el
        formulario activo."""
        try:
            query = text("UPDATE forms SET is_active = FALSE WHERE target_role_id = :role_id AND is_template = FALSE")
            conn.execute(query, {"role_id": role_id})
        except SQLAlchemyError as e:
            logger.error(f"Error deactivating forms for role {role_id}: {e}")
            raise

    def insert_form(self, conn: Connection, form_data: Dict[str, Any]) -> int:
        try:
            query = text("""
                INSERT INTO forms (title, description, target_role_id, is_active, is_template)
                VALUES (:title, :description, :target_role_id, TRUE, :is_template)
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

    def count_evaluations_for_form(self, conn: Connection, form_id: int) -> int:
        """Cuantas evaluaciones referencian este formulario. Decide si se puede
        borrar de verdad o hay que archivarlo. NO es la autoridad final: el
        DELETE puede fallar igual por la FK, y form_service lo contempla."""
        try:
            query = text("SELECT COUNT(*) FROM evaluations WHERE form_id = :id")
            return int(conn.execute(query, {"id": form_id}).scalar() or 0)
        except SQLAlchemyError as e:
            logger.error(f"Error counting evaluations for form {form_id}: {e}")
            raise

    def delete_questions_for_form(self, conn: Connection, form_id: int) -> None:
        """Borra las preguntas del formulario. Necesario ANTES de delete_form:
        questions.form_id es ON DELETE RESTRICT, asi que sin esto ni un
        formulario sin usar se puede borrar. Si alguna pregunta tiene respuestas
        (evaluation_details.question_id, tambien RESTRICT) esto lanza
        IntegrityError -- que es exactamente lo que queremos: es la senal de que
        hay historial y el formulario debe archivarse en vez de borrarse."""
        try:
            query = text("DELETE FROM questions WHERE form_id = :id")
            conn.execute(query, {"id": form_id})
        except SQLAlchemyError as e:
            logger.error(f"Error deleting questions for form {form_id}: {e}")
            raise

    def delete_form(self, conn: Connection, form_id: int) -> None:
        """Borrado DURO. Solo valido si el formulario no tiene evaluaciones ni
        preguntas con respuestas; en cualquier otro caso la FK lo rechaza."""
        try:
            query = text("DELETE FROM forms WHERE id = :id")
            conn.execute(query, {"id": form_id})
        except SQLAlchemyError as e:
            logger.error(f"Error deleting form {form_id}: {e}")
            raise

    def archive_form(self, conn: Connection, form_id: int) -> None:
        """Retira el formulario de la grilla del admin SIN tocar su historial.
        Es lo maximo que se puede hacer con un formulario ya respondido: las FKs
        (evaluations.form_id, evaluation_details.question_id) hacen que borrarlo
        sea fisicamente imposible."""
        try:
            query = text("UPDATE forms SET archived_at = NOW(), is_active = FALSE WHERE id = :id")
            conn.execute(query, {"id": form_id})
        except SQLAlchemyError as e:
            logger.error(f"Error archiving form {form_id}: {e}")
            raise

    def has_active_period(self, conn: Connection) -> bool:
        try:
            query = text("SELECT 1 FROM periods WHERE is_active = TRUE LIMIT 1")
            result = conn.execute(query).first()
            return bool(result)
        except SQLAlchemyError as e:
            logger.error(f"Error checking active periods: {e}")
            raise
