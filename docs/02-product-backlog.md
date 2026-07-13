# 02 — Product Backlog

Backlog **full-stack** del MVP (frontend SPA + backend FastAPI + MySQL). Estimacion en **Story Points (SP)**, escala Fibonacci (1, 2, 3, 5, 8). Prioridad **MoSCoW** (Must / Should / Could). Cada SP refleja el esfuerzo completo (UI + endpoint + datos), salvo las historias de estructura base (CORE-01, CORE-02).

| ID | Nombre | Descripcion | Epica | Prioridad | SP | Dependencias |
|----|--------|-------------|-------|-----------|:--:|--------------|
| CORE-01 | Preparar repo + estructura base de la SPA | Monorepo, estructura `frontend/`, router, store y `http.js` | CORE | Must | 5 | — |
| CORE-02 | Estructura base del backend + BD | FastAPI, capas (routers/services/repos/models), conexion MySQL, seed | CORE | Must | 5 | — |
| CORE-03 | Layout y navegacion responsive | Shell SPA, nav por rol, estilos base mobile-first | CORE | Must | 5 | CORE-01 |
| AUTH-01 | Inicio de sesion | UI login + `POST /auth/login` con hash + emision de JWT | AUTH | Must | 3 | CORE-02, CORE-03 |
| AUTH-02 | Sesion y rutas protegidas | JWT en `localStorage`, guards SPA, `get_current_user`, expiracion/logout | AUTH | Must | 5 | AUTH-01 |
| AUTH-03 | Roles / autorizacion (RBAC) | Navegacion/acciones por rol (front) + `require_role` (back) | AUTH | Must | 3 | AUTH-02 |
| EVAL-01 | Listar evaluables | UI + `GET /users?role=...` de Team Leaders/Tutores a evaluar | EVAL | Must | 3 | AUTH-03 |
| EVAL-02 | Evaluar Team Leader | Formulario estructurado + `GET /forms?target_role=` plantilla | EVAL | Must | 5 | EVAL-01 |
| EVAL-03 | Evaluar Tutor | Reutiliza motor de formularios con plantilla de Tutor | EVAL | Must | 3 | EVAL-02 |
| EVAL-04 | Feedback anonimo opcional | Toggle + regla backend: no persistir `evaluator_id` | EVAL | Should | 2 | EVAL-02 |
| EVAL-05 | Registrar evaluacion (API) | `POST /evaluations`: validacion Pydantic, estados, **no-duplicado por periodo** | EVAL | Must | 5 | EVAL-02 |
| HIST-01 | Historial del Coder | UI + `GET /evaluations?evaluator_id=` de evaluaciones propias | HIST | Should | 3 | EVAL-05 |
| HIST-02 | Seguimiento historico | Admin: historico por evaluado/periodo, respeta anonimato | HIST | Should | 3 | EVAL-05 |
| DASH-01 | Dashboard + ICA | Panel admin + `GET /metrics/summary` (**ICA**) | DASH | Must | 5 | EVAL-05 |
| DASH-02 | ICA por criterio e indicadores | **Logica de negocio:** ICA por categoria, % participacion, confianza | DASH | Should | 3 | DASH-01 |
| AIFEED-01 | Resumen de feedback con IA | `GET /metrics/ai-summary` (Claude, anonimizado, cacheado) | AIFEED | Should | 5 | DASH-01 |
| DELIV-01 | Despliegue de la app | Backend + frontend + MySQL hospedados; URL publica; vars de entorno | ENTREGA | Must | 5 | EVAL-05 |
| DELIV-02 | Pitch comercial (ingles) | Slides + script en ingles (3-5 min); ensayado por todos | ENTREGA | Must | 3 | — |
| DELIV-03 | Pitch tecnico (espanol) | Slides + demo en vivo (5-8 min); cada integrante explica su parte | ENTREGA | Must | 3 | DELIV-01 |
| DELIV-04 | Documento tecnico final | Compilado de `/docs` + capturas + mockups + evidencias QA | ENTREGA | Must | 5 | — |

**Total backlog MVP:** 79 SP (20 historias).

## Logica de negocio (no es solo CRUD)

La rubrica exige logica de negocio identificable mas alla del CRUD. En este backlog reside en:
- **EVAL-05:** prevencion de evaluacion duplicada por (evaluador, evaluado, periodo) + estados borrador/enviada.
- **EVAL-04:** anonimato real (no se persiste el evaluador).
- **AUTH-03:** RBAC en servidor + visibilidad restringida por rol (`403`).
- **DASH-01/02:** **ICA** (indice ponderado por categoria, normalizado, con confianza, tendencia y estado), participacion.
- **AIFEED-01:** orquestacion de IA con privacidad por diseno (solo agregados anonimizados) y cache.

## Orden de refinamiento

1. **CORE** (estructura base front + back + BD).
2. **AUTH** (identidad y rol; todo depende de ello).
3. **EVAL** (nucleo de valor; feedback ascendente).
4. **HIST + DASH** (convierten datos en informacion accionable: ICA).
5. **AIFEED** (diferenciador: resumen IA).
6. **ENTREGA** (transversal: el doc tecnico se va escribiendo; despliegue + pitches al final).

## Definition of Ready (DoR)
- Tiene descripcion, criterios de aceptacion y SP.
- Dependencias resueltas o planificadas en el mismo sprint.
- Contrato de API definido en [`06-arquitectura.md`](./06-arquitectura.md).

## Definition of Done (DoD)
- Cumple **todos** sus criterios de aceptacion.
- **Backend:** validacion con Pydantic, manejo de errores y codigos HTTP correctos; integrado con MySQL.
- **Frontend:** responsive (movil + escritorio) y accesible (teclado, labels); sin errores en consola.
- Si aplica, incluye la **logica de negocio** asociada (no degradada a CRUD).
- Sigue las convenciones de [`08-diseno-tecnico.md`](./08-diseno-tecnico.md).
- Probada manualmente (y con casos de prueba donde aplique); mergeada a `develop` via Pull Request.
