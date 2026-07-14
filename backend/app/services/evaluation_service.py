from sqlalchemy import text
from datetime import datetime
from fastapi import HTTPException, status
from typing import Optional
from app.config.database import conn
from app.schemas.evaluation import EvaluationCreate

def create_evaluation(eval_data: EvaluationCreate, evaluator_id: int):
    """Crea una evaluación y sus respuestas correspondientes.

    evaluator_id viene del usuario autenticado (token), nunca del body del
    cliente, para que la validación de "no duplicado" no se pueda saltar.
    """
    # Regla de negocio: un evaluador no puede evaluar dos veces a la misma
    # persona en el mismo periodo. Esto corre siempre, sea anónima o no,
    # porque el registro se identifica por el evaluador real, no por lo
    # que el evaluado o el admin puedan ver después.
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

    # Si es anónima, no persistimos el evaluator_id (Anonimato real)
    db_evaluator_id = None if eval_data.is_anonymous else evaluator_id

    # Insertar evaluación
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

    # Insertar respuestas
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

    conn.commit()
    return get_evaluation_detail(evaluation_id)

def _get_answers(evaluation_id: int):
    query = text("SELECT id, question_id, score, comment FROM evaluation_answers WHERE evaluation_id = :evaluation_id")
    result = conn.execute(query, {"evaluation_id": evaluation_id})
    return [dict(row) for row in result.mappings()]

def get_evaluation_detail(evaluation_id: int):
    """Obtiene el detalle completo de una evaluación con sus respuestas."""
    query = text("""
        SELECT id, evaluator_id, evaluatee_id, template_id, period_id, is_anonymous, status, submitted_at
        FROM evaluations WHERE id = :id
    """)
    eval_row = conn.execute(query, {"id": evaluation_id}).mappings().first()
    if not eval_row:
        return None

    eval_dict = dict(eval_row)
    eval_dict["answers"] = _get_answers(evaluation_id)
    return eval_dict

def get_evaluations_by_evaluator(evaluator_id: int):
    """Obtiene las evaluaciones realizadas por un evaluador (solo las no anónimas o borradores)."""
    query = text("""
        SELECT id, evaluator_id, evaluatee_id, template_id, period_id, is_anonymous, status, submitted_at
        FROM evaluations WHERE evaluator_id = :evaluator_id
    """)
    result = conn.execute(query, {"evaluator_id": evaluator_id})

    evaluations = []
    for row in result.mappings():
        eval_dict = dict(row)
        eval_dict["answers"] = _get_answers(eval_dict["id"])
        evaluations.append(eval_dict)

    return evaluations

def get_evaluations_by_evaluatee(evaluatee_id: int, period_id: Optional[int] = None):
    """Obtiene el historial de evaluaciones recibidas por un evaluado, opcionalmente filtrado por periodo."""
    query_str = """
        SELECT id, evaluator_id, evaluatee_id, template_id, period_id, is_anonymous, status, submitted_at
        FROM evaluations WHERE evaluatee_id = :evaluatee_id
    """
    params = {"evaluatee_id": evaluatee_id}
    if period_id is not None:
        query_str += " AND period_id = :period_id"
        params["period_id"] = period_id

    result = conn.execute(text(query_str), params)

    evaluations = []
    for row in result.mappings():
        eval_dict = dict(row)
        if eval_dict["is_anonymous"]:
            eval_dict["evaluator_id"] = None  # Asegurar anonimato

        eval_dict["answers"] = _get_answers(eval_dict["id"])
        evaluations.append(eval_dict)

    return evaluations
