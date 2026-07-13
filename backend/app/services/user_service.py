from sqlalchemy import select, insert, update, delete, text
from app.config.database import conn
from app.config.security import hash_password
from app.models.user import users_table
from app.schemas.user import UserCreate, UserUpdate

def get_users():
    """Obtiene todos los usuarios de la base de datos (sin el hash de contraseña)."""
    query = text("""
        SELECT u.id, u.full_name AS name, u.email, u.is_active, u.role_id, u.clan_id, r.name AS role
        FROM users u
        JOIN roles r ON u.role_id = r.id
    """)
    result = conn.execute(query)
    users = []
    for row in result.mappings():
        user_dict = dict(row)
        user_dict["roles"] = [user_dict["role"]]
        users.append(user_dict)
    return users

def get_user(user_id: int):
    """Obtiene un usuario por ID (sin el hash de contraseña)."""
    query = text("""
        SELECT u.id, u.full_name AS name, u.email, u.is_active, u.role_id, u.clan_id, r.name AS role
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.id = :id
    """)
    result = conn.execute(query, {"id": user_id}).mappings().first()
    if not result:
        return None
    user_dict = dict(result)
    user_dict["roles"] = [user_dict["role"]]
    return user_dict

def get_user_by_email(email: str):
    """Obtiene un usuario por email, incluyendo el hash de contraseña.

    Solo lo usa auth_service para verificar el login: este hash nunca debe
    salir por un endpoint (por eso UserOut no tiene el campo password).
    """
    query = text("""
        SELECT u.id, u.full_name AS name, u.email, u.password_hash AS password, u.is_active, u.role_id, u.clan_id, r.name AS role
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.email = :email
    """)
    result = conn.execute(query, {"email": email}).mappings().first()
    if not result:
        return None
    user_dict = dict(result)
    user_dict["roles"] = [user_dict["role"]]
    return user_dict

def create_user(user: UserCreate):
    """Crea un usuario usando consultas SQLAlchemy y conn.execute."""
    stmt = insert(users_table).values(
        full_name=user.name,
        email=user.email,
        password_hash=hash_password(user.password),
        role_id=user.role_id,
        clan_id=user.clan_id,
        is_active=user.is_active
    )
    result = conn.execute(stmt)
    conn.commit()
    return get_user(result.lastrowid)

def update_user(user_id: int, user: UserUpdate):
    """Actualiza un usuario usando consultas SQLAlchemy y conn.execute."""
    values = {}
    if user.name is not None:
        values["full_name"] = user.name
    if user.email is not None:
        values["email"] = user.email
    if user.password is not None:
        values["password_hash"] = hash_password(user.password)
    if user.role_id is not None:
        values["role_id"] = user.role_id
    if user.clan_id is not None:
        values["clan_id"] = user.clan_id
    if user.is_active is not None:
        values["is_active"] = user.is_active

    if not values:
        return get_user(user_id)

    stmt = update(users_table).where(users_table.c.id == user_id).values(**values)
    conn.execute(stmt)
    conn.commit()
    return get_user(user_id)

def delete_user(user_id: int):
    """Elimina un usuario de la base de datos."""
    user = get_user(user_id)
    if not user:
        return False
    stmt = delete(users_table).where(users_table.c.id == user_id)
    conn.execute(stmt)
    conn.commit()
    return True
