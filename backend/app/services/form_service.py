from sqlalchemy import text
from fastapi import HTTPException, status

from app.config.database import engine
from app.schemas.form_template import TemplateCreate, TemplateUpdate
from app.services.question_service import _assert_no_active_period, WEIGHT_SUM_TOLERANCE

EVALUABLE_ROLES = ("team_leader", "tutor")


QUESTIONS_QUERY = """
    SELECT q.id, q.form_id, q.text, q.category_id, c.name AS category, q.input_type, q.sort_order, q.weight_percent
    FROM questions q
    JOIN categories c ON q.category_id = c.id
    WHERE q.form_id = :form_id AND q.is_active = TRUE
    ORDER BY q.sort_order ASC
"""


def get_forms_by_role(role_name: str):
    with engine.connect() as conn:
        role_query = text("SELECT id FROM roles WHERE name = :name")
        role_id = conn.execute(role_query, {"name": role_name}).scalar()
        if not role_id:
            return []

        template_query = text("""
            SELECT id, title, description, target_role_id, is_active, is_template, created_at
            FROM forms
            WHERE target_role_id = :role_id
            ORDER BY id DESC
        """)
        template_rows = conn.execute(template_query, {"role_id": role_id}).mappings().all()

        templates = []
        for row in template_rows:
            template_dict = dict(row)
            questions_result = conn.execute(text(QUESTIONS_QUERY), {"form_id": template_dict["id"]})
            template_dict["questions"] = [dict(q) for q in questions_result.mappings()]
            templates.append(template_dict)

        return templates


def get_template(form_id: int):
    with engine.connect() as conn:
        template_query = text("""
            SELECT id, title, description, target_role_id, is_active, is_template, created_at
            FROM forms
            WHERE id = :id
        """)
        template_row = conn.execute(template_query, {"id": form_id}).mappings().first()
        if not template_row:
            return None

        template_dict = dict(template_row)
        questions_result = conn.execute(text(QUESTIONS_QUERY), {"form_id": form_id})
        template_dict["questions"] = [dict(row) for row in questions_result.mappings()]
        return template_dict


def create_template(payload: TemplateCreate):

    if payload.target_role not in EVALUABLE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"target_role debe ser uno de {EVALUABLE_ROLES} (los unicos roles evaluables)."
        )

    scale_weights = [q.weight_percent for q in payload.questions if q.input_type == "scale"]
    if scale_weights:
        total = sum(scale_weights)
        if abs(total - 100) > WEIGHT_SUM_TOLERANCE:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Los pesos de las preguntas de escala deben sumar 100 (suma actual: {total})."
            )

    with engine.begin() as conn:
        role_id = conn.execute(text("SELECT id FROM roles WHERE name = :name"), {"name": payload.target_role}).scalar()
        
        conn.execute(
            text("UPDATE forms SET is_active = FALSE WHERE target_role_id = :role_id"),
            {"role_id": role_id}
        )

        insert_template_query = text("""
            INSERT INTO forms (title, description, target_role_id, is_active, is_template)
            VALUES (:title, :description, :target_role_id, TRUE, :is_template)
        """)
        result = conn.execute(insert_template_query, {
            "title": payload.title,
            "description": payload.description,
            "target_role_id": role_id,
            "is_template": payload.is_template,
        })
        form_id = result.lastrowid

        for category_id in {q.category_id for q in payload.questions}:
            exists = conn.execute(text("SELECT id FROM categories WHERE id = :id"), {"id": category_id}).scalar()
            if not exists:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Categoria {category_id} no encontrada.")

        insert_question_query = text("""
            INSERT INTO questions (form_id, text, category_id, input_type, sort_order, weight_percent, is_active)
            VALUES (:form_id, :text, :category_id, :input_type, :sort_order, :weight_percent, TRUE)
        """)
        for index, q in enumerate(payload.questions):
            conn.execute(insert_question_query, {
                "form_id": form_id,
                "text": q.text,
                "category_id": q.category_id,
                "input_type": q.input_type,
                "sort_order": index,
                "weight_percent": q.weight_percent if q.input_type == "scale" else 0,
            })

    return get_template(form_id)


def update_template(form_id: int, payload: TemplateUpdate):
    _assert_no_active_period()

    existing = get_template(form_id)
    if not existing:
        return None

    values = {}
    if payload.title is not None:
        values["title"] = payload.title
    if payload.description is not None:
        values["description"] = payload.description
    if not values:
        return existing

    with engine.begin() as conn:
        set_clause = ", ".join(f"{column} = :{column}" for column in values)
        conn.execute(text(f"UPDATE forms SET {set_clause} WHERE id = :id"), {**values, "id": form_id})
        
    return get_template(form_id)


def delete_template(form_id: int):
    _assert_no_active_period()

    existing = get_template(form_id)
    if not existing:
        return False
    if existing["is_active"]:
        with engine.begin() as conn:
            conn.execute(text("UPDATE forms SET is_active = FALSE WHERE id = :id"), {"id": form_id})
    return True
