from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.exc import IntegrityError
from app.config.database import engine
from app.schemas.evaluation_details import EvaluationCreate
from app.repositories.evaluation_repository import EvaluationRepository
from app.constants.evaluation_constants import EVALUATION_STATUS_SUBMITTED, ROLE_TEAM_LEADER, ROLE_TUTOR
from app.exceptions.evaluation_exceptions import (
    PeriodNotFoundException, PeriodNotActiveException, EvaluationAlreadyExistsException,
    EvaluateeNotFoundException, InvalidRoleException, InvalidClanException
)

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
        
        if evaluatee_info and evaluator_info and evaluatee_info["email"] == evaluator_info["email"]:
            raise InvalidRoleException("No puedes evaluarte a ti mismo.")
            
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

            eval_dict = {
                "evaluatee_id": eval_data.evaluatee_id,
                "form_id": eval_data.form_id,
                "period_id": eval_data.period_id,
                "is_anonymous": eval_data.is_anonymous,
                "status": eval_data.status,
                "submitted_at": datetime.now() if eval_data.status == EVALUATION_STATUS_SUBMITTED else None
            }
            evaluation_id = self.repo.insert_evaluation(conn, eval_dict)

            # Registro de participacion, en la MISMA transaccion que el contenido.
            # `evaluation_id` se guarda siempre, tambien en anonimas: el equipo
            # priorizo que el Coder pueda releer su propio historial por encima de
            # un anonimato estructural (regla 1). El precio es que el vinculo SI
            # existe en la BD y solo lo tapan dos filtros de aplicacion
            # (vw_evaluations_summary y get_evaluator_ids_for_evaluations). Toda
            # query nueva sobre esta tabla debe filtrar `is_anonymous` a mano.
            submission_dict = {
                "evaluator_id": eval_data.evaluator_id,
                "evaluatee_id": eval_data.evaluatee_id,
                "period_id": eval_data.period_id,
                "evaluation_id": evaluation_id,
            }
            try:
                self.repo.insert_evaluation_submission(conn, submission_dict)
            except IntegrityError:
                # Red de seguridad contra la condicion de carrera del SELECT previo:
                # dos peticiones concurrentes del mismo evaluador pueden pasar ambas
                # el check_evaluation_exists, pero solo una gana el INSERT porque
                # `uq_submission_once` (evaluator_id, evaluatee_id, period_id) es un
                # constraint de BD. La perdedora cae aqui y recibe el mismo 409 que
                # en el caso normal. El SELECT previo sigue existiendo para dar el
                # mensaje limpio sin depender de un error de driver; el constraint es
                # el que de verdad garantiza la unicidad.
                # engine.begin() revierte la transaccion completa, asi que la
                # evaluacion y sus respuestas no quedan huerfanas.
                raise EvaluationAlreadyExistsException(
                    "Ya has evaluado a esta persona en el periodo seleccionado."
                )

            answers_data = [
                {
                    "evaluation_id": evaluation_id,
                    "question_id": ans.question_id,
                    "score": ans.score,
                    "comment": ans.comment
                }
                for ans in eval_data.answers
            ]
            self.repo.insert_evaluation_details(conn, answers_data)

            created = self._get_evaluation_detail(conn, evaluation_id)
            if created is not None:
                # Se devuelve al propio evaluador su id (no revela nada: es quien
                # hizo la peticion). En anonima va None, como en la BD.
                created["evaluator_id"] = None if eval_data.is_anonymous else eval_data.evaluator_id
            return created

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
        """Historial del evaluador: participaciones y sus respuestas.

        El coder siempre puede ver su propio historial completo, incluyendo
        respuestas, incluso de sus evaluaciones anónimas.
        """
        with engine.connect() as conn:
            submissions = self.repo.get_submissions_by_evaluator(conn, evaluator_id, skip, limit)

            visible = []
            for s in submissions:
                s["is_anonymous"] = s.pop("eval_is_anonymous", False)
                s["answers"] = []
                if s["evaluation_id"] is not None:
                    visible.append(s)

            # Solo se cargan respuestas de las participaciones con contenido visible.
            if visible:
                answers = self.repo.get_answers_for_evaluations(
                    conn, [s["evaluation_id"] for s in visible]
                )
                answers_map: Dict[int, List[Dict[str, Any]]] = {s["evaluation_id"]: [] for s in visible}
                for ans in answers:
                    answers_map[ans["evaluation_id"]].append(ans)
                for s in visible:
                    s["answers"] = answers_map[s["evaluation_id"]]

            return submissions

    def get_evaluations_by_evaluatee(self, evaluatee_id: int, period_id: Optional[int] = None, hide_evaluator: bool = False, skip: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        """Evaluaciones recibidas por una persona.

        `evaluator_id` ya no vive en `evaluations`; para las no anonimas se
        resuelve via `evaluation_submissions`. Reglas 1 y 8 de CLAUDE.md:
        - anonima  -> no existe el dato, para nadie (ni para el admin);
        - hide_evaluator (el propio TL/Tutor consultando) -> nunca ve quien lo
          evaluo, ni siquiera en las no anonimas. Solo el admin lo ve.
        """
        with engine.connect() as conn:
            evaluations = self.repo.get_evaluations_by_evaluatee(conn, evaluatee_id, period_id, skip, limit)

            evaluator_map: Dict[int, int] = {}
            if not hide_evaluator:
                # Ni siquiera se consulta el dato si quien mira no puede verlo.
                identifiable = [ev["id"] for ev in evaluations if not ev["is_anonymous"]]
                evaluator_map = self.repo.get_evaluator_ids_for_evaluations(conn, identifiable)

            for ev in evaluations:
                ev["evaluator_id"] = None if (ev["is_anonymous"] or hide_evaluator) else evaluator_map.get(ev["id"])

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
