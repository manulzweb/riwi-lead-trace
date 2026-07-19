from sqlalchemy import text
from datetime import datetime
from fastapi import HTTPException, status
from typing import Optional
from app.config.database import engine
from app.schemas.evaluation import EvaluationCreate

def create_evaluation(eval_data: EvaluationCreate):
    evaluator_id = eval_data.evaluator_id

    with engine.begin() as conn:
        period_query = text("SELECT is_active FROM periods WHERE id = :period_id")
        period_row = conn.execute(period_query, {"period_id": eval_data.period_id}).first()
        if period_row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El periodo indicado no existe."
            )
        if not period_row[0]:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="No se pueden crear ni enviar evaluaciones: el periodo no esta activo."
            )

        check_query = text("""
            SELECT id FROM evaluations
            WHERE evaluator_id = :evaluator_id
              AND evaluatee_id = :evaluatee_id
              AND period_id = :period_id
        """)
        existing = conn.execute(check_query, {
            "evaluator_id": evaluator_id,
            "evaluatee_id": eval_data.evaluatee_id,
            "period_id": eval_data.period_id
        }).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya has evaluado a esta persona en el periodo seleccionado."
            )

        db_evaluator_id = None if eval_data.is_anonymous else evaluator_id

        if evaluator_id is not None:
            evaluatee_query = text("""
                SELECT u.clan_id, GROUP_CONCAT(r.name) as roles
                FROM users u
                LEFT JOIN user_roles ur ON u.id = ur.user_id
                LEFT JOIN roles r ON ur.role_id = r.id
                WHERE u.id = :evaluatee_id
                GROUP BY u.id
            """)
            evaluatee_row = conn.execute(evaluatee_query, {"evaluatee_id": eval_data.evaluatee_id}).mappings().first()
            
            if not evaluatee_row:
                raise HTTPException(status_code=404, detail="Evaluado no encontrado")
                
            evaluatee_roles = evaluatee_row["roles"].split(",") if evaluatee_row["roles"] else []
            
            if "tutor" not in evaluatee_roles and "team_leader" not in evaluatee_roles:
                raise HTTPException(status_code=403, detail="El usuario a evaluar debe tener rol de Tutor o Team Leader.")
            
            evaluator_query = text("SELECT clan_id FROM users WHERE id = :evaluator_id")
            evaluator_row = conn.execute(evaluator_query, {"evaluator_id": evaluator_id}).mappings().first()
            evaluator_clan = evaluator_row["clan_id"] if evaluator_row else None

            if "team_leader" in evaluatee_roles:
                tl_clans_query = text("SELECT clan_id FROM team_leader_clans WHERE user_id = :tl_id")
                tl_clans_rows = conn.execute(tl_clans_query, {"tl_id": eval_data.evaluatee_id}).all()
                tl_clans = [r.clan_id for r in tl_clans_rows]
                if evaluator_clan not in tl_clans:
                    raise HTTPException(status_code=403, detail="No puedes evaluar a un Team Leader que no tiene a cargo tu clan.")
            else:
                if evaluator_clan != evaluatee_row["clan_id"]:
                    raise HTTPException(status_code=403, detail="Solo puedes evaluar a usuarios de tu mismo clan.")

        try:
            insert_eval_query = text("""
                INSERT INTO evaluations (evaluator_id, evaluatee_id, template_id, period_id, is_anonymous, status, submitted_at)
                VALUES (:evaluator_id, :evaluatee_id, :template_id, :period_id, :is_anonymous, :status, :submitted_at)
            """)
            result = conn.execute(insert_eval_query, {
                "evaluator_id": db_evaluator_id,
                "evaluatee_id": eval_data.evaluatee_id,
                "template_id": eval_data.template_id,
                "period_id": eval_data.period_id,
                "is_anonymous": eval_data.is_anonymous,
                "status": eval_data.status,
                "submitted_at": datetime.now() if eval_data.status == "submitted" else None
            })
            evaluation_id = result.lastrowid

            insert_answer_query = text("""
                INSERT INTO evaluation_answers (evaluation_id, question_id, score, comment)
                VALUES (:evaluation_id, :question_id, :score, :comment)
            """)
            for ans in eval_data.answers:
                conn.execute(insert_answer_query, {
                    "evaluation_id": evaluation_id,
                    "question_id": ans.question_id,
                    "score": ans.score,
                    "comment": ans.comment
                })
        except Exception:
            raise HTTPException(status_code=500, detail="Error interno al guardar la evaluación.")
            
    return get_evaluation_detail(evaluation_id)

def _get_answers(conn, evaluation_id: int):
    query = text("SELECT id, question_id, score, comment FROM evaluation_answers WHERE evaluation_id = :evaluation_id")
    result = conn.execute(query, {"evaluation_id": evaluation_id})
    return [dict(row) for row in result.mappings()]

def get_evaluation_detail(evaluation_id: int):
    with engine.connect() as conn:
        query = text("""
            SELECT id, evaluator_id, evaluatee_id, template_id, period_id, is_anonymous, status, created_at, submitted_at
            FROM evaluations WHERE id = :id
        """)
        eval_row = conn.execute(query, {"id": evaluation_id}).mappings().first()
        if not eval_row:
            return None

        eval_dict = dict(eval_row)
        eval_dict["answers"] = _get_answers(conn, evaluation_id)
        return eval_dict

def get_evaluations_by_evaluator(evaluator_id: int, skip: int = 0, limit: int = 100):
    with engine.connect() as conn:
        query = text("""
            SELECT id, evaluator_id, evaluatee_id, template_id, period_id, is_anonymous, status, created_at, submitted_at
            FROM evaluations WHERE evaluator_id = :evaluator_id
            LIMIT :limit OFFSET :skip
        """)
        result = conn.execute(query, {"evaluator_id": evaluator_id, "limit": limit, "skip": skip})

        evaluations = []
        for row in result.mappings():
            eval_dict = dict(row)
            eval_dict["answers"] = _get_answers(conn, eval_dict["id"])
            evaluations.append(eval_dict)

        return evaluations

def get_evaluations_by_evaluatee(evaluatee_id: int, period_id: Optional[int] = None, hide_evaluator: bool = False, skip: int = 0, limit: int = 100):
    with engine.connect() as conn:
        query_str = """
            SELECT id, evaluator_id, evaluatee_id, template_id, period_id, is_anonymous, status, created_at, submitted_at
            FROM evaluations WHERE evaluatee_id = :evaluatee_id
        """
        params = {"evaluatee_id": evaluatee_id, "limit": limit, "skip": skip}
        if period_id is not None:
            query_str += " AND period_id = :period_id"
            params["period_id"] = period_id

        query_str += " LIMIT :limit OFFSET :skip"

        result = conn.execute(text(query_str), params)

        evaluations = []
        for row in result.mappings():
            eval_dict = dict(row)
            if eval_dict["is_anonymous"] or hide_evaluator:
                eval_dict["evaluator_id"] = None

            eval_dict["answers"] = _get_answers(conn, eval_dict["id"])
            evaluations.append(eval_dict)

        return evaluations
