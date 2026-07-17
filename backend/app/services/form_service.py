from sqlalchemy import text
from fastapi import HTTPException, status

from app.config.database import conn
from app.schemas.form_template import TemplateCreate, TemplateUpdate
from app.services.question_service import _assert_no_active_period, WEIGHT_SUM_TOLERANCE

# Roles que de verdad se evaluan (ver CLAUDE.md: coder evalua, admin administra,
# ninguno de los dos es evaluable). Una plantilla solo puede apuntar a estos.
EVALUABLE_ROLES = ("team_leader", "tutor")


def get_form_template_by_role(role_name: str):
    """Obtiene la plantilla de formulario activa para un rol específico, junto con sus preguntas."""
    # 1. Obtener el ID del rol
    role_query = text("SELECT id FROM roles WHERE name = :name")
    role_id = conn.execute(role_query, {"name": role_name}).scalar()
    if not role_id:
        return None

    # 2. Obtener la plantilla activa para ese rol
    template_query = text("""
        SELECT id, title, description, target_role_id, is_active
        FROM form_templates
        WHERE target_role_id = :role_id AND is_active = TRUE
    """)
    template_row = conn.execute(template_query, {"role_id": role_id}).mappings().first()
    if not template_row:
        return None

    template_dict = dict(template_row)

    # 3. Obtener las preguntas asociadas a esa plantilla
    questions_query = text("""
        SELECT id, template_id, text, category, input_type, sort_order
        FROM questions
        WHERE template_id = :template_id AND is_active = TRUE
        ORDER BY sort_order ASC
    """)
    questions_result = conn.execute(questions_query, {"template_id": template_dict["id"]})
    template_dict["questions"] = [dict(row) for row in questions_result.mappings()]

    return template_dict


def get_template(template_id: int):
    """Obtiene una plantilla por id (activa o no) junto con sus preguntas activas.

    A diferencia de get_form_template_by_role, esta no filtra por is_active
    en la plantilla misma -- la usan PUT/DELETE /forms/{id}, que necesitan
    poder encontrar la plantilla para operar sobre ella sin importar su estado.
    """
    template_query = text("""
        SELECT id, title, description, target_role_id, is_active
        FROM form_templates
        WHERE id = :id
    """)
    template_row = conn.execute(template_query, {"id": template_id}).mappings().first()
    if not template_row:
        return None

    template_dict = dict(template_row)
    questions_query = text("""
        SELECT id, template_id, text, category, input_type, sort_order
        FROM questions
        WHERE template_id = :template_id AND is_active = TRUE
        ORDER BY sort_order ASC
    """)
    questions_result = conn.execute(questions_query, {"template_id": template_id})
    template_dict["questions"] = [dict(row) for row in questions_result.mappings()]
    return template_dict


def create_template(payload: TemplateCreate):
    """POST /forms: crea una plantilla nueva con sus preguntas iniciales
    (constructor de plantillas del Admin). Solo con periodo cerrado.

    A diferencia de version_question_text, esto no versiona nada: es un
    instrumento nuevo, no hay historial previo que preservar.
    """
    _assert_no_active_period()

    if payload.target_role not in EVALUABLE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"target_role debe ser uno de {EVALUABLE_ROLES} (los unicos roles evaluables)."
        )
    role_id = conn.execute(text("SELECT id FROM roles WHERE name = :name"), {"name": payload.target_role}).scalar()

    scale_weights = [q.weight_percent for q in payload.questions if q.input_type == "scale"]
    if scale_weights:
        total = sum(scale_weights)
        if abs(total - 100) > WEIGHT_SUM_TOLERANCE:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Los pesos de las preguntas de escala deben sumar 100 (suma actual: {total})."
            )

    # Solo una plantilla activa por rol a la vez (mismo criterio que
    # periodos: crear/activar una desactiva cualquier otra de ese rol).
    conn.execute(
        text("UPDATE form_templates SET is_active = FALSE WHERE target_role_id = :role_id"),
        {"role_id": role_id}
    )

    insert_template = text("""
        INSERT INTO form_templates (title, description, target_role_id, is_active)
        VALUES (:title, :description, :target_role_id, TRUE)
    """)
    result = conn.execute(insert_template, {
        "title": payload.title,
        "description": payload.description,
        "target_role_id": role_id,
    })
    template_id = result.lastrowid

    insert_question = text("""
        INSERT INTO questions (template_id, text, category, input_type, sort_order, weight_percent, is_active)
        VALUES (:template_id, :text, :category, :input_type, :sort_order, :weight_percent, TRUE)
    """)
    for index, q in enumerate(payload.questions):
        conn.execute(insert_question, {
            "template_id": template_id,
            "text": q.text,
            "category": q.category,
            "input_type": q.input_type,
            "sort_order": index,
            "weight_percent": q.weight_percent if q.input_type == "scale" else 0,
        })

    conn.commit()
    return get_template(template_id)


def update_template(template_id: int, payload: TemplateUpdate):
    """PUT /forms/{id}: actualiza solo titulo/descripcion. Las preguntas se
    agregan/quitan/editan con los endpoints de /questions -- no hay reemplazo
    masivo aca (rompería el versionado de ADMIN-02). Solo con periodo cerrado.
    """
    _assert_no_active_period()

    existing = get_template(template_id)
    if not existing:
        return None

    values = {}
    if payload.title is not None:
        values["title"] = payload.title
    if payload.description is not None:
        values["description"] = payload.description
    if not values:
        return existing

    set_clause = ", ".join(f"{column} = :{column}" for column in values)
    conn.execute(text(f"UPDATE form_templates SET {set_clause} WHERE id = :id"), {**values, "id": template_id})
    conn.commit()
    return get_template(template_id)


def delete_template(template_id: int):
    """DELETE /forms/{id}: desactiva una plantilla (nunca se borra
    fisicamente -- sus preguntas quedan referenciadas por evaluaciones
    historicas via evaluations.template_id, protegido con ON DELETE RESTRICT).
    Solo con periodo cerrado.
    """
    _assert_no_active_period()

    existing = get_template(template_id)
    if not existing:
        return False
    if existing["is_active"]:
        conn.execute(text("UPDATE form_templates SET is_active = FALSE WHERE id = :id"), {"id": template_id})
        conn.commit()
    return True
