from typing import Optional, List, Dict, Any
from app.config.database import engine
from app.config.security import hash_password
from app.schemas.user import UserCreate, UserUpdate
from app.repositories.user_repository import UserRepository
from app.exceptions.user_exceptions import UserNotFoundException, EmailAlreadyExistsException
from sqlalchemy.exc import IntegrityError

class UserService:
    def __init__(self, repository: UserRepository = None):
        self.repo = repository or UserRepository()

    def _format_user(self, row_dict: Dict[str, Any]) -> Dict[str, Any]:
        user_dict = dict(row_dict)
        user_dict["id"] = str(user_dict["id"])
        user_dict["roles"] = user_dict["roles"].split(",") if user_dict["roles"] else []
        return user_dict

    def get_users(self, role: Optional[str] = None) -> List[Dict[str, Any]]:
        with engine.connect() as conn:
            users = self.repo.get_users(conn, role)
            return [self._format_user(u) for u in users]

    def get_evaluables(self) -> List[Dict[str, Any]]:
        with engine.connect() as conn:
            users = self.repo.get_evaluables(conn)
            return [self._format_user(u) for u in users]

    def get_user(self, user_id: int) -> Optional[Dict[str, Any]]:
        with engine.connect() as conn:
            user = self.repo.get_user_by_id(conn, user_id)
            return self._format_user(user) if user else None

    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        with engine.connect() as conn:
            user = self.repo.get_user_by_email(conn, email)
            return self._format_user(user) if user else None

    def create_user(self, user: UserCreate) -> Dict[str, Any]:
        with engine.begin() as conn:
            existing = self.repo.get_user_by_email(conn, user.email)
            if existing:
                raise EmailAlreadyExistsException("El email ya está registrado")

            user_data = {
                "full_name": user.name,
                "email": user.email,
                "password_hash": hash_password(user.password),
                "clan_id": user.clan_id,
                "is_active": user.is_active
            }
            try:
                new_user_id = self.repo.insert_user(conn, user_data)
            except IntegrityError:
                raise EmailAlreadyExistsException("Error de integridad: Posible email duplicado u otra restricción")

            if user.role_ids:
                roles_data = [{"user_id": new_user_id, "role_id": rid} for rid in user.role_ids]
                self.repo.insert_user_roles(conn, roles_data)
                
        return self.get_user(new_user_id)

    def update_user(self, user_id: int, user: UserUpdate) -> Optional[Dict[str, Any]]:
        with engine.begin() as conn:
            existing_user = self.repo.get_user_by_id(conn, user_id)
            if not existing_user:
                raise UserNotFoundException("Usuario no encontrado")

            values = {}
            if user.name is not None: values["full_name"] = user.name
            if user.email is not None: values["email"] = user.email
            if user.password is not None: values["password_hash"] = hash_password(user.password)
            if user.clan_id is not None: values["clan_id"] = user.clan_id
            if user.is_active is not None: values["is_active"] = user.is_active

            if values:
                try:
                    self.repo.update_user(conn, user_id, values)
                except IntegrityError:
                    raise EmailAlreadyExistsException("El email ya pertenece a otro usuario")
                
            if user.role_ids is not None:
                self.repo.delete_user_roles(conn, user_id)
                if user.role_ids:
                    roles_data = [{"user_id": user_id, "role_id": rid} for rid in user.role_ids]
                    self.repo.insert_user_roles(conn, roles_data)

        return self.get_user(user_id)

    def delete_user(self, user_id: int) -> bool:
        with engine.begin() as conn:
            deleted = self.repo.delete_user(conn, user_id)
            if not deleted:
                raise UserNotFoundException("Usuario no encontrado")
        return True

# Exportar una instancia global por compatibilidad y simplicidad
user_service = UserService()

def get_users(role: Optional[str] = None):
    return user_service.get_users(role)

def get_evaluables():
    return user_service.get_evaluables()

def get_user(user_id: int):
    return user_service.get_user(user_id)

def get_user_by_email(email: str):
    return user_service.get_user_by_email(email)

def create_user(user: UserCreate):
    return user_service.create_user(user)

def update_user(user_id: int, user: UserUpdate):
    return user_service.update_user(user_id, user)

def delete_user(user_id: int):
    return user_service.delete_user(user_id)
