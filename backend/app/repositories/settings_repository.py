from sqlalchemy import text
from sqlalchemy.engine import Connection
from typing import Dict, Any

class SettingsRepository:
    def get_settings(self, conn: Connection) -> Dict[str, Any]:
        query = text("""
            SELECT 
                ai_temperature, ai_auto_summary, score_risk_threshold, 
                score_excellent_threshold, weight_tolerance, strict_entity_lock, 
                required_evaluations, log_retention_days
            FROM system_settings 
            WHERE id = 1
        """)
        row = conn.execute(query).mappings().first()
        return dict(row) if row else {}

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
        conn.execute(query, data)
        return self.get_settings(conn)
