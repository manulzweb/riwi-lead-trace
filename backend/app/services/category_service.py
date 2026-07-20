from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status

from app.config.database import engine
from app.services import activity_log_service


def get_categories():
    """Lista todas las categorias (para poblar el selector del constructor de plantillas)."""
    with engine.connect() as conn:
        result = conn.execute(text("SELECT id, name FROM categories ORDER BY name ASC"))
        return [dict(row) for row in result.mappings()]


def create_category(name: str):
    with engine.begin() as conn:
        existing = conn.execute(text("SELECT id FROM categories WHERE name = :name"), {"name": name}).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe una categoria con ese nombre.")

        result = conn.execute(text("INSERT INTO categories (name) VALUES (:name)"), {"name": name})
        return {"id": result.lastrowid, "name": name}


def update_category(category_id: int, name: str):
    with engine.begin() as conn:
        existing = conn.execute(text("SELECT id FROM categories WHERE id = :id"), {"id": category_id}).first()
        if not existing:
            return None

        duplicate = conn.execute(
            text("SELECT id FROM categories WHERE name = :name AND id != :id"),
            {"name": name, "id": category_id}
        ).first()
        if duplicate:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe una categoria con ese nombre.")

        conn.execute(text("UPDATE categories SET name = :name WHERE id = :id"), {"name": name, "id": category_id})
        return {"id": category_id, "name": name}


def delete_category(category_id: int, admin_id: int = None):
    with engine.begin() as conn:
        existing = conn.execute(text("SELECT id, name FROM categories WHERE id = :id"), {"id": category_id}).mappings().first()
        if not existing:
            return False

        try:
            conn.execute(text("DELETE FROM categories WHERE id = :id"), {"id": category_id})
        except IntegrityError:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="No se puede eliminar: hay preguntas (activas o de evaluaciones historicas) que usan esta categoria."
            )

        activity_log_service.log_action(
            conn, admin_id,
            action="category_deleted",
            target_type="category",
            target_id=category_id,
            detail=existing["name"],
        )
        return True
