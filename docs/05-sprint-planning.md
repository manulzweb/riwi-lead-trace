# 05 — Sprint Planning

## Marco de trabajo

- **Equipo:** 5 Coders de la misma jornada (Scrum obligatorio).
- **Roles Scrum** (de referencia; todos desarrollan y comprenden la solución):

| # | Integrante | Rol Scrum | Foco |
|---|-----------|-----------|------|
| 1 | — | Scrum Master / Líder | Coordinación + Fullstack |
| 2 | — | Product Owner | Backlog + Frontend |
| 3 | — | Backend Developer | FastAPI + MySQL |
| 4 | — | Backend Developer | FastAPI + lógica de negocio |
| 5 | — | Frontend Developer | SPA Vanilla JS |

- **Cronograma del proyecto integrador: 5 semanas**
  - **Semana 1 — Planeación y Diseño** → *Sprint 0*
  - **Semanas 2–3 — Desarrollo** → *Sprint 1*
  - **Semanas 4–5 — Integración y Sustentación** → *Sprint 2*
- **Velocidad estimada del equipo:** ~30–37 SP por sprint de 2 semanas (5 personas).
- **Total backlog MVP:** 119 SP (full-stack + ENTREGA: alcance 360° + IA + talento + pesos configurables + despliegue + pitches + doc técnico). Ver
  [`02-product-backlog.md`](./02-product-backlog.md). **⚠️ El alcance excede la velocidad estimada**
  (decisión del equipo de meter "todo en el MVP"): ver *Gestión de riesgos* — los `Should/Could`
  (AIFEED, TALENT, DASH-03/04) son los primeros candidatos a recortar.

### Eventos Scrum
- **Daily** (15 min): qué hice / qué haré / impedimentos.
- **Sprint Planning** al inicio de cada sprint; **Review** y **Retrospective** al cierre.
- **Tablero** (Trello / GitHub Projects) con columnas To Do · In Progress · Review · Done.
- Registro de reuniones y seguimiento de avances (requisito de evaluación).

---

## 🟦 Sprint 0 — Planeación y Diseño (Semana 1)

**Sprint Goal:** dejar el proyecto listo para construir: problema definido, backlog, mockups, arquitectura, BD y andamiaje técnico funcionando.

**Capacidad:** 13 SP (más trabajo de planeación/diseño no estimado en SP)

| ID | Historia | SP | Responsable principal |
|----|----------|:--:|-----------------------|
| CORE-01 | Setup repo monorepo + scaffold SPA | 5 | Frontend Dev |
| CORE-02 | Scaffold backend (FastAPI) + conexión MySQL + seed | 5 | Backend Dev |
| AREA-01 | Modelo de áreas + 4 roles (coder/tutor/team_leader/admin) | 3 | Backend Dev |

**Trabajo de planeación (no SP):** definición del problema y alcance, historias de usuario, MVP, **mockups (Figma)**, modelo de datos (3FN), arquitectura, configuración de tablero Scrum y GitFlow, plantilla de PR.

**Justificación:** la rúbrica dedica la Semana 1 a planeación y diseño. Se aprovecha para dejar el andamiaje full-stack listo (repo, SPA vacía navegable, API arrancando contra MySQL con seed) de modo que la Semana 2 empiece a producir valor de inmediato.

---

## 🟩 Sprint 1 — Núcleo: Autenticación + Evaluaciones (Semanas 2–3)

**Sprint Goal:** un usuario inicia sesión según su rol; un Coder puede evaluar (incl. anónimo) a Team Leaders y Tutores **por área**, y un TL registra notas de tutoría — todo persistido en la API con sus reglas de negocio.

**Capacidad:** 45 SP *(sobrecargado; paralelizar y recortar `Should` si es necesario)*

| ID | Historia | SP | Responsable sugerido |
|----|----------|:--:|----------------------|
| CORE-03 | Layout y navegación responsive | 5 | Frontend Dev |
| AUTH-01 | Inicio de sesión (UI + API + JWT) | 5 | SM/Fullstack |
| AUTH-02 | Sesión y rutas protegidas (front + back) | 5 | Backend Dev |
| AUTH-03 | Roles / autorización (RBAC front + back) | 3 | Backend Dev |
| AREA-02 | Evaluables y plantillas por área | 3 | Backend Dev |
| EVAL-01 | Listar evaluables | 3 | PO/Frontend |
| EVAL-02 | Evaluar Team Leader | 5 | Frontend Dev |
| EVAL-03 | Evaluar Tutor | 3 | PO/Frontend |
| EVAL-04 | Feedback anónimo opcional | 3 | Backend Dev |
| EVAL-05 | Registrar evaluación (API + reglas de negocio) | 5 | Backend Dev |
| TLEVAL-01 | Nota de tutoría (TL→Tutor) | 5 | Backend Dev |

**Sprint Backlog (clave):** shell responsive y navegación por rol; login con hash + JWT; guards de ruta y `require_role`; **filtro por área**; motor de formularios reutilizable; plantillas TL/Tutor desde API; toggle anónimo; persistencia con validación Pydantic, **no-duplicado por periodo/área** y **anonimato real**; bitácora TL→Tutor con RBAC.

**Justificación:** concentra el **corazón del producto** (la hipótesis a validar: evaluación 360° multi-área) en el periodo de desarrollo. Con 5 personas el trabajo se paraleliza: backend (AUTH/AREA/EVAL/TLEVAL) y frontend (CORE-03/EVAL-01/02/03) avanzan en simultáneo contra el contrato REST.

---

## 🟨 Sprint 2 — Trazabilidad, Métricas, Integración y Entrega (Semanas 4–5)

**Sprint Goal:** el Admin visualiza el **ICA** por área, **resúmenes IA** y el **ranking de talento**; los TL consultan su bitácora; los Coders su historial; el producto queda integrado, probado, desplegado y con la documentación y pitches listos.

**Capacidad:** 61 SP (incluyendo ENTREGA) *(muy comprimido; AIFEED/TALENT/DASH-05 son `Should` y se recortan primero si aprieta; los DELIV son `Must`)*

| ID | Historia | SP | Responsable sugerido |
|----|----------|:--:|----------------------|
| HIST-01 | Historial del Coder | 3 | Frontend Dev |
| HIST-02 | Seguimiento histórico (admin) | 5 | Backend Dev |
| TLEVAL-02 | Consultar mi bitácora (TL) | 3 | Frontend Dev |
| DASH-01 | Dashboard + ICA | 5 | SM/Fullstack |
| DASH-02 | ICA por criterio e indicadores | 5 | Backend Dev |
| DASH-03 | Visualización de tendencias | 3 | Frontend Dev |
| DASH-04 | Reportes básicos (export CSV) | 3 | PO/Frontend |
| DASH-05 | Configurar pesos del ICA (admin) | 3 | Backend Dev |
| AIFEED-01 | Resumen de feedback con IA (Claude) | 5 | Backend Dev |
| AIFEED-02 | Manejo de errores/costos de IA | 2 | Backend Dev |
| AIFEED-03 | Mejoras por IA para el evaluado (TL/Tutor) | 3 | Frontend Dev |
| TALENT-01 | Ranking de talento (futuros TL) | 5 | SM/Fullstack |
| DELIV-01 | Despliegue de la app | 5 | Backend Dev |
| DELIV-02 | Pitch comercial (inglés) | 3 | PO/Equipo |
| DELIV-03 | Pitch técnico (español) | 3 | SM/Equipo |
| DELIV-04 | Documento técnico final | 5 | PO/Equipo |

**Trabajo de integración/entrega (no SP):** corrección de errores, **casos de prueba y evidencias**, documento técnico final, **mockups finales**, despliegue (GitHub Pages/Vercel + backend en la nube), **pitch comercial (inglés)** y **pitch técnico (español)**.

**Justificación:** las Semanas 4–5 son de integración y sustentación, pero el alcance "todo en el MVP" las carga (39 SP). **Prioriza:** ICA (DASH-01/02) y entrega son `Must`; **AIFEED, TALENT, DASH-03/04** son `Should/Could` → primeros candidatos a recortar para proteger la estabilización y los pitches.

---

## Resumen

| Sprint | Semanas | Goal | SP | Épicas |
|--------|---------|------|:--:|--------|
| 0 | 1 | Planeación + andamiaje + modelo de áreas | 13 | CORE, AREA |
| 1 | 2–3 | Login + roles + evaluaciones 360° + bitácora | 45 | CORE, AUTH, AREA, EVAL, TLEVAL |
| 2 | 4–5 | ICA + IA + talento + entrega | 61 | HIST, DASH, TLEVAL, AIFEED, TALENT, ENTREGA |

## Gestión de riesgos del plan

| Riesgo | Mitigación |
|--------|------------|
| Integración front/back tardía | Contrato REST acordado en Sprint 0; `/docs` de FastAPI desde el inicio |
| Reparto desigual de contribución | Asignación por historia + evidencia GitFlow por integrante |
| Sprints 1 y 2 sobrecargados (45 y 39 SP > velocidad) | "Todo en el MVP" excede la capacidad; recortar `Should/Could` (AIFEED, TALENT, DASH-03/04), paralelizar y proteger la entrega |
| Dependencia externa de IA (Claude API) | `ANTHROPIC_API_KEY` por `.env`; degradación elegante (AIFEED-02); cache para costo; el dashboard funciona sin IA |
| Privacidad del feedback con IA | Solo agregados anonimizados al modelo; nunca identidades (regla de negocio + test) |
| Sobreingeniería | Sin frameworks de UI; capas simples; reutilizar motor de formularios; ICA/talento derivados |
| Quedar en "solo CRUD" | Priorizar lógica de negocio (ICA, talento, anonimato, no-duplicado, RBAC) como criterios de DoD |
