from sqlalchemy import text
from sqlalchemy.engine import Connection
from typing import Dict, Any

from app.repositories.base_repository import BaseRepository


class SettingsRepository(BaseRepository):
    def get_settings(self, conn: Connection) -> Dict[str, Any]:
        query = text("""
            SELECT
                ai_temperature, ai_auto_summary, score_risk_threshold,
                score_excellent_threshold, weight_tolerance, strict_entity_lock,
                required_evaluations, log_retention_days
            FROM system_settings
            WHERE id = 1
        """)
        # `or {}` conserva el contrato original: sin fila (BD sin seed) devuelve
        # un dict vacio, NO None -- resolve_weight_tolerance y _load_policy
        # cuentan con eso para caer a sus constantes de respaldo.
        return self.fetch_one(conn, query) or {}

    def update_settings(self, conn: Connection, data: dict) -> Dict[str, Any]:
        query = text("""
            UPDATE system_settings
            SET
                ai_temperature = :ai_temperature,
                ai_auto_summary = :ai_auto_summary,
                score_risk_threshold = :score_risk_threshold,
                score_excellent_threshold = :score_excellent_threshold,
                weight_tolerance = :weight_tolerance,
                strict_entity_lock = :strict_entity_lock,
                required_evaluations = :required_evaluations,
                log_retention_days = :log_retention_days
            WHERE id = 1
        """)
        self.execute(conn, query, data)
        return self.get_settings(conn)
