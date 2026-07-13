from fastapi import APIRouter, HTTPException, Query, status, Depends
from typing import List, Optional
from app.schemas.evaluation import EvaluationCreate, EvaluationOut, EvaluationDetailOut
from app.services import evaluation_service
from app.deps import get_current_user

router = APIRouter()

@router.post("/evaluations", response_model=EvaluationDetailOut, status_code=status.HTTP_201_CREATED)
def create_evaluation(evaluation: EvaluationCreate):
    """Registra una nueva evaluación (borrador o enviada)."""
    return evaluation_service.create_evaluation(evaluation)

@router.get("/evaluations", response_model=List[EvaluationDetailOut])
def get_evaluations(
    evaluator_id: Optional[int] = Query(None, description="Filtrar por el ID del evaluador"),
    evaluatee_id: Optional[int] = Query(None, description="Filtrar por el ID del evaluado"),
    period_id: Optional[int] = Query(None, description="Filtrar por periodo (solo con evaluatee_id)"),
    current_user: dict = Depends(get_current_user)
):
    """Obtiene el historial de evaluaciones filtrado por evaluador o evaluado."""
    if evaluator_id is not None:
        return evaluation_service.get_evaluations_by_evaluator(evaluator_id)
    elif evaluatee_id is not None:
        # Regla de negocio: solo el Admin ve el histórico completo por evaluado
        if current_user["role"] != "admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin permiso")
        return evaluation_service.get_evaluations_by_evaluatee(evaluatee_id, period_id)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debe proporcionar al menos evaluator_id o evaluatee_id"
        )
