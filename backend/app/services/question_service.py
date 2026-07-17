from sqlalchemy import text
from fastapi import HTTPException, status

from app.config.database import conn
from app.schemas.question import QuestionCreate, WeightsUpdate
from app.services.ai_service import check_question_category_coherence

WEIGHT_SUM_TOLERANCE = 0.01  # margen por redondeo de DECIMAL(5,2)


def _assert_no_active_period():
    """Regla ADMIN-02: las preguntas (texto o pesos) solo se editan con el
    periodo cerrado -- editarlas mientras hay evaluaciones en curso podria
    cambiar el instrumento debajo de evaluadores a mitad de respuesta.
    """
    active = conn.execute(text("SELECT id FROM periods WHERE is_active = TRUE")).first()
    if active:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se pueden editar preguntas mientras haya un periodo activo. Cierra el periodo primero."
        )


def get_question(question_id: int):
    query = text("""
        SELECT id, template_id, text, category, input_type, sort_order, weight_percent, is_active
        FROM questions WHERE id = :id
    """)
    row = conn.execute(query, {"id": question_id}).mappings().first()
    return dict(row) if row else None


def get_questions_by_template(template_id: int, only_active: bool = True):
    query_str = "SELECT id, template_id, text, category, input_type, sort_order, weight_percent, is_active FROM questions WHERE template_id = :template_id"
    if only_active:
        query_str += " AND is_active = TRUE"
    query_str += " ORDER BY sort_order ASC"
    result = conn.execute(text(query_str), {"template_id": template_id})
    return [dict(row) for row in result.mappings()]


def version_question_text(question_id: int, new_text: str, confirm: bool):
    """Edita el texto de una pregunta versionandola (ADMIN-02): nunca
    sobrescribe la fila -- desactiva la anterior y crea una nueva con el
    mismo template/category/input_type/weight_percent/sort_order, para que
    las respuestas historicas conserven su pregunta y su peso originales.
    """
    _assert_no_active_period()

    original = get_question(question_id)
    if original is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pregunta no encontrada.")
    if not original["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Esta pregunta ya fue reemplazada por una version mas nueva."
        )
    if original["input_type"] != "scale" and original["input_type"] != "text":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tipo de pregunta invalido.")

    if not confirm:
        is_coherent = check_question_category_coherence(new_text, original["category"])
        if not is_coherent:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "La IA no esta segura de que este texto siga encajando en la categoria "
                    f"'{original['category']}'. Si de verdad quieres guardarlo asi, reenvia "
                    "la peticion con confirm=true."
                )
            )

    # category, input_type, sort_order y weight_percent NUNCA los toca esta
    # operacion -- el admin no puede tocarlos al "editar el texto" (regla
    # ADMIN-02). Si se quiere reponderar, es un paso aparte (PUT /questions/weights).
    deactivate_query = text("UPDATE questions SET is_active = FALSE WHERE id = :id")
    conn.execute(deactivate_query, {"id": question_id})

    insert_query = text("""
        INSERT INTO questions (template_id, text, category, input_type, sort_order, weight_percent, is_active)
        VALUES (:template_id, :text, :category, :input_type, :sort_order, :weight_percent, TRUE)
    """)
    result = conn.execute(insert_query, {
        "template_id": original["template_id"],
        "text": new_text,
        "category": original["category"],
        "input_type": original["input_type"],
        "sort_order": original["sort_order"],
        "weight_percent": original["weight_percent"],
    })
    conn.commit()
    return get_question(result.lastrowid)


def create_question(payload: QuestionCreate):
    """POST /questions: agrega una pregunta nueva a una plantilla existente
    (para el constructor de plantillas del Admin). A diferencia de editar
    texto, esto no versiona nada porque la fila es nueva -- no hay historial
    previo que preservar.

    No exige que los pesos sumen 100 en este momento (agregar una pregunta
    suelta normalmente descuadra el total); el admin reequilibra despues
    con PUT /questions/weights.
    """
    _assert_no_active_period()

    template_exists = conn.execute(
        text("SELECT id FROM form_templates WHERE id = :id"), {"id": payload.template_id}
    ).scalar()
    if not template_exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plantilla no encontrada.")

    next_sort_order = conn.execute(
        text("SELECT COALESCE(MAX(sort_order), -1) + 1 FROM questions WHERE template_id = :template_id"),
        {"template_id": payload.template_id}
    ).scalar()

    # weight_percent solo tiene sentido para 'scale' -- 'text'/'yes_no' no entran al ICP (ver metrics_service).
    weight = payload.weight_percent if payload.input_type == "scale" else 0

    insert_query = text("""
        INSERT INTO questions (template_id, text, category, input_type, sort_order, weight_percent, is_active)
        VALUES (:template_id, :text, :category, :input_type, :sort_order, :weight_percent, TRUE)
    """)
    result = conn.execute(insert_query, {
        "template_id": payload.template_id,
        "text": payload.text,
        "category": payload.category,
        "input_type": payload.input_type,
        "sort_order": next_sort_order,
        "weight_percent": weight,
    })
    conn.commit()
    return get_question(result.lastrowid)


def delete_question(question_id: int):
    """DELETE /questions/{id}: desactiva una pregunta (nunca se borra
    fisicamente -- podria tener respuestas historicas via
    evaluation_answers.question_id, y la FK la protege con ON DELETE RESTRICT).
    Idempotente: si ya estaba desactivada, no es un error.
    """
    _assert_no_active_period()

    existing = get_question(question_id)
    if existing is None:
        return False
    if existing["is_active"]:
        conn.execute(text("UPDATE questions SET is_active = FALSE WHERE id = :id"), {"id": question_id})
        conn.commit()
    return True


def update_weights(payload: WeightsUpdate):
    """PUT /questions/weights: reponderar las preguntas de escala activas de
    un template. Los pesos deben cubrir EXACTAMENTE ese conjunto (ni de mas
    ni de menos) y sumar 100, o se rechaza sin tocar nada.
    """
    _assert_no_active_period()

    current = get_questions_by_template(payload.template_id, only_active=True)
    current_scale = {q["id"] for q in current if q["input_type"] == "scale"}

    sent_ids = {w.question_id for w in payload.weights}
    if sent_ids != current_scale:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "El listado de pesos debe incluir exactamente todas las preguntas de escala "
                "activas del template, ni de mas ni de menos."
            )
        )

    total = sum(w.weight_percent for w in payload.weights)
    if abs(total - 100) > WEIGHT_SUM_TOLERANCE:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Los pesos deben sumar 100 (suma actual: {total})."
        )

    update_query = text("UPDATE questions SET weight_percent = :weight_percent WHERE id = :id")
    for item in payload.weights:
        conn.execute(update_query, {"weight_percent": item.weight_percent, "id": item.question_id})
    conn.commit()

    return get_questions_by_template(payload.template_id, only_active=True)
