from sqlalchemy import text
from fastapi import HTTPException, status
import google.generativeai as genai

from app.config.database import engine
from app.config.config import settings
from app.services.metrics_service import calculate_average_score, MIN_EVALUATIONS

AI_MODEL = "gemini-3.5-flash"

_CATEGORY_DEFINITIONS = {
    "Comunicación efectiva": "que tan claro y oportuno se comunica el Team Leader con el Coder",
    "Alineación de expectativas": "que tan claro deja el Team Leader lo que espera del Coder en cada entrega",
    "Verificación de comprensión": "si el Team Leader confirma que el Coder realmente entendio antes de avanzar",
    "Fomento de la independencia": "si el Team Leader impulsa al Coder a resolver problemas por su cuenta",
    "Desarrollo profesional": "si el Team Leader ayuda al Coder a crecer como desarrollador/a",
    "Valor del aprendizaje": "si las sesiones del Tutor le aportan al Coder algo que no lograria solo",
    "Claridad y organización": "que tan clara y bien preparada esta la explicacion tecnica del Tutor",
    "Cercanía individual": "si el Tutor trata al Coder con respeto y se interesa por su proceso",
    "Disponibilidad e interacción": "si el Tutor esta disponible y responde a tiempo",
    "General": "comentarios abiertos, sin un eje tematico especifico",
}


def get_or_generate_ai_summary(evaluatee_id: int, period_id: int):
    with engine.connect() as conn:
        cache_query = text("""
            SELECT summary FROM ai_feedback_cache
            WHERE evaluatee_id = :evaluatee_id AND period_id = :period_id
        """)
        cached = conn.execute(cache_query, {"evaluatee_id": evaluatee_id, "period_id": period_id}).scalar()
        if cached:
            return cached

    score_info = calculate_average_score(evaluatee_id, period_id)
    if score_info["average_score"] is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Datos insuficientes para generar resumen con IA (se necesitan al menos {MIN_EVALUATIONS} evaluaciones enviadas)."
        )

    comments = _get_anonymized_comments(evaluatee_id, period_id)
    name, role = _get_evaluatee_name_and_role(evaluatee_id)
    period_name = _get_period_name(period_id)

    prompt = _build_prompt(
        name=name,
        role=role,
        period_name=period_name,
        average_score=score_info["average_score"],
        n_evals=score_info["n_evals"],
        comments=comments,
    )

    summary = _ask_gemini(prompt)
    _cache_summary(evaluatee_id, period_id, summary)
    return summary


def _get_anonymized_comments(evaluatee_id: int, period_id: int) -> list[str]:
    with engine.connect() as conn:
        query = text("""
            SELECT a.comment
            FROM evaluation_answers a
            JOIN evaluations e ON a.evaluation_id = e.id
            JOIN questions q ON a.question_id = q.id
            WHERE e.evaluatee_id = :evaluatee_id
              AND e.period_id = :period_id
              AND e.status = 'submitted'
              AND q.input_type = 'text'
              AND a.comment IS NOT NULL
              AND a.comment != ''
        """)
        result = conn.execute(query, {"evaluatee_id": evaluatee_id, "period_id": period_id})
        return [row[0] for row in result.all()]


def _get_evaluatee_name_and_role(evaluatee_id: int) -> tuple[str, str]:
    with engine.connect() as conn:
        query = text("""
            SELECT u.full_name, GROUP_CONCAT(r.name) as role
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN roles r ON ur.role_id = r.id
            WHERE u.id = :id
            GROUP BY u.id
        """)
        row = conn.execute(query, {"id": evaluatee_id}).first()
        return (row[0], row[1]) if row else ("Persona", "Rol")


def _get_period_name(period_id: int) -> str:
    with engine.connect() as conn:
        query = text("SELECT name FROM periods WHERE id = :id")
        return conn.execute(query, {"id": period_id}).scalar() or "Periodo"


def _build_prompt(name, role, period_name, average_score, n_evals, comments: list[str]) -> str:
    comments_str = chr(10).join([f"- {c}" for c in comments]) if comments else "No hay comentarios de texto."
    return f"""Eres un asistente de IA para Riwi LeadTrace. Tu tarea es generar un resumen ejecutivo constructivo y profesional del feedback recibido por {name}, quien tiene el rol de {role}, en el periodo {period_name}.

IMPORTANTE: Debes enfocar claramente tu análisis y tus recomendaciones en el contexto específico de su rol como {role}. 
- Si es un Team Leader, enfócate en liderazgo, comunicación y gestión de equipo.
- Si es un Tutor, enfócate en pedagogía, claridad técnica y acompañamiento del aprendizaje.
- Si es un Admin, enfócate en administración, gestión operativa y soporte.

Aqui tienes las metricas agregadas:
- Puntaje promedio de las evaluaciones: {average_score}/100
- Numero de evaluaciones recibidas: {n_evals}

Comentarios de los evaluadores:
{comments_str}

Por favor, proporciona un resumen estructurado con un tono constructivo y profesional, en las siguientes secciones:
1. Fortalezas (qué hace bien en su rol de {role})
2. Areas de oportunidad (qué puede mejorar en su rol de {role})
3. Recomendaciones de accion (pasos prácticos enfocados a su rol de {role})"""


def _ask_gemini(prompt: str) -> str:
    if not settings.GEMINI_API_KEY:
        return "[Servicio de IA deshabilitado: GEMINI_API_KEY no configurado en el archivo .env]"

    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel(AI_MODEL)
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Error al conectar con el servicio de IA de Gemini: {str(e)}"
        )



def check_question_category_coherence(question_text: str, category: str) -> bool:
    if not settings.GEMINI_API_KEY:
        return True

    definition = _CATEGORY_DEFINITIONS.get(category, category)
    prompt = (
        f"Categoria: \"{category}\" ({definition}).\n"
        f"Pregunta: \"{question_text}\"\n\n"
        "¿La pregunta encaja claramente en el tema de esa categoria? "
        "Responde con una sola palabra: SI o NO."
    )

    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel(AI_MODEL)
        response = model.generate_content(prompt)
        answer = response.text.strip().upper()
        return answer.startswith("S")
    except Exception:
        return True


def _cache_summary(evaluatee_id: int, period_id: int, summary: str) -> None:
    with engine.begin() as conn:
        query = text("""
            INSERT INTO ai_feedback_cache (evaluatee_id, period_id, summary, model)
            VALUES (:evaluatee_id, :period_id, :summary, :model)
        """)
        conn.execute(query, {
            "evaluatee_id": evaluatee_id,
            "period_id": period_id,
            "summary": summary,
            "model": AI_MODEL
        })
