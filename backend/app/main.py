from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import health

app = FastAPI(
    title="Riwi LeadTrace API",
    description="Backend de evaluación 360° para Riwi",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["health"])

# app.include_router(auth.router,        prefix="/auth",        tags=["auth"])
# app.include_router(users.router,       prefix="/users",       tags=["users"])
# app.include_router(forms.router,       prefix="/forms",       tags=["forms"])
# app.include_router(evaluations.router, prefix="/evaluations", tags=["evaluations"])
# app.include_router(metrics.router,     prefix="/metrics",     tags=["metrics"])
