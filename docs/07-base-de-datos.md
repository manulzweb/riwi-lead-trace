# 07 — Diseno de Base de Datos

Base de datos **relacional MySQL** consumida por el backend FastAPI. Modelo **normalizado hasta la Tercera Forma Normal (3FN)**, con integridad referencial y operaciones CRUD completas (requisitos de la rubrica).

## Por que MySQL (relacional)?

- Los datos son **altamente estructurados y relacionados** (usuarios, roles, plantillas, preguntas, evaluaciones, respuestas) -> encajan naturalmente en un modelo relacional con FKs.
- Necesitamos **integridad referencial** (una respuesta siempre pertenece a una evaluacion y a una pregunta) y **restricciones de unicidad** (no-duplicado por periodo).
- El dashboard requiere **consultas agregadas** (promedios, conteos, agrupaciones) que SQL resuelve de forma natural.
- Es ampliamente ensenada en la Ruta Basica -> el equipo puede sustentarla con solvencia.

Justificacion ampliada en [`06-arquitectura.md`](./06-arquitectura.md).

## Entidades

| Entidad | Descripcion |
|---------|-------------|
| `roles` | Catalogo de roles del sistema (coder, tutor, team_leader, admin) |
| `cohortes` | Cohortes de Riwi (p.ej. cohorte 5); agrupan clanes |
| `clanes` | Clanes dentro de una cohorte; a ellos pertenecen los Coders y Tutores |
| `users` | Usuarios de la plataforma; cada uno tiene uno o varios roles, y (segun su rol) un clan |
| `user_roles` | Tabla intermedia para asociar usuarios con multiples roles |
| `periods` | Periodos/ciclos de evaluacion (p.ej. trimestre, cohorte) |
| `forms` | Plantilla de formulario segun el rol evaluado (TL / Tutor) |
| `categories` | Categoria/tema de una pregunta (ej. "Comunicacion efectiva"); el Admin la administra aparte de las plantillas |
| `questions` | Preguntas/criterios que componen una plantilla |
| `evaluations` | Una evaluacion de un evaluador hacia un evaluado, en un periodo |
| `evaluation_details` | Respuestas (puntaje + comentario) por pregunta de una evaluacion |
| `ai_feedback_cache` | Cache de resumenes generados por IA (Google Gemini) para el Admin |
| `admin_activity_log` | Bitacora de acciones administrativas (auditoria basica, sin verificacion criptografica de autoria); expuesta via `GET /activity-log` y su export CSV `GET /activity-log/export` |
| `system_settings` | Configuracion global del sistema (fila unica `id=1`: umbrales de ICP, temperatura de IA, tolerancia de pesos, etc.); expuesta via `GET`/`PUT /settings` y `GET /settings/defaults` |

## Atributos principales

### `roles`
| Atributo | Tipo | Notas |
|----------|------|-------|
| id | INT PK | |
| name | VARCHAR(30) | unico: coder, tutor, team_leader, admin |

### `cohortes`
| Atributo | Tipo | Notas |
|----------|------|-------|
| id | INT PK | |
| numero | INT | numero de la cohorte (p.ej. 5); unico |
| nombre | VARCHAR(80) | nombre descriptivo |
| ciudad | VARCHAR(80) NULL | ciudad/sede (opcional) |

### `clanes`
| Atributo | Tipo | Notas |
|----------|------|-------|
| id | INT PK | |
| cohorte_id | INT FK -> cohortes.id | cohorte a la que pertenece el clan |
| numero | INT | numero del clan (p.ej. 10) |
| nombre | VARCHAR(80) | nombre del clan |
| | | **UNIQUE(cohorte_id, numero)**: el no es unico *dentro* de la cohorte |

### `users`
| Atributo | Tipo | Notas |
|----------|------|-------|
| id | INT PK | |
| full_name | VARCHAR(120) | |
| email | VARCHAR(150) | unico |
| password_hash | VARCHAR(255) | nunca texto plano |
| clan_id | INT FK -> clanes.id (NULLABLE) | clan principal (1:1) usado por coders y tutores; NULL para TL/admin |
| is_active | BOOLEAN | default true |
| created_at | TIMESTAMP | |

### `user_roles` (Tabla 1:N para multiples roles)
| Atributo | Tipo | Notas |
|----------|------|-------|
| user_id | INT PK/FK -> users.id | |
| role_id | INT PK/FK -> roles.id | |
| | | Permite que un usuario tenga multiples roles (p.ej. Coder y Tutor) |

### `team_leader_clans` (Nueva tabla 1:N para TLs)
| Atributo | Tipo | Notas |
|----------|------|-------|
| user_id | INT PK/FK -> users.id | |
| clan_id | INT PK/FK -> clanes.id | |
| | | Permite que un TL imparta clases a varios clanes |

### `periods`
| Atributo | Tipo | Notas |
|----------|------|-------|
| id | INT PK | |
| name | VARCHAR(60) | p.ej. "2026-T1" |
| starts_at | DATE | |
| ends_at | DATE | |
| is_active | BOOLEAN | |

### `forms`
| Atributo | Tipo | Notas |
|----------|------|-------|
| id | INT PK | |
| title | VARCHAR(120) | |
| description | VARCHAR(255) NULL | instrucciones opcionales para quien llena el formulario |
| target_role_id | INT FK -> roles.id | rol que se evalua (team_leader/tutor) |
| is_active | BOOLEAN | una sola plantilla activa por rol a la vez: crear una nueva (`POST /forms`) desactiva cualquier otra del mismo `target_role_id` |

### `categories`
| Atributo | Tipo | Notas |
|----------|------|-------|
| id | INT PK | |
| name | VARCHAR(60) UNIQUE | el Admin la crea/renombra libremente (`POST`/`PATCH /categories`); borrarla (`DELETE /categories/{id}`) esta **restringido**: se rechaza con `409` mientras alguna pregunta (activa o de una evaluacion historica) tenga `category_id` apuntando a ella -- lo aplica la FK `fk_question_category` (`ON DELETE RESTRICT`), no una validacion aparte |

### `questions`
| Atributo | Tipo | Notas |
|----------|------|-------|
| id | INT PK | |
| form_id | INT FK -> forms.id | |
| text | VARCHAR(255) | editable por el Admin **solo con periodo cerrado** y via **versionado** (fila nueva + desactivar la anterior) |
| category_id | INT FK -> categories.id | categoria tematica de la pregunta (organiza el formulario y permite listar/rankear por categoria en el dashboard); **no editable** en preguntas existentes (se fija al crearla) |
| input_type | VARCHAR(20) | 'scale' \| 'text' \| 'yes_no'; **no editable** desde la UI en preguntas existentes (si se define al crearla) |
| sort_order | INT | orden de despliegue; **no editable** desde la UI |
| weight_percent | DECIMAL(5,2) | peso de la pregunta en el ICP ponderado (solo aplica a 'scale'; 'text' queda en 0). Las preguntas de escala **activas** de un mismo `form_id` deben sumar exactamente 100 — se valida en `question_service.update_weights` antes de guardar. Editable por el Admin via `PUT /questions/weights`, solo con periodo cerrado |
| is_active | BOOLEAN | default TRUE; las evaluaciones nuevas cargan solo preguntas activas; las respuestas historicas conservan su pregunta y su peso original |

### `evaluations`
| Atributo | Tipo | Notas |
|----------|------|-------|
| id | INT PK | |
| evaluatee_id | INT FK -> users.id | persona evaluada |
| form_id | INT FK -> forms.id | |
| period_id | INT FK -> periods.id | |
| is_anonymous | BOOLEAN | default false |
| status | VARCHAR(20) | 'draft' \| 'submitted' |
| submitted_at | TIMESTAMP NULL | |
| created_at | TIMESTAMP | |

> **Esta tabla ya NO tiene `evaluator_id`.** Guarda solo el **contenido** de la evaluacion. Quien
> participo vive en `evaluation_submissions` (abajo). Ver "Decisiones de diseno → Anonimato".

### `evaluation_submissions`
Registra **la participacion** de un evaluador, separada del contenido que escribio.

| Atributo | Tipo | Notas |
|----------|------|-------|
| id | INT PK | |
| evaluator_id | INT FK -> users.id (NOT NULL) | **siempre** se guarda, sea o no anonima la evaluacion |
| evaluatee_id | INT FK -> users.id (NOT NULL) | persona evaluada |
| period_id | INT FK -> periods.id (NOT NULL) | |
| evaluation_id | INT FK -> evaluations.id (NULLABLE) | **el vinculo persona↔contenido**. Lleno si la evaluacion **no** es anonima; **NULL si es anonima** — en ese caso el enlace no existe y nadie puede reconstruirlo |
| created_at | TIMESTAMP | |

Constraint: `uq_submission_once UNIQUE (evaluator_id, evaluatee_id, period_id)` — como las tres
columnas son `NOT NULL`, cubre **por igual** evaluaciones anonimas y no anonimas.

### `evaluation_details`
| Atributo | Tipo | Notas |
|----------|------|-------|
| id | INT PK | |
| evaluation_id | INT FK -> evaluations.id | |
| question_id | INT FK -> questions.id | |
| score | SMALLINT NULL | 1-5 si input_type='scale' |
| comment | TEXT NULL | si input_type='text' |

### `ai_feedback_cache`
Cache de los resumenes generados por IA (Google Gemini) para no re-llamar al modelo y controlar costo.
No es dato relacional duplicado, sino el **resultado materializado de un servicio externo** (ver 3FN).

| Atributo | Tipo | Notas |
|----------|------|-------|
| id | INT PK | |
| evaluatee_id | INT FK -> users.id | persona resumida |
| period_id | INT FK -> periods.id | periodo del resumen |
| summary | TEXT | texto generado por el modelo |
| model | VARCHAR(40) | modelo usado (hoy `gemini-3.5-flash`, la constante `AI_SUMMARY_MODEL`) |
| generated_at | TIMESTAMP | cuando se genero |
| | | **UNIQUE(evaluatee_id, period_id)** |

### `system_settings`
Configuracion global del sistema. **Fila unica** (`id = 1`, `TINYINT UNSIGNED DEFAULT 1` como PK):
no es un catalogo clave-valor, sino una fila con una columna tipada por ajuste. Se expone via
`GET /settings`, `PUT /settings` y `GET /settings/defaults`.

| Atributo | Tipo | Default | Estado real |
|----------|------|---------|-------------|
| id | TINYINT UNSIGNED PK | 1 | fila unica |
| ai_temperature | DECIMAL(3,2) | 0.70 | **cableado, solo para el resumen** — el chequeo de coherencia usa `COHERENCE_TEMPERATURE = 0.0` fijo (debe ser determinista) |
| ai_auto_summary | BOOLEAN | TRUE | **NO cableado** — no existe generacion automatica de resumenes |
| score_risk_threshold | DECIMAL(5,2) | 60.00 | **cableado** en `metrics_service.classify_status`. Escala **0-100** (la del ICP) |
| score_excellent_threshold | DECIMAL(5,2) | 80.00 | **cableado**, misma escala 0-100 |
| weight_tolerance | DECIMAL(4,2) | 0.01 | **cableado** via `resolve_weight_tolerance()` (`constants/form_constants.py`) |
| strict_entity_lock | BOOLEAN | TRUE | **NO cableado, a proposito** — cablearlo permitiria editar el instrumento con periodo activo (viola la regla 6) |
| required_evaluations | SMALLINT UNSIGNED | 3 | **cableado** como parametro ligado en `metrics_repository` (ya no hardcodeado en la vista) |
| log_retention_days | SMALLINT UNSIGNED | 90 | **NO cableado** — nada purga `admin_activity_log` |
| updated_at | TIMESTAMP | CURRENT_TIMESTAMP | |

**Notas:**
- Los umbrales son `DECIMAL(5,2)` y no `(4,2)` a proposito: con `(4,2)` el tope seria 99.99 y el
  admin no podria guardar 100.
- Los defaults estan **duplicados en cuatro sitios** que deben moverse juntos: este DDL, el `INSERT`
  de `database/02_dml.sql`, `settings_service.SYSTEM_SETTINGS_DEFAULTS` y las constantes de respaldo
  de `metrics_service.py`. El duplicado es consciente (ver el comentario en `settings_service.py`).
- Los tres ajustes NO cableados se persisten y se muestran en la UI de admin, pero **no cambian el
  comportamiento del sistema**. No presentarlos como funcionales. Detalle en `CLAUDE.md`.
- **Se muestran deshabilitados y marcados "Proximamente", no ocultos.** La pantalla de Configuracion
  Global (`frontend/src/views/admin/settings.view.js`) los pinta con `disabled` + `aria-disabled` y
  una nota que explica que no hacen. Ocultarlos borraria que la columna existe y esta prevista;
  dejarlos operables convertia la UI en un control que miente, porque el `PUT /settings` guarda el
  valor y nada lo consume. El `UPDATE` sigue escribiendo las 8 columnas: el front lee los controles
  deshabilitados por JS y re-envia el valor que vino del `SELECT`, asi que **ninguna columna recibe
  `NULL` ni un valor basura** por estar deshabilitada en la UI.
- **`strict_entity_lock` es un caso distinto de los otros dos.** `ai_auto_summary` y
  `log_retention_days` son funcionalidad **no construida todavia** (un scheduler y un job de purga,
  respectivamente). `strict_entity_lock` esta sin cablear porque **conectarlo seria incorrecto**:
  un valor `FALSE` habilitaria editar `questions` / pesos con un periodo `is_active = TRUE`, y las
  filas de `answers` ya insertadas quedarian apuntando a una pregunta o a un `weight_percent`
  distintos de los que respondio el evaluador — corrupcion de datos historicos, no un simple cambio
  de configuracion. Por eso la regla 6 se aplica **incondicionalmente** en
  `question_service._assert_no_active_period()`. Si el equipo quisiera resolverlo de raiz, el camino
  es **eliminar la columna** del modelo, no cablearla.

## Relaciones

- `users` N—M `roles` *(mediante `user_roles`)*
- `cohortes` 1—N `clanes`
- `clanes` 1—N `users` *(un Coder/Tutor pertenece a **un** clan; FK nullable para TL/admin)*
- `clanes` N—M `users` *(solo para TLs mediante tabla intermedia `team_leader_clans`)*
- `roles` 1—N `forms` (rol evaluado)
- `forms` 1—N `questions`
- `categories` 1—N `questions` *(borrar una categoria esta restringido mientras tenga preguntas)*
- `users` (evaluador) 1—N `evaluation_submissions` *(la participacion; nunca NULL)*
- `evaluations` 1—0..1 `evaluation_submissions` *(el vinculo `evaluation_id`; **NULL en anonimas**, y por eso el evaluador de una anonima es irrecuperable)*
- `users` (evaluado) 1—N `evaluations` · 1—N `evaluation_submissions`
- `periods` 1—N `evaluations` · 1—N `evaluation_submissions`
- `evaluations` 1—N `evaluation_details`
- `questions` 1—N `evaluation_details`
- `users` (evaluado) 1—N `ai_feedback_cache` · `periods` 1—N `ai_feedback_cache`

## Modelo Entidad-Relacion (texto)

```
cohortes (id PK, numero, nombre, ciudad)
   │1
           └──< clanes (id PK, cohorte_id FK, numero, nombre)   UNIQUE(cohorte_id, numero)
                    │1                 │1
                    │                  └──< (clan_id, NULL en TL/staff)
                    └──< team_leader_clans (user_id FK, clan_id FK) >───┐
                                                                        │1
                                                                        │1
roles (id PK, name)                                                     │
   │1                                                                   │
   └──< user_roles (user_id FK, role_id FK) >───┐                       │
                                                │1                      │
        users (id PK, full_name, email, password_hash, clan_id FK?, is_active, created_at) >──┘
        │1                         │1 (evaluatee)        │1 (evaluator, via evaluation_submissions)
        │                          │                     │
        └──< forms (id PK, title, target_role_id FK, is_active)
            │1
            └──< questions (id PK, form_id FK, text, category_id FK, input_type, sort_order)
                      │N
categories (id PK, name) ──────────────────────────< questions.category_id
                      │1
                      └──< evaluation_details (id PK, evaluation_id FK, question_id FK, score, comment)
                                   │N
                                   └──> evaluations (id PK, evaluatee_id FK,
                                                     form_id FK, period_id FK, is_anonymous,
                                                     status, submitted_at, created_at)
                                                          │N        │0..1
periods (id PK, name, starts_at, ends_at, is_active) ─────┘         │ (evaluation_id, NULL si anonima)
                                                                    │
        evaluation_submissions (id PK, evaluator_id FK, evaluatee_id FK,
                                period_id FK, evaluation_id FK?, created_at)
                                UNIQUE(evaluator_id, evaluatee_id, period_id) = uq_submission_once
```

Cardinalidades clave:
- **users ──< evaluations (evaluatee):** un usuario puede ser evaluado muchas veces.
- **users ──< evaluation_submissions (evaluator):** un usuario puede participar muchas veces; la FK **nunca es NULL** (siempre se sabe *que* participo, aunque no *que respondio*).
- **evaluations ──o evaluation_submissions:** relacion 1—0..1 por `evaluation_id`. Si la evaluacion es anonima **esa fila de enlace queda en NULL** y el par persona↔contenido no existe en la BD.
- **evaluations ──< evaluation_details:** una evaluacion tiene muchas respuestas.

## Modelo relacional (resumen)

```
roles(id, name)                                   -- coder, tutor, team_leader, admin
cohortes(id, numero, nombre, ciudad)
clanes(id, cohorte_id->cohortes, numero, nombre)   -- UNIQUE(cohorte_id, numero)
users(id, full_name, email, password_hash, clan_id->clanes?, is_active, created_at)
user_roles(user_id->users, role_id->roles)         -- Relación N:M para multiples roles
team_leader_clans(user_id->users, clan_id->clanes) -- Relación N:M exclusiva para TLs
periods(id, name, starts_at, ends_at, is_active)
forms(id, title, description, target_role_id->roles, is_active)
categories(id, name)
questions(id, form_id->forms, text, category_id->categories, input_type, sort_order, weight_percent)
evaluations(id, evaluatee_id->users, form_id->forms,
            period_id->periods, is_anonymous, status, submitted_at, created_at)
evaluation_submissions(id, evaluator_id->users, evaluatee_id->users, period_id->periods,
            evaluation_id->evaluations?, created_at)   -- UNIQUE(evaluator_id, evaluatee_id, period_id)
evaluation_details(id, evaluation_id->evaluations, question_id->questions, score, comment)
ai_feedback_cache(id, evaluatee_id->users, period_id->periods, summary, model,
                  generated_at)                   -- UNIQUE(evaluatee_id, period_id)
```

## Decisiones de diseno

- **Anonimato (estructural, por separacion de tablas):** el contenido (`evaluations`) y la
  participacion (`evaluation_submissions`) viven en tablas distintas, unidas por
  `evaluation_submissions.evaluation_id`. Si la evaluacion es anonima, **esa columna queda en NULL y
  el vinculo no llega a existir**: la BD sabe *que* Fulano participo y sabe *que respuestas* hay,
  pero no hay dato alguno que las relacione.
  **Por que es mas fuerte que el modelo anterior:** antes se modelaba con `evaluations.evaluator_id`
  NULLABLE, es decir el anonimato era una **convencion que cada query debia respetar** — la columna
  existia y solo se dejaba vacia, asi que un `JOIN` de mas, un `UPDATE` posterior o un cambio
  descuidado podian rellenarla, y el esquema no lo impedia. Ahora la informacion **no esta
  almacenada en ninguna parte**, asi que no hay consulta capaz de revelarla. El precio, aceptado a
  proposito: el propio autor **tampoco** puede recuperar sus respuestas anonimas (si el pudiera, el
  admin tambien podria).
- **Plantillas dinamicas:** `forms` + `questions` permiten cambiar criterios sin tocar codigo. El Admin puede **editar texto y activar/desactivar** preguntas (`questions.is_active`), **solo con periodo cerrado** y **versionando** (fila nueva + desactivar la anterior): asi las respuestas historicas conservan el texto que realmente respondieron y el ICP no se contamina. Ademas puede **crear plantillas nuevas** (`POST /forms`, con sus preguntas iniciales) y **agregar/quitar preguntas** de una plantilla existente (`POST`/`DELETE /questions`) — tambien solo con periodo cerrado; crear/quitar nunca versiona (no hay historial previo que preservar), solo desactiva. `target_role` esta restringido a `team_leader`/`tutor` (los unicos roles evaluables); `input_type` acepta `scale`\|`text`\|`yes_no` (`yes_no` se excluye del ICP igual que `text`).
- **Ventana de evaluacion controlada:** `periods.is_active` define si hay formularios disponibles. Solo **un** periodo activo a la vez (regla en `services`, transaccional); sin periodo activo, no se aceptan evaluaciones nuevas ni envios.
- **Una respuesta por pregunta** via `evaluation_details` (normalizado), facilitando metricas por criterio/categoria.
- **Integridad de unicidad:** un evaluador no puede evaluar dos veces al mismo evaluado en el mismo
  periodo, y la regla **si aplica ahora a las anonimas**, en las dos capas:
  - **Capa BD (autoridad).** `evaluation_submissions` lleva
    `uq_submission_once UNIQUE (evaluator_id, evaluatee_id, period_id)`. Las tres columnas son
    `NOT NULL`, asi que **el hueco de los NULL de MySQL desaparece**: no hay forma de insertar una
    segunda participacion, sea anonima o no. El viejo indice `uq_eval_once` sobre `evaluations`
    **se elimino** (la columna que indexaba ya no existe).
  - **Capa aplicacion (UX).** `evaluation_service.create_evaluation` sigue llamando a
    `check_evaluation_exists` (`repositories/evaluation_repository.py`) antes de insertar, pero esa
    query ahora consulta **`evaluation_submissions`**, donde el `evaluator_id` esta siempre
    presente — de modo que **si detecta** las participaciones anonimas previas. Sirve para responder
    un `409` con mensaje claro sin esperar al error del motor.
  - **La condicion de carrera quedo cerrada.** Antes, entre el `SELECT` y el `INSERT` cabia una
    peticion concurrente y se documentaba como riesgo "aceptado para el tamano del MVP". Ya no
    depende del `SELECT`: si dos peticiones se cruzan, la segunda viola `uq_submission_once` y MySQL
    lanza `IntegrityError`, que el servicio traduce a `EvaluationAlreadyExistsException` → **`409`**,
    el mismo resultado que el camino normal (nunca un `500`).
  - **Efecto colateral resuelto:** el historial del Coder se arma desde `evaluation_submissions`
    (`get_submissions_by_evaluator`, con `LEFT JOIN` a `evaluations`), asi que **si aparecen** sus
    participaciones anonimas — marcadas como tales, pero **sin contenido**: el `LEFT JOIN` no encaja
    porque `evaluation_id` es NULL, que es justo lo que se busca (ver "Anonimato").
- **`ON DELETE SET NULL` en `fk_submission_evaluation`** (el FK de `evaluation_submissions` hacia
  `evaluations`), deliberadamente **ni CASCADE ni RESTRICT**: `CASCADE` borraria la participacion
  junto con la evaluacion y **reabriria el agujero del duplicado** (el coder podria volver a
  evaluar); `RESTRICT` impediria borrar evaluaciones para siempre. `SET NULL` conserva el registro de
  participacion y lo **degrada a la misma forma que una anonima** ("participo, contenido no
  disponible"), que es justo la semantica deseada.
- **Migracion de datos existentes (`database/05_migration_submissions.sql`):** en una BD **nueva**
  no aplica — `01_ddl.sql` ya crea el esquema nuevo. En una BD **con datos** (Railway) hay que
  ejecutarla una sola vez, y **re-ejecutar `04_views.sql` despues** (las vistas leen el esquema
  nuevo). La migracion puede reconstruir `evaluation_submissions` **solo para las evaluaciones no
  anonimas**, copiando su `evaluations.evaluator_id`. Las anonimas historicas se guardaron con
  `evaluator_id = NULL`: **ese evaluador se perdio para siempre y no se puede rellenar**, porque el
  dato nunca existio. Consecuencia unica y acotada: esos coders **podran volver a evaluar una vez** a
  esa persona en ese periodo, ya que no queda participacion previa que `uq_submission_once` bloquee.
  Es un efecto de arrastre de los datos viejos, **no un defecto del modelo nuevo** — a partir de la
  migracion toda evaluacion crea su fila de participacion y el constraint aplica sin excepciones.
  Reconstruir esos evaluadores por heuristica (timestamps, clan, orden de insercion) **viola el
  anonimato** y no debe intentarse.
- **Roles (4, N:M por usuario):** `roles` = coder, tutor, team_leader, admin. Un usuario puede tener **mas de uno a la vez** via `user_roles` (N:M); no existe un `role_id` unico en `users`. **`tutor` es un rol de cuenta de pleno derecho** (no una bandera sobre coder): conserva `clan_id`.
- **Metricas derivadas, no persistidas:** el **ICP** (indice 0-100) y la **participacion** se calculan **on-read** en `services` desde `evaluation_details`; no se guardan como columnas (evita redundancia/inconsistencia). Se persiste solo lo que **no** es derivacion: el `ai_feedback_cache` (resultado costoso de un servicio externo, con `UNIQUE(evaluatee_id, period_id)`).
- **Privacidad de IA:** al modelo solo se envian agregados/comentarios **anonimizados**; nunca `evaluator_id`. El cache guarda el texto resultante, no las identidades de origen.
- **Cohortes y clanes:** un Coder pertenece a **un** clan (`users.clan_id`, relacion 1—N), y cada clan vive dentro de **una** cohorte (`clanes.cohorte_id`). El numero de clan es unico **dentro** de su cohorte -> `UNIQUE(cohorte_id, numero)`.
- **Relación M:N exclusiva para Team Leaders:** se maneja mediante la tabla intermedia `team_leader_clans`. Esto permite que un Team Leader pueda impartir clases a dos o más clanes simultáneamente, mientras que los coders se mantienen estrictamente 1:1 con su clan en la tabla `users`.
- **No guardamos `cohorte_id` en `users`:** la cohorte de un Coder se obtiene siguiendo `users.clan_id -> clanes.cohorte_id` (un JOIN). Duplicar la cohorte en `users` seria una **dependencia transitiva** (rompe 3FN).

## Cumplimiento de la Tercera Forma Normal (3FN)

- **1FN:** todos los atributos son atomicos; no hay grupos repetidos (las respuestas se modelan en su propia tabla `evaluation_details`, no como columnas multiples).
- **2FN:** sin dependencias parciales; cada tabla tiene PK simple (`id`) y los atributos dependen de ella por completo.
- **3FN:** sin dependencias transitivas; p.ej. el nombre del rol vive en `roles` (no se repite en `users`) y los criterios en `questions`. La **cohorte de un Coder no se almacena en `users`**: depende del clan (`clan_id -> clanes.cohorte_id`), asi que guardarla seria transitiva; se deriva por JOIN. El **ICP tampoco se persiste**: es funcion de las respuestas y se calcula on-read (persistirlo seria redundancia derivada).

## Operaciones CRUD (cobertura MVP)

| Entidad | Create | Read | Update | Delete |
|---------|:------:|:----:|:------:|:------:|
| users | seed/admin | login, listar evaluables | perfil (futuro) | baja logica (`is_active`) |
| evaluations | Coder (POST) | historial, dashboard | borrador->enviada | borrador descartable |
| evaluation_details | con la evaluacion | en detalle/metricas | en borrador | cascada con evaluacion |
| forms / questions | seed | render de formularios | admin: texto + `is_active` (versionado, periodo cerrado) | baja logica (`is_active`) |
| periods | seed/admin | filtros | admin: activar/cerrar (uno activo) | — |
| ai_feedback_cache | servicio IA | resumen del Admin | regenerar | invalidar |

> La logica de negocio (anonimato, no-duplicado por periodo, **ICP**, resumen IA, RBAC)
> se implementa en la capa `services` del backend sobre estas operaciones; **no es CRUD plano**.

## Ampliacion futura (fuera del MVP)

- **Areas / multi-area:** agregar tabla `areas` y `area_id` a users/evaluations/forms para segmentar el ICP por area (Desarrollo, Ingles, HSE, BLS).
- **Bitacora TL->Tutor:** tabla `tutor_feedback_log` para notas continuas del TL sobre tutores.
- **Pesos del ICP configurables:** tabla `icp_weights` para que el Admin edite los pesos por categoria.
- **Analitica de talento:** Talent Score derivado para ranking de futuros TL.
- **N—N Coder-Clanes:** si un Coder puede estar en varias cohortes a la vez, migrar a tabla intermedia `coder_clanes(user_id, clan_id)`.

Los scripts ejecutables están divididos en cuatro archivos, en este orden:
- DDL (Estructura): [`/database/01_ddl.sql`](../database/01_ddl.sql)
- DML (Datos semilla): [`/database/02_dml.sql`](../database/02_dml.sql)
- Histórico simulado (opcional): [`/database/03_mock_history.sql`](../database/03_mock_history.sql)
- Vistas (requerido — `/metrics` depende de ellas): [`/database/04_views.sql`](../database/04_views.sql)
