from typing import List, Dict, Any, Optional
from sqlalchemy import text

from app.repositories.base_repository import BaseRepository


class EvaluationRepository(BaseRepository):
    def get_period_active_status(self, conn, period_id: int) -> Optional[bool]:
        # fetch_scalar NO sirve aqui: devuelve None tanto si el periodo no
        # existe como si is_active fuera NULL, y el servicio distingue
        # "periodo inexistente" (404) de "periodo cerrado" (409).
        query = text("SELECT is_active FROM periods WHERE id = :period_id")
        row = self.execute(conn, query, {"period_id": period_id}).first()
        return row[0] if row else None

    def check_evaluation_exists(self, conn, evaluator_id: int, evaluatee_id: int, period_id: int) -> bool:
        """Un evaluador participa una sola vez por evaluado y periodo.

        La participacion vive en `evaluation_submissions`, no en `evaluations`:
        asi el chequeo tambien cubre las evaluaciones anonimas (antes, con
        `evaluations.evaluator_id` en NULL, las anonimas eran invisibles aqui y
        se podian repetir sin limite).
        """
        query = text("""
            SELECT 1 FROM evaluation_submissions
            WHERE evaluator_id = :evaluator_id
              AND evaluatee_id = :evaluatee_id
              AND period_id = :period_id
            LIMIT 1
        """)
        result = self.execute(conn, query, {
            "evaluator_id": evaluator_id,
            "evaluatee_id": evaluatee_id,
            "period_id": period_id
        }).first()
        return bool(result)

    def get_user_clan_and_roles(self, conn, user_id: int) -> Optional[Dict[str, Any]]:
        query = text("""
            SELECT u.clan_id, u.email, GROUP_CONCAT(r.name) as roles
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN roles r ON ur.role_id = r.id
            WHERE u.id = :user_id
            GROUP BY u.id
        """)
        return self.fetch_one(conn, query, {"user_id": user_id})

    def get_team_leader_clans(self, conn, tl_id: int) -> List[int]:
        query = text("SELECT clan_id FROM team_leader_clans WHERE user_id = :tl_id")
        return [r["clan_id"] for r in self.fetch_all(conn, query, {"tl_id": tl_id})]

    def insert_evaluation(self, conn, eval_data: Dict[str, Any]) -> int:
        """Inserta el CONTENIDO de la evaluacion. Ya no guarda `evaluator_id`:
        quien participo se registra aparte, en `evaluation_submissions`."""
        query = text("""
            INSERT INTO evaluations (evaluatee_id, form_id, period_id, is_anonymous, status, submitted_at)
            VALUES (:evaluatee_id, :form_id, :period_id, :is_anonymous, :status, :submitted_at)
        """)
        return self.execute(conn, query, eval_data).lastrowid

    def insert_evaluation_submission(self, conn, submission_data: Dict[str, Any]) -> int:
        """Registra la PARTICIPACION del evaluador.

        Lanza `IntegrityError` si se viola `uq_submission_once`; el servicio lo
        traduce a 409. Por eso aqui NO se captura: llegaria envuelta y el
        servicio dejaria de reconocerla.
        """
        query = text("""
            INSERT INTO evaluation_submissions (evaluator_id, evaluatee_id, period_id, evaluation_id)
            VALUES (:evaluator_id, :evaluatee_id, :period_id, :evaluation_id)
        """)
        return self.execute(conn, query, submission_data).lastrowid

    def insert_evaluation_details(self, conn, answers_data: List[Dict[str, Any]]) -> None:
        if not answers_data:
            return
        query = text("""
            INSERT INTO evaluation_details (evaluation_id, question_id, score, comment)
            VALUES (:evaluation_id, :question_id, :score, :comment)
        """)
        # Lista de dicts -> executemany (bulk insert) de SQLAlchemy.
        self.execute(conn, query, answers_data)

    def get_evaluation_by_id(self, conn, evaluation_id: int) -> Optional[Dict[str, Any]]:
        query = text("""
            SELECT id, evaluatee_id, form_id, period_id, is_anonymous, status, created_at, submitted_at
            FROM evaluations WHERE id = :id
        """)
        return self.fetch_one(conn, query, {"id": evaluation_id})

    def get_submissions_by_evaluator(self, conn, evaluator_id: int, skip: int, limit: int) -> List[Dict[str, Any]]:
        """Historial de participacion de un evaluador, con su contenido.

        El LEFT JOIN recupera tambien el contenido de las anonimas: `evaluation_id`
        se guarda siempre (regla 1), asi que el Coder puede releer lo que escribio.
        El LEFT (y no INNER) cubre el caso de una evaluacion borrada, donde la FK
        deja `evaluation_id` en NULL y las columnas de contenido salen vacias.

        OJO: esta query devuelve el vinculo evaluador->contenido sin filtrar por
        `is_anonymous`. Es correcto aqui porque el evaluador solo ve lo suyo
        (`WHERE s.evaluator_id = :evaluator_id`). Cualquier query nueva que no
        acote por evaluador DEBE filtrar `is_anonymous` a mano -- el esquema no
        lo impide.
        """
        query = text("""
            SELECT
                s.id            AS participation_id,
                s.evaluatee_id  AS evaluatee_id,
                s.period_id     AS period_id,
                s.evaluation_id AS evaluation_id,
                s.created_at    AS created_at,
                e.form_id       AS form_id,
                e.is_anonymous  AS eval_is_anonymous,
                e.status        AS status,
                e.submitted_at  AS submitted_at
            FROM evaluation_submissions s
            LEFT JOIN evaluations e ON e.id = s.evaluation_id
            WHERE s.evaluator_id = :evaluator_id
            ORDER BY s.id DESC
            LIMIT :limit OFFSET :skip
        """)
        return self.fetch_all(conn, query, {"evaluator_id": evaluator_id, "limit": limit, "skip": skip})

    def get_evaluator_ids_for_evaluations(self, conn, evaluation_ids: List[int]) -> Dict[int, int]:
        """Mapa evaluation_id -> evaluator_id, SOLO para evaluaciones no anonimas."""
        if not evaluation_ids:
            return {}
        query = text("""
            SELECT s.evaluation_id, s.evaluator_id
            FROM evaluation_submissions s
            JOIN evaluations e ON e.id = s.evaluation_id
            WHERE s.evaluation_id IN :eval_ids
              AND e.is_anonymous = FALSE
        """)
        rows = self.fetch_all(conn, query, {"eval_ids": tuple(evaluation_ids)})
        return {r["evaluation_id"]: r["evaluator_id"] for r in rows}

    def get_evaluations_by_evaluatee(self, conn, evaluatee_id: int, period_id: Optional[int], skip: int, limit: int) -> List[Dict[str, Any]]:
        # status = 'submitted': un borrador es feedback a medio escribir que el
        # evaluador nunca confirmo; el evaluado no debe verlo. Mismo criterio que
        # vw_period_metrics y get_total_evaluations.
        query_str = """
            SELECT id, evaluatee_id, form_id, period_id, is_anonymous, status, created_at, submitted_at
            FROM evaluations WHERE evaluatee_id = :evaluatee_id AND status = 'submitted'
        """
        params = {"evaluatee_id": evaluatee_id, "limit": limit, "skip": skip}
        if period_id is not None:
            query_str += " AND period_id = :period_id"
            params["period_id"] = period_id

        # Sin ORDER BY, MySQL no garantiza orden estable entre paginas.
        query_str += " ORDER BY submitted_at DESC, id DESC LIMIT :limit OFFSET :skip"

        return self.fetch_all(conn, text(query_str), params)

    def get_answers_for_evaluations(self, conn, evaluation_ids: List[int]) -> List[Dict[str, Any]]:
        if not evaluation_ids:
            return []
        query = text("SELECT id, evaluation_id, question_id, score, comment FROM evaluation_details WHERE evaluation_id IN :eval_ids")
        # La tupla permite a SQLAlchemy expandir correctamente la clausula IN.
        return self.fetch_all(conn, query, {"eval_ids": tuple(evaluation_ids)})
