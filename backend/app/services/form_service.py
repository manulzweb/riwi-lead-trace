from sqlalchemy import select
from app.config.database import conn
from app.models.form_template import form_templates_table, questions_table
from app.models.role import roles_table

def get_form_template_by_role(role_name: str):
    """Obtiene la plantilla de formulario activa para un rol específico, junto con sus preguntas."""
    # 1. Obtener el ID del rol
    role_stmt = select(roles_table.c.id).where(roles_table.c.name == role_name)
    role_result = conn.execute(role_stmt).first()
    if not role_result:
        return None
    role_id = role_result[0]

    # 2. Obtener la plantilla activa para ese rol
    template_stmt = select(form_templates_table).where(
        form_templates_table.c.target_role_id == role_id,
        form_templates_table.c.is_active == True
    )
    template_row = conn.execute(template_stmt).mappings().first()
    if not template_row:
        return None
    
    template_dict = dict(template_row)

    # 3. Obtener las preguntas asociadas a esa plantilla
    questions_stmt = select(questions_table).where(
        questions_table.c.template_id == template_dict["id"]
    ).order_by(questions_table.c.sort_order.asc())
    
    questions_result = conn.execute(questions_stmt)
    template_dict["questions"] = [dict(row) for row in questions_result.mappings()]

    return template_dict
