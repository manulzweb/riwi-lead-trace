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
| `form_templates` | Plantilla de formulario segun el rol evaluado (TL / Tutor) |
| `categories` | Categoria/tema de una pregunta (ej. "Comunicacion efectiva"); el Admin la administra aparte de las plantillas |
| `questions` | Preguntas/criterios que componen una plantilla |
| `evaluations` | Una evaluacion de un evaluador hacia un evaluado, en un periodo |
| `evaluation_answers` | Respuestas (puntaje + comentario) por pregunta de una evaluacion |
| `ai_feedback_cache` | Cache de resumenes generados por IA (Gemini API) para el Admin |

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

### `form_templates`
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
| template_id | INT FK -> form_templates.id | |
| text | VARCHAR(255) | editable por el Admin **solo con periodo cerrado** y via **versionado** (fila nueva + desactivar la anterior) |
| category_id | INT FK -> categories.id | categoria tematica de la pregunta (organiza el formulario y permite listar/rankear por categoria en el dashboard); **no editable** en preguntas existentes (se fija al crearla) |
| input_type | VARCHAR(20) | 'scale' \| 'text' \| 'yes_no'; **no editable** desde la UI en preguntas existentes (si se define al crearla) |
| sort_order | INT | orden de despliegue; **no editable** desde la UI |
| weight_percent | DECIMAL(5,2) | peso de la pregunta en el ICP ponderado (solo aplica a 'scale'; 'text' queda en 0). Las preguntas de escala **activas** de un mismo `template_id` deben sumar exactamente 100 — se valida en `question_service.update_weights` antes de guardar. Editable por el Admin via `PUT /questions/weights`, solo con periodo cerrado |
| is_active | BOOLEAN | default TRUE; las evaluaciones nuevas cargan solo preguntas activas; las respuestas historicas conservan su pregunta y su peso original |

### `evaluations`
| Atributo | Tipo | Notas |
|----------|------|-------|
| id | INT PK | |
| evaluator_id | INT FK -> users.id (NULLABLE) | **NULL si es anonima** |
| evaluatee_id | INT FK -> users.id | persona evaluada |
| template_id | INT FK -> form_templates.id | |
| period_id | INT FK -> periods.id | |
| is_anonymous | BOOLEAN | default false |
| status | VARCHAR(20) | 'draft' \| 'submitted' |
| submitted_at | TIMESTAMP NULL | |
| created_at | TIMESTAMP | |

### `evaluation_answers`
| Atributo | Tipo | Notas |
|----------|------|-------|
| id | INT PK | |
| evaluation_id | INT FK -> evaluations.id | |
| question_id | INT FK -> questions.id | |
| score | SMALLINT NULL | 1-5 si input_type='scale' |
| comment | TEXT NULL | si input_type='text' |

### `ai_feedback_cache`
Cache de los resumenes generados por IA (Gemini API) para no re-llamar al modelo y controlar costo.
No es dato relacional duplicado, sino el **resultado materializado de un servicio externo** (ver 3FN).

| Atributo | Tipo | Notas |
|----------|------|-------|
| id | INT PK | |
| evaluatee_id | INT FK -> users.id | persona resumida |
| period_id | INT FK -> periods.id | periodo del resumen |
| summary | TEXT | texto generado por el modelo |
| model | VARCHAR(40) | modelo usado (p.ej. gemini-3.5-flash) |
| generated_at | TIMESTAMP | cuando se genero |
| | | **UNIQUE(evaluatee_id, period_id)** |

## Relaciones

- `users` N—M `roles` *(mediante `user_roles`)*
- `cohortes` 1—N `clanes`
- `clanes` 1—N `users` *(un Coder/Tutor pertenece a **un** clan; FK nullable para TL/admin)*
- `clanes` N—M `users` *(solo para TLs mediante tabla intermedia `team_leader_clans`)*
- `roles` 1—N `form_templates` (rol evaluado)
- `form_templates` 1—N `questions`
- `categories` 1—N `questions` *(borrar una categoria esta restringido mientras tenga preguntas)*
- `users` (evaluador) 1—N `evaluations` *(opcional: NULL en anonimas)*
- `users` (evaluado) 1—N `evaluations`
- `periods` 1—N `evaluations`
- `evaluations` 1—N `evaluation_answers`
- `questions` 1—N `evaluation_answers`
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
        │1                         │1 (evaluatee)        │0..1 (evaluator, NULL si anonima)
        │                          │                     │
        └──< form_templates (id PK, title, target_role_id FK, is_active)
            │1
            └──< questions (id PK, template_id FK, text, category_id FK, input_type, sort_order)
                      │N
categories (id PK, name) ──────────────────────────< questions.category_id
                      │1
                      └──< evaluation_answers (id PK, evaluation_id FK, question_id FK, score, comment)
                                   │N
                                   └──> evaluations (id PK, evaluator_id FK?, evaluatee_id FK,
                                                     template_id FK, period_id FK, is_anonymous,
                                                     status, submitted_at, created_at)
                                                          │N
periods (id PK, name, starts_at, ends_at, is_active) ─────┘
```

Cardinalidades clave:
- **users ──< evaluations (evaluatee):** un usuario puede ser evaluado muchas veces.
- **users ──< evaluations (evaluator):** un usuario puede evaluar muchas veces; FK *nullable* para anonimato.
- **evaluations ──< evaluation_answers:** una evaluacion tiene muchas respuestas.

## Modelo relacional (resumen)

```
roles(id, name)                                   -- coder, tutor, team_leader, admin
cohortes(id, numero, nombre, ciudad)
clanes(id, cohorte_id->cohortes, numero, nombre)   -- UNIQUE(cohorte_id, numero)
users(id, full_name, email, password_hash, clan_id->clanes?, is_active, created_at)
user_roles(user_id->users, role_id->roles)         -- Relación N:M para multiples roles
team_leader_clans(user_id->users, clan_id->clanes) -- Relación N:M exclusiva para TLs
periods(id, name, starts_at, ends_at, is_active)
form_templates(id, title, description, target_role_id->roles, is_active)
categories(id, name)
questions(id, template_id->form_templates, text, category_id->categories, input_type, sort_order, weight_percent)
evaluations(id, evaluator_id->users?, evaluatee_id->users, template_id->form_templates,
            period_id->periods, is_anonymous, status, submitted_at, created_at)
evaluation_answers(id, evaluation_id->evaluations, question_id->questions, score, comment)
ai_feedback_cache(id, evaluatee_id->users, period_id->periods, summary, model,
                  generated_at)                   -- UNIQUE(evaluatee_id, period_id)
```

## Decisiones de diseno

- **Anonimato:** se modela con `is_anonymous` + `evaluator_id` NULLABLE. Si la evaluacion es anonima, no se persiste el evaluador -> anonimato real a nivel de datos.
- **Plantillas dinamicas:** `form_templates` + `questions` permiten cambiar criterios sin tocar codigo. El Admin puede **editar texto y activar/desactivar** preguntas (`questions.is_active`), **solo con periodo cerrado** y **versionando** (fila nueva + desactivar la anterior): asi las respuestas historicas conservan el texto que realmente respondieron y el ICP no se contamina. Ademas puede **crear plantillas nuevas** (`POST /forms`, con sus preguntas iniciales) y **agregar/quitar preguntas** de una plantilla existente (`POST`/`DELETE /questions`) — tambien solo con periodo cerrado; crear/quitar nunca versiona (no hay historial previo que preservar), solo desactiva. `target_role` esta restringido a `team_leader`/`tutor` (los unicos roles evaluables); `input_type` acepta `scale`\|`text`\|`yes_no` (`yes_no` se excluye del ICP igual que `text`).
- **Ventana de evaluacion controlada:** `periods.is_active` define si hay formularios disponibles. Solo **un** periodo activo a la vez (regla en `services`, transaccional); sin periodo activo, no se aceptan evaluaciones nuevas ni envios.
- **Una respuesta por pregunta** via `evaluation_answers` (normalizado), facilitando metricas por criterio/categoria.
- **Integridad de unicidad:** un evaluador no deberia evaluar dos veces al mismo evaluado en el mismo periodo. Esto se valida **solo en `evaluation_service`** (un `SELECT` por `evaluator_id`+`evaluatee_id`+`period_id` antes del `INSERT`, sin transaccion). El script trae, comentado a proposito, el indice `uq_eval_once ON evaluations (evaluator_id, evaluatee_id, period_id)` que cerraria la condicion de carrera a nivel de BD; queda deshabilitado para el MVP (ver `database/01_ddl.sql`), asumiendo el riesgo residual de una doble evaluacion por dos requests concurrentes. No reactivarlo ni reescribir la validacion sin aprobacion del equipo.
- **Roles (4, N:M por usuario):** `roles` = coder, tutor, team_leader, admin. Un usuario puede tener **mas de uno a la vez** via `user_roles` (N:M); no existe un `role_id` unico en `users`. **`tutor` es un rol de cuenta de pleno derecho** (no una bandera sobre coder): conserva `clan_id`.
- **Metricas derivadas, no persistidas:** el **ICP** (indice 0-100) y la **participacion** se calculan **on-read** en `services` desde `evaluation_answers`; no se guardan como columnas (evita redundancia/inconsistencia). Se persiste solo lo que **no** es derivacion: el `ai_feedback_cache` (resultado costoso de un servicio externo, con `UNIQUE(evaluatee_id, period_id)`).
- **Privacidad de IA:** al modelo solo se envian agregados/comentarios **anonimizados**; nunca `evaluator_id`. El cache guarda el texto resultante, no las identidades de origen.
- **Cohortes y clanes:** un Coder pertenece a **un** clan (`users.clan_id`, relacion 1—N), y cada clan vive dentro de **una** cohorte (`clanes.cohorte_id`). El numero de clan es unico **dentro** de su cohorte -> `UNIQUE(cohorte_id, numero)`.
- **Relación M:N exclusiva para Team Leaders:** se maneja mediante la tabla intermedia `team_leader_clans`. Esto permite que un Team Leader pueda impartir clases a dos o más clanes simultáneamente, mientras que los coders se mantienen estrictamente 1:1 con su clan en la tabla `users`.
- **No guardamos `cohorte_id` en `users`:** la cohorte de un Coder se obtiene siguiendo `users.clan_id -> clanes.cohorte_id` (un JOIN). Duplicar la cohorte en `users` seria una **dependencia transitiva** (rompe 3FN).

## Cumplimiento de la Tercera Forma Normal (3FN)

- **1FN:** todos los atributos son atomicos; no hay grupos repetidos (las respuestas se modelan en su propia tabla `evaluation_answers`, no como columnas multiples).
- **2FN:** sin dependencias parciales; cada tabla tiene PK simple (`id`) y los atributos dependen de ella por completo.
- **3FN:** sin dependencias transitivas; p.ej. el nombre del rol vive en `roles` (no se repite en `users`) y los criterios en `questions`. La **cohorte de un Coder no se almacena en `users`**: depende del clan (`clan_id -> clanes.cohorte_id`), asi que guardarla seria transitiva; se deriva por JOIN. El **ICP tampoco se persiste**: es funcion de las respuestas y se calcula on-read (persistirlo seria redundancia derivada).

## Operaciones CRUD (cobertura MVP)

| Entidad | Create | Read | Update | Delete |
|---------|:------:|:----:|:------:|:------:|
| users | seed/admin | login, listar evaluables | perfil (futuro) | baja logica (`is_active`) |
| evaluations | Coder (POST) | historial, dashboard | borrador->enviada | borrador descartable |
| evaluation_answers | con la evaluacion | en detalle/metricas | en borrador | cascada con evaluacion |
| form_templates / questions | seed | render de formularios | admin: texto + `is_active` (versionado, periodo cerrado) | baja logica (`is_active`) |
| periods | seed/admin | filtros | admin: activar/cerrar (uno activo) | — |
| ai_feedback_cache | servicio IA | resumen del Admin | regenerar | invalidar |

> La logica de negocio (anonimato, no-duplicado por periodo, **ICP**, resumen IA, RBAC)
> se implementa en la capa `services` del backend sobre estas operaciones; **no es CRUD plano**.

## Ampliacion futura (fuera del MVP)

- **Areas / multi-area:** agregar tabla `areas` y `area_id` a users/evaluations/form_templates para segmentar el ICP por area (Desarrollo, Ingles, HSE, BLS).
- **Bitacora TL->Tutor:** tabla `tutor_feedback_log` para notas continuas del TL sobre tutores.
- **Pesos del ICP configurables:** tabla `icp_weights` para que el Admin edite los pesos por categoria.
- **Analitica de talento:** Talent Score derivado para ranking de futuros TL.
- **N—N Coder-Clanes:** si un Coder puede estar en varias cohortes a la vez, migrar a tabla intermedia `coder_clanes(user_id, clan_id)`.

Los scripts ejecutables están divididos en dos archivos:
- DDL (Estructura): [`/database/01_ddl.sql`](../database/01_ddl.sql)
- DML (Datos semilla): [`/database/02_dml.sql`](../database/02_dml.sql)