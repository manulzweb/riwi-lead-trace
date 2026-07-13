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
rutas vive junto (`routers/`), toda la logica de negocio vive junta (`services/`), todo el acceso a
datos vive junto (`repositories/`). La alternativa (**vertical**: una carpeta por feature con su
propio router+service+repo adentro, ej. `features/evaluations/`) se descarta a proposito: con ~7
entidades y ~8 endpoints, separar por feature agrega carpetas y decisiones sin beneficio real para
un equipo de 5 en un MVP corto. Horizontal es mas facil de explicar y de encontrar codigo ("¿donde
esta la logica? en `services/`").

## Patrones de diseño

En **backend, la programacion orientada a objetos encaja natural** (Python + FastAPI ya trabajan asi).
En **frontend Vanilla JS, se usan clases solo donde de verdad ayudan** (cuando hay estado que
mantener) — forzar clases en todo (vistas, servicios) agrega ceremonia sin beneficio real cuando una
funcion pura hace lo mismo con menos codigo.

### Backend (POO explicita)

| Patron | Donde | Que resuelve |
|---|---|---|
| **Layered Architecture** | `routers/ -> services/ -> repositories/ -> models/` | Cada capa tiene una responsabilidad; los cambios quedan localizados |
| **Repository** | `repositories/` (ej. `EvaluationRepository`) | Encapsula el acceso a datos; los `services` no escriben SQL/queries directamente |
| **Service Layer** | `services/` (ej. `EvaluationService`, `MetricsService`) | Concentra la logica de negocio (anonimato, no-duplicado, calculo del ICP) fuera de los routers |
| **Dependency Injection** | `Depends(get_db)`, `Depends(get_current_user)`, `Depends(require_role(...))` | FastAPI inyecta dependencias en vez de que cada endpoint las construya; facilita testear |
| **DTO (Data Transfer Object)** | `schemas/` (Pydantic) | Define exactamente que entra/sale de la API, distinto del modelo de BD |
| **Data Mapper** | `models/` (SQLAlchemy ORM) | Mapea objetos Python a filas de MySQL sin que el resto del codigo escriba SQL |

### Frontend (funciones + un poco de OOP donde importa)

| Patron | Donde | Que resuelve |
|---|---|---|
| **Module Pattern** | Cada archivo `*.service.js`, `*.view.js` (ES Modules) | Encapsula detalles; solo se exporta lo necesario |
| **Observer** | `store.js` (`subscribe`/`setState` notifica a quien escucha) | El estado compartido (sesion, tema) cambia en un lugar y todos los suscriptores se enteran — es el unico lugar del frontend con estado real, por eso aqui si vale una clase |
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
│          Services ─> http.js (fetch: baseURL, JWT, errores) │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS · REST (JSON) · JWT
                            v
┌──────────────────── Backend (backend/ · FastAPI) ───────────┐
│  Routers (endpoints, validacion I/O con Pydantic)            │
│     │                                                        │
│     v                                                        │
│  Services  <── LOGICA DE NEGOCIO (anonimato, no-duplicado,  │
│     │           ICP, resumen IA, RBAC)                      │
│     │           └─ ai_service ──HTTPS──> Claude API         │
│     v                                                        │
│  Repositories (consultas / acceso a datos)                  │
│     │                                                        │
│     v                                                        │
│  Models (SQLAlchemy ORM)                                     │
└───────────────────────────┬─────────────────────────────────┘
                            │ SQLAlchemy + PyMySQL
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
│       │   ├── http.js         # wrapper fetch (baseURL, JWT, errores)
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
│   │   ├── main.py             # crea FastAPI, CORS, incluye routers
│   │   ├── core/
│   │   │   ├── config.py       # settings (DB_URL, JWT_SECRET) desde .env
│   │   │   ├── database.py     # engine + SessionLocal + Base
│   │   │   └── security.py     # hash de contrasenas + crear/verificar JWT
│   │   ├── models/             # SQLAlchemy: user, role, period, form_template,
│   │   │                       # question, evaluation, answer, ai_feedback_cache
│   │   ├── schemas/            # Pydantic: request/response por dominio
│   │   ├── repositories/       # acceso a datos (queries reutilizables)
│   │   ├── services/           # LOGICA DE NEGOCIO: metrics_service (ICP),
│   │   │                       # ai_service, evaluation_service
│   │   ├── routers/            # auth, users, forms, evaluations, metrics
│   │   └── deps.py             # get_db, get_current_user, require_role
│   ├── tests/                  # pytest
│   ├── requirements.txt
│   └── .env.example
│
├── database/
│   └── schema.sql              # DDL + seed (MySQL, 3FN)
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
- Slices por dominio: `auth.store` (usuario, token, rol), `ui.store` (loading, toasts).
- La sesion se **hidrata** desde `localStorage` al arrancar (`main.js`).

## Backend — arquitectura por capas (FastAPI)

| Capa | Responsabilidad | Regla |
|------|-----------------|-------|
| `routers/` | Definir endpoints, validar I/O con Pydantic, codigos HTTP | No contiene logica de negocio |
| `services/` | **Logica de negocio** (reglas, calculos, orquestacion) | No conoce detalles HTTP |
| `repositories/` | Consultas y acceso a datos via ORM | Unico lugar con queries |
| `models/` | Entidades SQLAlchemy mapeadas a MySQL | Definen el esquema |
| `schemas/` | Contratos Pydantic (validacion/serializacion) | Frontera de datos |
| `deps.py` | Dependencias: `get_db`, `get_current_user`, `require_role` | Inyeccion/seguridad |

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
def summary(period_id: int,
            user = Depends(require_role("admin")), db = Depends(get_db)):
    return metrics_service.build_summary(db, period_id)
```

## Logica de negocio destacada (ICP · IA)

Toda esta logica vive en `services/` (no en routers ni queries dispersas). Es la parte "no CRUD".

### Indice de Calidad Percibida (ICP) — `metrics_service`

**Que mide (y que no).** El ICP mide la **calidad percibida** del acompanamiento segun los
Coders — es una *Student Evaluation of Teaching* (SET), el tipo de instrumento mas usado en
educacion superior para evaluar docentes desde la percepcion del estudiante. La literatura
muestra que estas encuestas correlacionan de forma **moderada** con el rendimiento academico
(r ≈ 0.43) pero **no miden aprendizaje real**; por eso el indice se llama "percibida" y sus
resultados se leen como senal de percepcion, no como veredicto de efectividad. Esta limitacion
se declara explicitamente en el dashboard y en el pitch tecnico.

**En que se fundamentan las categorias.** No son inventadas: cada rol evaluado usa las
dimensiones de un instrumento validado, adaptadas al contexto Riwi.

| Rol evaluado | Instrumento base | Categorias del ICP (con peso `w_c`) |
|---|---|---|
| **Team Leader** (es un *mentor*) | **MCA-21** — Mentoring Competency Assessment (Fleming et al.; revalidado 2022, J Clin Transl Sci) | Comunicación efectiva (0.25) · Alineación de expectativas (0.20) · Verificación de comprensión (0.20) · Fomento de la independencia (0.20) · Desarrollo profesional (0.15) |
| **Tutor** (rol *docente/tecnico*) | **SEEQ** — Students' Evaluations of Educational Quality (Marsh, 1982) | Valor del aprendizaje (0.30) · Claridad y organización (0.30) · Cercanía individual (0.20) · Disponibilidad e interacción (0.20) |

> Los nombres de categoria de esta tabla son **exactamente** los valores de `questions.category`
> sembrados en `database/schema.sql` (con tildes): los pesos `DEFAULT_ICP_WEIGHTS` mapean por ese
> string. La categoria `General` (comentario libre) no pondera en el ICP; alimenta el resumen IA.

**Definicion de cada categoria (que mide).** Estas definiciones de una linea son la referencia
para juzgar si una pregunta "pertenece" a su categoria: el editor de ADMIN-02 las muestra al
editar, y el **chequeo de coherencia con IA** (parte de ADMIN-02) las usa como criterio.

| Categoria | Que mide |
|---|---|
| Comunicación efectiva | Si el TL se comunica claro, a tiempo y es facil hablarle cuando algo va mal |
| Alineación de expectativas | Si el TL deja claro que se espera del coder y acuerda objetivos alcanzables |
| Verificación de comprensión | Si el TL confirma que el coder entendio antes de avanzar y adapta su explicacion |
| Fomento de la independencia | Si el TL impulsa al coder a resolver por su cuenta y reduce su dependencia |
| Desarrollo profesional | Si el TL da retroalimentacion y orientacion que hacen crecer el perfil del coder |
| Valor del aprendizaje | Si lo aprendido con el Tutor sirve para los retos y aporta mas que estudiar solo |
| Claridad y organización | Si el Tutor explica claro/ordenado y prepara ejemplos al nivel del coder |
| Cercanía individual | Si el coder se siente tratado con respeto y en confianza para preguntar |
| Disponibilidad e interacción | Si el Tutor esta disponible en los espacios acordados y responde a tiempo |

> **Riesgo documentado (deriva semantica):** el peso pondera la **categoria**, no el texto. Una
> pregunta "re-temada" (ej. una de *Cercania individual* reescrita como desempeno general)
> contaminaria su categoria hacia adelante. Por eso la regla de ADMIN-02 es **reformular, no
> re-temar**: para preguntar otro tema se desactiva la pregunta y se crea una nueva en la
> categoria correcta. El historico nunca se afecta (edicion solo con periodo cerrado + versionado).

**Calculo.** Por cada `(evaluatee_id, period_id)`, solo con evaluaciones `submitted`:
1. `A_c` = promedio por categoria (`AVG(score)` de preguntas `scale`, escala 1-5).
2. Base ponderada `B = Sum(w_c · A_c) / Sum(w_c)` con pesos `w_c` por categoria (tabla
   anterior). Los pesos son **constantes en codigo** (`DEFAULT_ICP_WEIGHTS`), no editables
   desde la UI.
3. Normaliza `score = round((B - 1) / 4 * 100)` -> 0-100.
4. **Confianza** segun `n` (respuestas) y participacion: `Datos insuficientes` si `n < N_MIN`.
5. **Tendencia** `D = score_actual - score_periodo_anterior`, comparada **por categoria** (no
   por pregunta), de modo que editar la redaccion de una pregunta no rompe la comparabilidad.
6. **Estado:** `En riesgo` (`score < 60` o `D <= -10`), `Solido` (`>=80` y `D>=0`), `Estable` o
   `Datos insuficientes`. Umbrales y pesos son constantes documentadas (sustentables).

**Renormalizacion defensiva:** si una categoria queda sin preguntas activas o sin respuestas,
se excluye y los pesos se renormalizan sobre las categorias presentes (el denominador
`Sum(w_c)` ya lo hace naturalmente).

> El ICP **no se persiste**: se calcula on-read. `repositories/` solo provee los agregados.

**Referencias del instrumento (para el documento tecnico y la sustentacion):**
- Marsh, H. W. (1982). *SEEQ: A reliable, valid, and useful instrument for collecting
  students' evaluations of university teaching.* British Journal of Educational Psychology.
- *Revalidation of the Mentoring Competency Assessment (MCA-21).* Journal of Clinical and
  Translational Science (2022).
- *Students' Evaluation of Teaching and Their Academic Achievement* (Frontiers in
  Psychology, 2020) — correlacion r ≈ 0.43 entre SET y rendimiento.
- La evaluacion 360° enmarca este MVP: la vista ascendente (Coder -> TL/Tutor) es **una** de
  las fuentes posibles; autoevaluacion y evaluacion de pares quedan como version futura.

### Resumen por IA — `ai_service`
- Construye un prompt con **agregados anonimizados** (promedios por categoria, conteos, comentarios
  sin autor) y llama a **Claude API** (SDK `anthropic`).
- Modelo: `claude-sonnet-4-6` (calidad) o `claude-haiku-4-5-20251001` (economico). Clave en
  `core/config.py` (`ANTHROPIC_API_KEY`).
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

- En frontend, **toda** llamada pasa por `services/http.js`: prefija `API_BASE_URL`, inyecta `Authorization: Bearer <token>`, serializa/parsea JSON y **normaliza errores** a `{ status, message }`.
- Cada `*.service.js` expone funciones de dominio; nunca `fetch` directo en vistas.
- **Contrato REST del MVP:**

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| POST | `/auth/login` | Autenticacion -> `{ token, user }` |
| GET | `/users?role=team_leader` | Evaluables por rol |
| GET | `/forms?target_role=team_leader` | Plantilla de formulario por rol |
| POST | `/evaluations` | Registrar evaluacion (anonimato + no-duplicado por periodo + **requiere periodo activo**, si no `409`) |
| GET | `/evaluations?evaluator_id=:id` | Historial del Coder |
| GET | `/evaluations?evaluatee_id=:id` | Historico por evaluado (respeta anonimato) |
| GET | `/periods` | Listar periodos (el activo define si hay formularios disponibles) |
| PATCH | `/periods/:id` | **Admin:** activar/cerrar el periodo de evaluacion (solo uno activo a la vez) |
| PATCH | `/questions/:id` | **Admin:** editar texto o activar/desactivar una pregunta (solo con periodo cerrado, si no `409`) |
| GET | `/metrics/summary?period_id=:p` | KPIs + **ICP** |
| GET | `/metrics/ai-summary?evaluatee_id=:e&period_id=:p` | Resumen IA (Claude, anonimizado) — admin |

> FastAPI expone documentacion interactiva automatica en `/docs` (Swagger) y `/redoc`, util para pruebas y sustentacion.

## Manejo de autenticacion

- Login -> `POST /auth/login`: backend verifica hash, emite **JWT** firmado. Frontend guarda `token` y `user` en `localStorage` + `auth.store`.
- El token viaja en cada peticion (`http.js`); el backend lo valida en `get_current_user`.
- `401` global en frontend -> limpiar sesion + redirigir a `/login`. Logout -> limpiar storage + store.
- **Autorizacion por rol** en backend (`require_role`) — autoridad real — y en frontend (guards) — solo UX.
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
| Auth | **JWT** | sesiones server-side | Sin estado, encaja con SPA + API REST |
| IA (resumenes) | **Claude API** (`anthropic`) | otros LLM, sin IA | Calidad de redaccion + privacidad por diseno (solo agregados anonimos) |

**FastAPI** trae validacion (Pydantic), tipado y documentacion automatica (Swagger/`/docs`) sin librerias extra — util para la sustentacion. **MySQL** encaja porque el dominio es naturalmente relacional (usuarios<->roles, evaluaciones<->respuestas) y el dashboard vive de consultas agregadas. **JWT** es la opcion natural para una SPA sin estado. **Claude API** resume el feedback en lenguaje natural para el Admin — es el diferenciador, pero la IA complementa la logica de negocio propia (el ICP), que es lo que evalua la rubrica como "no-CRUD".

**Decisiones que evitan sobreingenieria:** sin frameworks de frontend ni estado externo; ORM simple (SQLAlchemy) sobre un esquema 3FN sin complejidad extra; `database/schema.sql` versionado en vez de migraciones (Alembic queda como mejora futura); tests enfocados en la logica de negocio, no en cobertura total.
