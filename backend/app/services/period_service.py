from typing import List, Dict, Any, Optional
from app.config.database import engine
from app.schemas.period import PeriodCreate, PeriodUpdate
from app.services import activity_log_service
from app.repositories.period_repository import PeriodRepository
from app.exceptions.period_exceptions import PeriodNotFoundException
import fastapi

class PeriodService:
    def __init__(self, repository: PeriodRepository = None):
        self.repo = repository or PeriodRepository()

    def get_periods(self) -> List[Dict[str, Any]]:
        with engine.connect() as conn:
            return self.repo.get_periods(conn)

    def get_period(self, period_id: int) -> Optional[Dict[str, Any]]:
        with engine.connect() as conn:
            return self.repo.get_period_by_id(conn, period_id)

    def create_period(self, period: PeriodCreate) -> Dict[str, Any]:
        with engine.begin() as conn:
            period_data = {
                "name": period.name,
                "starts_at": period.starts_at,
                "ends_at": period.ends_at,
                "is_active": period.is_active
            }
            new_id = self.repo.insert_period(conn, period_data)
            
            if period.is_active:
                self.repo.deactivate_other_periods(conn, new_id)
                
            return self.repo.get_period_by_id(conn, new_id)

    def update_period(self, period_id: int, period: PeriodUpdate, background_tasks: Optional['fastapi.BackgroundTasks'] = None) -> Optional[Dict[str, Any]]:
        admin_id = period.admin_id
        values = {}
        if period.name is not None: values["name"] = period.name
        if period.starts_at is not None: values["starts_at"] = period.starts_at
        if period.ends_at is not None: values["ends_at"] = period.ends_at
        if period.is_active is not None: values["is_active"] = period.is_active

        if not values:
            return self.get_period(period_id)

        with engine.begin() as conn:
            existing = self.repo.get_period_by_id(conn, period_id)
            if not existing:
                raise PeriodNotFoundException("Periodo no encontrado")

            self.repo.update_period(conn, period_id, values)
            
            if values.get("is_active") is True:
                self.repo.deactivate_other_periods(conn, period_id)

            if "is_active" in values:
                period_name = values.get("name") or self.repo.get_period_name(conn, period_id)
                activity_log_service.log_action(
                    conn, admin_id,
                    action="period_opened" if values["is_active"] else "period_closed",
                    target_type="period",
                    target_id=period_id,
                    detail=period_name,
                )
                
                # Check if period was closed, and if so trigger the background task
                if values["is_active"] is False and background_tasks is not None:
                    from app.services.settings_service import settings_service
                    from app.services.ai_service import generate_missing_summaries_for_period
                    system_settings = settings_service.get_settings()
                    if system_settings.get("ai_auto_summary", False):
                        background_tasks.add_task(generate_missing_summaries_for_period, period_id)

            return self.repo.get_period_by_id(conn, period_id)

    def delete_period(self, period_id: int) -> bool:
        with engine.begin() as conn:
            deleted = self.repo.delete_period(conn, period_id)
            if not deleted:
                raise PeriodNotFoundException("Periodo no encontrado")
        return True

period_service = PeriodService()
