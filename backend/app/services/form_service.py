from sqlalchemy import text
from app.config.database import conn

def get_form_template_by_role(role_name: str):
    """Obtiene la plantilla de formulario activa para un rol específico, junto con sus preguntas."""
    # 1. Obtener el ID del rol
    role_query = text("SELECT id FROM roles WHERE name = :name")
    role_id = conn.execute(role_query, {"name": role_name}).scalar()
    if not role_id:
        return None

    # 2. Obtener la plantilla activa para ese rol
    template_query = text("""
        SELECT id, title, target_role_id, is_active
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
        WHERE template_id = :template_id
        ORDER BY sort_order ASC
    """)
    questions_result = conn.execute(questions_query, {"template_id": template_dict["id"]})
    template_dict["questions"] = [dict(row) for row in questions_result.mappings()]

    return template_dict
