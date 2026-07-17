from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status

from app.config.database import conn


def get_categories():
    """Lista todas las categorias (para poblar el selector del constructor de plantillas)."""
    result = conn.execute(text("SELECT id, name FROM categories ORDER BY name ASC"))
    return [dict(row) for row in result.mappings()]


def create_category(name: str):
    existing = conn.execute(text("SELECT id FROM categories WHERE name = :name"), {"name": name}).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe una categoria con ese nombre.")

    result = conn.execute(text("INSERT INTO categories (name) VALUES (:name)"), {"name": name})
    conn.commit()
    return {"id": result.lastrowid, "name": name}


def update_category(category_id: int, name: str):
    """Renombrar una categoria: afecta por igual a preguntas activas e historicas
    (son la misma fila de categories), a diferencia de editar el texto de una
    pregunta (que versiona). Aqui no hace falta versionar nada -- el nombre de
    la categoria no es parte de lo que un evaluador respondio.
    """
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
    conn.commit()
    return {"id": category_id, "name": name}


def delete_category(category_id: int):
    """Borra una categoria SOLO si ninguna pregunta (activa o historica) la usa.

    No se valida "a mano" con un SELECT previo: se deja que la FK
    fk_question_category (ON DELETE RESTRICT) lo rechace, y se traduce ese
    error de integridad a un 409 legible. Asi la regla vive en un solo lugar
    (la base de datos) en vez de duplicarse en Python.
    """
    existing = conn.execute(text("SELECT id FROM categories WHERE id = :id"), {"id": category_id}).first()
    if not existing:
        return False

    try:
        conn.execute(text("DELETE FROM categories WHERE id = :id"), {"id": category_id})
        conn.commit()
    except IntegrityError:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se puede eliminar: hay preguntas (activas o de evaluaciones historicas) que usan esta categoria."
        )
    return True
