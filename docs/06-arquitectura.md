# 06 — Arquitectura del Software

## Principios

- **Simplicidad y claridad:** lo necesario para un MVP full-stack mantenible por un equipo de 5.
- **Separacion de capas** en frontend y backend; responsabilidades unicas por modulo.
- **Logica de negocio explicita** (no solo CRUD): vive en la capa `services` del backend.
- **Contrato REST estable** entre SPA y API -> frontend y backend evolucionan en paralelo.

## Estilo arquitectonico: monolito modular por capas

El sistema implementa un patrón de arquitectura de monolito modular, garantizando un despliegue unificado para el backend y frontend (SPA). Internamente, la base de código se segmenta en módulos con responsabilidades aisladas para minimizar el acoplamiento y prevenir la degradación de la arquitectura.

La organización estructural es de tipo **horizontal (por capa técnica)** en contraste con una separación vertical por funcionalidad (Feature-Sliced Design). Esta decisión fue tomada deliberadamente para maximizar la legibilidad y simplificar el modelo mental del código, favoreciendo la centralización de responsabilidades: los controladores viven en `routes/`, la lógica de negocio subyace en `services/`, y el acceso a datos está aislado en `repositories/`.

> **Nota:** La persistencia se abstrae en `backend/app/repositories/`, encapsulando un repositorio por entidad (`user`, `evaluation`, `period`, etc.). Los servicios de dominio (`services/`) delegan la persistencia mediante inyección o uso de estos repositorios, los cuales ejecutan sentencias preparadas de SQL mediante `conn.execute(text(...))`. Las consultas se elaboran utilizando sintaxis SQL nativa, eludiendo la introducción de una capa de mapeo objeto-relacional completa (ORM como SQLAlchemy ORM) para reducir la sobrecarga técnica (overhead), y separando estrictamente la definición de datos (DDL) a los scripts iniciales sin definir un modelo de objetos intermedio.

## Patrones de diseño

En **backend, la programacion orientada a objetos encaja natural** (Python + FastAPI ya trabajan asi).
En **frontend Vanilla JS, se usan clases solo donde de verdad ayudan** (cuando hay estado que
mantener) — forzar clases en todo (vistas, servicios) agrega ceremonia sin beneficio real cuando una
funcion pura hace lo mismo con menos codigo.

### Backend (POO explicita)

| Patron | Donde | Que resuelve |
|---|---|---|
| **Layered Architecture** | `routes/ -> services/ -> repositories/ -> MySQL` | Cada capa tiene una responsabilidad; los cambios quedan localizados |
| **Service Layer** | `services/` (ej. `evaluation_service`, `metrics_service`, `ai_service`) | Concentra la logica de negocio (anonimato, no-duplicado, calculo de metricas), delegando las queries SQL a `repositories/` |
| **Repository** | `repositories/` (un archivo por entidad, ej. `evaluation_repository`, `metrics_repository`) | Encapsula el acceso a datos (SQL plano con `text()`); `services/` no ejecuta queries inline |
| **Dependency Injection** | `Depends(...)` en `routes/` (ej. `Query(...)` para filtros como `role`, `viewer_role`) | FastAPI inyecta dependencias en vez de que cada endpoint las construya; facilita testear |
| **DTO (Data Transfer Object)** | `schemas/` (Pydantic) | Define exactamente que entra/sale de la API, distinto de las columnas de la BD |

### Frontend (funciones + un poco de OOP donde importa)

| Patron | Donde | Que resuelve |
|---|---|---|
| **Module Pattern** | Cada archivo `*.service.js`, `*.view.js` (ES Modules) | Encapsula detalles; solo se exporta lo necesario |
| **Front Controller** | `router.js` (`renderRoute`) | Un unico punto de entrada decide que vista renderizar segun la ruta y el rol |

**Vistas, componentes y `*.service.js` se quedan como funciones**, no clases: no guardan estado propio
entre llamadas (reciben datos, devuelven HTML o hacen un `fetch`), asi que una clase ahi solo anadiria
`this.` sin ganar nada. No hay ningun objeto con estado compartido en el frontend (no existe un
`store`, ver "Gestion de estado" mas abajo): el unico estado que persiste entre pantallas es la
sesion en `localStorage`.

## Arquitectura general (full-stack)

```
┌───────────────────────── Navegador ─────────────────────────┐
│  SPA (frontend/)                                              │
│  Router ─> Vistas <─> Componentes                            │
│             │                                                 │
│             v                                                 │
│          localStorage (sesion; sin store pub/sub central)   │
│             │                                                 │
│             v                                                 │
│          Services ─> api.service.js (fetch: baseURL, errores) │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS · REST (JSON) · sin JWT (ver nota mas abajo)
                            v
┌──────────────────── Backend (backend/ · FastAPI) ───────────┐
│  Routes (endpoints, validacion I/O con Pydantic)             │
│     │                                                        │
│     v                                                        │
│  Services  <── LOGICA DE NEGOCIO                             │
│     │           (anonimato, no-duplicado, metricas, RBAC)   │
│     │           └─ ai_service ──HTTPS──> Google Gemini API  │
│     v                                                        │
│  Repositories <── ACCESO A DATOS: queries SQL (text())      │
└───────────────────────────┬─────────────────────────────────┘
                            │ SQLAlchemy (text()) + PyMySQL
                            v
                   ┌──────────────────┐
                   │   MySQL (3FN)    │  (ver 07-base-de-datos)
                   └──────────────────┘
```

## Estructura de carpetas (monorepo)

```
riwi-lead-trace/
├── frontend/
│   ├── index.html              # punto de entrada SPA (un solo HTML)
│   ├── package.json
│   ├── vite.config.js
│   ├── public/
│   └── src/
│       ├── main.js             # bootstrap: router + hidratar sesion
│       ├── router/
│       │   ├── router.js       # motor de rutas (History API) + guards
│       │   └── routes.js       # rutas -> vistas + roles permitidos
│       │                       # NO existen store/ ni config/: el estado de sesion vive en
│       │                       # localStorage (auth.service.js) y cada componente resuelve
│       │                       # el suyo localmente. No hay store pub/sub centralizado.
│       ├── services/           # unica capa que llama a la API
│       │   ├── api.service.js  # wrapper fetch (BASE_URL vive aqui, errores; sin JWT, ver nota)
│       │   ├── auth.service.js
│       │   ├── evaluation.service.js · evaluables.service.js · forms.service.js
│       │   ├── users.service.js · periods.service.js · categories.service.js
│       │   ├── settings.service.js · activityLog.service.js · theme.service.js
│       │   └── metrics.service.js       # ICP + resumen IA
│       ├── views/              # auth/login.js · dashboard.view.js · profile.view.js ·
│       │                       # coder/{evaluables,evaluate,my-evaluations}.view.js ·
│       │                       # team-leader/my-results.view.js · tutor/my-results.view.js ·
│       │                       # admin/{evaluations,periods,categories,metrics,ai-summary,
│       │                       #   activity-log,settings}.view.js · notFound.js (*.view.js)
│       ├── components/         # navbar.js · sidebar.js · badge.js · statusBadge.js ·
│       │                       # dropdown.js · cards_ui.js · searchBox.js ·
│       │                       # evaluation_detail_modal.js · period_management.js ·
│       │                       # active_period_banner.js · alerts.js · background.js · lang-switcher.js
│       ├── utils/              # validators.js · formUtils.js · date.js · modalA11y.js · categoryBreakdown.js
│       └── styles/             # global.css (Tailwind CSS, un solo archivo)
│
├── backend/
│   ├── app/
│   │   ├── main.py             # crea FastAPI, CORS, incluye los routers de routes/
│   │   ├── config/
│   │   │   ├── config.py       # settings (DATABASE_URL, SECRET_KEY...) desde .env
│   │   │   ├── database.py     # engine + conexion SQLAlchemy
│   │   │   └── security.py     # hash de contrasenas (bcrypt); ya NO crea/verifica JWT
│   │   ├── schemas/            # Pydantic: request/response por dominio
│   │   ├── services/           # LOGICA DE NEGOCIO por entidad:
│   │   │                       # auth, user, period, form, question, evaluation, metrics, ai, activity_log, settings
│   │   ├── repositories/       # ACCESO A DATOS por entidad: queries SQL (text()) que consumen los services de arriba
│   │   └── routes/              # auth, users, forms, evaluations, periods, questions, metrics, activity_log, settings
│   ├── requirements.txt
│   └── .env.example
│
├── database/
│   ├── 01_ddl.sql              # DDL (estructura, MySQL 3FN)
│   ├── 02_dml.sql              # DML (seed minimo de datos)
│   ├── 03_mock_history.sql     # datos historicos simulados (opcional, para poblar historial/dashboard/IA)
│   └── 04_views.sql            # vistas SQL (requerido: /metrics depende de vw_period_metrics)
├── docs/                       # documentacion Scrum + tecnica (00..13, ver indice en README.md)
└── mockups/                    # exports/enlaces Figma
```

## Sistema de rutas SPA (frontend)

- **Motor Propio (Vanilla JS):** Construido sobre la **History API** (`pushState` + `popstate`). Intercepta globalmente los eventos de clic en enlaces (`<a>`) para prevenir recargas completas del navegador (comportamiento SPA nativo).
- **View Transitions API:** Implementa transiciones visuales fluidas (`document.startViewTransition()`) si el navegador lo soporta, cayendo con gracia (graceful degradation) a una actualización estándar del DOM.
- **Rutas y Guardias (Route Guards):** `routes.js` declara un objeto `ROUTES` que mapea cada path a su vista y a los roles autorizados:

```js
export const ROUTES = {
  "/login":     { renderView: renderLogin, initSetup: setupLogin, requireAuth: false, redirectIfAuth: true, allowedRoles: [...] },
  "/dashboard": { renderView: renderDashboard, initSetup: setupDashboard, requireAuth: true, allowedRoles: ["coder","tutor","team_leader","admin"] },
  "/evaluables":{ renderView: renderEvaluables, initSetup: setupEvaluables, requireAuth: true, allowedRoles: ["coder"] },
  "/my-results":{ renderView: renderMyResults, initSetup: setupMyResults, requireAuth: true, allowedRoles: ["team_leader","tutor"] },
  "/admin/metrics": { renderView: renderMetrics, initSetup: setupMetrics, requireAuth: true, allowedRoles: ["admin"] },
  "/404":       { renderView: renderNotFound, initSetup: setupNotFound, requireAuth: false, allowedRoles: [...] },
};
```

- **Ejecución de Guards:** Antes de la inserción en el DOM, el enrutador valida la sesión (`authService.getSession()`) y los roles (`allowedRoles`). Emite redirecciones o notificaciones (SweetAlert2) si se violan los privilegios, mitigando accesos no autorizados a nivel de cliente (UX).

## Gestion de estado (frontend)

La gestión de estado se mantiene deliberadamente simple, delegando la persistencia de la sesión al `localStorage` del cliente. El módulo `auth.service.js` provee la abstracción necesaria para interactuar con la sesión. Los componentes UI determinan su estado de renderizado reactivo internamente, prescindiendo de la adopción de una arquitectura de estado global (e.g. Redux o equivalentes) o implementaciones de bus de eventos (pub/sub).

## Backend — arquitectura por capas (FastAPI)

| Capa | Responsabilidad | Regla |
|------|-----------------|-------|
| `routes/` | Controladores HTTP, validación estructural de I/O mediante **Pydantic V2**, y mapeo a verbos REST. | Aislada estrictamente de la lógica de negocio pura. |
| `services/` | **Lógica de dominio** central (validaciones cruzadas, orquestación, integración con IA). | Agnóstica al protocolo HTTP; no emite excepciones de framework web (usa `ApplicationException`). |
| `repositories/` | **Capa de Acceso a Datos (DAL)**: Ejecuta consultas paramétricas y transacciones de persistencia (`sqlalchemy.text()`). | Hereda de `BaseRepository`. Maneja la hidratación y proyecciones de estado (State Projection). |
| `constants/` | Valores inmutables y reglas puras aisladas (e.g. `can_evaluate_by_clan`). | Sujetas a pruebas unitarias sin dependencia del motor de base de datos. |
| `schemas/` | Contratos de serialización y deserialización (DTOs) implementados en **Pydantic V2**. | Frontera de datos; asegura la exclusión de atributos sensibles (e.g. `password_hash`). |

> **evaluator_id viene del body:** en `POST /evaluations`, `evaluator_id` es un campo mas del
> JSON que manda el cliente (`EvaluationCreate.evaluator_id`, leido en
> `evaluation_service.create_evaluation`).
>
> **Ojo:** ese `evaluator_id` del body **ya no se guarda en `evaluations`** (esa columna no existe).
> Se persiste en `evaluation_submissions`, y solo se enlaza con el contenido cuando la evaluacion
> **no** es anonima. Ver "Anonimato y no-duplicado" mas abajo.
>
> La infraestructura de base de datos emplea un modelo normalizado robusto complementado por abstracciones específicas para lectura, acercándose a un patrón arquitectónico **CQRS (Command Query Responsibility Segregation)** de manera simplificada:
>
> - **Escrituras (Commands):** Los `repositories/` ejecutan inserciones y mutaciones encapsuladas en transacciones explícitas. Se apoyan en un **Connection Pool** pre-configurado (`pool_size=10`, `max_overflow=20`) con `pool_pre_ping=True` para asegurar resiliencia en conexiones inestables.
> - **Lecturas Complejas (Queries):** Para optimizar la obtención de datos agregados sin generar cuellos de botella (N+1 query problem), se abstraen las consultas pesadas a nivel de base de datos empleando **Vistas Materializadas o Virtuales**.

### Índice de Calidad Percibida (ICP) — Cálculo Híbrido

**Definición:** El ICP es una métrica cuantitativa (escalada de 0 a 100) diseñada para evaluar la calidad percibida del acompañamiento. Actúa como indicador clave de rendimiento basado en la agregación de encuestas de evaluación.

**Algoritmo de Cálculo:** El índice se implementa a través de un promedio ponderado y está supeditado a un factor de confianza por significancia estadística (tamaño mínimo de muestra). El procesamiento aritmético se delega íntegramente a la capa de base de datos a través de la vista virtual `vw_period_metrics`.

1. La vista cuenta cuantas evaluaciones `submitted` tiene esa persona en ese periodo (`n_evals`).
2. Calcula el promedio ponderado usando los puntajes (1-5) y el **peso (`weight_percent`)** de
   **todas** las preguntas tipo `scale` (las de tipo `text` no entran al calculo; alimentan el
   resumen de IA). Fórmula: `sum(avg_score * weight) / sum(weight)`.
3. Normaliza ese promedio de la escala 1-5 a 0-100: `score = round((promedio_ponderado - 1) / 4 * 100)`.
4. `metrics_repository` filtra el resultado por `n_evals >= required_evaluations`: ese minimo ya
   no es una constante fija en Python, es el ajuste `system_settings.required_evaluations`
   (configurable por el Admin, default 3) que `metrics_service._load_policy()` lee antes de
   consultar. Si `n_evals` no alcanza el minimo, el evaluado se sigue listando pero con
   `average_score = None` ("datos insuficientes"), en vez de un puntaje poco confiable.

`metrics_service.classify_status` clasifica ese `average_score` contra `score_risk_threshold` /
`score_excellent_threshold` (tambien leidos de `system_settings`, con defaults hardcodeados en
`metrics_service.py` como respaldo). `get_metrics_summary` repite esto para cada Team
Leader/Tutor del periodo y agrega: promedio global, total de evaluaciones enviadas, y tasa de
participacion (evaluaciones enviadas ÷ evaluaciones posibles, asumiendo 2 evaluaciones por coder
activo).



> El ICP **no se persiste**: se calcula on-read (en la vista SQL, no en una funcion `services`).
> No busques `metrics_service.calculate_average_score` ni una constante `MIN_EVALUATIONS` en
> `metrics_service.py`: ese diseño anterior ya no existe en el codigo actual.

### Integración de Inteligencia Artificial (IA) — `ai_service`

La arquitectura incorpora IA no como un adorno, sino como motor analítico delegando procesamiento de lenguaje natural a Google Gemini API (`google-generativeai`).

- **Estrategia Multi-Modelo:** Se emplean dos modelos especializados optimizando latencia y costo:
  - `gemini-3.5-flash` (`AI_SUMMARY_MODEL`): Orientado a síntesis ejecutivas, procesa resúmenes masivos de feedback cualitativo.
  - `gemini-2.5-flash-lite` (`AI_LITE_MODEL`): Desplegado para validación semántica de alta velocidad; verifica la coherencia entre el texto de una pregunta editada y la definición de su categoría (Data Quality).
- **Aislamiento y Privacidad:** El modelo recibe agregados anonimizados. En ningún escenario se inyectan identificadores (`evaluator_id`) u otra información de identificación personal (PII).
- **Estrategia de Caché:** Para mitigar llamadas redundantes a la API (y costos), las respuestas sintéticas se persisten en `ai_feedback_cache` empleando un índice único compuesto (`evaluatee_id`, `period_id`).

## Comunicacion con la API

- En frontend, **toda** llamada pasa por `services/api.service.js` (`request` + `jsonOptions`): prefija `VITE_API_BASE_URL`, serializa/parsea JSON y adjunta `status`/`detail` al error si la respuesta no es 2xx. No inyecta ningun header `Authorization` — no hay token que mandar (ver "Manejo de autenticacion").
- Cada `*.service.js` expone funciones de dominio; nunca `fetch` directo en vistas.
- **Contrato REST del MVP:**

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| POST | `/auth/login` | Autenticacion -> `{ user }` |
| GET | `/users?role=team_leader` | Evaluables por rol |
| GET | `/forms?target_role=team_leader` | Plantilla de formulario por rol |
| POST | `/evaluations` | Registrar evaluacion: inserta el contenido en `evaluations` **y** la participacion en `evaluation_submissions` (con `evaluation_id = NULL` si es anonima). No-duplicado por periodo garantizado por `uq_submission_once` (`409`) + **requiere periodo activo** (si no, `409`) |
| GET | `/evaluations?evaluator_id=:id` | Historial del Coder: se lee de `evaluation_submissions`, asi que **incluye tambien las participaciones anonimas** — visibles como "participaste", pero **sin su contenido** |
| GET | `/evaluations?evaluatee_id=:id&viewer_role=` | Historico por evaluado (respeta anonimato; `viewer_role` lo manda el cliente, sin verificar). El admin ve el evaluador de las **no anonimas** resolviendo `evaluation_submissions.evaluation_id` |
| GET | `/periods` | Listar periodos (el activo define si hay formularios disponibles) |
| PUT | `/periods/:id` | **Admin:** activar/cerrar el periodo de evaluacion (solo uno activo a la vez) |
| PATCH | `/questions/:id` | **Admin:** editar (versionar) el texto de una pregunta (solo con periodo cerrado, si no `409`) |
| PUT | `/questions/weights` | **Admin:** actualizar los pesos (`weight_percent`) de las preguntas de escala de un form (deben sumar 100, solo con periodo cerrado) |
| GET | `/metrics/summary?period_id=:p` | KPIs + **ICP** |
| GET | `/metrics/ai-summary?evaluatee_id=:e&period_id=:p` | Resumen IA (Google Gemini, anonimizado) — admin |
| GET | `/activity-log?limit=` | Bitacora de acciones administrativas, mas reciente primero — admin |
| GET | `/activity-log/export` | Descarga la bitacora en CSV (trunca a 10000 filas) — admin |
| GET / PUT | `/settings` | Leer/actualizar la configuracion global (`system_settings`) — admin |
| GET | `/settings/defaults` | Valores de fabrica de la configuracion, solo lectura — admin |

> FastAPI expone documentacion interactiva automatica en `/docs` (Swagger) y `/redoc`, util para pruebas y sustentacion.

## Manejo de autenticacion

- Login -> `POST /auth/login`: el backend solo verifica el hash bcrypt (`auth_service.login`) y
  devuelve `{ user }`. El frontend guarda `user` en `localStorage`
  (`auth.service.js` — `setSession`/`getSession`/`clearSession`), no hay `token` que guardar.
- Cada peticion que necesita saber "quien soy" o "que rol tengo" manda ese dato **en el propio
  request** — como parametro de query (`viewer_role`) o campo del body (`evaluator_id`) — y el
  backend lo usa **tal cual, sin verificarlo criptograficamente**.
- No hay `401` por sesion expirada (no hay sesion que expire en el backend); el frontend solo
  redirige a `/login` si no hay `user` guardado en `localStorage`.
- **Autorizacion por rol:** en **frontend** (guards de `router.js`) es la unica capa que oculta
  rutas/opciones por rol — es **solo UX**. En **backend** no hay verificacion de rol real: los
  filtros por rol (`?role=`, `viewer_role`) son conveniencia sobre el dato que manda el cliente,
  **no una barrera de seguridad**.
- **Visibilidad de evaluadores (regla de negocio):** una persona evaluada (**TL/Tutor**) **nunca ve
  quien la evaluo**. Solo el **Admin** ve la identidad del evaluador en evaluaciones **no anonimas**;
  las **anonimas permanecen anonimas para todos** (incluido el Admin).
  El mecanismo: `evaluation_repository.get_evaluator_ids_for_evaluations` arma el mapa
  `evaluation_id -> evaluator_id` desde `evaluation_submissions`, y el servicio solo lo adjunta si
  `viewer_role == "admin"`. Las anonimas **no figuran en ese mapa** porque su fila de participacion
  tiene `evaluation_id = NULL` — no hay identidad que enmascarar, simplemente no esta guardada.
  Es la diferencia clave con el modelo anterior: la proteccion **ya no depende** de que el servicio
  se acuerde de poner el campo en `None`.

## Anonimato y no-duplicado (modelo de datos)

El anonimato **no** se implementa dejando una columna en NULL, sino separando dos hechos distintos
en dos tablas:

- `evaluations` — **el contenido** (respuestas, form, periodo, `is_anonymous`). **Ya no tiene
  `evaluator_id`.**
- `evaluation_submissions` — **la participacion**: `(evaluator_id, evaluatee_id, period_id,
  evaluation_id NULL)`. El `evaluator_id` **siempre** se guarda; `evaluation_id` es el **vinculo**
  con el contenido y **solo se llena si la evaluacion no es anonima**.

Consecuencias de diseno:

1. **Anonimato real (regla 1).** En una evaluacion anonima el vinculo **no llega a existir**. No hay
   query, join ni acceso directo a la BD que reconstruya quien escribio que. Antes era una
   convencion que el codigo debia respetar en cada consulta; ahora es una propiedad del esquema.
2. **No-duplicado real (regla 2).** `uq_submission_once UNIQUE (evaluator_id, evaluatee_id,
   period_id)` sobre columnas `NOT NULL` cubre anonimas y no anonimas por igual. El viejo
   `uq_eval_once` desaparecio: indexaba `evaluations.evaluator_id`, que era NULL en las anonimas, y
   MySQL admite multiples NULL en un indice unico — por eso no las detectaba. La **condicion de
   carrera** que antes se documentaba como aceptada queda **cerrada**: el `SELECT` previo
   (`check_evaluation_exists`) es solo UX; si dos peticiones concurrentes se cruzan, el constraint
   lanza `IntegrityError` y el servicio lo traduce a `409`.
3. **Precio aceptado:** el Coder ve **que** participo de forma anonima, pero **no puede recuperar sus
   respuestas**. Es deliberado — si el autor pudiera recuperarlas, el admin tambien podria.

## Manejo de errores

## Manejo de errores y Resiliencia (Backend)

El sistema incorpora un interceptor global de excepciones (Exception Handler) en FastAPI, diseñado con estrictas consideraciones de seguridad y correlación:

- **Manejo de Errores Controlados:** Las validaciones de Pydantic emiten `422 Unprocessable Entity` automáticamente. Excepciones de dominio personalizadas (`ApplicationException`) resuelven proactivamente a sus códigos HTTP subyacentes (`400`, `403`, `404`, `409`) serializando un payload JSON predecible: `{"detail": "<mensaje>"}`.
- **Manejo de Errores No Controlados (Fallo General):** Las excepciones críticas (ej., violaciones de base de datos o fallos nulos) son interceptadas por un manejador global de `Exception`.
  - **Estrategia Opaca:** Previene la filtración (leak) de detalles internos, como sentencias SQL fallidas o configuraciones de servidor al frontend.
  - **Trazabilidad mediante UUID:** Genera un identificador único opaco (`error_id`) devuelto al cliente y concurrentemente inyectado en la consola del servidor (`logger.exception`). Esto permite al equipo de ingeniería correlacionar un reporte de falla del usuario directamente con el *stack trace* en el entorno de despliegue, sin exponer datos sensibles.

**Frontend**
- `api.service.js` adjunta `status`/`detail` a los errores de red y codigos no-2xx.
- Las vistas muestran un toast (`components/alerts.js`, sobre SweetAlert2) o un estado de error; nunca dejan la pantalla en blanco.
- Validacion de formularios en cliente (`utils/validators.js`) antes de enviar.
- Estados de **carga** y **vacio** manejados por cada vista (ver `components/emptyState.js`).

## Justificacion tecnologica

La rubrica exige justificar las decisiones tecnicas. Todas las elecciones estan dentro de las tecnologias permitidas por el proyecto integrador.

| Capa | Eleccion | Alternativas permitidas | Por que esta |
|---|---|---|---|
| Frontend | **Vite + Vanilla JS + TailwindCSS** | Empaquetado rápido y estilos ágiles |
| Backend | **Python + FastAPI** | Flask, Express.js | Python alineado a la Ruta Basica; validacion y docs integradas |
| Base de datos | **MySQL** | PostgreSQL, MongoDB | Datos relacionales, integridad, consultas agregadas |
| Auth | **Login bcrypt** | Autenticación basica en servidor. |
| IA (resumenes) | **Google Gemini** (`google-generativeai`) | otros LLM, sin IA | Calidad de redaccion + privacidad por diseno (solo agregados anonimos) |

**FastAPI** trae validacion (Pydantic), tipado y documentacion automatica (Swagger/`/docs`) sin librerias extra, util para la sustentacion. **MySQL** encaja porque el dominio es naturalmente relacional (usuarios<->roles, evaluaciones<->respuestas) y el dashboard vive de consultas agregadas. **Google Gemini** resume el feedback en lenguaje natural para el Admin: complementa la logica de negocio propia (el ICP), que es lo que la rubrica evalua como "no-CRUD".

**Decisiones que evitan sobreingenieria:** sin frameworks de frontend ni estado externo; SQL plano (`text()`) sobre un esquema 3FN sin complejidad extra; `database/01_ddl.sql` + `database/02_dml.sql` + `database/03_mock_history.sql` + `database/04_views.sql` versionados en vez de migraciones (Alembic queda como mejora futura); tests enfocados en la logica de negocio, no en cobertura total.
