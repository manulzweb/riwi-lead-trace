import logging
from typing import List, Dict, Any, Optional
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.engine import Connection

from app.exceptions.user_exceptions import UserInUseException
from app.repositories.base_repository import BaseRepository

logger = logging.getLogger(__name__)

class UserRepository(BaseRepository):
    def _base_user_query(self, include_password: bool = False) -> str:
        pwd_field = ", u.password_hash AS password" if include_password else ""
        return f"""
            SELECT u.id, u.full_name AS name, u.email{pwd_field}, u.is_active, u.clan_id, GROUP_CONCAT(r.name) as roles
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN roles r ON ur.role_id = r.id
        """

    def get_users(self, conn: Connection, role: Optional[str] = None) -> List[Dict[str, Any]]:
        query_str = self._base_user_query()
        params = {}
        if role is not None:
            query_str += " WHERE r.name = :role"
            params["role"] = role
        query_str += " GROUP BY u.id"

        return self.fetch_all(conn, text(query_str), params)

    def get_evaluables(self, conn: Connection) -> List[Dict[str, Any]]:
        query_str = self._base_user_query() + """
            WHERE r.name IN ('team_leader', 'tutor') AND u.is_active = 1
            GROUP BY u.id
        """
        return self.fetch_all(conn, text(query_str))

    def get_team_leader_clans_map(self, conn: Connection) -> Dict[int, List[int]]:
        """{user_id: [clan_id, ...]} de TODOS los Team Leaders, en una sola query.

        Se resuelve de golpe y no uno por uno a proposito: get_evaluables filtra
        una lista completa, y consultar los clanes por cada TL seria un N+1
        (una consulta extra por fila).

        `team_leader_clans` es la unica fuente valida del clan de un TL. Su
        `users.clan_id` es NULL -- ver can_evaluate_by_clan.
        """
        query = text("SELECT user_id, clan_id FROM team_leader_clans")
        clans_map: Dict[int, List[int]] = {}
        for row in self.fetch_all(conn, query):
            clans_map.setdefault(row["user_id"], []).append(row["clan_id"])
        return clans_map

    def get_user_by_id(self, conn: Connection, user_id: int) -> Optional[Dict[str, Any]]:
        query_str = self._base_user_query() + " WHERE u.id = :id GROUP BY u.id"
        return self.fetch_one(conn, text(query_str), {"id": user_id})

    def get_user_by_email(self, conn: Connection, email: str) -> Optional[Dict[str, Any]]:
        query_str = self._base_user_query(include_password=True) + " WHERE u.email = :email GROUP BY u.id"
        return self.fetch_one(conn, text(query_str), {"email": email})

    def insert_user(self, conn: Connection, user_data: Dict[str, Any]) -> int:
        query = text("""
            INSERT INTO users (full_name, email, password_hash, clan_id, is_active)
            VALUES (:full_name, :email, :password_hash, :clan_id, :is_active)
        """)
        return self.execute(conn, query, user_data).lastrowid

    def insert_user_roles(self, conn: Connection, roles_data: List[Dict[str, Any]]) -> None:
        if not roles_data:
            return
        query = text("INSERT INTO user_roles (user_id, role_id) VALUES (:user_id, :role_id)")
        self.execute(conn, query, roles_data)

    def delete_user_roles(self, conn: Connection, user_id: int) -> None:
        self.execute(conn, text("DELETE FROM user_roles WHERE user_id = :id"), {"id": user_id})

    def update_user(self, conn: Connection, user_id: int, update_values: Dict[str, Any]) -> None:
        if not update_values:
            return
        set_clause = ", ".join(f"{col} = :{col}" for col in update_values)
        query = text(f"UPDATE users SET {set_clause} WHERE id = :id")
        self.execute(conn, query, {**update_values, "id": user_id})

    def delete_user(self, conn: Connection, user_id: int) -> bool:
        query = text("DELETE FROM users WHERE id = :id")
        try:
            return self.execute(conn, query, {"id": user_id}).rowcount > 0
        except IntegrityError:
            # Las FK hacia evaluations y evaluation_submissions son RESTRICT a
            # proposito: borrar en cascada destruiria el historico. Es un conflicto
            # de estado (409), no un fallo del servidor.
            logger.warning("Usuario %s con historial, no se puede borrar", user_id)
            raise UserInUseException(
                "No se puede eliminar: este usuario tiene evaluaciones o participaciones registradas. Desactivalo en su lugar."
            )
