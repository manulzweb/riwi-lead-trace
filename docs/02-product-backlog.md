# 02 — Product Backlog

Backlog **full-stack** del MVP (frontend SPA + backend FastAPI + MySQL). Estimación en **Story Points (SP)**, escala Fibonacci (1, 2, 3, 5, 8). Prioridad **MoSCoW** (Must / Should / Could). Cada SP refleja el esfuerzo completo (UI + endpoint + datos), salvo las historias de andamiaje.

| ID | Nombre | Descripción | Épica | Prioridad | SP | Dependencias |
|----|--------|-------------|-------|-----------|:--:|--------------|
| CORE-01 | Setup repo + scaffold SPA | Monorepo, estructura `frontend/`, router, store y `http.js` | CORE | Must | 5 | — |
| CORE-02 | Scaffold backend + BD | FastAPI, capas (routers/services/repos/models), conexión MySQL, seed | CORE | Must | 5 | — |
| CORE-03 | Layout y navegación responsive | Shell SPA, nav por rol, estilos base mobile-first | CORE | Must | 5 | CORE-01 |
| AUTH-01 | Inicio de sesión | UI login + `POST /auth/login` con hash + emisión de JWT | AUTH | Must | 5 | CORE-02, CORE-03 |
| AUTH-02 | Sesión y rutas protegidas | JWT en `localStorage`, guards SPA, `get_current_user`, expiración/logout | AUTH | Must | 5 | AUTH-01 |
| AUTH-03 | Roles / autorización (RBAC) | Navegación/acciones por rol (front) + `require_role` (back) | AUTH | Must | 3 | AUTH-02 |
| AREA-01 | Modelo de áreas y 4 roles | `areas` + roles (coder/tutor/team_leader/admin) + `GET /areas` | AREA | Must | 3 | CORE-02 |
| AREA-02 | Evaluables y plantillas por área | `GET /users?role=&area_id=` + plantilla por área | AREA | Must | 3 | AREA-01, AUTH-03 |
| EVAL-01 | Listar evaluables | UI + `GET /users?role=&area_id=` de Team Leaders/Tutores a evaluar | EVAL | Must | 3 | AREA-02 |
| EVAL-02 | Evaluar Team Leader | Formulario estructurado + `GET /forms?target_role=` plantilla | EVAL | Must | 5 | EVAL-01 |
| EVAL-03 | Evaluar Tutor | Reutiliza motor de formularios con plantilla de Tutor | EVAL | Must | 3 | EVAL-02 |
| EVAL-04 | Feedback anónimo opcional | Toggle + regla backend: no persistir `evaluator_id` | EVAL | Should | 3 | EVAL-02 |
| EVAL-05 | Registrar evaluación (API) | `POST /evaluations`: validación Pydantic, estados, **no-duplicado por periodo/área** | EVAL | Must | 5 | EVAL-02 |
| TLEVAL-01 | Nota de tutoría (TL→Tutor) | `POST /tutor-logs`: bitácora del TL (RBAC) | TLEVAL | Must | 5 | AREA-02 |
| TLEVAL-02 | Consultar mi bitácora | `GET /tutor-logs?tutor_id=` solo del TL autor (`403` a otros) | TLEVAL | Should | 3 | TLEVAL-01 |
| HIST-01 | Historial del Coder | UI + `GET /evaluations?evaluator_id=` de evaluaciones propias | HIST | Should | 3 | EVAL-05 |
| HIST-02 | Seguimiento histórico | Admin: histórico por evaluado/área/periodo, respeta anonimato | HIST | Should | 5 | EVAL-05 |
| DASH-01 | Dashboard + ICA | Panel admin + `GET /metrics/summary` (**ICA** por área) | DASH | Must | 5 | EVAL-05 |
| DASH-02 | ICA por criterio e indicadores | **Lógica de negocio:** ICA por categoría, % participación, confianza | DASH | Should | 5 | DASH-01 |
| DASH-03 | Visualización de tendencias | Evolución temporal del ICA por criterio/persona | DASH | Should | 3 | DASH-02 |
| DASH-04 | Reportes básicos (export) | Exportar a CSV / vista imprimible | DASH | Could | 3 | DASH-01 |
| DASH-05 | Configurar pesos del ICA | `GET/PUT/POST /metrics/ica-weights[/reset]` (admin) | DASH | Should | 3 | DASH-02 |
| AIFEED-01 | Resumen de feedback con IA | `GET /metrics/ai-summary` (Claude, anonimizado, cacheado) | AIFEED | Should | 5 | DASH-02 |
| AIFEED-02 | Manejo de errores/costos IA | Degradación elegante si falla la IA | AIFEED | Could | 2 | AIFEED-01 |
| AIFEED-03 | Mejoras por IA para el evaluado | `GET /me/ai-feedback`: resultados + mejoras (TL/Tutor) | AIFEED | Should | 3 | AIFEED-01 |
| TALENT-01 | Ranking de talento (futuros TL) | `GET /talent/candidates`: **Talent Score** por tutor | TALENT | Should | 5 | DASH-02, TLEVAL-02 |
| DELIV-01 | Despliegue de la app | Backend + frontend + MySQL hospedados; URL pública; vars de entorno | ENTREGA | Must | 5 | EVAL-05 |
| DELIV-02 | Pitch comercial (inglés) | Slides + script en inglés (3–5 min); ensayado por todos | ENTREGA | Must | 3 | — |
| DELIV-03 | Pitch técnico (español) | Slides + demo en vivo (5–8 min); cada integrante explica su parte | ENTREGA | Must | 3 | DELIV-01 |
| DELIV-04 | Documento técnico final | Compilado de `/docs` + capturas + mockups + evidencias QA | ENTREGA | Must | 5 | — |

**Total backlog MVP:** 119 SP.

## Lógica de negocio (no es solo CRUD)

La rúbrica exige lógica de negocio identificable más allá del CRUD. En este backlog reside en:
- **EVAL-05:** prevención de evaluación duplicada por (evaluador, evaluado, periodo, área) + estados borrador/enviada.
- **EVAL-04:** anonimato real (no se persiste el evaluador).
- **AUTH-03 / TLEVAL-02:** RBAC en servidor + visibilidad restringida de la bitácora (`403`).
- **DASH-01/02/03:** **ICA** (índice ponderado por categoría, normalizado, con confianza, tendencia y estado), participación, tendencias.
- **DASH-05:** pesos del ICA configurables por el Admin con reset a defaults (defaults en código).
- **AIFEED-01/03:** orquestación de IA con privacidad por diseño (solo agregados anonimizados) y cache; resúmenes al Admin y mejoras al propio TL/Tutor (sin exponer evaluadores).
- **TALENT-01:** **Talent Score** por tutor (fórmula compuesta) para ranking de futuros TL.

## Orden de refinamiento

1. **CORE** (andamiaje front + back + BD).
2. **AUTH + AREA** (identidad, rol y dimensión de área; todo depende de ello).
3. **EVAL + TLEVAL** (núcleo de valor; feedback 360°).
4. **HIST + DASH** (convierten datos en información accionable: ICA).
5. **AIFEED + TALENT** (diferenciadores: resumen IA y analítica de talento).
6. **ENTREGA** (transversal: el doc técnico se va escribiendo; despliegue + pitches al final).

## Definition of Ready (DoR)
- Tiene descripción, criterios de aceptación y SP.
- Dependencias resueltas o planificadas en el mismo sprint.
- Contrato de API definido en [`06-arquitectura.md`](./06-arquitectura.md).

## Definition of Done (DoD)
- Cumple **todos** sus criterios de aceptación.
- **Backend:** validación con Pydantic, manejo de errores y códigos HTTP correctos; integrado con MySQL.
- **Frontend:** responsive (móvil + escritorio) y accesible (teclado, labels); sin errores en consola.
- Si aplica, incluye la **lógica de negocio** asociada (no degradada a CRUD).
- Sigue las convenciones de [`08-diseno-tecnico.md`](./08-diseno-tecnico.md).
- Probada manualmente (y con casos de prueba donde aplique); mergeada a `develop` vía Pull Request.
