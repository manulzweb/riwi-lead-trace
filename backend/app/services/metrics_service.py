from typing import List, Dict, Any
from app.config.database import engine
from app.repositories.metrics_repository import MetricsRepository

UMBRAL_EN_RIESGO = 60
UMBRAL_SOLIDO = 80

class MetricsService:
    def __init__(self, repository: MetricsRepository = None):
        self.repo = repository or MetricsRepository()

    def classify_status(self, average_score: float) -> str:
        if average_score is None:
            return "Datos insuficientes"
        if average_score < UMBRAL_EN_RIESGO:
            return "En riesgo"
        if average_score >= UMBRAL_SOLIDO:
            return "Sólido"
        return "Estable"

    def get_score_history(self, evaluatee_id: int) -> List[Dict[str, Any]]:
        """
        Serie del ICP de una persona a través de todos los periodos.
        Usa la vista vw_period_metrics para obtener los datos precalculados.
        """
        with engine.connect() as conn:
            return self.repo.get_score_history_for_user(conn, evaluatee_id)

    def get_metrics_summary(self, period_id: int) -> Dict[str, Any]:
        """
        Agrega y normaliza las métricas de ICP basándose en la vista vw_period_metrics.
        """
        with engine.connect() as conn:
            total_evaluations = self.repo.get_total_evaluations(conn, period_id)
            total_coders = self.repo.get_total_active_coders(conn)
            evaluatees_rows = self.repo.get_evaluatees_with_metrics(conn, period_id)

        evaluatees = []
        scores = []
        
        for user_dict in evaluatees_rows:
            avg_score = user_dict.get("average_score")
            
            user_dict["status"] = self.classify_status(avg_score)
            evaluatees.append(user_dict)
            
            if avg_score is not None:
                scores.append(avg_score)

        average_score_global = round(sum(scores) / len(scores)) if scores else 0

        # Asumimos 2 evaluaciones por coder activo como baseline ideal (ej. evalúan a su Tutor y a su TL)
        possible_evaluations = total_coders * 2
        participation_rate = round((total_evaluations / possible_evaluations) * 100) if possible_evaluations else 0
        participation_rate = min(participation_rate, 100)

        return {
            "kpis": {
                "total_evaluations": total_evaluations,
                "average_score": average_score_global,
                "participation_rate": participation_rate
            },
            "evaluatees": evaluatees
        }

metrics_service = MetricsService()

def get_score_history(evaluatee_id: int):
    return metrics_service.get_score_history(evaluatee_id)

def get_metrics_summary(period_id: int):
    return metrics_service.get_metrics_summary(period_id)
