from sqlalchemy import text
from app.config.database import conn
from app.config.security import hash_password
from app.schemas.user import UserCreate, UserUpdate

def _format_user(row):
    user_dict = dict(row)
    user_dict["id"] = str(user_dict["id"])
    user_dict["roles"] = user_dict["roles"].split(",") if user_dict["roles"] else []
    return user_dict

def get_users():
    query = text("""
        SELECT u.id, u.full_name AS name, u.email, u.is_active, u.clan_id, GROUP_CONCAT(r.name) as roles
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        GROUP BY u.id
    """)
    result = conn.execute(query)
    return [_format_user(row) for row in result.mappings()]

def get_user(user_id: int):
    query = text("""
        SELECT u.id, u.full_name AS name, u.email, u.is_active, u.clan_id, GROUP_CONCAT(r.name) as roles
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        WHERE u.id = :id
        GROUP BY u.id
    """)
    result = conn.execute(query, {"id": user_id}).mappings().first()
    if not result:
        return None
    return _format_user(result)

def get_user_by_email(email: str):
    query = text("""
        SELECT u.id, u.full_name AS name, u.email, u.password_hash AS password, u.is_active, u.clan_id, GROUP_CONCAT(r.name) as roles
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        WHERE u.email = :email
        GROUP BY u.id
    """)
    result = conn.execute(query, {"email": email}).mappings().first()
    if not result:
        return None
    return _format_user(result)

def create_user(user: UserCreate):
    query = text("""
        INSERT INTO users (full_name, email, password_hash, clan_id, is_active)
        VALUES (:full_name, :email, :password_hash, :clan_id, :is_active)
    """)
    result = conn.execute(query, {
        "full_name": user.name,
        "email": user.email,
        "password_hash": hash_password(user.password),
        "clan_id": user.clan_id,
        "is_active": user.is_active
    })
    new_user_id = result.lastrowid
    
    if user.role_ids:
        role_query = text("INSERT INTO user_roles (user_id, role_id) VALUES (:user_id, :role_id)")
        for rid in user.role_ids:
            conn.execute(role_query, {"user_id": new_user_id, "role_id": rid})
            
    conn.commit()
    return get_user(new_user_id)

def update_user(user_id: int, user: UserUpdate):
    values = {}
    if user.name is not None:
        values["full_name"] = user.name
    if user.email is not None:
        values["email"] = user.email
    if user.password is not None:
        values["password_hash"] = hash_password(user.password)
    if user.clan_id is not None:
        values["clan_id"] = user.clan_id
    if user.is_active is not None:
        values["is_active"] = user.is_active

    if values:
        set_clause = ", ".join(f"{column} = :{column}" for column in values)
        query = text(f"UPDATE users SET {set_clause} WHERE id = :id")
        conn.execute(query, {**values, "id": user_id})
        
    if user.role_ids is not None:
        conn.execute(text("DELETE FROM user_roles WHERE user_id = :id"), {"id": user_id})
        role_query = text("INSERT INTO user_roles (user_id, role_id) VALUES (:user_id, :role_id)")
        for rid in user.role_ids:
            conn.execute(role_query, {"user_id": user_id, "role_id": rid})

    conn.commit()
    return get_user(user_id)

def delete_user(user_id: int):
    user = get_user(user_id)
    if not user:
        return False
    query = text("DELETE FROM users WHERE id = :id")
    conn.execute(query, {"id": user_id})
    conn.commit()
    return True
