"""Constantes propias del ciclo de evaluacion.

Los ROLE_* NO se definen aqui: viven en `role_constants` (fuente unica) y se
reexportan para no romper los imports existentes, que ya apuntaban a este
modulo.
"""
from app.constants.role_constants import ROLE_TEAM_LEADER, ROLE_TUTOR  # noqa: F401

# Valores de la columna ENUM `evaluations.status` (ver database/01_ddl.sql).
EVALUATION_STATUS_DRAFT = "draft"
EVALUATION_STATUS_SUBMITTED = "submitted"
