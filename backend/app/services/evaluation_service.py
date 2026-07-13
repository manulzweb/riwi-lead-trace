from sqlalchemy import select, insert, update, delete, and_
from datetime import datetime
from fastapi import HTTPException, status
from typing import Optional
from app.config.database import conn
from app.models.evaluation import evaluations_table, evaluation_answers_table
from app.models.user import users_table
from app.schemas.evaluation import EvaluationCreate

def create_evaluation(eval_data: EvaluationCreate):
    """Crea una evaluación y sus respuestas correspondientes."""
    # Regla de negocio: Validar duplicado para evaluaciones no anónimas
    if eval_data.evaluator_id and not eval_data.is_anonymous:
        stmt_check = select(evaluations_table.c.id).where(
            and_(
                evaluations_table.c.evaluator_id == eval_data.evaluator_id,
                evaluations_table.c.evaluatee_id == eval_data.evaluatee_id,
                evaluations_table.c.period_id == eval_data.period_id
            )
        )
        existing = conn.execute(stmt_check).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya has evaluado a esta persona en el periodo seleccionado."
            )

    # Si es anónima, no persistimos el evaluator_id (Anonimato real)
    db_evaluator_id = None if eval_data.is_anonymous else eval_data.evaluator_id

    # Insertar evaluación
    eval_stmt = insert(evaluations_table).values(
        evaluator_id=db_evaluator_id,
        evaluatee_id=eval_data.evaluatee_id,
        template_id=eval_data.template_id,
        period_id=eval_data.period_id,
        is_anonymous=eval_data.is_anonymous,
        status=eval_data.status,
        submitted_at=datetime.now() if eval_data.status == "submitted" else None
    )
    result = conn.execute(eval_stmt)
    evaluation_id = result.lastrowid

    # Insertar respuestas
    for ans in eval_data.answers:
        ans_stmt = insert(evaluation_answers_table).values(
            evaluation_id=evaluation_id,
            question_id=ans.question_id,
            score=ans.score,
            comment=ans.comment
        )
        conn.execute(ans_stmt)

    conn.commit()
    return get_evaluation_detail(evaluation_id)

def get_evaluation_detail(evaluation_id: int):
    """Obtiene el detalle completo de una evaluación con sus respuestas."""
    stmt = select(evaluations_table).where(evaluations_table.c.id == evaluation_id)
    eval_row = conn.execute(stmt).mappings().first()
    if not eval_row:
        return None

    eval_dict = dict(eval_row)

    # Obtener respuestas
    answers_stmt = select(evaluation_answers_table).where(
        evaluation_answers_table.c.evaluation_id == evaluation_id
    )
    answers_result = conn.execute(answers_stmt)
    eval_dict["answers"] = [dict(row) for row in answers_result.mappings()]

    return eval_dict

def get_evaluations_by_evaluator(evaluator_id: int):
    """Obtiene las evaluaciones realizadas por un evaluador (solo las no anónimas o borradores)."""
    stmt = select(evaluations_table).where(evaluations_table.c.evaluator_id == evaluator_id)
    result = conn.execute(stmt)
    
    evaluations = []
    for row in result.mappings():
        eval_dict = dict(row)
        # Añadir respuestas
        answers_stmt = select(evaluation_answers_table).where(
            evaluation_answers_table.c.evaluation_id == eval_dict["id"]
        )
        answers_result = conn.execute(answers_stmt)
        eval_dict["answers"] = [dict(r) for r in answers_result.mappings()]
        evaluations.append(eval_dict)
        
    return evaluations

def get_evaluations_by_evaluatee(evaluatee_id: int, period_id: Optional[int] = None):
    """Obtiene el historial de evaluaciones recibidas por un evaluado, opcionalmente filtrado por periodo."""
    # Nota: Respetamos el anonimato eliminando el evaluator_id si la evaluación es anónima
    conditions = [evaluations_table.c.evaluatee_id == evaluatee_id]
    if period_id is not None:
        conditions.append(evaluations_table.c.period_id == period_id)

    stmt = select(evaluations_table).where(and_(*conditions))
    result = conn.execute(stmt)
    
    evaluations = []
    for row in result.mappings():
        eval_dict = dict(row)
        if eval_dict["is_anonymous"]:
            eval_dict["evaluator_id"] = None  # Asegurar anonimato
            
        answers_stmt = select(evaluation_answers_table).where(
            evaluation_answers_table.c.evaluation_id == eval_dict["id"]
        )
        answers_result = conn.execute(answers_stmt)
        eval_dict["answers"] = [dict(r) for r in answers_result.mappings()]
        evaluations.append(eval_dict)
        
    return evaluations
