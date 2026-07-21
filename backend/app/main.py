from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import traceback
import uuid

from app.config.config import settings
from app.routes import auth_routes, category_routes, check, period_routes, user_routes, form_routes, evaluation_routes, metrics_routes, question_routes, activity_log_routes, settings_routes, cohort_routes, clan_routes

tags_metadata = [
    {"name": "auth", "description": "Validación de credenciales (bcrypt). No emite JWT; el cliente asume el estado de sesión."},
    {"name": "users", "description": "CRUD de usuarios. Mapeo de entidades a roles (`team_leader`, `tutor`, `coder`, `admin`)."},
    {"name": "forms", "description": "Gestión de esquemas de plantillas (`forms`)."},
    {"name": "questions", "description": "Mutación de preguntas. Utiliza Soft Deletes/Versionado (`is_active` flag) para mantener la integridad de evaluaciones históricas."},
    {"name": "evaluations", "description": "Transacciones de evaluación. Implementa control de concurrencia y validación de periodo activo."},
    {"name": "periods", "description": "Control de ciclos temporales. Constraint de aplicación: max 1 periodo activo global."},
    {"name": "metrics", "description": "Agregación y cálculo del Índice de Calidad Percibida (ICP) on-read. Integración NLP vía Google Gemini API."},
    {"name": "health", "description": "Health checks para el Load Balancer / Proxy."},
    {"name": "activity-log", "description": "Bitacora de acciones administrativas (auditoria basica, sin verificacion criptografica de autoria)."}
]

description_text = """
### Riwi LeadTrace API — Especificaciones Técnicas

Backend monolítico diseñado en FastAPI para el procesamiento de evaluaciones de desempeño. 

#### Arquitectura & Constraints:
*   **Base de Datos:** MySQL relacional (3FN). Acceso a datos mediante SQL plano (`sqlalchemy.text()`) sobre pool de conexiones; sin abstracción ORM para queries complejas.
*   **Autenticación & Autorización:** MVP Stateless. Autenticación contra hash Bcrypt. **No implementa JWT ni manejo de sesiones en servidor.** El control de acceso basado en roles (RBAC) está delegado al cliente (SPA); la API confía en los identificadores de sesión proporcionados en el payload (`evaluator_id`).
*   **Integridad Transaccional:** Control de concurrencia a nivel de base de datos (`UNIQUE INDEX` compuesto) para prevenir race conditions en el envío de evaluaciones. Las mutaciones de esquemas (preguntas) operan bajo lógica de append-only (versionado).
*   **IA:** Acoplamiento con Google Gemini (Google AI) mediante dos modelos según el uso: `gemini-3.5-flash` para la generación de resúmenes agregados on-fly (cacheado vía `ai_feedback_cache`) y `gemini-2.5-flash-lite` para la validación semántica de coherencia texto↔categoría en actualizaciones de preguntas.
"""

app = FastAPI(
    title="Riwi LeadTrace API",
    description=description_text,
    version="1.0.0",
    contact={
        "name": "Manuel Vasquez",
        "email": "manuelandresvasquezm21@gmail.com",
    },
    license_info={
        "name": "MIT",
    },
    openapi_tags=tags_metadata
)

# Middleware de sesión eliminado porque la auto-sanación se hace ahora a nivel de SQLAlchemy en database.py.

# Configuración de CORS
origins = [
    settings.FRONTEND_ORIGIN,
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Manejador Global de Errores (Evita que el backend se caiga feo y oculta el CORS)
#
# La respuesta al cliente es GENERICA a proposito. Antes se devolvia
# `error_hint: str(exc)`, y en un error de SQLAlchemy ese texto incluye la
# sentencia SQL completa (a veces con datos de conexion), que se filtraba al
# navegador en CADA 500.
#
# Para no perder capacidad de depuracion se devuelve un `error_id` opaco: un UUID
# que no dice nada por si mismo, se imprime en el log del servidor junto al
# traceback y permite localizar el error exacto a partir de lo que reporte el
# usuario. El detalle tecnico se queda del lado del servidor.
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_id = str(uuid.uuid4())
    print(f"ERROR NO CONTROLADO [{error_id}]: {exc}")
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Ha ocurrido un error interno en el servidor.",
            "error_id": error_id,
        },
    )

# Incluir enrutadores
app.include_router(auth_routes.router, tags=["auth"])
app.include_router(check.router, tags=["health"])
app.include_router(period_routes.router, tags=["periods"])
app.include_router(user_routes.router, tags=["users"])
app.include_router(form_routes.router, tags=["forms"])
app.include_router(evaluation_routes.router, tags=["evaluations"])
app.include_router(metrics_routes.router, tags=["metrics"])
app.include_router(question_routes.router, tags=["questions"])
app.include_router(category_routes.router, tags=["categories"])
app.include_router(activity_log_routes.router, tags=["activity-log"])
app.include_router(cohort_routes.router, tags=["master-data"])
app.include_router(clan_routes.router, tags=["master-data"])
app.include_router(settings_routes.router, tags=["settings"])
