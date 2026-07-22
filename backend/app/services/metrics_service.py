from typing import List, Dict, Any
from app.config.database import engine
from app.repositories.metrics_repository import MetricsRepository
from app.services.settings_service import settings_service

# Valores de respaldo si `system_settings` no devuelve fila (BD sin seed).
#
# ESCALA: 0-100, la misma que produce vw_period_metrics.
# La vista normaliza la media ponderada 1-5 a 0-100 con ((x - 1) / 4 * 100),
# asi que los umbrales con los que se compara el ICP viven tambien en 0-100.
# Estos numeros son los que estaban hardcodeados antes de leer la config global,
# por lo que sin fila en `system_settings` la clasificacion no cambia.
DEFAULT_SCORE_RISK_THRESHOLD = 60
DEFAULT_SCORE_EXCELLENT_THRESHOLD = 80
DEFAULT_REQUIRED_EVALUATIONS = 3


class MetricsService:
    def __init__(self, repository: MetricsRepository = None):
        self.repo = repository or MetricsRepository()

    def _load_policy(self) -> Dict[str, Any]:
        """
        Lee la configuracion global de politicas de evaluacion.

        Se llama SIEMPRE antes de abrir la conexion de metricas: settings_service
        abre su propia conexion (`engine.begin()`), y llamarlo dentro de un
        `with engine.connect()` mantendria dos checkouts del pool vivos a la vez
        en la misma peticion. Leyendo primero, las conexiones no se solapan.

        Si no hay fila en `system_settings`, el repositorio devuelve {} y aqui
        degradamos a los valores por defecto en vez de reventar.
        """
        settings = settings_service.get_settings() or {}

        def value_or_default(key: str, default):
            # `or` no sirve: 0 es un umbral valido y seria descartado como falsy.
            raw = settings.get(key)
            return default if raw is None else raw

        return {
            "risk_threshold": float(
                value_or_default("score_risk_threshold", DEFAULT_SCORE_RISK_THRESHOLD)
            ),
            "excellent_threshold": float(
                value_or_default("score_excellent_threshold", DEFAULT_SCORE_EXCELLENT_THRESHOLD)
            ),
            "required_evaluations": int(
                value_or_default("required_evaluations", DEFAULT_REQUIRED_EVALUATIONS)
            ),
        }

    def classify_status(
        self,
        average_score: float,
        risk_threshold: float = DEFAULT_SCORE_RISK_THRESHOLD,
        excellent_threshold: float = DEFAULT_SCORE_EXCELLENT_THRESHOLD,
    ) -> str:
        """
        Clasifica un ICP (0-100) contra los umbrales configurables del admin.
        Funcion pura: los umbrales entran por parametro, no los lee de la BD.
        """
        if average_score is None:
            return "Datos insuficientes"
        if float(average_score) < float(risk_threshold):
            return "En riesgo"
        if float(average_score) >= float(excellent_threshold):
            return "Sólido"
        return "Estable"

    def get_score_history(self, evaluatee_id: int) -> List[Dict[str, Any]]:
        """
        Serie del ICP de una persona a través de todos los periodos.
        Usa la vista vw_period_metrics para obtener los datos precalculados.
        El minimo de evaluaciones para que un periodo sea estadisticamente
        valido ya no vive en la vista: se pasa como parametro a la query.
        """
        policy = self._load_policy()
        with engine.connect() as conn:
            return self.repo.get_score_history_for_user(
                conn, evaluatee_id, policy["required_evaluations"]
            )

    def get_metrics_summary(self, period_id: int) -> Dict[str, Any]:
        """
        Agrega y normaliza las métricas de ICP basándose en la vista vw_period_metrics.
        """
        policy = self._load_policy()

        with engine.connect() as conn:
            total_evaluations = self.repo.get_total_evaluations(conn, period_id)
            total_coders = self.repo.get_total_active_coders(conn)
            evaluatees_rows = self.repo.get_evaluatees_with_metrics(
                conn, period_id, policy["required_evaluations"]
            )

        evaluatees = []
        scores = []

        for user_dict in evaluatees_rows:
            avg_score = user_dict.get("average_score")

            user_dict["status"] = self.classify_status(
                avg_score, policy["risk_threshold"], policy["excellent_threshold"]
            )
            evaluatees.append(user_dict)

            if avg_score is not None:
                scores.append(avg_score)

        average_score_global = round(sum(scores) / len(scores)) if scores else 0

        # Asumimos 2 evaluaciones por coder activo como baseline ideal (ej. evalúan a su Tutor y a su TL)
        # Si estamos viendo todos los periodos (period_id == 0), multiplicamos por la cantidad total de periodos
        possible_evaluations = total_coders * 2
        if period_id == 0:
            with engine.connect() as conn:
                # `or 1` y no `or 0`: es un DENOMINADOR. Con 0 periodos el
                # calculo de participacion se anularia; se conserva el valor
                # que ya tenia antes de mover la query al repositorio.
                total_periods = self.repo.get_total_periods(conn) or 1
            possible_evaluations *= total_periods
            
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
