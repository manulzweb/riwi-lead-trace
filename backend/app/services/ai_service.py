import google.generativeai as genai
from typing import List
from app.config.database import engine
from app.config.config import settings
from app.services.metrics_service import metrics_service
from app.services.settings_service import settings_service, SYSTEM_SETTINGS_DEFAULTS
from app.repositories.ai_repository import AIRepository
from app.exceptions.ai_exceptions import InsufficientDataException, AIServiceUnavailableException

AI_SUMMARY_MODEL = "gemini-3.5-flash"
AI_LITE_MODEL = "gemini-2.5-flash-lite"

# Temperatura FIJA para el chequeo de coherencia texto<->categoria (AI_LITE_MODEL).
#
# Por que NO usa `ai_temperature` de system_settings: ese chequeo es una decision
# binaria (SI/NO) que puede BLOQUEAR al admin al editar el texto de una pregunta
# (regla de negocio 6). Con temperatura alta la MISMA pregunta se aprobaria o se
# rechazaria segun la tirada, y el admin no podria reproducir ni sustentar el
# resultado. Un control de integridad tiene que ser determinista, asi que va en 0.0
# y no se expone en la UI. El ajuste configurable gobierna solo el RESUMEN, que es
# texto redactado y donde variar el tono si es una preferencia legitima del admin.
COHERENCE_TEMPERATURE = 0.0

# `ai_auto_summary` (system_settings):
# Cuando esta activo, `period_service.py` ejecuta una BackgroundTask al cerrar un
# periodo (`is_active` -> False) para pre-generar los resumenes de IA pendientes
# y dejarlos cacheados en `ai_feedback_cache`.

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
            period_data = next((p for p in score_info if p["period_id"] == period_id), None)
            
            if not period_data:
                sys_settings = settings_service.get_settings()
                min_evals = sys_settings.get("required_evaluations", 3)
                raise InsufficientDataException(
                    f"Datos insuficientes para generar resumen con IA (se necesitan al menos {min_evals} evaluaciones enviadas)."
                )
                
            average_score = period_data["average_score"]
            # get_score_history no expone n_evals, asi que se manda un texto generico.
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

        summary = self._ask_gemini(prompt, AI_SUMMARY_MODEL, self._get_summary_temperature())
        
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

    def _get_summary_temperature(self) -> float:
        """Lee `ai_temperature` de system_settings para la generacion de resumenes.

        Se llama FUERA de cualquier `with engine.connect()` abierto: get_settings()
        hace su propio checkout del pool y anidarlo dentro de otra conexion abierta
        gastaria dos conexiones por request sin necesidad.

        Si la tabla esta vacia o el valor es invalido se cae al valor de fabrica en
        vez de reventar: un ajuste corrupto no debe tumbar el resumen.
        """
        default = SYSTEM_SETTINGS_DEFAULTS["ai_temperature"]
        try:
            value = settings_service.get_settings().get("ai_temperature", default)
            # La columna es DECIMAL(3,2), asi que llega como Decimal y el SDK espera float.
            temperature = float(value)
        except (TypeError, ValueError, KeyError):
            return default
        # El CHECK de la BD ya limita 0..1; se reafirma aqui por si el dato entro por otra via.
        return min(max(temperature, 0.0), 1.0)

    def _ask_gemini(self, prompt: str, model_name: str, temperature: float) -> str:
        if not settings.GEMINI_API_KEY:
            return "[Servicio de IA deshabilitado: GEMINI_API_KEY no configurado en el archivo .env]"

        try:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel(model_name)
            # Sin GenerationConfig el SDK aplica la temperatura por defecto del modelo
            # y el ajuste del admin no llegaba nunca a la API.
            response = model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(temperature=temperature),
            )
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
            answer = self._ask_gemini(prompt, AI_LITE_MODEL, COHERENCE_TEMPERATURE)
            return answer.strip().upper().startswith("S")
        except Exception:
            return True

    def generate_missing_summaries_for_period(self, period_id: int):
        from app.services.metrics_service import metrics_service
        import logging
        logger = logging.getLogger(__name__)
        logger.info("Background task starting: generating missing AI summaries for period %s", period_id)

        try:
            summary_data = metrics_service.get_metrics_summary(period_id)
            # Solo los que tienen average_score valido llegan al minimo de evaluaciones para resumir.
            valid_evaluatees = [e for e in summary_data["evaluatees"] if e.get("average_score") is not None]

            generated_count = 0
            with engine.connect() as conn:
                for evaluatee in valid_evaluatees:
                    evaluatee_id = evaluatee["id"]
                    cached = self.repo.get_cached_summary(conn, evaluatee_id, period_id)
                    if not cached:
                        try:
                            logger.info("Generating AI summary for evaluatee %s in period %s", evaluatee_id, period_id)
                            self.get_or_generate_ai_summary(evaluatee_id, period_id)
                            generated_count += 1
                        except Exception as e:
                            logger.exception("Error generating summary for evaluatee %s", evaluatee_id)
            
            logger.info("Background task finished: generated %s missing summaries.", generated_count)
        except Exception as e:
            logger.exception("Error in background task generate_missing_summaries_for_period")

ai_service = AIService()


def check_question_category_coherence(question_text: str, category: str):
    return ai_service.check_question_category_coherence(question_text, category)

def generate_missing_summaries_for_period(period_id: int):
    return ai_service.generate_missing_summaries_for_period(period_id)
