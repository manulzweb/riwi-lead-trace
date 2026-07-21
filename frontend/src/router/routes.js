import { renderDashboard, setupDashboard } from "../views/dashboard.view.js";
import { renderProfile, setupProfile } from "../views/profile.view.js";
import { renderLogin, setupLogin } from "../views/auth/login.js";
import { renderNotFound, setupNotFound } from "../views/notFound.js";
import { renderEvaluate, setupEvaluate } from "../views/coder/evaluate.view.js";
import { renderMyEvaluations, setupMyEvaluations } from "../views/coder/my-evaluations.view.js";
import { renderEvaluables, setupEvaluables } from "../views/coder/evaluables.view.js";
import { renderMyResults, setupMyResults } from "../views/team-leader/my-results.view.js";
import { renderMetrics, setupMetrics } from "../views/admin/metrics.view.js";
import { renderAiSummary, setupAiSummary } from "../views/admin/ai-summary.view.js";
import { renderAdminEvaluations, setupAdminEvaluations } from "../views/admin/evaluations.view.js";
import { renderAdminPeriods, setupAdminPeriods } from "../views/admin/periods.view.js";
import { renderAdminCategories, setupAdminCategories } from "../views/admin/categories.view.js";
import { renderActivityLog, setupActivityLog } from "../views/admin/activity-log.view.js";

export const ROUTES = {
  "/login": {
    title: "Login | LeadTrace",
    renderView: renderLogin,
    initSetup: setupLogin,
    requireAuth: false,
    redirectIfAuth: true,
    allowedRoles: ["coder", "tutor", "team_leader", "admin"],
  },
  "/dashboard": {
    title: "Dashboard | LeadTrace",
    renderView: renderDashboard,
    initSetup: setupDashboard,
    requireAuth: true,
    allowedRoles: ["coder", "tutor", "team_leader", "admin"],
  },
  "/profile": {
    title: "Mi perfil | LeadTrace",
    renderView: renderProfile,
    initSetup: setupProfile,
    requireAuth: true,
    allowedRoles: ["coder", "tutor", "team_leader", "admin"],
  },

  // ── Coder ──────────────────────────────────────────────────────────────────
  "/evaluables": {
    title: "Elegir evaluado | LeadTrace",
    renderView: renderEvaluables,
    initSetup: setupEvaluables,
    requireAuth: true,
    allowedRoles: ["coder"],
  },
  "/evaluations": {
    title: "Mis evaluaciones | LeadTrace",
    renderView: renderMyEvaluations,
    initSetup: setupMyEvaluations,
    requireAuth: true,
    allowedRoles: ["coder", "tutor"],
  },
  "/evaluations/new": {
    title: "Nueva evaluación | LeadTrace",
    renderView: renderEvaluate,
    initSetup: setupEvaluate,
    requireAuth: true,
    allowedRoles: ["coder", "tutor"],
  },

  // ── Team Leader ────────────────────────────────────────────────────────────
  "/my-results": {
    title: "Mis resultados | LeadTrace",
    renderView: renderMyResults,
    initSetup: setupMyResults,
    requireAuth: true,
    allowedRoles: ["team_leader", "tutor"],
  },

  // ── Admin ──────────────────────────────────────────────────────────────────
  "/admin/evaluations": {
    title: "Gestión de Formularios | LeadTrace",
    renderView: renderAdminEvaluations,
    initSetup: setupAdminEvaluations,
    requireAuth: true,
    allowedRoles: ["admin"],
  },
  "/admin/periods": {
    title: "Gestión de Ciclos | LeadTrace",
    renderView: renderAdminPeriods,
    initSetup: setupAdminPeriods,
    requireAuth: true,
    allowedRoles: ["admin"],
  },
  "/admin/metrics": {
    title: "Métricas ICP | LeadTrace",
    renderView: renderMetrics,
    initSetup: setupMetrics,
    requireAuth: true,
    allowedRoles: ["admin"],
  },
  "/admin/ai-summary": {
    title: "Resumen IA | LeadTrace",
    renderView: renderAiSummary,
    initSetup: setupAiSummary,
    requireAuth: true,
    allowedRoles: ["admin"],
  },
  "/admin/categories": {
    title: "Categorías | LeadTrace",
    renderView: renderAdminCategories,
    initSetup: setupAdminCategories,
    requireAuth: true,
    allowedRoles: ["admin"],
  },
  "/admin/activity-log": {
    title: "Bitácora | LeadTrace",
    renderView: renderActivityLog,
    initSetup: setupActivityLog,
    requireAuth: true,
    allowedRoles: ["admin"],
  },

  // ── Sistema ────────────────────────────────────────────────────────────────
  "/404": {
    title: "Página no encontrada | LeadTrace",
    renderView: renderNotFound,
    initSetup: setupNotFound,
    requireAuth: false,
    allowedRoles: ["coder", "tutor", "team_leader", "admin"],
  },
};
