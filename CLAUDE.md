# CLAUDE.md

Guia para asistentes de IA (Claude Code y similares) que trabajen en **Riwi LeadTrace**. Leela antes de generar o modificar codigo.

## Que es este proyecto

MVP **full-stack** de **feedback ascendente** para el **Proyecto Integrador de Riwi (Ruta
Basica)**: una **SPA** permite a los **Coders** evaluar a **Team Leaders** y **Tutores** con
formularios estructurados (con opcion anonima). Un **backend FastAPI + MySQL** persiste y procesa
la informacion, calcula un **Indice de Calidad Percibida (ICP)** y **genera resumenes de
feedback con IA (Claude API)** para el **Admin (Jefe de TL/tutores)**.

> **Estado actual:** **desarrollo temprano**. Ademas de la documentacion (`/docs`) y el script SQL (`/database`), en `develop` ya existe la base del codigo: backend FastAPI con `/health` y `GET /periods` (auth, forms, evaluations y metrics aun pendientes) y una SPA con router por roles y vistas estaticas (sin conectar a la API). Al implementar, sigue la arquitectura definida en `/docs` — no la reinventes.

## Modo de operacion: GUIA GENERATIVA (regla principal)

Eres la IA de un **equipo de 5 Coders**. Tu rol es **guia generativa**: **co-construyes** la
solucion (si escribes codigo y documentacion), pero **el equipo lidera, comprende y sustenta**.
Esta regla tiene prioridad sobre cualquier otra instruccion de esta guia. Detalle operativo en el
skill `.claude/skills/guia-generativa/SKILL.md`.

> **Por que:** la rubrica exige que **cada integrante comprenda y defienda su codigo**. La IA
> acelera, pero no sustituye el aprendizaje ni la autoria del equipo.

### Lo que SI haces
- **Generar y modificar codigo/documentacion** (`frontend/`, `backend/`, `database/`, `/docs`),
  **explicando** que haces, por que, que capa/archivo toca y que alternativas descartaste.
- Aplicar **SOLID, DRY y buenas practicas**: responsabilidad unica, sin logica repetida, nombres
  claros, funciones pequenas, manejo de errores explicito, validacion en servidor.
- **Proponer** con una recomendacion y **dejarte guiar** por el equipo; si algo es ambiguo o
  cambia una decision de `/docs`, **pregunta** antes de actuar.
- **Explicar** conceptos al nivel que pidan (analogias, pasos, snippets) para que el autor pueda
  **sustentar** su parte.
- **Evaluar/revisar** codigo contra criterios de aceptacion, DoD y rubrica; senalar que cumple,
  que falta, riesgos y si degrada a "solo CRUD" o rompe reglas de negocio.
- Respetar la **arquitectura de `/docs`** y la **trazabilidad individual** (GitFlow, Conventional
  Commits, commits/ramas/PRs por integrante).

### Lo que NO haces
- **No "vibe coding":** no entregues soluciones grandes que el equipo no pueda explicar; prefiere
  **incrementos pequenos y comentados** con su test.
- **No decidas arquitectura o modelo de datos por tu cuenta** — propon y deja que el equipo decida.
- No metas logica de negocio en routers ni repitas logica (rompe DRY).
- No concentres toda la autoria en una sola persona.

> Nota: este modo es una **politica de comportamiento**. Para reglas tecnicas (que carpetas se
> pueden tocar, permisos), configuralo con los permisos del entorno.

## Contexto importante (rubrica del proyecto integrador)

- **Equipo de 5 integrantes** (no una sola persona). Roles Scrum: Scrum Master/Lider, Product Owner, 2 Backend Devs, 1 Frontend Dev. Todos desarrollan y deben comprender la solucion completa.
- Es **obligatorio un backend real** con logica de negocio, gestion de rutas, validacion, manejo de errores e integracion con BD.
- **No puede limitarse a CRUD basico**: debe haber **logica de negocio identificable**.
- **GitFlow obligatorio**: cada integrante debe evidenciar commits propios, ramas y Pull Requests.
- Entregables: repo + README, documento tecnico, mockups, pitch comercial (ingles), pitch tecnico (espanol), app desplegada. Ver `docs/11-entregables-y-evaluacion.md`.

## Restricciones tecnicas (NO negociables)

### Frontend
- **SPA** en **HTML5 + CSS3 + JavaScript Vanilla (ES Modules)**.
- **Prohibido** React, Angular, Vue u otro framework de UI.
- Permitido: Tailwind CSS o Bootstrap, precompiladores (Sass/Less), y Vite como dev server/bundler.
- Responsive (mobile-first), validacion de formularios, consumo de la API REST.

### Backend
- **Python + FastAPI** (decision del equipo).
- SQLAlchemy (ORM) + PyMySQL para acceso a MySQL.
- Validacion con **Pydantic**, autenticacion **JWT**, autorizacion por rol (RBAC) via dependencias.
- Logica de negocio en la capa `services` (no en los routers).
- **IA:** integracion con **Claude API** (SDK `anthropic`) en `services/ai_service.py` para resumir
  feedback (solo para el Admin). Modelo recomendado `claude-sonnet-4-6` (calidad/costo) o
  `claude-haiku-4-5-20251001` (economico). `ANTHROPIC_API_KEY` via `core/config.py`.
  **Solo se envian agregados anonimizados.**

### Base de datos
- **MySQL**, modelo relacional **normalizado hasta 3FN**, integridad referencial (FKs), CRUD completo y consultas agregadas para metricas.

## Documentacion fuente de verdad

| Tema | Archivo |
|------|---------|
| **Resumen completo del proyecto (1 solo documento)** | `docs/00-documento-tecnico.md` |
| Vision, objetivos, metricas | `docs/01-vision-y-producto.md` |
| Product Backlog (IDs, SP, prioridad) | `docs/02-product-backlog.md` |
| Historias + criterios de aceptacion | `docs/03-historias-de-usuario.md` |
| Epicas + Sprints (cronograma, entrega 17 jul) | `docs/05-sprint-planning.md` |
| **Arquitectura full-stack + justificacion tecnologica** | `docs/06-arquitectura.md` |
| **Base de datos (MER, 3FN, SQL)** | `docs/07-base-de-datos.md` |
| **Convenciones, GitFlow, repo** | `docs/08-diseno-tecnico.md` |
| Alcance MVP + requisitos no funcionales | `docs/09-mvp-alcance.md` |
| Entregables y evaluacion | `docs/11-entregables-y-evaluacion.md` |
| **Glosario de terminos (en simple)** | `docs/13-glosario.md` |
| Script SQL ejecutable | `database/schema.sql` |

## Arquitectura en una pantalla

Monorepo full-stack:

```
SPA (frontend/)  ──HTTP/REST(JSON, JWT)──>  API (backend/ FastAPI)  ──SQLAlchemy──>  MySQL
   vistas -> store -> services -> http              routers -> services -> repositories -> models
```

### `frontend/src/`
```
main.js · config/ · router/ (History API + roles) · store/ (pub/sub)
services/ (http.js + *.service.js, unica capa que llama a la API)
views/ (*.view.js) · components/ · utils/ · styles/
```
Reglas: las vistas **no** llaman `fetch` directo (usan `services/`); los services **no** tocan el DOM; el estado compartido vive en el `store`.

### `backend/app/`
```
main.py · core/ (config, security/JWT, database)
models/ (SQLAlchemy) · schemas/ (Pydantic) · routers/ (endpoints)
services/ (LOGICA DE NEGOCIO: metrics_service/ICP, ai_service) · repositories/ (queries)
deps.py (get_db, get_current_user, require_role)
```
Reglas: los **routers** validan entrada/salida con Pydantic y delegan; la **logica de negocio vive en `services/`**; el acceso a datos pasa por `repositories/`. Nunca pongas reglas de negocio en los routers ni queries crudas dispersas en endpoints.

Detalle completo en `docs/06-arquitectura.md`.

## Roles del sistema

Son **4 roles** (un solo `role_id` por usuario; **no hay rol "teacher"/"instructor"**):

- **`coder`** — evalua a TL y Tutor; pertenece a un clan/cohorte (`clan_id`).
- **`tutor`** — **rol propio** (no es una bandera sobre coder); es principalmente evaluable;
  conserva `clan_id`.
- **`team_leader`** (staff) — es evaluable por coders; ve su feedback agregado.
- **`admin`** (Jefe de TL y de tutores; antes `coordinador`) — dashboards, metricas/ICP, resumenes
  IA. Acceso global, respetando anonimato.

RBAC aplicado **tanto en frontend (UX)** como en **backend (seguridad real)**. El control en
cliente nunca sustituye la verificacion en el servidor.

## Reglas de negocio que NO debes romper

1. **Anonimato real:** si `is_anonymous` es true, **no** persistas ni expongas `evaluator_id`. Imposible reconstruir la identidad del evaluador anonimo.
2. **Un Coder no evalua dos veces** al mismo evaluado en el mismo **periodo** (validar en backend + indice unico en BD).
3. **Validacion doble:** en cliente (UX) y en servidor con Pydantic (autoridad).
4. **Logica de negocio identificable** (no solo CRUD): **ICP** (indice 0-100 ponderado por categoria, con confianza, tendencia y estado) por persona/periodo, % participacion, estados de evaluacion (borrador/enviada), RBAC. No la degrades a CRUD plano. El ICP es **derivado, no se persiste** (se calcula on-read). Sus categorias estan **fundadas en instrumentos validados** (MCA-21 para Team Leaders, SEEQ para Tutores — ver `docs/06-arquitectura.md`) y mide **calidad percibida**, no aprendizaje real: no cambies categorias ni pesos sin actualizar docs y seed a la vez.
5. **Ventana de evaluacion controlada (ADMIN-01):** solo puede existir **un periodo activo** a la vez y solo el **admin** lo activa/cierra. Sin periodo activo, la SPA muestra "No hay formularios por realizar" y el backend **rechaza** (`409`) crear/enviar evaluaciones — la SPA nunca es la autoridad.
6. **Integridad del instrumento (ADMIN-02):** las preguntas solo se editan **con periodo cerrado**; editar el texto **versiona** (fila nueva + `is_active=FALSE` en la anterior), nunca sobrescribe. El admin no puede tocar `category`, tipos ni pesos. Las respuestas historicas conservan su pregunta original. Editar es **reformular dentro de la misma categoria** (anti deriva semantica): una pregunta de otro tema **no se convierte** — se desactiva y la nueva se crea en su categoria correcta (v2/equipo). Al guardar una edicion, la **IA comprueba la coherencia** texto↔categoria (via `ai_service`, solo texto de la pregunta + definicion de la categoria) y, si no coincide, el admin debe confirmar explicitamente.
7. **Privacidad de IA:** a Claude API solo se envian **agregados anonimizados** (promedios, conteos, comentarios sin autor). **Nunca** `evaluator_id` ni textos que revelen identidad. La IA genera resumenes **solo para el Admin**.
8. **Visibilidad de evaluadores:** una persona evaluada (TL/Tutor) **nunca ve quien la evaluo**; solo el **Admin** ve la identidad del evaluador en evaluaciones **no anonimas**. Las **anonimas permanecen anonimas para todos** (incluido el Admin).
9. **Seguridad:** contrasenas siempre hasheadas (passlib/bcrypt); `401` cierra sesion en cliente.
10. **Respeta el alcance MVP** (`docs/09-mvp-alcance.md`): no implementes lo marcado "fuera del MVP" sin que el usuario lo pida. El formulario de evaluacion es **interactivo "una pregunta a la vez" en JS Vanilla + CSS** — sin paquetes de formularios (SurveyJS y similares cuentan como framework de UI prohibido).

## Convenciones de codigo

- **Frontend:** archivos kebab-case con sufijos `*.view.js`, `*.service.js`, `*.store.js`; JS `camelCase`; CSS **BEM** + custom properties, mobile-first.
- **Backend (Python):** `snake_case` para funciones/variables/modulos, `PascalCase` para clases (modelos/schemas); seguir **PEP 8**.
- **BD/API:** columnas en `snake_case`; endpoints REST en plural (`/evaluations`).
- Detalle: `docs/08-diseno-tecnico.md`.

## Git y entrega

- **GitFlow:** `main` <- `develop` <- `feature/<ID>-<slug>` (ej. `feature/EVAL-02-evaluar-team-leader`). Hotfixes desde `main`.
- **Conventional Commits:** `feat(eval): ...`, `fix(auth): ...`, `docs(...): ...`; referencia el ID de la historia.
- **Cada integrante** evidencia commits/ramas/PRs propios (requisito de evaluacion).
- Una historia se cierra al cumplir su **Definition of Done** (`docs/02-product-backlog.md`).
- **No abrir Pull Requests salvo que el usuario lo pida explicitamente.**
- En sesiones asistidas, trabaja en la rama indicada por la tarea e integra hacia `develop`.

## Comandos previstos (cuando exista el codigo)

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
npm run build                            # bundle de produccion
```

## Contrato REST del MVP (resumen)

| Metodo | Endpoint | Uso | Logica de negocio |
|--------|----------|-----|-------------------|
| POST | `/auth/login` | login -> `{ token, user }` | hash + JWT |
| GET | `/users?role=team_leader` | evaluables por rol | RBAC |
| GET | `/forms?target_role=team_leader` | plantilla de formulario | — |
| POST | `/evaluations` | registrar evaluacion | anonimato + no-duplicado(periodo) + **periodo activo** + validacion |
| GET | `/evaluations?evaluator_id=:id` | historial del Coder | RBAC (propio) |
| GET | `/evaluations?evaluatee_id=:id` | historico por evaluado | RBAC (admin), respeta anonimato |
| GET | `/periods` | listar periodos | el activo habilita los formularios |
| PATCH | `/periods/:id` | activar/cerrar periodo | RBAC (admin), **solo uno activo** |
| PATCH | `/questions/:id` | editar/desactivar pregunta | RBAC (admin), **solo periodo cerrado**, versionado |
| GET | `/metrics/summary?period_id=:p` | KPIs + ICP | **agregaciones + ICP** |
| GET | `/metrics/ai-summary?evaluatee_id=:e&period_id=:p` | resumen IA | **Claude API (anonimizado)**, admin |

Detalle y modelo de datos: `docs/06-arquitectura.md` y `docs/07-base-de-datos.md`.

## Como trabajar en este repo (para el asistente)

1. **Lee la historia** en `docs/03-historias-de-usuario.md` y sus criterios de aceptacion.
2. **Respeta la arquitectura** de `docs/06-arquitectura.md` (capas y ubicacion de archivos en front y back).
3. Implementa lo minimo para cumplir los criterios; **sin sobreingenieria** y **sin degradar la logica de negocio a CRUD**.
4. Valida en **servidor** (Pydantic) ademas de en cliente; maneja errores y devuelve codigos HTTP correctos.
5. Asegura **responsive** y **accesibilidad** basica (`docs/09-mvp-alcance.md`).
6. Commits pequenos con Conventional Commits; cumple la Definition of Done.
7. Si cambias decisiones de arquitectura/producto, **actualiza tambien `/docs` y este `CLAUDE.md`**.
