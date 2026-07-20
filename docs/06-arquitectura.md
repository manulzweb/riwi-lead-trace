# 06 — Arquitectura del Software

## Principios

- **Simplicidad y claridad:** lo necesario para un MVP full-stack mantenible por un equipo de 5.
- **Separacion de capas** en frontend y backend; responsabilidades unicas por modulo.
- **Logica de negocio explicita** (no solo CRUD): vive en la capa `services` del backend.
- **Contrato REST estable** entre SPA y API -> frontend y backend evolucionan en paralelo.

## Estilo arquitectonico: monolito modular por capas

Es **un monolito**: un solo backend desplegable y una sola SPA desplegable (no microservicios). Es
**modular**: dentro de cada uno, el codigo se separa en modulos con una responsabilidad clara, para
que no se vuelva espagueti.

La organizacion interna es **horizontal (por capa tecnica)**, no vertical (por feature): todo lo de
rutas vive junto (`routes/`), toda la logica de negocio (incluido el acceso a datos) vive junta
(`services/`). La alternativa (**vertical**: una carpeta por feature con su propio router+service
adentro, ej. `features/evaluations/`) se descarta a proposito: con ~7 entidades y ~8 endpoints,
separar por feature agrega carpetas y decisiones sin beneficio real para un equipo de 5 en un MVP
corto. Horizontal es mas facil de explicar y de encontrar codigo ("¿donde esta la logica? en
`services/`").

> **Nota:** una version anterior de esta arquitectura proponia una capa `repositories/` separada
> para el acceso a datos, y modelos SQLAlchemy Core (`Table`) en `models/`. El equipo elimino
> ambas cosas a proposito: las queries se escriben como SQL plano con `text()` (la misma sintaxis
> que ya usan en MySQL Workbench y que explica `docs/13-glosario.md`), directo en el archivo de
> `services/` de cada entidad — sin aprender el mini-lenguaje de `select()/insert()/join()` de
> SQLAlchemy, y sin una capa de `models/` que solo repetiria lo que ya dice `database/01_ddl.sql`.
> Menos "profesional" en el sentido de perder el constructor de queries tipado, pero mas facil de
> leer para alguien que recien esta aprendiendo SQL.

## Patrones de diseño

En **backend, la programacion orientada a objetos encaja natural** (Python + FastAPI ya trabajan asi).
En **frontend Vanilla JS, se usan clases solo donde de verdad ayudan** (cuando hay estado que
mantener) — forzar clases en todo (vistas, servicios) agrega ceremonia sin beneficio real cuando una
funcion pura hace lo mismo con menos codigo.

### Backend (POO explicita)

| Patron | Donde | Que resuelve |
|---|---|---|
| **Layered Architecture** | `routes/ -> services/ -> MySQL` | Cada capa tiene una responsabilidad; los cambios quedan localizados |
| **Service Layer** | `services/` (ej. `evaluation_service`, `metrics_service`, `ai_service`) | Concentra la logica de negocio (anonimato, no-duplicado, calculo de metricas) y las queries SQL, fuera de los routes |
| **Dependency Injection** | `Depends(...)` en `routes/` (ej. `Query(...)` para filtros como `role`, `viewer_role`) | FastAPI inyecta dependencias en vez de que cada endpoint las construya; facilita testear |
| **DTO (Data Transfer Object)** | `schemas/` (Pydantic) | Define exactamente que entra/sale de la API, distinto de las columnas de la BD |

### Frontend (funciones + un poco de OOP donde importa)

| Patron | Donde | Que resuelve |
|---|---|---|
| **Module Pattern** | Cada archivo `*.service.js`, `*.view.js` (ES Modules) | Encapsula detalles; solo se exporta lo necesario |
| **Front Controller** | `router.js` (`renderRoute`) | Un unico punto de entrada decide que vista renderizar segun la ruta y el rol |

**Vistas, componentes y `*.service.js` se quedan como funciones**, no clases: no guardan estado propio
entre llamadas (reciben datos, devuelven HTML o hacen un `fetch`), asi que una clase ahi solo anadiria
`this.` sin ganar nada. El unico candado a OOP real en frontend es el **store**, porque es el unico
sitio con estado que varias partes necesitan compartir y observar.

## Arquitectura general (full-stack)

```
┌───────────────────────── Navegador ─────────────────────────┐
│  SPA (frontend/)                                              │
│  Router ─> Vistas <─> Componentes                            │
│             │                                                 │
│             v                                                 │
│          Store (pub/sub: auth, ui)                           │
│             │                                                 │
│             v                                                 │
│          Services ─> http.js (fetch: baseURL, errores)       │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS · REST (JSON) · sin JWT (ver nota mas abajo)
                            v
┌──────────────────── Backend (backend/ · FastAPI) ───────────┐
│  Routes (endpoints, validacion I/O con Pydantic)             │
│     │                                                        │
│     v                                                        │
│  Services  <── LOGICA DE NEGOCIO + queries SQL (text())      │
│     │           (anonimato, no-duplicado, metricas, RBAC)   │
│     │           └─ ai_service ──HTTPS──> Gemini API         │
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
│       ├── config/env.js       # API_BASE_URL, constantes
│       ├── router/
│       │   ├── router.js       # motor de rutas (History API) + guards
│       │   └── routes.js       # rutas -> vistas + roles permitidos
│       ├── store/
│       │   ├── store.js        # store pub/sub generico
│       │   ├── auth.store.js
│       │   └── ui.store.js
│       ├── services/
│       │   ├── http.js         # wrapper fetch (baseURL, errores; sin JWT, ver nota)
│       │   ├── auth.service.js
│       │   ├── evaluation.service.js
│       │   ├── user.service.js
│       │   └── metrics.service.js       # ICP + resumen IA
│       ├── views/              # login, home, evaluables, evaluation-form,
│       │                       # history, dashboard, not-found (*.view.js)
│       ├── components/         # navbar, form-field, rating-input, card,
│       │                       # toast, loader
│       ├── utils/              # dom.js, validators.js, format.js
│       └── styles/             # variables, base, layout, components (.css)
│
├── backend/
│   ├── app/
│   │   ├── main.py             # crea FastAPI, CORS, incluye los routers de routes/
│   │   ├── config/
│   │   │   ├── config.py       # settings (DATABASE_URL, SECRET_KEY...) desde .env
│   │   │   ├── database.py     # engine + conexion SQLAlchemy
│   │   │   └── security.py     # hash de contrasenas (bcrypt); ya NO crea/verifica JWT
│   │   ├── schemas/            # Pydantic: request/response por dominio
│   │   ├── services/           # LOGICA DE NEGOCIO + acceso a datos por entidad:
│   │   │                       # auth, user, period, form, question, evaluation, metrics, ai
│   │   └── routes/              # auth, users, forms, evaluations, periods, questions, metrics
│   ├── requirements.txt
│   └── .env.example
│
├── database/
│   ├── 01_ddl.sql              # DDL (estructura, MySQL 3FN)
│   └── 02_dml.sql              # DML (seed de datos)
├── docs/                       # documentacion Scrum + tecnica (01..12)
└── mockups/                    # exports/enlaces Figma
```

## Sistema de rutas SPA (frontend)

- Router propio sobre **History API** (`pushState` + `popstate`).
- `routes.js` declara ruta -> vista -> roles autorizados:

```js
export const routes = [
  { path: '/login',        view: 'login',           public: true },
  { path: '/',             view: 'home',            roles: ['coder','team_leader','tutor','admin'] },
  { path: '/evaluables',   view: 'evaluables',      roles: ['coder'] },
  { path: '/evaluar/:id',  view: 'evaluation-form', roles: ['coder'] },
  { path: '/historial',    view: 'history',         roles: ['coder','admin'] },
  { path: '/dashboard',    view: 'dashboard',       roles: ['admin'] },
  { path: '*',             view: 'not-found',       public: true },
];
```

- **Guards:** antes de renderizar se valida sesion (`auth.store`) y rol. Sin sesion -> `/login`; rol no autorizado -> "no autorizado".

## Gestion de estado (frontend)

- Store **pub/sub** sin librerias: `getState()`, `setState(patch)`, `subscribe(fn)`.
- Slices por dominio: `auth.store` (usuario, rol — sin token, ver "Manejo de autenticacion"), `ui.store` (loading, toasts).
- La sesion se **hidrata** desde `localStorage` al arrancar (`main.js`).

## Backend — arquitectura por capas (FastAPI)

| Capa | Responsabilidad | Regla |
|------|-----------------|-------|
| `routes/` | Definir endpoints, validar I/O con Pydantic, codigos HTTP | No contiene logica de negocio |
| `services/` | **Logica de negocio** (reglas, calculos, orquestacion) y las queries SQL (`text()`) | No conoce detalles HTTP |
| `schemas/` | Contratos Pydantic (validacion/serializacion) | Frontera de datos; nunca exponen campos sensibles (ej. `password_hash`) |

> **No hay capa de autenticacion en el backend.** El proyecto no usa JWT ni ningun otro mecanismo
> de sesion verificable en servidor — no existe un `deps.py` con `get_current_user`/`require_role`,
> ni `Depends(...)` de auth en ningun archivo de `routes/` (podes verificarlo: `metrics_routes.py`,
> por ejemplo, no declara ninguna dependencia de este tipo). Detalle en "Manejo de autenticacion"
> y `CLAUDE.md`.

> **evaluator_id viene del body:** en `POST /evaluations`, `evaluator_id` es un campo mas del
> JSON que manda el cliente (`EvaluationCreate.evaluator_id`, leido en
> `evaluation_service.create_evaluation`) — no se deriva de ningun token ni sesion verificada,
> porque no hay JWT. Es un tradeoff de seguridad para mantener el MVP simple: cualquiera que llame
> la API directo (sin pasar por la SPA) podria, en teoria, mandar
> el `evaluator_id` de otro coder. El mismo tradeoff aplica a `viewer_role` en
> `GET /evaluations?evaluatee_id=`. Ver el detalle completo en `CLAUDE.md` ("Sin JWT").

## Logica de negocio destacada (ICP · IA)

Toda esta logica vive en `services/` (no en routers ni queries dispersas). Es la parte "no CRUD".

### Indice de Calidad Percibida (ICP) — `metrics_service`

**Que mide.** El ICP mide la **calidad percibida** del acompanamiento segun los Coders: un
puntaje de 0 a 100 por persona y periodo, calculado a partir de sus evaluaciones. Mide
percepcion, no aprendizaje real — por eso "percibida".

**Calculo.** Es un **promedio ponderado con un filtro de tamaño de muestra**. Por cada `(evaluatee_id, period_id)`, en `calculate_average_score`:

1. Cuenta cuantas evaluaciones `submitted` tiene esa persona en ese periodo (`n_evals`).
2. Si `n_evals < MIN_EVALUATIONS` (3), no calcula nada: devuelve "datos insuficientes". Evita
   mostrar un puntaje basado en muy pocas respuestas.
3. Si hay suficientes, calcula el promedio ponderado usando los puntajes (1-5) y el **peso (`weight_percent`)** de **todas** las preguntas tipo `scale`
   (las de tipo `text` no entran al calculo; alimentan el resumen de IA). Fórmula: `sum(score * weight) / sum(weight)`.
4. Normaliza ese promedio de la escala 1-5 a 0-100: `score = round((promedio_ponderado - 1) / 4 * 100)`.

`get_metrics_summary` repite esto para cada Team Leader/Tutor del periodo y agrega: promedio
global, total de evaluaciones enviadas, y tasa de participacion (evaluaciones enviadas ÷
evaluaciones posibles, asumiendo 2 evaluaciones por coder activo).

**Lo que el ICP no hace (a proposito, para no sobre-construir en el MVP):** no pondera por
categoría globalmente (usa los pesos individuales por pregunta, pero no agrupa matemáticamente por categoría), no calcula tendencia contra el periodo
anterior, no clasifica en estados tipo "Solido"/"En riesgo". Las preguntas sí tienen una
`category` en la BD (ver `07-base-de-datos.md`) para organizar el formulario, pero el calculo
del ICP no la usa matemáticamente (más allá del peso de cada pregunta). Si el equipo decide agregar alguna de estas senales mas adelante, son
extensiones puntuales sobre `calculate_average_score`, no un rediseno.

> El ICP **no se persiste**: se calcula on-read en `metrics_service`.

### Resumen por IA — `ai_service`
- Construye un prompt con **agregados anonimizados** (promedios por categoria, conteos, comentarios
  sin autor) y llama a **Gemini API** (SDK `google-generativeai`).
- Modelo en uso: `gemini-3.5-flash` (economico) — constante `AI_MODEL` en `ai_service.py`.
  Clave en `config/config.py` (`GEMINI_API_KEY`).
- **Destinatario: solo el Admin** (Jefe de TL/tutores). Resumen ejecutivo del feedback por
  persona/periodo.
- **Privacidad:** nunca se envian identidades ni `evaluator_id`. El texto resultante se guarda en
  `ai_feedback_cache` (`UNIQUE(evaluatee_id, period_id)`) para no re-llamar al modelo.
- **Segundo uso (ADMIN-02) — chequeo de coherencia de preguntas:** al editar una pregunta,
  `ai_service` pide al modelo validar si el texto nuevo sigue midiendo la **definicion de su
  categoria** (tabla anterior). Solo se envian el texto de la pregunta y esa definicion — cero
  datos personales. Si no coincide, el editor **advierte** y exige confirmacion explicita del
  admin para guardar (la IA no bloquea; la decision es humana). Sin API key o ante error, la
  edicion funciona sin chequeo (degradacion elegante).

## Comunicacion con la API

- En frontend, **toda** llamada pasa por `services/http.js`: prefija `API_BASE_URL`, serializa/parsea JSON y **normaliza errores** a `{ status, message }`. No inyecta ningun header `Authorization` — no hay token que mandar (ver "Manejo de autenticacion").
- Cada `*.service.js` expone funciones de dominio; nunca `fetch` directo en vistas.
- **Contrato REST del MVP:**

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| POST | `/auth/login` | Autenticacion -> `{ user }` (**sin token** — ver "Manejo de autenticacion") |
| GET | `/users?role=team_leader` | Evaluables por rol |
| GET | `/forms?target_role=team_leader` | Plantilla de formulario por rol |
| POST | `/evaluations` | Registrar evaluacion (anonimato + no-duplicado por periodo + **requiere periodo activo**, si no `409`) |
| GET | `/evaluations?evaluator_id=:id` | Historial del Coder |
| GET | `/evaluations?evaluatee_id=:id&viewer_role=` | Historico por evaluado (respeta anonimato; `viewer_role` lo manda el cliente, sin verificar) |
| GET | `/periods` | Listar periodos (el activo define si hay formularios disponibles) |
| PUT | `/periods/:id` | **Admin:** activar/cerrar el periodo de evaluacion (solo uno activo a la vez) |
| PATCH | `/questions/:id` | **Admin:** editar (versionar) el texto de una pregunta (solo con periodo cerrado, si no `409`) |
| PUT | `/questions/weights` | **Admin:** actualizar los pesos (`weight_percent`) de las preguntas de escala de un template (deben sumar 100, solo con periodo cerrado) |
| GET | `/metrics/summary?period_id=:p` | KPIs + **ICP** |
| GET | `/metrics/ai-summary?evaluatee_id=:e&period_id=:p` | Resumen IA (Gemini, anonimizado) — admin |

> FastAPI expone documentacion interactiva automatica en `/docs` (Swagger) y `/redoc`, util para pruebas y sustentacion.

## Manejo de autenticacion

> **Sin JWT.** El backend no emite ni verifica ningun token de sesion. Para el detalle y el porque,
> ver `CLAUDE.md` ("Sin JWT").

- Login -> `POST /auth/login`: el backend solo verifica el hash bcrypt (`auth_service.login`) y
  devuelve `{ user }`. **No emite token.** Frontend guarda `user` en `localStorage` + `auth.store`
  (no hay `token` que guardar).
- Cada peticion que necesita saber "quien soy" o "que rol tengo" manda ese dato **en el propio
  request** — como parametro de query (`viewer_role`) o campo del body (`evaluator_id`) — y el
  backend lo usa **tal cual, sin verificarlo criptograficamente**.
- No hay `401` por sesion expirada (no hay sesion que expire en el backend); el frontend solo
  redirige a `/login` si no hay `user` hidratado en el store.
- **Autorizacion por rol:** en **frontend** (guards de `router.js`) es la unica capa que oculta
  rutas/opciones por rol — es **solo UX**. En **backend** no hay verificacion de rol real: los
  filtros por rol (`?role=`, `viewer_role`) son conveniencia sobre el dato que manda el cliente,
  **no una barrera de seguridad**.
- **Visibilidad de evaluadores (regla de negocio):** una persona evaluada (**TL/Tutor**) **nunca ve
  quien la evaluo**. Solo el **Admin** ve la identidad del evaluador en evaluaciones **no anonimas**;
  las **anonimas permanecen anonimas para todos** (incluido el Admin).

## Manejo de errores

**Backend**
- Validacion de entrada con Pydantic -> `422` automatico con detalle por campo.
- Errores de negocio -> `HTTPException` con codigo correcto (`400/403/404/409`).
- Manejadores globales para excepciones no controladas -> `500` con cuerpo JSON consistente; logging.

**Frontend**
- `http.js` normaliza errores de red y codigos no-2xx.
- Las vistas muestran `toast` (`ui.store`) o estado de error; nunca dejan la pantalla en blanco.
- Validacion de formularios en cliente (`utils/validators.js`) antes de enviar.
- Estados de **carga** y **vacio** estandarizados (`loader`, estado vacio).
- `window.onerror` / `unhandledrejection` -> toast generico + log.

## Justificacion tecnologica

La rubrica exige justificar las decisiones tecnicas. Todas las elecciones estan dentro de las tecnologias permitidas por el proyecto integrador.

| Capa | Eleccion | Alternativas permitidas | Por que esta |
|---|---|---|---|
| Frontend | HTML5 + CSS3 + **JS Vanilla (SPA)** | (obligatorio; sin frameworks) | Requisito del proyecto |
| Backend | **Python + FastAPI** | Flask, Express.js | Python alineado a la Ruta Basica; validacion y docs integradas |
| Base de datos | **MySQL** | PostgreSQL, MongoDB | Datos relacionales, integridad, consultas agregadas |
| Auth | **Sin JWT** | JWT, sesiones server-side | El login valida hash bcrypt pero no emite token; el rol/ID lo manda el propio front y el backend lo confia. Reduce el alcance del MVP a costa de no tener verificacion criptografica real (ver "Manejo de autenticacion") |
| IA (resumenes) | **Gemini API** (`google-generativeai`) | otros LLM, sin IA | Calidad de redaccion + privacidad por diseno (solo agregados anonimos) |

**FastAPI** trae validacion (Pydantic), tipado y documentacion automatica (Swagger/`/docs`) sin librerias extra, util para la sustentacion. **MySQL** encaja porque el dominio es naturalmente relacional (usuarios<->roles, evaluaciones<->respuestas) y el dashboard vive de consultas agregadas. No usar **JWT** es un tradeoff de seguridad consciente para reducir el alcance del MVP en el tiempo disponible; para una SPA sin estado, JWT seria la opcion mas robusta, pero no era necesaria para demostrar la logica de negocio del proyecto. **Gemini API** resume el feedback en lenguaje natural para el Admin: complementa la logica de negocio propia (el ICP), que es lo que la rubrica evalua como "no-CRUD".

**Decisiones que evitan sobreingenieria:** sin frameworks de frontend ni estado externo; SQL plano (`text()`) sobre un esquema 3FN sin complejidad extra; `database/01_ddl.sql` + `database/02_dml.sql` versionados en vez de migraciones (Alembic queda como mejora futura); tests enfocados en la logica de negocio, no en cobertura total.