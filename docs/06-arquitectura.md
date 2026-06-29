# 06 — Arquitectura del Software

## Principios

- **Simplicidad y claridad:** lo necesario para un MVP full-stack mantenible por un equipo de 5.
- **Separación de capas** en frontend y backend; responsabilidades únicas por módulo.
- **Lógica de negocio explícita** (no solo CRUD): vive en la capa `services` del backend.
- **Contrato REST estable** entre SPA y API → frontend y backend evolucionan en paralelo.

## Arquitectura general (full-stack)

```
┌───────────────────────── Navegador ─────────────────────────┐
│  SPA (frontend/)                                              │
│  Router ─▶ Vistas ◀─▶ Componentes                            │
│             │                                                 │
│             ▼                                                 │
│          Store (pub/sub: auth, ui)                           │
│             │                                                 │
│             ▼                                                 │
│          Services ─▶ http.js (fetch: baseURL, JWT, errores) │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS · REST (JSON) · JWT
                            ▼
┌──────────────────── Backend (backend/ · FastAPI) ───────────┐
│  Routers (endpoints, validación I/O con Pydantic)            │
│     │                                                        │
│     ▼                                                        │
│  Services  ◀── LÓGICA DE NEGOCIO (anonimato, no-duplicado,  │
│     │           ICA por área, talento, resumen IA, RBAC)    │
│     │           └─ ai_service ──HTTPS──▶ Claude API         │
│     ▼                                                        │
│  Repositories (consultas / acceso a datos)                  │
│     │                                                        │
│     ▼                                                        │
│  Models (SQLAlchemy ORM)                                     │
└───────────────────────────┬─────────────────────────────────┘
                            │ SQLAlchemy + PyMySQL
                            ▼
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
│       ├── main.js             # bootstrap: router + hidratar sesión
│       ├── config/env.js       # API_BASE_URL, constantes
│       ├── router/
│       │   ├── router.js       # motor de rutas (History API) + guards
│       │   └── routes.js       # rutas → vistas + roles permitidos
│       ├── store/
│       │   ├── store.js        # store pub/sub genérico
│       │   ├── auth.store.js
│       │   └── ui.store.js
│       ├── services/
│       │   ├── http.js         # wrapper fetch (baseURL, JWT, errores)
│       │   ├── auth.service.js
│       │   ├── evaluation.service.js
│       │   ├── user.service.js
│       │   ├── area.service.js          # catálogo de áreas
│       │   ├── tutor-log.service.js     # bitácora TL→Tutor
│       │   ├── talent.service.js        # ranking de talento (admin)
│       │   └── metrics.service.js       # ICA + resumen IA
│       ├── views/              # login, home, evaluables, evaluation-form,
│       │                       # history, dashboard, not-found (*.view.js)
│       ├── components/         # navbar, form-field, rating-input, card,
│       │                       # toast, loader
│       ├── utils/              # dom.js, validators.js, format.js
│       └── styles/             # variables, base, layout, components (.css)
│
├── backend/
│   ├── app/
│   │   ├── main.py             # crea FastAPI, CORS, incluye routers
│   │   ├── core/
│   │   │   ├── config.py       # settings (DB_URL, JWT_SECRET) desde .env
│   │   │   ├── database.py     # engine + SessionLocal + Base
│   │   │   └── security.py     # hash de contraseñas + crear/verificar JWT
│   │   ├── models/             # SQLAlchemy: user, role, area, period, form_template,
│   │   │                       # question, evaluation, answer, tutor_feedback_log, ai_feedback_cache
│   │   ├── schemas/            # Pydantic: request/response por dominio
│   │   ├── repositories/       # acceso a datos (queries reutilizables)
│   │   ├── services/           # LÓGICA DE NEGOCIO: metrics_service (ICA),
│   │   │                       # talent_service, ai_service, evaluation_service
│   │   ├── routers/            # auth, users, areas, forms, evaluations,
│   │   │                       # tutor_logs, metrics, talent
│   │   └── deps.py             # get_db, get_current_user, require_role
│   ├── tests/                  # pytest
│   ├── requirements.txt
│   └── .env.example
│
├── database/
│   └── schema.sql              # DDL + seed (MySQL, 3FN)
├── docs/                       # documentación Scrum + técnica (01..12)
└── mockups/                    # exports/enlaces Figma
```

## Sistema de rutas SPA (frontend)

- Router propio sobre **History API** (`pushState` + `popstate`).
- `routes.js` declara ruta → vista → roles autorizados:

```js
export const routes = [
  { path: '/login',        view: 'login',           public: true },
  { path: '/',             view: 'home',            roles: ['coder','team_leader','tutor','admin'] },
  { path: '/evaluables',   view: 'evaluables',      roles: ['coder'] },
  { path: '/evaluar/:id',  view: 'evaluation-form', roles: ['coder'] },
  { path: '/historial',    view: 'history',         roles: ['coder','admin'] },
  { path: '/bitacora',     view: 'tutor-log',       roles: ['team_leader'] },   // TL→Tutor
  { path: '/dashboard',    view: 'dashboard',       roles: ['admin'] },         // ICA + IA por área
  { path: '/talento',      view: 'talent',          roles: ['admin'] },
  { path: '*',             view: 'not-found',       public: true },
];
```

- **Guards:** antes de renderizar se valida sesión (`auth.store`) y rol. Sin sesión → `/login`; rol no autorizado → "no autorizado".

## Gestión de estado (frontend)

- Store **pub/sub** sin librerías: `getState()`, `setState(patch)`, `subscribe(fn)`.
- Slices por dominio: `auth.store` (usuario, token, rol), `ui.store` (loading, toasts).
- La sesión se **hidrata** desde `localStorage` al arrancar (`main.js`).

## Backend — arquitectura por capas (FastAPI)

| Capa | Responsabilidad | Regla |
|------|-----------------|-------|
| `routers/` | Definir endpoints, validar I/O con Pydantic, códigos HTTP | No contiene lógica de negocio |
| `services/` | **Lógica de negocio** (reglas, cálculos, orquestación) | No conoce detalles HTTP |
| `repositories/` | Consultas y acceso a datos vía ORM | Único lugar con queries |
| `models/` | Entidades SQLAlchemy mapeadas a MySQL | Definen el esquema |
| `schemas/` | Contratos Pydantic (validación/serialización) | Frontera de datos |
| `deps.py` | Dependencias: `get_db`, `get_current_user`, `require_role` | Inyección/seguridad |

Ejemplo de RBAC con dependencias (ilustrativo):

```python
# app/deps.py
def require_role(*roles):
    def checker(user = Depends(get_current_user)):
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="No autorizado")
        return user
    return checker

# app/routers/metrics.py
@router.get("/metrics/summary")
def summary(period_id: int, area_id: int | None = None,
            user = Depends(require_role("admin")), db = Depends(get_db)):
    return metrics_service.build_summary(db, period_id, area_id)
```

## Lógica de negocio destacada (ICA · IA · talento)

Toda esta lógica vive en `services/` (no en routers ni queries dispersas). Es la parte "no CRUD".

### Índice de Calidad de Acompañamiento (ICA) — `metrics_service`
Por cada `(evaluatee_id, area_id, period_id)`, solo con evaluaciones `submitted`:
1. `A_c` = promedio por categoría (`AVG(score)` de preguntas `scale`, escala 1–5).
2. Base ponderada `B = Σ(w_c · A_c) / Σ(w_c)` con pesos `w_c` por categoría. Los pesos los
   **edita el Admin** (tabla `ica_weights`); los **defaults** viven en código
   (`DEFAULT_ICA_WEIGHTS`) y un **reset** los restaura. No requieren sumar 1 (la fórmula normaliza).
3. Normaliza `score = round((B − 1) / 4 × 100)` → 0–100.
4. **Confianza** según `n` (respuestas) y participación: `Datos insuficientes` si `n < N_MIN`.
5. **Tendencia** `Δ = score_actual − score_periodo_anterior`.
6. **Estado:** `En riesgo` (`score < 60` o `Δ ≤ −10`), `Sólido` (`≥80` y `Δ≥0`), `Estable` o
   `Datos insuficientes`. Umbrales y pesos son constantes documentadas (sustentables).

> El ICA **no se persiste**: se calcula on-read. `repositories/` solo provee los agregados.

### Resumen y mejoras por IA — `ai_service`
- Construye un prompt con **agregados anonimizados** (promedios por categoría, conteos, comentarios
  sin autor, notas de la bitácora) y llama a **Claude API** (SDK `anthropic`).
- Modelo: `claude-sonnet-4-6` (calidad) o `claude-haiku-4-5-20251001` (económico). Clave en
  `core/config.py` (`ANTHROPIC_API_KEY`).
- **Destinatarios (no solo el Admin):**
  - **Admin (Jefe de TL/tutores):** resumen ejecutivo del feedback por persona/área/periodo.
  - **Team Leader:** sus propios resultados + **sugerencias de mejora** sobre su feedback.
  - **Tutor:** **sugerencias de mejora** combinando el feedback de su **TL (bitácora)** y de los **Coders**.
- **Privacidad:** nunca se envían identidades ni `evaluator_id`; el evaluado ve mejoras, **no** quién
  lo evaluó. El texto resultante se guarda en `ai_feedback_cache`
  (`UNIQUE(evaluatee_id, area_id, period_id)`) para no re-llamar al modelo.

### Analítica de talento — `talent_service`
- **Talent Score** (0–100) por **tutor**: combina su ICA como tutor + consistencia entre periodos
  + volumen/cobertura de tutorías (bitácora) + tendencia. Ranking de "preparación para TL" por área.
- Fórmula transparente (constantes documentadas), derivada y no persistida.

## Comunicación con la API

- En frontend, **toda** llamada pasa por `services/http.js`: prefija `API_BASE_URL`, inyecta `Authorization: Bearer <token>`, serializa/parsea JSON y **normaliza errores** a `{ status, message }`.
- Cada `*.service.js` expone funciones de dominio; nunca `fetch` directo en vistas.
- **Contrato REST del MVP:**

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/auth/login` | Autenticación → `{ token, user }` |
| GET | `/areas` | Catálogo de áreas (Desarrollo/Inglés/HSE/BLS) |
| GET | `/users?role=team_leader&area_id=:a` | Evaluables por rol y área |
| GET | `/forms?target_role=team_leader&area_id=:a` | Plantilla de formulario por rol y área |
| POST | `/evaluations` | Registrar evaluación (anonimato + no-duplicado por periodo/área) |
| GET | `/evaluations?evaluator_id=:id` | Historial del Coder |
| GET | `/evaluations?evaluatee_id=:id` | Histórico por evaluado (respeta anonimato) |
| POST/GET | `/tutor-logs` | Bitácora TL→Tutor (solo el TL autor) |
| GET | `/metrics/summary?period_id=:p&area_id=:a` | KPIs + **ICA** por área |
| GET | `/metrics/ai-summary?evaluatee_id=:e&period_id=:p` | Resumen IA (Claude, anonimizado) — admin |
| GET | `/me/ai-feedback?period_id=:p` | Mis resultados + mejoras IA — TL / Tutor (sin ver evaluadores) |
| GET | `/metrics/ica-weights` | Pesos actuales del ICA — admin |
| PUT | `/metrics/ica-weights` | Editar pesos del ICA — admin |
| POST | `/metrics/ica-weights/reset` | Restaurar pesos por defecto — admin |
| GET | `/talent/candidates?area_id=:a&period_id=:p` | Ranking de futuros TL — admin |

> FastAPI expone documentación interactiva automática en `/docs` (Swagger) y `/redoc`, útil para pruebas y sustentación.

## Manejo de autenticación

- Login → `POST /auth/login`: backend verifica hash, emite **JWT** firmado. Frontend guarda `token` y `user` en `localStorage` + `auth.store`.
- El token viaja en cada petición (`http.js`); el backend lo valida en `get_current_user`.
- `401` global en frontend → limpiar sesión + redirigir a `/login`. Logout → limpiar storage + store.
- **Autorización por rol** en backend (`require_role`) — autoridad real — y en frontend (guards) — solo UX.
- **Visibilidad de evaluadores (regla de negocio):** una persona evaluada (**TL/Tutor**) ve sus
  resultados agregados y sus mejoras por IA, pero **nunca quién la evaluó**. Solo el **Admin** ve la
  identidad del evaluador en evaluaciones **no anónimas**; las **anónimas permanecen anónimas para
  todos** (incluido el Admin). Los pesos del ICA y su reset son **solo admin**.

## Manejo de errores

**Backend**
- Validación de entrada con Pydantic → `422` automático con detalle por campo.
- Errores de negocio → `HTTPException` con código correcto (`400/403/404/409`).
- Manejadores globales para excepciones no controladas → `500` con cuerpo JSON consistente; logging.

**Frontend**
- `http.js` normaliza errores de red y códigos no-2xx.
- Las vistas muestran `toast` (`ui.store`) o estado de error; nunca dejan la pantalla en blanco.
- Validación de formularios en cliente (`utils/validators.js`) antes de enviar.
- Estados de **carga** y **vacío** estandarizados (`loader`, estado vacío).
- `window.onerror` / `unhandledrejection` → toast genérico + log.
