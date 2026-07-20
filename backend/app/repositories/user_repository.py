import logging
from typing import List, Dict, Any, Optional
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.engine import Connection

logger = logging.getLogger(__name__)

class UserRepository:
    def _base_user_query(self, include_password: bool = False) -> str:
        pwd_field = ", u.password_hash AS password" if include_password else ""
        return f"""
            SELECT u.id, u.full_name AS name, u.email{pwd_field}, u.is_active, u.clan_id, GROUP_CONCAT(r.name) as roles
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN roles r ON ur.role_id = r.id
        """

    def get_users(self, conn: Connection, role: Optional[str] = None) -> List[Dict[str, Any]]:
        try:
            query_str = self._base_user_query()
            params = {}
            if role is not None:
                query_str += " WHERE r.name = :role"
                params["role"] = role
            query_str += " GROUP BY u.id"
            
            rows = conn.execute(text(query_str), params).mappings().all()
            return [dict(r) for r in rows]
        except SQLAlchemyError as e:
            logger.error(f"Error fetching users: {e}")
            raise

    def get_evaluables(self, conn: Connection) -> List[Dict[str, Any]]:
        try:
            query_str = self._base_user_query() + """
                WHERE r.name IN ('team_leader', 'tutor') AND u.is_active = 1
                GROUP BY u.id
            """
            rows = conn.execute(text(query_str)).mappings().all()
            return [dict(r) for r in rows]
        except SQLAlchemyError as e:
            logger.error(f"Error fetching evaluables: {e}")
            raise

    def get_user_by_id(self, conn: Connection, user_id: int) -> Optional[Dict[str, Any]]:
        try:
            query_str = self._base_user_query() + " WHERE u.id = :id GROUP BY u.id"
            row = conn.execute(text(query_str), {"id": user_id}).mappings().first()
            return dict(row) if row else None
        except SQLAlchemyError as e:
            logger.error(f"Error fetching user by id {user_id}: {e}")
            raise

    def get_user_by_email(self, conn: Connection, email: str) -> Optional[Dict[str, Any]]:
        try:
            query_str = self._base_user_query(include_password=True) + " WHERE u.email = :email GROUP BY u.id"
            row = conn.execute(text(query_str), {"email": email}).mappings().first()
            return dict(row) if row else None
        except SQLAlchemyError as e:
            logger.error(f"Error fetching user by email {email}: {e}")
            raise

    def insert_user(self, conn: Connection, user_data: Dict[str, Any]) -> int:
        try:
            query = text("""
                INSERT INTO users (full_name, email, password_hash, clan_id, is_active)
                VALUES (:full_name, :email, :password_hash, :clan_id, :is_active)
            """)
            result = conn.execute(query, user_data)
            return result.lastrowid
        except SQLAlchemyError as e:
            logger.error(f"Error inserting user: {e}")
            raise

    def insert_user_roles(self, conn: Connection, roles_data: List[Dict[str, Any]]) -> None:
        if not roles_data:
            return
        try:
            query = text("INSERT INTO user_roles (user_id, role_id) VALUES (:user_id, :role_id)")
            conn.execute(query, roles_data)
        except SQLAlchemyError as e:
            logger.error(f"Error inserting user roles: {e}")
            raise

    def delete_user_roles(self, conn: Connection, user_id: int) -> None:
        try:
            conn.execute(text("DELETE FROM user_roles WHERE user_id = :id"), {"id": user_id})
        except SQLAlchemyError as e:
            logger.error(f"Error deleting user roles for {user_id}: {e}")
            raise

    def update_user(self, conn: Connection, user_id: int, update_values: Dict[str, Any]) -> None:
        if not update_values:
            return
        try:
            set_clause = ", ".join(f"{col} = :{col}" for col in update_values)
            query = text(f"UPDATE users SET {set_clause} WHERE id = :id")
            conn.execute(query, {**update_values, "id": user_id})
        except SQLAlchemyError as e:
            logger.error(f"Error updating user {user_id}: {e}")
            raise

    def delete_user(self, conn: Connection, user_id: int) -> bool:
        try:
            query = text("DELETE FROM users WHERE id = :id")
            result = conn.execute(query, {"id": user_id})
            return result.rowcount > 0
        except SQLAlchemyError as e:
            logger.error(f"Error deleting user {user_id}: {e}")
            raise
