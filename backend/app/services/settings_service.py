from app.config.database import engine
from app.repositories.settings_repository import SettingsRepository

# Valores de fabrica de la configuracion global.
#
# ⚠️ DUPLICADO CONSCIENTE — deben moverse juntos con:
#   - database/01_ddl.sql  -> tabla `system_settings`, clausulas DEFAULT de cada columna
#   - database/02_dml.sql  -> INSERT del registro semilla (id = 1)
#
# Por que se declaran aqui y no se leen del INFORMATION_SCHEMA de MySQL:
#   1. No ata la app al motor de BD ni a como MySQL formatea los DEFAULT
#      (devuelve strings tipo '0.70'/'1', que habria que castear a mano).
#   2. Una consulta al catalogo del servidor por cada "restaurar" es coste y
#      superficie de fallo que no aportan nada a un MVP.
#   3. Es explicito y testeable sin BD.
# El precio es que hay dos copias del mismo dato; si cambia una, cambia la otra.
SYSTEM_SETTINGS_DEFAULTS = {
    "ai_temperature": 0.7,
    "ai_auto_summary": True,
    # Escala 0-100, la misma del ICP (no 1-5): los compara
    # metrics_service.classify_status contra el average_score de vw_period_metrics.
    "score_risk_threshold": 60.0,
    "score_excellent_threshold": 80.0,
    "weight_tolerance": 0.01,
    "strict_entity_lock": True,
    "required_evaluations": 3,
    "log_retention_days": 90,
}

class SettingsService:
    def __init__(self):
        self.repo = SettingsRepository()

    def get_settings(self):
        with engine.connect() as conn:
            # Sin la fila semilla de 02_dml.sql el repo devuelve {}, y SystemSettingsOut
            # exige los 8 campos -> ResponseValidationError -> 500. Degradamos a los
            # valores de fabrica, igual que metrics_service._load_policy.
            return self.repo.get_settings(conn) or dict(SYSTEM_SETTINGS_DEFAULTS)

    def get_defaults(self):
        # Solo devuelve los valores de fabrica: no toca la BD ni persiste nada.
        # Guardarlos es una accion aparte y explicita del admin (PUT /settings).
        return dict(SYSTEM_SETTINGS_DEFAULTS)

    def update_settings(self, data: dict):
        with engine.begin() as conn:
            return self.repo.update_settings(conn, data)

settings_service = SettingsService()
