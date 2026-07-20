import logging
from typing import List, Dict, Any, Optional
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

logger = logging.getLogger(__name__)

class EvaluationRepository:
    def get_period_active_status(self, conn, period_id: int) -> Optional[bool]:
        try:
            query = text("SELECT is_active FROM periods WHERE id = :period_id")
            row = conn.execute(query, {"period_id": period_id}).first()
            return row[0] if row else None
        except SQLAlchemyError as e:
            logger.error(f"Error querying period {period_id}: {e}")
            raise

    def check_evaluation_exists(self, conn, evaluator_id: int, evaluatee_id: int, period_id: int) -> bool:
        try:
            query = text("""
                SELECT 1 FROM evaluations 
                WHERE evaluator_id = :evaluator_id 
                  AND evaluatee_id = :evaluatee_id 
                  AND period_id = :period_id
                LIMIT 1
            """)
            result = conn.execute(query, {
                "evaluator_id": evaluator_id,
                "evaluatee_id": evaluatee_id,
                "period_id": period_id
            }).first()
            return bool(result)
        except SQLAlchemyError as e:
            logger.error(f"Error checking evaluation existence: {e}")
            raise

    def get_user_clan_and_roles(self, conn, user_id: int) -> Optional[Dict[str, Any]]:
        try:
            query = text("""
                SELECT u.clan_id, GROUP_CONCAT(r.name) as roles
                FROM users u
                LEFT JOIN user_roles ur ON u.id = ur.user_id
                LEFT JOIN roles r ON ur.role_id = r.id
                WHERE u.id = :user_id
                GROUP BY u.id
            """)
            row = conn.execute(query, {"user_id": user_id}).mappings().first()
            return dict(row) if row else None
        except SQLAlchemyError as e:
            logger.error(f"Error fetching user {user_id} clan and roles: {e}")
            raise

    def get_team_leader_clans(self, conn, tl_id: int) -> List[int]:
        try:
            query = text("SELECT clan_id FROM team_leader_clans WHERE user_id = :tl_id")
            rows = conn.execute(query, {"tl_id": tl_id}).all()
            return [r.clan_id for r in rows]
        except SQLAlchemyError as e:
            logger.error(f"Error fetching team leader clans for {tl_id}: {e}")
            raise

    def insert_evaluation(self, conn, eval_data: Dict[str, Any]) -> int:
        try:
            query = text("""
                INSERT INTO evaluations (evaluator_id, evaluatee_id, form_id, period_id, is_anonymous, status, submitted_at)
                VALUES (:evaluator_id, :evaluatee_id, :form_id, :period_id, :is_anonymous, :status, :submitted_at)
            """)
            result = conn.execute(query, eval_data)
            return result.lastrowid
        except SQLAlchemyError as e:
            logger.error(f"Error inserting evaluation: {e}")
            raise

    def insert_evaluation_answers(self, conn, answers_data: List[Dict[str, Any]]) -> None:
        if not answers_data:
            return
        try:
            query = text("""
                INSERT INTO evaluation_answers (evaluation_id, question_id, score, comment)
                VALUES (:evaluation_id, :question_id, :score, :comment)
            """)
            # Pass a list of dicts to SQLAlchemy to trigger an executemany (bulk insert)
            conn.execute(query, answers_data)
        except SQLAlchemyError as e:
            logger.error(f"Error inserting evaluation answers: {e}")
            raise

    def get_evaluation_by_id(self, conn, evaluation_id: int) -> Optional[Dict[str, Any]]:
        try:
            query = text("""
                SELECT id, evaluator_id, evaluatee_id, form_id, period_id, is_anonymous, status, created_at, submitted_at
                FROM evaluations WHERE id = :id
            """)
            row = conn.execute(query, {"id": evaluation_id}).mappings().first()
            return dict(row) if row else None
        except SQLAlchemyError as e:
            logger.error(f"Error fetching evaluation by id {evaluation_id}: {e}")
            raise

    def get_evaluations_by_evaluator(self, conn, evaluator_id: int, skip: int, limit: int) -> List[Dict[str, Any]]:
        try:
            query = text("""
                SELECT id, evaluator_id, evaluatee_id, form_id, period_id, is_anonymous, status, created_at, submitted_at
                FROM evaluations WHERE evaluator_id = :evaluator_id
                LIMIT :limit OFFSET :skip
            """)
            rows = conn.execute(query, {"evaluator_id": evaluator_id, "limit": limit, "skip": skip}).mappings().all()
            return [dict(r) for r in rows]
        except SQLAlchemyError as e:
            logger.error(f"Error fetching evaluations by evaluator {evaluator_id}: {e}")
            raise

    def get_evaluations_by_evaluatee(self, conn, evaluatee_id: int, period_id: Optional[int], skip: int, limit: int) -> List[Dict[str, Any]]:
        try:
            query_str = """
                SELECT id, evaluator_id, evaluatee_id, form_id, period_id, is_anonymous, status, created_at, submitted_at
                FROM evaluations WHERE evaluatee_id = :evaluatee_id
            """
            params = {"evaluatee_id": evaluatee_id, "limit": limit, "skip": skip}
            if period_id is not None:
                query_str += " AND period_id = :period_id"
                params["period_id"] = period_id
            
            query_str += " LIMIT :limit OFFSET :skip"
            
            rows = conn.execute(text(query_str), params).mappings().all()
            return [dict(r) for r in rows]
        except SQLAlchemyError as e:
            logger.error(f"Error fetching evaluations by evaluatee {evaluatee_id}: {e}")
            raise

    def get_answers_for_evaluations(self, conn, evaluation_ids: List[int]) -> List[Dict[str, Any]]:
        if not evaluation_ids:
            return []
        try:
            query = text("SELECT id, evaluation_id, question_id, score, comment FROM evaluation_answers WHERE evaluation_id IN :eval_ids")
            # Tuple binding allows SQLAlchemy to correctly format the IN clause
            rows = conn.execute(query, {"eval_ids": tuple(evaluation_ids)}).mappings().all()
            return [dict(r) for r in rows]
        except SQLAlchemyError as e:
            logger.error(f"Error fetching answers for evaluation ids {evaluation_ids}: {e}")
            raise
