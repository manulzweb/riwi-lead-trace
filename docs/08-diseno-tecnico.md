# 08 — Diseño Técnico

## Convenciones de nombres

### Frontend — archivos y carpetas
- Carpetas y archivos en **kebab-case**: `evaluation-form.view.js`, `auth.service.js`.
- Sufijos por tipo: `*.view.js` (vistas), `*.service.js` (servicios), `*.store.js` (stores).
- Componentes reutilizables sin sufijo en `components/`: `navbar.js`, `rating-input.js`.

### Frontend — código JavaScript
- **Variables y funciones:** `camelCase` (`getEvaluables`, `currentUser`).
- **Constantes globales:** `UPPER_SNAKE_CASE` (`API_BASE_URL`).
- **Clases/constructores:** `PascalCase` (raro en este MVP; preferir funciones).
- **Privado por convención:** prefijo `_` (`_render`).
- **Booleanos:** prefijo `is/has/can` (`isAnonymous`, `hasSession`).
- Módulos ES (`import`/`export`); evitar variables globales.

### Backend — código Python (PEP 8)
- **Módulos y paquetes:** `snake_case` (`evaluation_service.py`, `metrics.py`).
- **Funciones y variables:** `snake_case` (`build_summary`, `current_user`).
- **Clases** (modelos SQLAlchemy, schemas Pydantic): `PascalCase` (`Evaluation`, `EvaluationCreate`).
- **Constantes:** `UPPER_SNAKE_CASE` (`MIN_EVALUATIONS`, `ANTHROPIC_API_KEY`).
- Schemas Pydantic con sufijo de intención: `EvaluationCreate`, `EvaluationOut`.
- Type hints obligatorios; formateo con **Black** + lint con **Ruff/Flake8**.

### CSS
- Metodología **BEM**: `.card`, `.card__title`, `.card--highlight`.
- Variables de diseño en `:root` (`--color-primary`, `--space-md`).
- **Mobile-first**: estilos base para móvil, `@media (min-width: ...)` para ampliar.

### Base de datos / API
- Tablas y columnas en **snake_case** (`form_templates`, `created_at`).
- Endpoints REST en **kebab/plural** (`/evaluations`, `/form-templates`).

## Estrategia de ramas Git (GitFlow) — equipo de 5

GitFlow es **obligatorio** y cada integrante debe evidenciar commits, ramas y Pull Requests propios (impacta la evaluación individual). Se usa un GitFlow de 3 tipos de rama:

```
main        ← código estable / entregable (releases del MVP)
 └─ develop ← integración continua del trabajo del equipo
     ├─ feature/CORE-02-backend-base         (Backend Dev)
     ├─ feature/EVAL-02-evaluar-team-leader  (Frontend Dev)
     └─ feature/DASH-02-metricas             (Backend Dev)
```

- `main`: siempre desplegable. Recibe merges desde `develop` al cerrar un sprint/release.
- `develop`: rama de integración; refleja el estado actual del MVP.
- `feature/*`: **una por historia**, nombrada con el ID; trabajada por su responsable:
  - `feature/CORE-01-setup-spa`
  - `feature/AUTH-02-sesion-rutas-protegidas`
  - `feature/EVAL-05-registrar-evaluacion`
- Correcciones urgentes sobre `main`: `hotfix/<slug>`.

### Flujo de trabajo del equipo
1. `git checkout develop && git pull`
2. `git checkout -b feature/EVAL-02-evaluar-team-leader`
3. Commits pequeños y frecuentes durante la historia.
4. **Pull Request** `feature/* → develop` revisado por **al menos otro integrante** (code review cruzado).
5. Merge a `develop` al cumplir la Definition of Done.
6. Al cerrar el sprint: PR `develop → main` + tag de versión (`v0.1.0`, `v0.2.0`, ...).

### Buenas prácticas para trabajo en paralelo (5 personas)
- Acordar el **contrato REST** en Sprint 0 para que backend y frontend avancen sin bloquearse.
- Ramas cortas y PRs pequeños → menos conflictos de merge.
- `develop` siempre integrable; no romper la build de los demás.
- Repartir historias por responsable para asegurar **contribución individual evidenciable**.

> En este repositorio, el trabajo asistido se realiza en la rama indicada por la tarea
> (`claude/claude-md-docs-8814n5`); al integrarse seguirá el flujo anterior hacia `develop`.

### Convención de commits (Conventional Commits)

```
<tipo>(<alcance>): <descripción breve en imperativo>
```

Tipos: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.

Ejemplos:
```
feat(eval): agregar formulario de evaluación de Team Leader
fix(auth): redirigir a login cuando el token expira
docs(backlog): actualizar story points del sprint 2
```

Referenciar el ID de la historia cuando aplique: `feat(eval): EVAL-02 formulario Team Leader`.

## Estructura del repositorio GitHub (monorepo)

```
riwi-lead-trace/
├── README.md                 # overview + cómo correr
├── CLAUDE.md                 # guía para asistentes de IA
├── .gitignore
├── frontend/                 # SPA Vanilla JS (ver 06-arquitectura)
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
├── backend/                  # API FastAPI (ver 06-arquitectura)
│   ├── app/
│   ├── tests/
│   ├── requirements.txt
│   └── .env.example
├── database/
│   ├── 01_ddl.sql             # estructura (DDL)
│   └── 02_dml.sql             # datos semilla (DML)
├── docs/                     # documentación Scrum + técnica (01..12)
└── mockups/                  # exports/enlaces Figma
```

### Configuración recomendada del repo
- **Branch protection** en `main` y `develop` (no push directo; PR + 1 review requeridos).
- **PR template** con checklist de Definition of Done.
- **Issues** vinculados a las historias del backlog (un issue por ID).
- **Milestones** = Sprints (Sprint 0, 1, 2).
- **GitHub Projects** (tablero Kanban) como herramienta de seguimiento Scrum.
- **Labels:** por épica (`core`, `auth`, `eval`, `hist`, `dash`), prioridad (`must`, `should`, `could`) y capa (`frontend`, `backend`).

## Calidad y herramientas (livianas, sin sobreingeniería)

**Frontend**
- **Formato:** Prettier por defecto. **Lint:** ESLint base (`eslint:recommended`) para JS Vanilla/ESM.

**Backend**
- **Formato:** Black. **Lint:** Ruff (o Flake8). **Tipos:** type hints + (opcional) mypy.
- **Tests:** `pytest` para servicios con lógica de negocio (anonimato, no-duplicado, métricas).

**General**
- `.editorconfig` para indentación consistente (JS: 2 espacios; Python: 4 espacios).
- **Casos de prueba y evidencias** documentados (requisito de la rúbrica): ver [`11-entregables-y-evaluacion.md`](./11-entregables-y-evaluacion.md).
