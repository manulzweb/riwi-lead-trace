import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from app.config.database import engine
from app.schemas.evaluation import EvaluationCreate
from app.repositories.evaluation_repository import EvaluationRepository
from app.constants.evaluation_constants import EVALUATION_STATUS_SUBMITTED, ROLE_TEAM_LEADER, ROLE_TUTOR
from app.exceptions.evaluation_exceptions import (
    PeriodNotFoundException, PeriodNotActiveException, EvaluationAlreadyExistsException,
    EvaluateeNotFoundException, InvalidRoleException, InvalidClanException
)

logger = logging.getLogger(__name__)

class EvaluationService:
    def __init__(self, repository: EvaluationRepository = None):
        # Allow dependency injection, default to a new instance if not provided
        self.repo = repository or EvaluationRepository()

    def _validate_period(self, conn, period_id: int):
        is_active = self.repo.get_period_active_status(conn, period_id)
        if is_active is None:
            raise PeriodNotFoundException("El periodo indicado no existe.")
        if not is_active:
            raise PeriodNotActiveException("No se pueden crear ni enviar evaluaciones: el periodo no esta activo.")

    def _validate_permissions(self, conn, evaluator_id: int, evaluatee_id: int):
        evaluatee_info = self.repo.get_user_clan_and_roles(conn, evaluatee_id)
        if not evaluatee_info:
            raise EvaluateeNotFoundException("Evaluado no encontrado")
            
        evaluatee_roles = evaluatee_info["roles"].split(",") if evaluatee_info["roles"] else []
        
        if ROLE_TUTOR not in evaluatee_roles and ROLE_TEAM_LEADER not in evaluatee_roles:
            raise InvalidRoleException("El usuario a evaluar debe tener rol de Tutor o Team Leader.")
        
        evaluator_info = self.repo.get_user_clan_and_roles(conn, evaluator_id)
        evaluator_clan = evaluator_info["clan_id"] if evaluator_info else None

        if ROLE_TEAM_LEADER in evaluatee_roles:
            tl_clans = self.repo.get_team_leader_clans(conn, evaluatee_id)
            if evaluator_clan not in tl_clans:
                raise InvalidClanException("No puedes evaluar a un Team Leader que no tiene a cargo tu clan.")
        else:
            if evaluator_clan != evaluatee_info["clan_id"]:
                raise InvalidClanException("Solo puedes evaluar a usuarios de tu mismo clan.")

    def create_evaluation(self, eval_data: EvaluationCreate) -> Optional[Dict[str, Any]]:
        with engine.begin() as conn:
            self._validate_period(conn, eval_data.period_id)
            
            if self.repo.check_evaluation_exists(conn, eval_data.evaluator_id, eval_data.evaluatee_id, eval_data.period_id):
                raise EvaluationAlreadyExistsException("Ya has evaluado a esta persona en el periodo seleccionado.")
            
            if eval_data.evaluator_id is not None:
                self._validate_permissions(conn, eval_data.evaluator_id, eval_data.evaluatee_id)
            
            db_evaluator_id = None if eval_data.is_anonymous else eval_data.evaluator_id
            
            eval_dict = {
                "evaluator_id": db_evaluator_id,
                "evaluatee_id": eval_data.evaluatee_id,
                "form_id": eval_data.form_id,
                "period_id": eval_data.period_id,
                "is_anonymous": eval_data.is_anonymous,
                "status": eval_data.status,
                "submitted_at": datetime.now() if eval_data.status == EVALUATION_STATUS_SUBMITTED else None
            }
            evaluation_id = self.repo.insert_evaluation(conn, eval_dict)
            
            answers_data = [
                {
                    "evaluation_id": evaluation_id,
                    "question_id": ans.question_id,
                    "score": ans.score,
                    "comment": ans.comment
                }
                for ans in eval_data.answers
            ]
            self.repo.insert_evaluation_answers(conn, answers_data)
            
            return self._get_evaluation_detail(conn, evaluation_id)

    def _attach_answers(self, conn, evaluations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        eval_ids = [e["id"] for e in evaluations]
        if not eval_ids:
            return evaluations
            
        answers = self.repo.get_answers_for_evaluations(conn, eval_ids)
        
        answers_map = {eid: [] for eid in eval_ids}
        for ans in answers:
            answers_map[ans["evaluation_id"]].append(ans)
            
        for ev in evaluations:
            ev["answers"] = answers_map[ev["id"]]
            
        return evaluations

    def _get_evaluation_detail(self, conn, evaluation_id: int) -> Optional[Dict[str, Any]]:
        eval_dict = self.repo.get_evaluation_by_id(conn, evaluation_id)
        if not eval_dict:
            return None
        return self._attach_answers(conn, [eval_dict])[0]

    def get_evaluations_by_evaluator(self, evaluator_id: int, skip: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        with engine.connect() as conn:
            evaluations = self.repo.get_evaluations_by_evaluator(conn, evaluator_id, skip, limit)
            return self._attach_answers(conn, evaluations)

    def get_evaluations_by_evaluatee(self, evaluatee_id: int, period_id: Optional[int] = None, hide_evaluator: bool = False, skip: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        with engine.connect() as conn:
            evaluations = self.repo.get_evaluations_by_evaluatee(conn, evaluatee_id, period_id, skip, limit)
            
            for ev in evaluations:
                if ev["is_anonymous"] or hide_evaluator:
                    ev["evaluator_id"] = None
                    
            return self._attach_answers(conn, evaluations)

# We export a singleton instance for backward compatibility with other routes
# that might import the module directly, but it can be replaced by DI.
evaluation_service = EvaluationService()

# Facade methods to preserve exact backward compatibility for old imports
def create_evaluation(eval_data: EvaluationCreate):
    return evaluation_service.create_evaluation(eval_data)

def get_evaluations_by_evaluator(evaluator_id: int, skip: int = 0, limit: int = 100):
    return evaluation_service.get_evaluations_by_evaluator(evaluator_id, skip, limit)

def get_evaluations_by_evaluatee(evaluatee_id: int, period_id: Optional[int] = None, hide_evaluator: bool = False, skip: int = 0, limit: int = 100):
    return evaluation_service.get_evaluations_by_evaluatee(evaluatee_id, period_id, hide_evaluator, skip, limit)
