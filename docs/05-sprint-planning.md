# 05 — Sprint Planning

## Epicas

Las historias se organizan en 7 epicas. `CORE` es transversal (habilitadora); las demas representan valor de negocio. Todas son **full-stack** (frontend SPA + backend FastAPI + MySQL).

| Epica | Objetivo | Historias |
|---|---|---|
| **CORE** | Estructura base del monorepo: SPA modular + API FastAPI + MySQL. | CORE-01/02/03 |
| **AUTH** | Login con JWT y autorizacion por rol en cliente y servidor. | AUTH-01/02/03 |
| **EVALUACIONES** | Nucleo del producto: Coders evaluan TL/Tutores (con opcion anonima), persistido con sus reglas de negocio. | EVAL-01..05 |
| **HISTORIAL** | Trazabilidad: consultar evaluaciones pasadas y su evolucion. | HIST-01/02 |
| **DASHBOARD** | Transformar evaluaciones en informacion accionable: **ICP** e indicadores. | DASH-01/02 |
| **AIFEED** | Resumen de feedback con **Claude API** para el Admin (diferenciador). | AIFEED-01 |
| **ENTREGA** | Entregables no-codigo: despliegue, pitches y documento tecnico. | DELIV-01..04 |

### Mapa epica -> sprint

| Epica | Sprint 1 Setup | Sprint 2 Funcionalidad | Sprint 3 Metricas | Sprint 4 Entrega |
|---|:--:|:--:|:--:|:--:|
| CORE | CORE-01/02/03 | | | |
| AUTH | | AUTH-01/02/03 | | |
| EVALUACIONES | | EVAL-01..05 | | |
| HISTORIAL | | | HIST-01/02 | |
| DASHBOARD | | | DASH-01/02 | |
| AIFEED | | | AIFEED-01 | |
| ENTREGA | | parcial (DELIV-04) | | DELIV-01..04 |

---

## Marco de trabajo

- **Equipo:** 5 Coders de la misma jornada (Scrum obligatorio).
- **Roles Scrum** (de referencia; todos desarrollan y comprenden la solucion):

| # | Integrante | Rol Scrum | Foco |
|---|-----------|-----------|------|
| 1 | Manuel Vasquez (@manulzweb) | Scrum Master / Lider | Coordinacion + Backend (FastAPI + MySQL) |
| 2 | Carlos Charris (@karl26chy) | Product Owner | Backlog + Frontend |
| 3 | Yamit Garcia (@YamitGC) | Backend Developer | FastAPI — Auth / JWT / RBAC |
| 4 | Sebastian Mendoza (@smendozab097) | Frontend Developer | SPA Vanilla JS |
| 5 | Saeb Garcia (@SaebGC) | Frontend Developer | SPA Vanilla JS |

- **Cronograma: 20 de junio – 17 de julio de 2026** (~4 semanas).
  - **Sprint 1 — Setup:** 20 jun – 1 jul
  - **Sprint 2 — Funcionalidad:** 2 – 9 jul
  - **Sprint 3 — Metricas:** 10 – 13 jul
  - **Sprint 4 — Entrega:** 14 – 17 jul
- **Velocidad estimada del equipo:** ~20 SP por semana (5 personas).
- **Total backlog MVP:** 79 SP (20 historias). Ver [`02-product-backlog.md`](./02-product-backlog.md).

### Eventos Scrum
- **Daily** (15 min): que hice / que hare / impedimentos.
- **Sprint Planning** al inicio de cada sprint; **Review** y **Retrospective** al cierre.
- **Tablero** (Trello / GitHub Projects) con columnas To Do · In Progress · Review · Done.
- Registro de reuniones y seguimiento de avances (requisito de evaluacion).

---

## Sprint 1 — Setup (20 jun – 1 jul)

**Sprint Goal:** dejar el proyecto listo para construir: problema definido, backlog, mockups, arquitectura, BD y estructura base tecnica funcionando.

**Capacidad:** 15 SP + trabajo de planeacion/diseno

| ID | Historia | SP | Responsable principal |
|----|----------|:--:|-----------------------|
| CORE-01 | Preparar repo monorepo + estructura base de la SPA | 5 | Frontend Dev |
| CORE-02 | Estructura base del backend (FastAPI) + conexion MySQL + seed | 5 | Backend Dev |
| CORE-03 | Layout y navegacion responsive | 5 | Frontend Dev |

**Trabajo de planeacion (no SP):** definicion del problema y alcance, historias de usuario, MVP, **mockups (Figma)**, modelo de datos (3FN), arquitectura, configuracion de tablero Scrum y GitFlow, plantilla de PR.

**Justificacion:** las primeras semanas combinaron planeacion, investigacion y construccion en paralelo: mientras se refinaban historias, MVP y modelo de datos, el equipo ya dejaba lista la estructura base full-stack (CORE-01, CORE-02) para que el Sprint 2 empezara a producir valor de inmediato.

---

## Sprint 2 — Funcionalidad (2 – 9 jul)

**Sprint Goal:** un usuario inicia sesion segun su rol; un Coder puede evaluar (incl. anonimo) a Team Leaders y Tutores — todo persistido en la API con sus reglas de negocio.

**Capacidad:** 29 SP *(sobrecargado; paralelizar front/back y recortar `Should` si es necesario)*

| ID | Historia | SP | Responsable sugerido |
|----|----------|:--:|----------------------|
| AUTH-01 | Inicio de sesion (UI + API + JWT) | 3 | SM/Fullstack |
| AUTH-02 | Sesion y rutas protegidas (front + back) | 5 | Backend Dev |
| AUTH-03 | Roles / autorizacion (RBAC front + back) | 3 | Backend Dev |
| EVAL-01 | Listar evaluables | 3 | PO/Frontend |
| EVAL-02 | Evaluar Team Leader | 5 | Frontend Dev |
| EVAL-03 | Evaluar Tutor | 3 | PO/Frontend |
| EVAL-04 | Feedback anonimo opcional | 2 | Backend Dev |
| EVAL-05 | Registrar evaluacion (API + reglas de negocio) | 5 | Backend Dev |

**Sprint Backlog (clave):** shell responsive y navegacion por rol; login con hash + JWT; guards de ruta y `require_role`; motor de formularios reutilizable; plantillas TL/Tutor desde API; toggle anonimo; persistencia con validacion Pydantic, **no-duplicado por periodo** y **anonimato real**.

**Justificacion:** concentra el **corazon del producto** (feedback ascendente) en el periodo de desarrollo. Con 5 personas el trabajo se paraleliza: backend (AUTH/EVAL) y frontend (EVAL-01/02/03) avanzan en simultaneo contra el contrato REST.

---

## Sprint 3 — Metricas (10 – 13 jul)

**Sprint Goal:** el Admin visualiza el **ICP** y el **resumen IA**; los Coders consultan su historial; el Admin consulta el historico por evaluado.

**Capacidad:** 19 SP

| ID | Historia | SP | Responsable sugerido |
|----|----------|:--:|----------------------|
| HIST-01 | Historial del Coder | 3 | Frontend Dev |
| HIST-02 | Seguimiento historico (admin) | 3 | Backend Dev |
| DASH-01 | Dashboard + ICP | 5 | SM/Fullstack |
| DASH-02 | ICP por criterio e indicadores | 3 | Backend Dev |
| AIFEED-01 | Resumen de feedback con IA (Claude) | 5 | Backend Dev |

**Justificacion:** convierte los datos de evaluaciones en informacion accionable. El ICP es la logica de negocio "fuerte" para la rubrica; el resumen IA es el diferenciador. AIFEED-01 es `Should` y puede recortarse si aprieta.

---

## Sprint 4 — Entrega (14 – 17 jul)

**Sprint Goal:** el producto queda integrado, probado, desplegado y con la documentacion y pitches listos para la sustentacion.

**Capacidad:** 16 SP + trabajo de integracion/entrega

| ID | Historia | SP | Responsable sugerido |
|----|----------|:--:|----------------------|
| DELIV-01 | Despliegue de la app | 5 | Backend Dev |
| DELIV-02 | Pitch comercial (ingles) | 3 | PO/Equipo |
| DELIV-03 | Pitch tecnico (espanol) | 3 | SM/Equipo |
| DELIV-04 | Documento tecnico final | 5 | PO/Equipo |

**Trabajo de integracion/entrega (no SP):** correccion de errores, **casos de prueba y evidencias**, documento tecnico final, **mockups finales**, despliegue (GitHub Pages/Vercel + backend en la nube), **pitch comercial (ingles)** y **pitch tecnico (espanol)**.

**Justificacion:** la semana final se dedica a integracion y sustentacion. El doc tecnico (DELIV-04) se viene construyendo desde Sprint 1 (los `/docs` se actualizan continuamente); aqui se consolida. Los pitches requieren ensayo de todo el equipo.

---

## Resumen

| Sprint | Fechas | Goal | SP | Epicas |
|--------|--------|------|:--:|--------|
| 1 — Setup | 20 jun – 1 jul | Planeacion + estructura base full-stack | 15 | CORE |
| 2 — Funcionalidad | 2 – 9 jul | Login + roles + evaluaciones | 29 | AUTH, EVALUACIONES |
| 3 — Metricas | 10 – 13 jul | Historial + ICP + resumen IA | 19 | HISTORIAL, DASHBOARD, AIFEED |
| 4 — Entrega | 14 – 17 jul | Despliegue + pitches + doc tecnico | 16 | ENTREGA |

## Gestion de riesgos del plan

| Riesgo | Mitigacion |
|--------|------------|
| **Sprints 2-4 comprimidos** (64 SP en ~2.5 semanas) | Priorizar **Must**; el Sprint 1 ya esta hecho (estructura base front + back). Los **Should** (EVAL-04, HIST-01, HIST-02, DASH-02, AIFEED-01 = 16 SP) se recortan o posponen si aprieta. Recomendado conservar **AIFEED-01** por ser el diferenciador. |
| Integracion front/back tardia | Contrato REST acordado en Sprint 1; `/docs` de FastAPI desde el inicio |
| Reparto desigual de contribucion | Asignacion por historia + evidencia GitFlow por integrante |
| Sprint 2 sobrecargado (29 SP > velocidad) | Paralelizar front/back; EVAL-04 es `Should` y puede posponerse |
| Dependencia externa de IA (Claude API) | `ANTHROPIC_API_KEY` por `.env`; degradacion elegante; cache para costo; el dashboard funciona sin IA |
| Privacidad del feedback con IA | Solo agregados anonimizados al modelo; nunca identidades (regla de negocio + test) |
| Sobreingenieria | Sin frameworks de UI; capas simples; reutilizar motor de formularios; ICP derivado |
| Quedar en "solo CRUD" | Priorizar logica de negocio (ICP, anonimato, no-duplicado, RBAC) como criterios de DoD |
