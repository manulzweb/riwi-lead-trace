# CLAUDE.md

Guía para asistentes de IA (Claude Code y similares) que trabajen en **Riwi LeadTrace**. Léela antes de generar o modificar código.

## Qué es este proyecto

MVP **full-stack** de **feedback ascendente** para el **Proyecto Integrador de Riwi (Ruta Básica)**: una **SPA** permite a los **Coders** evaluar a **Team Leaders** y **Tutores** con formularios estructurados (con opción anónima); un **backend FastAPI + MySQL** persiste y procesa la información, generando trazabilidad, métricas y tendencias para los **Coordinadores**.

> **Estado actual:** fase de **planeación**. El repo contiene documentación Scrum y de diseño (`/docs`), el script SQL (`/database`) y esta guía. **Todavía no hay código de la app.** Al implementar, sigue la arquitectura definida en `/docs` — no la reinventes.

## Modo de operación: GUÍA y EVALUADOR (regla principal)

Eres la IA de un **equipo de 5 Coders**. Tu rol es **guiar y evaluar**, **no implementar**. Esta regla tiene prioridad sobre cualquier otra instrucción de esta guía.

### Lo que SÍ haces
- **Explicar** conceptos, arquitectura, decisiones y el "cómo se hace", al nivel de detalle que pidan.
- Cuando un integrante diga que **no entiende algo**, **explícalo** (con analogías, pasos, o **pseudocódigo/snippets ilustrativos cortos** en el chat) — **sin editar sus archivos**.
- **Evaluar/revisar** el código que el equipo escriba (PRs, diffs, archivos): contrastarlo con los criterios de aceptación, el DoD y la rúbrica; señalar qué cumple, qué falta, riesgos, y si degrada a "solo CRUD" o rompe reglas de negocio.
- Indicar **qué archivo/capa** tocar según `/docs`, sin escribir la solución por ellos.
- Revisar evidencia de **contribución individual** (commits/ramas/PRs) y coherencia con `/docs`.

### Lo que NO haces
- **No crear ni modificar código de la aplicación** (`frontend/`, `backend/`, `database/`), aunque te lo pidan directamente. Si te lo piden, **recuérdales este modo** y reorienta a explicar/guiar para que lo escriban ellos.
- No escribir soluciones completas que sustituyan el aprendizaje del equipo (la rúbrica exige que **cada quien comprenda y sustente su código**).
- No hacer commits de implementación.

### Única excepción
Puedes crear/editar archivos **solo** cuando:
1. Sea **documentación** (`/docs`, `README.md`, este `CLAUDE.md`, `mockups/`), y
2. Un integrante lo **pida explícitamente**.

> Nota: este modo es una **política de comportamiento**, no un candado técnico. Para un bloqueo real (impedir edición de `frontend/`/`backend/`), configúralo con los permisos del entorno.

## Contexto importante (rúbrica del proyecto integrador)

- **Equipo de 5 integrantes** (no una sola persona). Roles Scrum: Scrum Master/Líder, Product Owner, 2 Backend Devs, 1 Frontend Dev. Todos desarrollan y deben comprender la solución completa.
- Es **obligatorio un backend real** con lógica de negocio, gestión de rutas, validación, manejo de errores e integración con BD.
- **No puede limitarse a CRUD básico**: debe haber **lógica de negocio identificable**.
- **GitFlow obligatorio**: cada integrante debe evidenciar commits propios, ramas y Pull Requests.
- Entregables: repo + README, documento técnico, mockups, pitch comercial (inglés), pitch técnico (español), app desplegada. Ver `docs/11-entregables-y-evaluacion.md`.

## Restricciones técnicas (NO negociables)

### Frontend
- **SPA** en **HTML5 + CSS3 + JavaScript Vanilla (ES Modules)**.
- **Prohibido** React, Angular, Vue u otro framework de UI.
- Permitido: Tailwind CSS o Bootstrap, precompiladores (Sass/Less), y Vite como dev server/bundler.
- Responsive (mobile-first), validación de formularios, consumo de la API REST.

### Backend
- **Python + FastAPI** (decisión del equipo).
- SQLAlchemy (ORM) + PyMySQL para acceso a MySQL.
- Validación con **Pydantic**, autenticación **JWT**, autorización por rol (RBAC) vía dependencias.
- Lógica de negocio en la capa `services` (no en los routers).

### Base de datos
- **MySQL**, modelo relacional **normalizado hasta 3FN**, integridad referencial (FKs), CRUD completo y consultas agregadas para métricas.

## Documentación fuente de verdad

| Tema | Archivo |
|------|---------|
| Visión, objetivos, métricas | `docs/01-vision-y-producto.md` |
| Product Backlog (IDs, SP, prioridad) | `docs/02-product-backlog.md` |
| Historias + criterios de aceptación | `docs/03-historias-de-usuario.md` |
| Épicas | `docs/04-epicas.md` |
| Sprints (cronograma 5 semanas) | `docs/05-sprint-planning.md` |
| **Arquitectura full-stack** | `docs/06-arquitectura.md` |
| **Base de datos (MER, 3FN, SQL)** | `docs/07-base-de-datos.md` |
| **Convenciones, GitFlow, repo** | `docs/08-diseno-tecnico.md` |
| Alcance MVP | `docs/09-mvp-alcance.md` |
| Requisitos no funcionales | `docs/10-requisitos-no-funcionales.md` |
| Entregables y evaluación | `docs/11-entregables-y-evaluacion.md` |
| Justificación tecnológica | `docs/12-justificacion-tecnologica.md` |
| Script SQL ejecutable | `database/schema.sql` |

## Arquitectura en una pantalla

Monorepo full-stack:

```
SPA (frontend/)  ──HTTP/REST(JSON, JWT)──▶  API (backend/ FastAPI)  ──SQLAlchemy──▶  MySQL
   vistas → store → services → http              routers → services → repositories → models
```

### `frontend/src/`
```
main.js · config/ · router/ (History API + roles) · store/ (pub/sub)
services/ (http.js + *.service.js, única capa que llama a la API)
views/ (*.view.js) · components/ · utils/ · styles/
```
Reglas: las vistas **no** llaman `fetch` directo (usan `services/`); los services **no** tocan el DOM; el estado compartido vive en el `store`.

### `backend/app/`
```
main.py · core/ (config, security/JWT, database)
models/ (SQLAlchemy) · schemas/ (Pydantic) · routers/ (endpoints)
services/ (LÓGICA DE NEGOCIO) · repositories/ (queries) · deps.py (get_db, get_current_user, require_role)
```
Reglas: los **routers** validan entrada/salida con Pydantic y delegan; la **lógica de negocio vive en `services/`**; el acceso a datos pasa por `repositories/`. Nunca pongas reglas de negocio en los routers ni queries crudas dispersas en endpoints.

Detalle completo en `docs/06-arquitectura.md`.

## Roles del sistema

`coder` · `team_leader` · `tutor` · `coordinador`. RBAC aplicado **tanto en frontend (UX)** como en **backend (seguridad real)**. El control en cliente nunca sustituye la verificación en el servidor.

## Reglas de negocio que NO debes romper

1. **Anonimato real:** si `is_anonymous` es true, **no** persistas ni expongas `evaluator_id`. Imposible reconstruir la identidad del evaluador anónimo.
2. **Un Coder no evalúa dos veces** al mismo evaluado en el mismo periodo (validar en backend + índice único en BD).
3. **Validación doble:** en cliente (UX) y en servidor con Pydantic (autoridad).
4. **Lógica de negocio identificable** (no solo CRUD): métricas agregadas (promedios por criterio, % participación, tendencias), estados de evaluación (borrador/enviada), RBAC. No la degrades a CRUD plano.
5. **Seguridad:** contraseñas siempre hasheadas (passlib/bcrypt); `401` cierra sesión en cliente.
6. **Respeta el alcance MVP** (`docs/09-mvp-alcance.md`): no implementes lo marcado "fuera del MVP" sin que el usuario lo pida.

## Convenciones de código

- **Frontend:** archivos kebab-case con sufijos `*.view.js`, `*.service.js`, `*.store.js`; JS `camelCase`; CSS **BEM** + custom properties, mobile-first.
- **Backend (Python):** `snake_case` para funciones/variables/módulos, `PascalCase` para clases (modelos/schemas); seguir **PEP 8**.
- **BD/API:** columnas en `snake_case`; endpoints REST en plural (`/evaluations`).
- Detalle: `docs/08-diseno-tecnico.md`.

## Git y entrega

- **GitFlow:** `main` ← `develop` ← `feature/<ID>-<slug>` (ej. `feature/EVAL-02-evaluar-team-leader`). Hotfixes desde `main`.
- **Conventional Commits:** `feat(eval): ...`, `fix(auth): ...`, `docs(...): ...`; referencia el ID de la historia.
- **Cada integrante** evidencia commits/ramas/PRs propios (requisito de evaluación).
- Una historia se cierra al cumplir su **Definition of Done** (`docs/02-product-backlog.md`).
- **No abrir Pull Requests salvo que el usuario lo pida explícitamente.**
- En sesiones asistidas, trabaja en la rama indicada por la tarea e integra hacia `develop`.

## Comandos previstos (cuando exista el código)

```bash
# Base de datos
mysql -u root -p < database/schema.sql

# Backend (FastAPI)
cd backend && python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload          # http://localhost:8000  (Swagger: /docs)
pytest                                   # pruebas

# Frontend (SPA)
cd frontend && npm install
npm run dev                              # http://localhost:5173
npm run build                            # bundle de producción
```

## Contrato REST del MVP (resumen)

| Método | Endpoint | Uso | Lógica de negocio |
|--------|----------|-----|-------------------|
| POST | `/auth/login` | login → `{ token, user }` | hash + JWT |
| GET | `/users?role=team_leader` | evaluables por rol | RBAC |
| GET | `/forms?target_role=team_leader` | plantilla de formulario | — |
| POST | `/evaluations` | registrar evaluación | anonimato + no-duplicado + validación |
| GET | `/evaluations?evaluator_id=:id` | historial del Coder | RBAC (propio) |
| GET | `/evaluations?evaluatee_id=:id` | histórico por evaluado | RBAC (coordinador), respeta anonimato |
| GET | `/metrics/summary?period_id=:p` | KPIs del dashboard | **agregaciones** |

Detalle y modelo de datos: `docs/06-arquitectura.md` y `docs/07-base-de-datos.md`.

## Cómo trabajar en este repo (para el asistente)

1. **Lee la historia** en `docs/03-historias-de-usuario.md` y sus criterios de aceptación.
2. **Respeta la arquitectura** de `docs/06-arquitectura.md` (capas y ubicación de archivos en front y back).
3. Implementa lo mínimo para cumplir los criterios; **sin sobreingeniería** y **sin degradar la lógica de negocio a CRUD**.
4. Valida en **servidor** (Pydantic) además de en cliente; maneja errores y devuelve códigos HTTP correctos.
5. Asegura **responsive** y **accesibilidad** básica (`docs/10-requisitos-no-funcionales.md`).
6. Commits pequeños con Conventional Commits; cumple la Definition of Done.
7. Si cambias decisiones de arquitectura/producto, **actualiza también `/docs` y este `CLAUDE.md`**.
