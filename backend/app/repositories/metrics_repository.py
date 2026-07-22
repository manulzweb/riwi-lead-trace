from typing import List, Dict, Any
from sqlalchemy import text
from sqlalchemy.engine import Connection

from app.repositories.base_repository import BaseRepository


class MetricsRepository(BaseRepository):
    def get_total_evaluations(self, conn: Connection, period_id: int) -> int:
        if period_id == 0:
            query = text("SELECT COUNT(DISTINCT id) FROM evaluations WHERE status = 'submitted'")
            return self.fetch_scalar(conn, query) or 0

        query = text("SELECT COUNT(DISTINCT id) FROM evaluations WHERE period_id = :period_id AND status = 'submitted'")
        return self.fetch_scalar(conn, query, {"period_id": period_id}) or 0

    def get_total_periods(self, conn: Connection) -> int:
        """Cuantos periodos existen. Lo usa el calculo de participacion cuando
        se piden TODOS los periodos (period_id == 0), para escalar el
        denominador de evaluaciones posibles."""
        query = text("SELECT COUNT(id) FROM periods")
        return self.fetch_scalar(conn, query) or 0

    def get_total_active_coders(self, conn: Connection) -> int:
        query = text("""
            SELECT COUNT(DISTINCT u.id)
            FROM users u
            JOIN user_roles ur ON u.id = ur.user_id
            JOIN roles r ON ur.role_id = r.id
            WHERE r.name = 'coder' AND u.is_active = TRUE
        """)
        return self.fetch_scalar(conn, query) or 0

    def get_evaluatees_with_metrics(
        self, conn: Connection, period_id: int, required_evaluations: int
    ) -> List[Dict[str, Any]]:
        # Las vistas resuelven la complejidad en una sola consulta.
        # vw_period_metrics agrupa por evaluatee_id Y period_id, asi que con
        # period_id == 0 hay que agregar sobre todos los periodos.
        if period_id == 0:
            query = text("""
                SELECT
                    e.id,
                    e.name,
                    e.email,
                    e.role,
                    e.clan_name,
                    e.cohort_name,
                    CASE WHEN SUM(COALESCE(m.n_evals, 0)) >= :required_evaluations THEN AVG(m.average_score) ELSE NULL END as average_score,
                    SUM(COALESCE(m.n_evals, 0)) as n_evals
                FROM vw_evaluatees_summary e
                LEFT JOIN vw_period_metrics m ON e.id = m.evaluatee_id
                GROUP BY e.id, e.name, e.email, e.role, e.clan_name, e.cohort_name
            """)
            return self.fetch_all(conn, query, {"required_evaluations": required_evaluations})

        query = text("""
            SELECT
                e.id,
                e.name,
                e.email,
                e.role,
                e.clan_name,
                e.cohort_name,
                m.average_score,
                COALESCE(m.n_evals, 0) as n_evals
            FROM vw_evaluatees_summary e
            LEFT JOIN vw_period_metrics m
                   ON e.id = m.evaluatee_id
                  AND m.period_id = :period_id
                  AND m.n_evals >= :required_evaluations
        """)
        return self.fetch_all(
            conn, query, {"period_id": period_id, "required_evaluations": required_evaluations}
        )

    def get_score_history_for_user(
        self, conn: Connection, evaluatee_id: int, required_evaluations: int
    ) -> List[Dict[str, Any]]:
        # Aqui el minimo si va en el WHERE: un periodo sin evaluaciones
        # suficientes no debe aparecer como punto de la serie historica
        # (era el efecto del filtro que antes estaba dentro de la vista).
        query = text("""
            SELECT
                p.id as period_id,
                p.name as period_name,
                p.starts_at,
                m.average_score
            FROM vw_period_metrics m
            JOIN periods p ON m.period_id = p.id
            WHERE m.evaluatee_id = :evaluatee_id
              AND m.n_evals >= :required_evaluations
            ORDER BY p.starts_at ASC
        """)
        return self.fetch_all(
            conn, query, {"evaluatee_id": evaluatee_id, "required_evaluations": required_evaluations}
        )
