# CLAUDE.md

Guia para asistentes de IA (Claude Code y similares) que trabajen en **Riwi LeadTrace**. Leela antes de generar o modificar codigo.

## Que es este proyecto

MVP **full-stack** de **feedback ascendente** para el **Proyecto Integrador de Riwi (Ruta
Basica)**: una **SPA** permite a los **Coders** evaluar a **Team Leaders** y **Tutores** con
formularios estructurados (con opcion anonima). Un **backend FastAPI + MySQL** persiste y procesa
la informacion, calcula un **Indice de Calidad Percibida (ICP)** y **genera resumenes de
feedback con IA (Google Gemini)** para el **Admin (Jefe de TL/tutores)**.

> **Estado actual:** en desarrollo activo. Backend FastAPI y SPA estan implementados y conectados
> (auth, periods, forms, evaluations, metrics, users). Al implementar, sigue la arquitectura
> definida en `/docs` — no la reinventes.

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
- **Python + FastAPI**.
- SQL plano con SQLAlchemy `text()` + `conn.execute` (no ORM declarativo, no `Table`) + PyMySQL
  para acceso a MySQL. Sin capa `models/`: el esquema de tablas vive solo en `database/01_ddl.sql`
  (+ seed en `database/02_dml.sql`).
- Validacion con **Pydantic**.
- **Sin JWT:** el login verifica credenciales con bcrypt en el servidor, pero no emite ni verifica
  token. El rol/identidad de quien hace cada peticion se confia al valor que manda el propio front
  (ej. `viewer_role` en `GET /evaluations`, `evaluator_id` en `POST /evaluations`). No hay
  verificacion criptografica de identidad en el backend: es un tradeoff de seguridad para mantener
  el MVP simple, y hay que poder sustentarlo en la evaluacion. No agregues `backend/app/deps.py` ni
  las funciones JWT en `security.py` (`create_access_token`/`decode_access_token`) sin que el
  equipo lo apruebe primero.
- **Manejo global de errores:** el handler de excepciones no controladas en `main.py` **ya no
  devuelve `error_hint: str(exc)`** — en un error de SQLAlchemy ese texto filtraba la query SQL al
  cliente. Ahora devuelve un **`error_id` opaco (UUID)** que se imprime junto al error real en el log
  del servidor, para poder correlacionar sin exponer nada. No reintroduzcas `error_hint` ni metas el
  mensaje de la excepcion en la respuesta.
- Logica de negocio en la capa `services` (no en los routes); el acceso a datos vive en `repositories/`
  y `services/` lo delega ahi (no en queries inline). Es la arquitectura real del backend: hay
  **10 repositorios** en `backend/app/repositories/`, uno por entidad (`user_repository.py`,
  `evaluation_repository.py`, `period_repository.py`, `form_repository.py`, `question_repository.py`,
  `category_repository.py`, `metrics_repository.py`, `ai_repository.py`, `activity_log_repository.py`,
  `settings_repository.py`), y los 10 `services/` correspondientes delegan ahi el `conn.execute(text(...))`
  en vez de tenerlo inline. Sigue sin existir capa `models/` (el esquema vive solo en
  `database/01_ddl.sql`): `repositories/` no reintroduce SQLAlchemy Core ni `Table`, solo mueve las
  mismas queries `text()` a un archivo dedicado por entidad.
- **IA:** integracion con **Google Gemini** (SDK `google-generativeai`) en `services/ai_service.py`.
  Dos usos y dos modelos: `gemini-3.5-flash` (`AI_SUMMARY_MODEL`) para resumir feedback (solo para
  el Admin, cacheado en `ai_feedback_cache`) y `gemini-2.5-flash-lite` (`AI_LITE_MODEL`) para el
  chequeo de coherencia texto<->categoria al editar una pregunta. `GEMINI_API_KEY` via
  `config/config.py`; si no esta configurada, el servicio degrada sin romper (devuelve un aviso en
  el resumen y aprueba la coherencia). **Solo se envian agregados anonimizados.**
  > **Deuda tecnica pendiente:** el SDK `google-generativeai` que usa `ai_service.py` esta
  > deprecado por Google, reemplazado por el SDK unificado `google-genai`. Los modelos
  > (`gemini-3.5-flash`, `gemini-2.5-flash-lite`) siguen siendo validos; lo deprecado es la libreria
  > cliente. Nadie ha migrado esto todavia — no lo hagas por tu cuenta sin que el equipo lo pida.

### Base de datos
- **MySQL**, modelo relacional **normalizado hasta 3FN**, integridad referencial (FKs), CRUD completo y consultas agregadas para metricas.

## Documentacion fuente de verdad

| Tema | Archivo |
|------|---------|
| **Resumen completo del proyecto (1 solo documento)** | `docs/00-documento-tecnico.md` |
| Vision, objetivos, metricas | `docs/01-vision-y-producto.md` |
| Product Backlog (IDs, SP, prioridad) | `docs/02-product-backlog.md` |
| Historias + criterios de aceptacion | `docs/03-historias-de-usuario.md` |
| Epicas | `docs/04-epicas.md` |
| Epicas + Sprints (cronograma, entrega 17 jul) | `docs/05-sprint-planning.md` |
| **Arquitectura full-stack + justificacion tecnologica** | `docs/06-arquitectura.md` |
| **Base de datos (MER, 3FN, SQL)** | `docs/07-base-de-datos.md` |
| **Convenciones, GitFlow, repo** | `docs/08-diseno-tecnico.md` |
| Alcance MVP + requisitos no funcionales | `docs/09-mvp-alcance.md` |
| Entregables y evaluacion | `docs/11-entregables-y-evaluacion.md` |
| **Glosario de terminos (en simple)** | `docs/13-glosario.md` |
| Scripts SQL ejecutables (4 archivos, en este orden) | `database/01_ddl.sql` (DDL) + `database/02_dml.sql` (seed) + `database/03_mock_history.sql` (historico simulado, opcional) + `database/04_views.sql` (vistas, **requerido**) |

## Arquitectura en una pantalla

Monorepo full-stack:

```
SPA (frontend/)  ──HTTP/REST(JSON)──>  API (backend/ FastAPI)  ──SQLAlchemy──>  MySQL
   vistas -> services -> fetch (api.service.js)      routes -> services -> repositories -> MySQL
```

### `frontend/src/`
```
main.js · router/ (History API + roles)
services/ (api.service.js + *.service.js, unica capa que llama a la API; el BASE_URL vive ahi mismo)
views/ (*.view.js) · components/ · utils/ · styles/
```
Reglas: las vistas **no** llaman `fetch` directo (usan `services/`); los services **no** tocan el DOM.
> **Nota:** no existen las carpetas `store/` ni `config/` que versiones anteriores de esta guia
> describian. No hay un store centralizado de pub/sub: el estado de sesion vive en `localStorage`
> (via `auth.service.js`) y componentes puntuales (`sidebar.js`, `navbar.js`) resuelven su propio
> estado/reactividad de forma local.

### `backend/app/`
```
main.py · config/ (config, security, database)
schemas/ (Pydantic) · routes/ (endpoints)
services/ (LOGICA DE NEGOCIO: auth, user, period, form, question, evaluation, metrics, ai, activity_log, settings)
repositories/ (ACCESO A DATOS: un archivo por entidad, queries SQL con text())
```
Reglas: los **routes** validan entrada/salida con Pydantic y delegan; la **logica de negocio vive en
`services/`**, que a su vez delega el acceso a datos en `repositories/` (queries `text()` por
entidad). Nunca pongas reglas de negocio en los routes ni dupliques queries entre archivos de
`repositories/`.

Detalle completo en `docs/06-arquitectura.md`.

## Roles del sistema

Son **4 roles** en el catalogo `roles`, y **un mismo usuario puede tener varios a la vez**: la
relacion `users`<->`roles` es **N:M** via la tabla intermedia `user_roles`. Un usuario puede ser,
por ejemplo, `tutor` y `team_leader` simultaneamente. **No hay rol "teacher"/"instructor"**:

- **`coder`** — evalua a TL y Tutor; pertenece a un clan/cohorte (`clan_id`, relacion 1:1).
- **`tutor`** — **rol propio** (no es una bandera sobre coder); es principalmente evaluable;
  conserva `clan_id`.
- **`team_leader`** (staff) — es evaluable por coders; ve su feedback agregado. Un TL puede tener
  **dos o mas clanes a cargo**: esa asignacion N:M vive en la tabla `team_leader_clans`, separada
  de `users.clan_id` (relacion 1:1, que usan coder/tutor).
- **`admin`** (Jefe de TL y de tutores) — dashboards, metricas/ICP, resumenes IA. Acceso global,
  respetando anonimato.

Al crear/actualizar un usuario (`POST`/`PUT /users`), los roles se mandan como `role_ids: number[]`
(reemplaza la lista completa en `PUT`, no la incrementa) — ver `user_service.create_user` /
`update_user` y `database/01_ddl.sql` (`user_roles`, `team_leader_clans`).

RBAC aplicado en **frontend** (oculta rutas y opciones por rol) y en **backend** solo como filtro
de datos basado en el rol/ID que **manda el propio front** (sin JWT no hay forma de verificarlo
criptograficamente). **No es una barrera de seguridad real** — es un filtro de conveniencia. Si el
equipo decide que hace falta seguridad real, la unica forma correcta es reintroducir algun
mecanismo de sesion verificable en servidor (JWT u otro), no maquillar el front.

## Reglas de negocio que NO debes romper

1. **Anonimato por convencion de aplicacion (NO estructural):** la tabla `evaluations` **ya no tiene
   columna `evaluator_id`**. Quien participo se registra en una tabla aparte,
   `evaluation_submissions(id, evaluator_id, evaluatee_id, period_id, evaluation_id NULL, created_at)`,
   y el vinculo persona↔contenido es la columna `evaluation_id`. **Ese vinculo se guarda siempre**,
   sea la evaluacion anonima o no (`evaluation_service.create_evaluation`), para que el Coder pueda
   releer su propio historial completo.

   **Que significa esto exactamente — hay que saber sustentarlo:** el anonimato **no** es una
   propiedad del esquema. El dato *si* esta almacenado, y esta consulta lo revela:

   ```sql
   SELECT s.evaluator_id, e.* FROM evaluation_submissions s
   JOIN evaluations e ON e.id = s.evaluation_id WHERE e.is_anonymous = TRUE;
   ```

   Lo que protege el anonimato son **dos filtros de aplicacion** que hay que respetar en cada query
   nueva:
   - `vw_evaluations_summary` enmascara el evaluador con `CASE WHEN e.is_anonymous THEN NULL`.
   - `evaluation_repository.get_evaluator_ids_for_evaluations` filtra `AND e.is_anonymous = FALSE`.

   **Consecuencia practica:** basta un `JOIN` descuidado, un endpoint nuevo que lea la tabla cruda o
   un dump de la BD para romperlo. Al escribir cualquier query que toque `evaluation_submissions`,
   el filtro `is_anonymous` es responsabilidad tuya — el esquema no te va a salvar.

   **En la sustentacion:** describir esto como "anonimato frente a los usuarios de la aplicacion",
   nunca como "irreconstruible incluso con acceso a la base de datos". Lo segundo es falso.

   > **Alternativa descartada por el equipo (2026-07-21):** guardar `evaluation_id = NULL` en las
   > anonimas haria el anonimato estructural e irreconstruible, pero el Coder perderia el acceso a
   > sus propias respuestas anonimas. El equipo priorizo el historial del Coder. Si algun dia se
   > invierte esa decision, hay que arreglar antes `EvaluationHistoryOut.is_anonymous`, que hoy es
   > `bool` no-opcional y reventaria con `None` en cuanto el `LEFT JOIN` no encaje.
2. **Un Coder no evalua dos veces** al mismo evaluado en el mismo **periodo**, y ahora la regla
   **cubre por igual anonimas y no anonimas**. La unicidad vive en `evaluation_submissions`, que
   siempre guarda el `evaluator_id` real (sea o no anonima la evaluacion), bajo el constraint:

   ```sql
   CONSTRAINT uq_submission_once UNIQUE (evaluator_id, evaluatee_id, period_id)
   ```

   Como esas tres columnas son `NOT NULL`, **no hay NULL que se cuele por el hueco de MySQL**: el
   motor rechaza el segundo intento siempre. El viejo indice `uq_eval_once` sobre `evaluations`
   **ya no existe** — no lo busques ni lo reintroduzcas.

   **Dos capas, con la BD como autoridad final:**
   - **Aplicacion (UX):** `evaluation_service.create_evaluation` llama antes al `SELECT` de
     `check_evaluation_exists` (`repositories/evaluation_repository.py`), que ahora consulta
     `evaluation_submissions` — asi que **si ve** las participaciones anonimas previas. Sirve para
     devolver un `409` con mensaje claro en el caso normal.
   - **Base de datos (autoridad):** si dos peticiones concurrentes del mismo evaluador se cruzan
     entre el `SELECT` y el `INSERT`, la segunda viola `uq_submission_once` y MySQL lanza
     `IntegrityError`. El servicio **debe capturarlo** y traducirlo a
     `EvaluationAlreadyExistsException`, que el route ya mapea a **`409 CONFLICT`** — el mismo
     resultado que el camino normal, nunca un `500`.

   **La condicion de carrera que este repo documentaba como "aceptada para el tamano del MVP" queda
   cerrada:** ya no depende de que el `SELECT` y el `INSERT` no se pisen, porque el constraint de BD
   es quien decide. No vuelvas a describirla como un riesgo abierto ni "simplifiques" quitando la
   captura de `IntegrityError`, que es lo unico que cierra la ventana.
3. **Validacion doble:** en cliente (UX) y en servidor con Pydantic (autoridad).
4. **Logica de negocio identificable** (no solo CRUD): **ICP** (indice 0-100 por persona/periodo, ponderado por el peso de cada pregunta — ver regla 6 — y normalizado, solo si hay al menos `required_evaluations` respuestas), % participacion, estados de evaluacion (borrador/enviada), filtros por rol. No la degrades a CRUD plano. El ICP es **derivado, no se persiste**: el promedio ponderado y su normalizacion 1-5→0-100 se calculan on-read en la vista SQL `vw_period_metrics` (`database/04_views.sql`), y `metrics_service` (via `metrics_repository`) la consulta y le aplica la clasificacion (`classify_status`) y el minimo de muestra (`required_evaluations`) — ya no existe una funcion `calculate_average_score` en `metrics_service.py`, no la busques ni la referencies. El ICP mide **calidad percibida**, no aprendizaje real, y no calcula tendencia entre periodos (ver `docs/06-arquitectura.md` para el detalle exacto del calculo antes de asumir que existe algo mas elaborado).
5. **Ventana de evaluacion controlada (ADMIN-01):** solo puede existir **un periodo activo** a la vez y solo el **admin** lo activa/cierra (activar uno desactiva cualquier otro). Sin periodo activo, la SPA muestra "No hay formularios por realizar" y el backend **rechaza** (`409`) crear/enviar evaluaciones — la SPA nunca es la autoridad.
6. **Integridad del instrumento (ADMIN-02):** las preguntas solo se editan **con periodo cerrado**; editar el texto **versiona** (fila nueva + `is_active=FALSE` en la anterior), nunca sobrescribe. El admin **si puede** ajustar el **peso** (`weight_percent`) de cada pregunta de escala — es la unica ponderacion que existe — pero **no puede tocar** `category` ni `input_type`. Los pesos de las preguntas de escala **activas de un mismo `form` deben sumar exactamente 100** (validado en `question_service` antes de guardar; si no suma, se rechaza con `422`/`409`). Las respuestas historicas conservan su pregunta y su peso original. Editar el texto es **reformular dentro de la misma categoria** (anti deriva semantica): una pregunta de otro tema **no se convierte** — se desactiva y la nueva se crea en su categoria correcta (v2/equipo). Al guardar una edicion de texto, la **IA comprueba la coherencia** texto↔categoria (via `ai_service`, solo texto de la pregunta + definicion de la categoria) y, si no coincide, el admin debe confirmar explicitamente (con temperatura fija 0.0, ver regla de `ai_temperature`).
   **Como se mantiene la suma 100 al crear/borrar:** `create_question` inserta **siempre** con
   `weight_percent = 0` — `POST /questions` **ignora** el `weight_percent` que le manden en el body.
   Sumar 0 no rompe el invariante; el peso real lo aplica despues `PUT /questions/weights`, que es el
   **unico** punto donde se valida la suma 100. Efecto: una pregunta recien creada se responde pero
   **pesa 0 en el ICP** hasta que el admin reponderе. **Limitacion conocida:** `delete_question`
   desactiva sin revalidar, asi que borrar una pregunta de escala **deja la suma por debajo de 100**
   y ahi se queda si el admin abandona la edicion a medias. Es deliberado (rechazar el borrado
   romperia el flujo borrar→crear→reponderar del front), esta reportado al equipo y **no se arregla
   por cuenta propia**.
7. **Privacidad de IA:** a la API de Gemini solo se envian **agregados anonimizados** (promedios, conteos, comentarios sin autor). **Nunca** `evaluator_id` ni textos que revelen identidad. La IA genera resumenes **solo para el Admin**.
8. **Visibilidad de evaluadores (se preserva, con mecanismo nuevo):** una persona evaluada
   (TL/Tutor) **nunca ve quien la evaluo**; solo el **Admin** ve la identidad del evaluador en
   evaluaciones **no anonimas**. Las **anonimas permanecen anonimas para todos** (incluido el Admin).
   Con el modelo de `evaluation_submissions` esto se resuelve asi:
   - **No anonimas:** `evaluation_repository.get_evaluator_ids_for_evaluations` consulta
     `evaluation_submissions WHERE evaluation_id IN (...)` y devuelve el mapa
     `evaluation_id -> evaluator_id`. El servicio solo adjunta ese dato cuando
     `viewer_role == "admin"`; para cualquier otro rol se omite.
   - **Anonimas:** su submission **si tiene** `evaluation_id` (regla 1), asi que el enmascarado es
     activo, no automatico: la query filtra `AND e.is_anonymous = FALSE` para dejarlas fuera del
     mapa, y el servicio vuelve a enmascarar el campo en la respuesta. Son **dos capas de
     aplicacion**; si ambas se olvidan en un endpoint nuevo, el evaluador anonimo queda expuesto.
9. **Seguridad:** contrasenas siempre hasheadas (passlib/bcrypt), nunca en texto plano ni devueltas en responses.
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

## Comandos previstos

```bash
# Base de datos (CUATRO archivos, en este orden exacto)
mysql -u root -p < database/01_ddl.sql                              # DDL: crea la BD y todas las tablas
mysql -u root -p riwi_lead_trace < database/02_dml.sql              # seed minimo: roles, cohortes, clanes, usuarios demo, periodo activo, forms/questions, fila de system_settings
mysql -u root -p riwi_lead_trace < database/03_mock_history.sql     # OPCIONAL: periodos cerrados + evaluaciones simuladas (normales, anonimas, borrador, casos de borde) para poblar historial/dashboard/IA con datos de prueba
mysql -u root -p riwi_lead_trace < database/04_views.sql            # REQUERIDO: crea vw_period_metrics, vw_evaluatees_summary, vw_users_with_roles, vw_evaluations_summary. Sin este archivo, /metrics y el resumen IA fallan (dependen de estas vistas)

# ⚠️ `04_views.sql` usa CREATE OR REPLACE VIEW: es idempotente y hay que RE-EJECUTARLO en cada
#    entorno cuando cambie, incluida la BD de Railway. La version vigente saco el `>= 3`
#    hardcodeado de vw_period_metrics (ahora es el ajuste `required_evaluations`); si Railway
#    sigue con la vista vieja, ese ajuste solo surte efecto hacia arriba. Ver el bloque de
#    estado de `system_settings` mas abajo.

# --- NO hay script de migracion ---
#
# El equipo retiro `05_migration_submissions.sql`. La unica ruta soportada es RECREAR la BD
# desde cero con el orden 01 → 02 → 03 (opcional) → 04. `01_ddl.sql` arranca con
# `DROP TABLE IF EXISTS` de todas las tablas, asi que es reejecutable tal cual.
#
# Para un entorno con datos que valga la pena conservar (Railway): HAZ BACKUP ANTES,
# porque recrear borra todo.
mysqldump -h <host> -P <port> -u <user> -p riwi_lead_trace > backup.sql
```

**Por que se elimino la migracion:** el rename de `detalles_evaluacion` → `evaluation_details` la
dejaba desactualizada, y mantener una ruta de migracion que nadie ejercita es peor que no tenerla —
da una falsa sensacion de que existe un camino de upgrade probado. Si algun dia hace falta migrar
en vez de recrear, se escribe una nueva contra el esquema vigente. **No la reintroduzcas por tu
cuenta.**

```bash
# Backend (FastAPI)
cd backend && python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload          # http://localhost:8000  (Swagger: /docs)

# Pruebas: corren contra una BD APARTE (backend/.env.test), nunca contra la de .env.
# Preparacion, una sola vez:
cp .env.test.example .env.test         # y ajusta DATABASE_URL
python tests/bootstrap_test_db.py      # crea esquema + seed en la BD de pruebas
pytest                                 # pruebas

# Frontend (SPA)
cd frontend && npm install
npm run dev                              # http://localhost:5173
npm run build                            # bundle de produccion
```

> ⚠️ **Las pruebas NUNCA corren contra la BD de desarrollo.** `backend/tests/conftest.py` carga
> `backend/.env.test` **antes** de importar `app` (si no, `app.config.database` ya habria abierto el
> engine contra el `.env` normal) y **aborta** si el nombre de la base no termina en `_test`.
>
> No es paranoia: las pruebas insertan y **borran** filas, y `test_periods.py` activa un periodo
> temporal, lo que dispara `deactivate_other_periods` y **cierra el periodo activo real**. Ocurrio
> de verdad contra la BD compartida de Railway (2026-07-21) — un `pytest` distraido deja a los
> coders sin poder evaluar. No relajes el guard ni apuntes `.env.test` a la misma base que `.env`.

## Contrato REST del MVP (resumen)

> Nota: sin JWT, ninguna columna "RBAC" de esta tabla es una verificacion criptografica — es un
> filtro de datos basado en un rol/ID que manda el propio front. Ver seccion "Roles del sistema".

| Metodo | Endpoint | Uso | Logica de negocio |
|--------|----------|-----|-------------------|
| POST | `/auth/login` | login -> `{ user }` (sin token) | hash bcrypt en servidor |
| GET | `/users?role=team_leader` | evaluables por rol | filtro por rol |
| GET | `/forms?target_role=team_leader` | plantilla de formulario | — |
| POST | `/evaluations` | registrar evaluacion | escribe **dos** filas: contenido en `evaluations` + participacion en `evaluation_submissions` (con `evaluation_id` poblado **siempre**, tambien en anonimas — regla 1). No-duplicado garantizado por `uq_submission_once` → `409`; + **periodo activo** + validacion |
| GET | `/evaluations?evaluator_id=:id` | historial del Coder | lee `evaluation_submissions` (LEFT JOIN a `evaluations`): incluye las participaciones anonimas **con su contenido**, porque el Coder puede releer lo que escribio (regla 1) |
| GET | `/evaluations?evaluatee_id=:id` | historico por evaluado | `viewer_role` del front; el admin ve el evaluador de las **no anonimas**; las anonimas se enmascaran con `is_anonymous = FALSE` en la query + en el servicio (regla 8). **Nota:** el front nunca manda `viewer_role`, asi que esa rama admin hoy es inalcanzable desde la SPA |
| GET | `/periods` | listar periodos | el activo habilita los formularios |
| PUT | `/periods/:id` | activar/cerrar periodo | **solo uno activo** a la vez |
| PATCH | `/questions/:id` | editar texto de una pregunta | **solo periodo cerrado**, versionado + chequeo IA de coherencia |
| PUT | `/questions/weights` | actualizar pesos de las preguntas de un form | **solo periodo cerrado**, pesos deben sumar 100 |
| GET | `/metrics/summary?period_id=:p` | KPIs + ICP | **agregaciones + ICP ponderado** |
| GET | `/metrics/ai-summary?evaluatee_id=:e&period_id=:p` | resumen IA | **Google Gemini (anonimizado)** |
| GET | `/activity-log` | bitacora de acciones administrativas | mas reciente primero, sin verificacion criptografica de autoria |
| GET | `/activity-log/export` | descarga la bitacora en CSV | mismo dataset que arriba, exportado |
| GET | `/settings` | configuracion global (`system_settings`, fila unica id=1) | umbrales de ICP, temperatura IA, tolerancia de pesos, etc. |
| GET | `/settings/defaults` | valores de fabrica de la configuracion | solo lectura, no persiste nada |
| PUT | `/settings` | actualizar la configuracion global | admin ajusta umbrales/politicas |

> **Estado real de los 8 ajustes de `system_settings`** (verificado contra el codigo): la pantalla
> de Configuracion Global persiste y lee los 8, pero **solo 5 tienen consumidor** en la logica de
> negocio. Los otros 3 son **decorativos**: la UI promete un comportamiento que el sistema no hace.
>
> **CABLEADOS (5) — funcionan de verdad:**
> - `score_risk_threshold` / `score_excellent_threshold` — `metrics_service._load_policy()` los lee
>   y `classify_status()` los aplica sobre el ICP. **Escala 0-100** (la misma del ICP, no 1-5:
>   `vw_period_metrics` normaliza la media ponderada con `((x - 1) / 4 * 100)`). Defaults **60 y 80**,
>   consistentes en los cuatro sitios donde viven: `database/01_ddl.sql` (`DECIMAL(5,2)`, no `(4,2)`,
>   para que quepa 100), `database/02_dml.sql`, `settings_service.SYSTEM_SETTINGS_DEFAULTS` y las
>   constantes de respaldo de `metrics_service.py`. Si cambias uno, cambia los cuatro.
> - `required_evaluations` — el `>= 3` ya **no** esta hardcodeado en la vista: se saco de
>   `vw_period_metrics` (MySQL no admite vistas parametrizadas) y ahora lo filtra
>   `metrics_repository.py` como parametro ligado `:required_evaluations` — en el `ON` del `LEFT JOIN`
>   para el resumen (el evaluado sigue listado con `average_score` NULL si no llega al minimo) y en
>   el `WHERE` para la serie historica. **Consecuencia operativa:** `database/04_views.sql` **debe
>   re-ejecutarse contra la BD de Railway**. Si alla sigue la vista vieja con el `>= 3` dentro,
>   subir el ajuste por encima de 3 si surte efecto (el filtro del repositorio se suma al de la
>   vista) pero **bajarlo por debajo de 3 no hace nada** — la vista ya descarto esas filas. El
>   ajuste solo funciona en una direccion hasta que se recreen las vistas.
> - `weight_tolerance` — cableado via `resolve_weight_tolerance()` en
>   `app/constants/form_constants.py`, que **si** se llama: `form_service.py` y `question_service.py`
>   la invocan antes de validar la suma 100. `WEIGHT_SUM_TOLERANCE = 0.01` quedo solo como valor de
>   respaldo si no hay fila en la tabla.
> - `ai_temperature` — cableado **solo para el resumen**: `ai_service._get_summary_temperature()` lo
>   lee y lo pasa a `AI_SUMMARY_MODEL` (clampeado a 0.0-1.0). **Matiz importante:** el chequeo de
>   coherencia texto↔categoria **no** lo usa — va con `COHERENCE_TEMPERATURE = 0.0` fijo, a
>   proposito: es un control de integridad del instrumento y debe ser **determinista** (la misma
>   pregunta debe dar siempre el mismo veredicto). No lo "unifiques" con el ajuste del admin.
>
> **NO CABLEADOS (3) — no los presentes como funcionales en una sustentacion:**
> - `strict_entity_lock` — **sin cablear a proposito**, no por olvido. La UI lo describe como si
>   pudiera relajar el bloqueo de edicion del instrumento, pero `question_service._assert_no_active_period()`
>   lo ignora deliberadamente (ver el comentario en el codigo). Cablearlo permitiria editar
>   preguntas/pesos **con periodo activo**, y las respuestas ya enviadas quedarian atadas a preguntas
>   o pesos distintos de los que se respondieron — corrompe evaluaciones en curso y viola la regla 6,
>   que es **incondicional**. Es un conflicto UI↔regla de negocio que decide el equipo; **que no
>   funcione es lo correcto**.
> - `ai_auto_summary` — **sin cablear**. No existe generacion automatica de resumenes en ninguna
>   parte del backend: no hay scheduler, cron ni disparo por evento. El unico camino que genera un
>   resumen es que el Admin lo pida via `GET /metrics/ai-summary`. El propio `ai_service.py` lo marca
>   como "AJUSTE SIN FUNCIONALIDAD DETRAS".
> - `log_retention_days` — **sin cablear**. Nada purga `admin_activity_log` (solo un comentario en
>   `activity_log_service.py` que menciona la intencion): la tabla **crece sin limite**, y el export
>   CSV trunca **en silencio** a las 10000 filas mas recientes (`EXPORT_MAX_ROWS`), sin avisar al
>   admin de que la descarga esta incompleta.
>
> **Como se tratan los 3 en la UI** (`frontend/src/views/admin/settings.view.js`): se **muestran
> deshabilitados** y marcados con una insignia **"Proximamente"**, **no se ocultan**. La decision es
> deliberada: ocultarlos dejaria la pantalla mas limpia pero borraria la evidencia de que el ajuste
> existe en la BD y esta previsto; dejarlos activos convertia la pantalla en un **control que miente**
> (el admin mueve un interruptor, se persiste, y no pasa nada). Mostrarlos inertes y rotulados es la
> unica opcion que no engana. Cada uno lleva `disabled` + `aria-disabled` y una nota corta ligada con
> `aria-describedby` que dice **que no hace**, para que el estado sea perceptible sin depender del
> color. Los tooltips se reescribieron: antes prometian comportamiento inexistente. El payload de
> `PUT /settings` **sigue mandando los 8 campos** — `disabled` bloquea la interaccion, no la lectura
> por JS (`.checked` / `.value` se conservan), asi que se re-persiste el valor que vino del backend.
>
> El matiz que hay que saber sustentar: `ai_auto_summary` y `log_retention_days` estan sin cablear
> por **alcance** (funcionalidad no construida, se puede construir despues). `strict_entity_lock`
> **no** — esta sin cablear porque **cablearlo seria incorrecto**: el interruptor solo tendria sentido
> si pudiera ponerse en `false`, y eso habilitaria editar preguntas o pesos con un periodo abierto,
> dejando respuestas ya enviadas atadas a un instrumento distinto del que se respondio. La regla 6 es
> **incondicional** justamente por eso. No es una carencia de tiempo, es una **decision de diseno**:
> el ajuste sobra, y lo correcto seria retirarlo del modelo, no conectarlo.

Detalle y modelo de datos: `docs/06-arquitectura.md` y `docs/07-base-de-datos.md`.

## Como trabajar en este repo (para el asistente)

1. **Lee la historia** en `docs/03-historias-de-usuario.md` y sus criterios de aceptacion.
2. **Respeta la arquitectura** de `docs/06-arquitectura.md` (capas y ubicacion de archivos en front y back).
3. Implementa lo minimo para cumplir los criterios; **sin sobreingenieria** y **sin degradar la logica de negocio a CRUD**.
4. Valida en **servidor** (Pydantic) ademas de en cliente; maneja errores y devuelve codigos HTTP correctos.
5. Asegura **responsive** y **accesibilidad** basica (`docs/09-mvp-alcance.md`).
6. Commits pequenos con Conventional Commits; cumple la Definition of Done.
7. Si cambias decisiones de arquitectura/producto, **actualiza tambien `/docs` y este `CLAUDE.md`**.
