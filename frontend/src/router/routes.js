import { renderDashboard, setupDashboard }         from "../views/dashboard.view.js";
import { renderProfile, setupProfile }               from "../views/profile.view.js";
import { renderLogin, setupLogin }                   from "../views/auth/login.js";
import { renderNotFound, setupNotFound }             from "../views/notFound.js";
import { renderEvaluate, setupEvaluate }             from "../views/coder/evaluate.view.js";
import { renderMyEvaluations, setupMyEvaluations }   from "../views/coder/my-evaluations.view.js";
import { renderMyResults, setupMyResults }           from "../views/team-leader/my-results.view.js";
import { renderTutorLog, setupTutorLog }             from "../views/team-leader/tutor-log.view.js";
import { renderTutorLogForm, setupTutorLogForm }     from "../views/team-leader/tutor-log-form.view.js";
import { renderMetrics, setupMetrics }               from "../views/admin/metrics.view.js";
import { renderTalent, setupTalent }                 from "../views/admin/talent.view.js";
import { renderAiSummary, setupAiSummary }           from "../views/admin/ai-summary.view.js";

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
  "/evaluations": {
    title: "Mis evaluaciones | LeadTrace",
    renderView: renderMyEvaluations,
    initSetup: setupMyEvaluations,
    requireAuth: true,
    allowedRoles: ["coder"],
  },
  "/evaluations/new": {
    title: "Nueva evaluación | LeadTrace",
    renderView: renderEvaluate,
    initSetup: setupEvaluate,
    requireAuth: true,
    allowedRoles: ["coder"],
  },

  // ── Team Leader ────────────────────────────────────────────────────────────
  "/my-results": {
    title: "Mis resultados | LeadTrace",
    renderView: renderMyResults,
    initSetup: setupMyResults,
    requireAuth: true,
    allowedRoles: ["team_leader", "tutor"],
  },
  "/tutor-logs": {
    title: "Bitácora | LeadTrace",
    renderView: renderTutorLog,
    initSetup: setupTutorLog,
    requireAuth: true,
    allowedRoles: ["team_leader"],
  },
  "/tutor-logs/new": {
    title: "Nueva entrada | LeadTrace",
    renderView: renderTutorLogForm,
    initSetup: setupTutorLogForm,
    requireAuth: true,
    allowedRoles: ["team_leader"],
  },

  // ── Admin ──────────────────────────────────────────────────────────────────
  "/admin/metrics": {
    title: "Métricas ICA | LeadTrace",
    renderView: renderMetrics,
    initSetup: setupMetrics,
    requireAuth: true,
    allowedRoles: ["admin"],
  },
  "/admin/talent": {
    title: "Analítica de talento | LeadTrace",
    renderView: renderTalent,
    initSetup: setupTalent,
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

  // ── Sistema ────────────────────────────────────────────────────────────────
  "/404": {
    title: "Página no encontrada | LeadTrace",
    renderView: renderNotFound,
    initSetup: setupNotFound,
    requireAuth: false,
    allowedRoles: ["coder", "tutor", "team_leader", "admin"],
  },
};
