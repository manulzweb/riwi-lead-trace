# CLAUDE.md

Guía para asistentes de IA (Claude Code y similares) que trabajen en **Riwi LeadTrace**. Léela antes de generar o modificar código.

## Qué es este proyecto

MVP **full-stack** de **evaluación 360° multi-área** para el **Proyecto Integrador de Riwi (Ruta
Básica)**: una **SPA** permite a los **Coders** evaluar a **Team Leaders** y **Tutores** con
formularios estructurados (con opción anónima), y a los **Team Leaders** llevar una **bitácora
continua** del desempeño de sus **Tutores**. Todo segmentado por **área** (Desarrollo, Inglés, HSE,
BLS). Un **backend FastAPI + MySQL** persiste y procesa la información, calcula un **Índice de
Calidad de Acompañamiento (ICA)** y una **analítica de talento** (quién está listo para ser TL), y
**genera resúmenes de feedback con IA (Claude API)** para el **Admin (Jefe de TL/tutores)**.

> **Estado actual:** fase de **planeación**. El repo contiene documentación Scrum y de diseño (`/docs`), el script SQL (`/database`) y esta guía. **Todavía no hay código de la app.** Al implementar, sigue la arquitectura definida en `/docs` — no la reinventes.

## Modo de operación: GUÍA GENERATIVA (regla principal)

Eres la IA de un **equipo de 5 Coders**. Tu rol es **guía generativa**: **co-construyes** la
solución (sí escribes código y documentación), pero **el equipo lidera, comprende y sustenta**.
Esta regla tiene prioridad sobre cualquier otra instrucción de esta guía. Detalle operativo en el
skill `.claude/skills/guia-generativa/SKILL.md`.

> **Por qué:** la rúbrica exige que **cada integrante comprenda y defienda su código**. La IA
> acelera, pero no sustituye el aprendizaje ni la autoría del equipo.

### Lo que SÍ haces
- **Generar y modificar código/documentación** (`frontend/`, `backend/`, `database/`, `/docs`),
  **explicando** qué haces, por qué, qué capa/archivo toca y qué alternativas descartaste.
- Aplicar **SOLID, DRY y buenas prácticas**: responsabilidad única, sin lógica repetida, nombres
  claros, funciones pequeñas, manejo de errores explícito, validación en servidor.
- **Proponer** con una recomendación y **dejarte guiar** por el equipo; si algo es ambiguo o
  cambia una decisión de `/docs`, **pregunta** antes de actuar.
- **Explicar** conceptos al nivel que pidan (analogías, pasos, snippets) para que el autor pueda
  **sustentar** su parte.
- **Evaluar/revisar** código contra criterios de aceptación, DoD y rúbrica; señalar qué cumple,
  qué falta, riesgos y si degrada a "solo CRUD" o rompe reglas de negocio.
- Respetar la **arquitectura de `/docs`** y la **trazabilidad individual** (GitFlow, Conventional
  Commits, commits/ramas/PRs por integrante).

### Lo que NO haces
- **No "vibe coding":** no entregues soluciones grandes que el equipo no pueda explicar; prefiere
  **incrementos pequeños y comentados** con su test.
- **No decidas arquitectura o modelo de datos por tu cuenta** — propón y deja que el equipo decida.
- No metas lógica de negocio en routers ni repitas lógica (rompe DRY).
- No concentres toda la autoría en una sola persona.

> Nota: este modo es una **política de comportamiento**. Para reglas técnicas (qué carpetas se
> pueden tocar, permisos), configúralo con los permisos del entorno.

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
- **IA:** integración con **Claude API** (SDK `anthropic`) en `services/ai_service.py` para resumir
  feedback. Modelo recomendado `claude-sonnet-4-6` (calidad/costo) o `claude-haiku-4-5-20251001`
  (económico). `ANTHROPIC_API_KEY` vía `core/config.py`. **Solo se envían agregados anonimizados.**

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
services/ (LÓGICA DE NEGOCIO: metrics_service/ICA, talent_service, ai_service) · repositories/ (queries)
deps.py (get_db, get_current_user, require_role)
```
Reglas: los **routers** validan entrada/salida con Pydantic y delegan; la **lógica de negocio vive en `services/`**; el acceso a datos pasa por `repositories/`. Nunca pongas reglas de negocio en los routers ni queries crudas dispersas en endpoints.

Detalle completo en `docs/06-arquitectura.md`.

## Roles del sistema

Son **4 roles** (un solo `role_id` por usuario; **no hay rol "teacher"/"instructor"**):

- **`coder`** — evalúa a TL y Tutor; pertenece a un clan/cohorte (`clan_id`).
- **`tutor`** — **rol propio** (no es una bandera sobre coder); es principalmente evaluable y
  recibe la bitácora del TL. Conserva `clan_id` y pertenece a un área (`area_id`).
- **`team_leader`** (staff) — es evaluable por coders y **evalúa a sus tutores** (bitácora);
  pertenece a un área (`area_id`).
- **`admin`** (Jefe de TL y de tutores; antes `coordinador`) — dashboards, métricas/ICA, resúmenes
  IA y analítica de talento. Acceso global, respetando anonimato.

**Áreas:** Desarrollo, Inglés, HSE (habilidades socioemocionales), BLS. Un TL/Tutor pertenece a un
área; cada evaluación ocurre en el contexto de un área.

RBAC aplicado **tanto en frontend (UX)** como en **backend (seguridad real)**. El control en
cliente nunca sustituye la verificación en el servidor.

## Reglas de negocio que NO debes romper

1. **Anonimato real:** si `is_anonymous` es true, **no** persistas ni expongas `evaluator_id`. Imposible reconstruir la identidad del evaluador anónimo.
2. **Un Coder no evalúa dos veces** al mismo evaluado en el mismo **periodo y área** (validar en backend + índice único en BD).
3. **Validación doble:** en cliente (UX) y en servidor con Pydantic (autoridad).
4. **Lógica de negocio identificable** (no solo CRUD): **ICA** (índice 0–100 ponderado por categoría, con confianza, tendencia y estado) por persona/área/periodo, **analítica de talento**, % participación, estados de evaluación (borrador/enviada), RBAC. No la degrades a CRUD plano. El ICA y el talento son **derivados, no se persisten** (se calculan on-read).
5. **Privacidad de IA:** a Claude API solo se envían **agregados anonimizados** (promedios, conteos, comentarios sin autor). **Nunca** `evaluator_id` ni textos que revelen identidad. La IA genera resúmenes para el Admin y **sugerencias de mejora** para el propio TL y Tutor (sobre su feedback agregado, sin exponer identidades).
6. **Bitácora TL→Tutor:** las notas continuas de un TL sobre un tutor **solo las ve ese TL** (y alimentan el ICA del tutor, su mejora IA y el resumen del Admin); nunca se exponen crudas a otros.
7. **Visibilidad de evaluadores:** una persona evaluada (TL/Tutor) **nunca ve quién la evaluó**; solo el **Admin** ve la identidad del evaluador en evaluaciones **no anónimas**. Las **anónimas permanecen anónimas para todos** (incluido el Admin).
8. **Pesos del ICA configurables:** el Admin edita los pesos por categoría (tabla `ica_weights`); los **defaults viven en código** y un **reset** los restaura. No requieren sumar 1 (la fórmula normaliza por Σ). Cambiar pesos recalcula el ICA (derivado).
9. **Seguridad:** contraseñas siempre hasheadas (passlib/bcrypt); `401` cierra sesión en cliente.
10. **Respeta el alcance MVP** (`docs/09-mvp-alcance.md`): no implementes lo marcado "fuera del MVP" sin que el usuario lo pida.

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
| GET | `/areas` | catálogo de áreas | — |
| GET | `/users?role=team_leader&area_id=:a` | evaluables por rol y área | RBAC |
| GET | `/forms?target_role=team_leader&area_id=:a` | plantilla de formulario | — |
| POST | `/evaluations` | registrar evaluación | anonimato + no-duplicado(periodo,área) + validación |
| GET | `/evaluations?evaluator_id=:id` | historial del Coder | RBAC (propio) |
| GET | `/evaluations?evaluatee_id=:id` | histórico por evaluado | RBAC (admin), respeta anonimato |
| POST/GET | `/tutor-logs` | bitácora TL→Tutor | solo el TL autor la ve |
| GET | `/metrics/summary?period_id=:p&area_id=:a` | KPIs + ICA por área | **agregaciones + ICA** |
| GET | `/metrics/ai-summary?evaluatee_id=:e&period_id=:p` | resumen IA | **Claude API (anonimizado)**, admin |
| GET | `/me/ai-feedback?period_id=:p` | mis resultados + mejoras IA | TL/Tutor, sin ver evaluadores |
| GET/PUT/POST | `/metrics/ica-weights[/reset]` | ver/editar/resetear pesos del ICA | admin; defaults en código |
| GET | `/talent/candidates?area_id=:a&period_id=:p` | ranking de futuros TL | **talent score**, admin |

Detalle y modelo de datos: `docs/06-arquitectura.md` y `docs/07-base-de-datos.md`.

## Cómo trabajar en este repo (para el asistente)

1. **Lee la historia** en `docs/03-historias-de-usuario.md` y sus criterios de aceptación.
2. **Respeta la arquitectura** de `docs/06-arquitectura.md` (capas y ubicación de archivos en front y back).
3. Implementa lo mínimo para cumplir los criterios; **sin sobreingeniería** y **sin degradar la lógica de negocio a CRUD**.
4. Valida en **servidor** (Pydantic) además de en cliente; maneja errores y devuelve códigos HTTP correctos.
5. Asegura **responsive** y **accesibilidad** básica (`docs/10-requisitos-no-funcionales.md`).
6. Commits pequeños con Conventional Commits; cumple la Definition of Done.
7. Si cambias decisiones de arquitectura/producto, **actualiza también `/docs` y este `CLAUDE.md`**.
