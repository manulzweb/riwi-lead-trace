import google.generativeai as genai
from typing import List
from app.config.database import engine
from app.config.config import settings
from app.services.metrics_service import metrics_service
from app.repositories.ai_repository import AIRepository
from app.exceptions.ai_exceptions import InsufficientDataException, AIServiceUnavailableException

AI_SUMMARY_MODEL = "gemini-3.5-flash"
AI_LITE_MODEL = "gemini-2.5-flash-lite"
MIN_EVALUATIONS = 3

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

class AIService:
    def __init__(self, repository: AIRepository = None):
        self.repo = repository or AIRepository()

    def get_or_generate_ai_summary(self, evaluatee_id: int, period_id: int) -> str:
        with engine.connect() as conn:
            cached = self.repo.get_cached_summary(conn, evaluatee_id, period_id)
            if cached:
                return cached

            score_info = metrics_service.get_score_history(evaluatee_id)
            # Find the specific period in the precalculated view history
            period_data = next((p for p in score_info if p["period_id"] == period_id), None)
            
            if not period_data:
                raise InsufficientDataException(
                    f"Datos insuficientes para generar resumen con IA (se necesitan al menos {MIN_EVALUATIONS} evaluaciones enviadas)."
                )
                
            average_score = period_data["average_score"]
            # get_score_history output doesn't include n_evals natively, so we pass a generic message
            n_evals = "Múltiples" 

            comments = self.repo.get_anonymized_comments(conn, evaluatee_id, period_id)
            name, role = self.repo.get_evaluatee_info(conn, evaluatee_id)
            period_name = self.repo.get_period_name(conn, period_id)

        prompt = self._build_prompt(
            name=name,
            role=role,
            period_name=period_name,
            average_score=average_score,
            n_evals=n_evals,
            comments=comments,
        )

        summary = self._ask_gemini(prompt, AI_SUMMARY_MODEL)
        
        with engine.begin() as conn:
            self.repo.cache_summary(conn, evaluatee_id, period_id, summary, AI_SUMMARY_MODEL)
            
        return summary

    def _build_prompt(self, name: str, role: str, period_name: str, average_score: float, n_evals: str, comments: List[str]) -> str:
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

    def _ask_gemini(self, prompt: str, model_name: str) -> str:
        if not settings.GEMINI_API_KEY:
            return "[Servicio de IA deshabilitado: GEMINI_API_KEY no configurado en el archivo .env]"

        try:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt)
            return response.text
        except Exception as e:
            raise AIServiceUnavailableException(f"Error al conectar con el servicio de IA de Gemini: {str(e)}")

    def check_question_category_coherence(self, question_text: str, category: str) -> bool:
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
            answer = self._ask_gemini(prompt, AI_LITE_MODEL)
            return answer.strip().upper().startswith("S")
        except Exception:
            return True

ai_service = AIService()

def get_or_generate_ai_summary(evaluatee_id: int, period_id: int):
    return ai_service.get_or_generate_ai_summary(evaluatee_id, period_id)

def check_question_category_coherence(question_text: str, category: str):
    return ai_service.check_question_category_coherence(question_text, category)
