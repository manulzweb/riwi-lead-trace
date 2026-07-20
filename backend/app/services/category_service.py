from typing import List, Dict, Any, Optional
from app.config.database import engine
from app.services import activity_log_service
from app.repositories.category_repository import CategoryRepository
from app.exceptions.category_exceptions import CategoryAlreadyExistsException, CategoryNotFoundException

class CategoryService:
    def __init__(self, repository: CategoryRepository = None):
        self.repo = repository or CategoryRepository()

    def get_categories(self) -> List[Dict[str, Any]]:
        """Lista todas las categorias (para poblar el selector del constructor de plantillas)."""
        with engine.connect() as conn:
            return self.repo.get_all_categories(conn)

    def create_category(self, name: str) -> Dict[str, Any]:
        with engine.begin() as conn:
            existing = self.repo.get_category_by_name(conn, name)
            if existing:
                raise CategoryAlreadyExistsException("Ya existe una categoria con ese nombre.")

            new_id = self.repo.insert_category(conn, name)
            return {"id": new_id, "name": name}

    def update_category(self, category_id: int, name: str) -> Optional[Dict[str, Any]]:
        with engine.begin() as conn:
            existing = self.repo.get_category_by_id(conn, category_id)
            if not existing:
                raise CategoryNotFoundException("Categoria no encontrada.")

            duplicate = self.repo.get_category_by_name(conn, name)
            if duplicate and duplicate["id"] != category_id:
                raise CategoryAlreadyExistsException("Ya existe una categoria con ese nombre.")

            self.repo.update_category(conn, category_id, name)
            return {"id": category_id, "name": name}

    def delete_category(self, category_id: int, admin_id: int = None) -> bool:
        with engine.begin() as conn:
            existing = self.repo.get_category_by_id(conn, category_id)
            if not existing:
                raise CategoryNotFoundException("Categoria no encontrada.")

            self.repo.delete_category(conn, category_id)

            activity_log_service.log_action(
                conn, admin_id,
                action="category_deleted",
                target_type="category",
                target_id=category_id,
                detail=existing["name"],
            )
            
        return True

category_service = CategoryService()

def get_categories():
    return category_service.get_categories()

def create_category(name: str):
    return category_service.create_category(name)

def update_category(category_id: int, name: str):
    return category_service.update_category(category_id, name)

def delete_category(category_id: int, admin_id: int = None):
    return category_service.delete_category(category_id, admin_id)
