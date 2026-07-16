from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.config import settings
from app.routes import auth_routes, check, period_routes, user_routes, form_routes, evaluation_routes, metrics_routes

app = FastAPI(
    title="Riwi LeadTrace API",
    description="Backend de evaluación 360° para Riwi (Simplificado)",
    version="0.1.0",
)

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir enrutadores
app.include_router(auth_routes.router, tags=["auth"])
app.include_router(check.router, tags=["health"])
app.include_router(period_routes.router, tags=["periods"])
app.include_router(user_routes.router, tags=["users"])
app.include_router(form_routes.router, tags=["forms"])
app.include_router(evaluation_routes.router, tags=["evaluations"])
app.include_router(metrics_routes.router, tags=["metrics"])
