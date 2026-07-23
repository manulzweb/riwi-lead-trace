# 04 — Estructura de Épicas (Epics)

La partición del *Product Backlog* se organiza mediante agrupaciones lógicas de alto nivel denominadas Épicas. La épica `CORE` es transversal y fundacional (habilitador técnico); las subsecuentes encapsulan flujos de valor de negocio y requerimientos analíticos. La totalidad de las épicas exigen un desarrollo **Full-Stack** (Frontend SPA + Backend FastAPI + Motor DB MySQL).

---

## CORE — Plataforma Base e Infraestructura
**Objetivo Arquitectónico:** Desplegar y estabilizar la topología base del monorepo: SPA modular asíncrona conectada a la API RESTful consumiendo un esquema relacional pre-poblado (seed).
**Valor de Negocio:** Habilitador técnico crítico. Constituye los cimientos sobre los cuales se construyen las demás épicas.
**Historias Mapeadas:** CORE-01, CORE-02, CORE-03.
**Definition of Done (DoD):** Renderizado de SPA mediante History API (sin recarga de página); servidor ASGI respondiendo a *health-checks*; consultas base a MySQL operativas; UI *Mobile-First* funcional.

---

## AUTH — Autenticación y Autorización
**Objetivo Arquitectónico:** Implementar validación de identidad (Authentication) y segmentación de permisos (Authorization).
**Valor de Negocio:** Garantizar el acceso seguro y segmentar la experiencia de usuario dependiendo de su rol en el ecosistema.
**Historias Mapeadas:** AUTH-01, AUTH-02, AUTH-03.
**Definition of Done (DoD):** Comprobación local de credenciales mediante *hashing* criptográfico (Bcrypt). Autenticación *Stateless* ejecutada y mantenida a nivel de cliente. Restricción de navegación evaluada por *Route Guards* en Frontend. (Consultar `06-arquitectura.md` para justificación de carencia de JWT).

---

## EVALUACIONES — Feedback Ascendente (Core Domain)
**Objetivo Arquitectónico:** Habilitar el flujo transaccional de captura de evaluaciones estructuradas con garantía de anonimato y prevención de concurrencia.
**Valor de Negocio:** Representa la hipótesis fundamental del MVP: levantar feedback cualitativo y cuantitativo hacia mentores.
**Historias Mapeadas:** EVAL-01, EVAL-02, EVAL-03, EVAL-04, EVAL-05.
**Definition of Done (DoD):** Selección dinámica de entidad a evaluar. Persistencia de transacciones de evaluación validando integridad referencial, enmascaramiento de autoría (anonimato criptográficamente irrecuperable) y rechazo *Server-Side* de envíos duplicados por periodo (HTTP 409).

---

## HISTORIAL — Trazabilidad y Retención
**Objetivo Arquitectónico:** Implementar consultas de lectura sobre el histórico de iteraciones anteriores.
**Valor de Negocio:** Consolidar un registro de progreso y garantizar trazabilidad inmutable del feedback.
**Historias Mapeadas:** HIST-01, HIST-02.
**Definition of Done (DoD):** Extracción de sumisiones históricas por Coder (sin acceso al contenido anónimo) y listado de evaluaciones pasadas recibidas por mentores bajo estricto cumplimiento del pacto de anonimato.

---

## DASHBOARD — Análisis de Métricas (OLAP Ligero)
**Objetivo Arquitectónico:** Agregar y procesar transacciones crudas en métricas accionables derivadas (*Índice de Calidad Percibida - ICP*).
**Valor de Negocio:** Habilitar a la gerencia académica la ingesta de telemetría útil para toma de decisiones.
**Historias Mapeadas:** DASH-01, DASH-02.
**Definition of Done (DoD):** Resolución y visualización de indicadores KPI y tasa de participación calculados *on-read* mediante vistas materializadas.

---

## AIFEED — Síntesis de Feedback Asistida por IA (LLM)
**Objetivo Arquitectónico:** Orquestar la integración delegada con la API de **Google Gemini** para procesamiento NLP de metadatos cualitativos, aplicando caché para optimización de recursos.
**Valor de Negocio:** Entregar resúmenes semánticos ejecutivos reduciendo drásticamente el esfuerzo cognitivo administrativo.
**Historias Mapeadas:** AIFEED-01.
**Definition of Done (DoD):** Despacho de cadenas de texto (Prompts) sanitizadas y anonimizadas al modelo fundacional; persistencia temporal de la respuesta en `ai_feedback_cache`.

---

## ENTREGA — Despliegue y Aseguramiento QA
**Objetivo Arquitectónico:** Ejecutar los *pipelines* de despliegue y materializar los requerimientos extra-código (Pitches, Documentación técnica).
**Valor de Negocio:** Cumplimiento irrestricto de las directrices del Proyecto Integrador.
**Historias Mapeadas:** DELIV-01, DELIV-02, DELIV-03, DELIV-04.
**Definition of Done (DoD):** SPA publicada en CDN, Backend funcional en PaaS. Documentación generada, diagramas consolidados y defensas orales preparadas.

---

## Mapa de Ejecución: Épica vs. Sprint (Timeline)

| Épica | Sprint 1 (Bootstrapping) | Sprint 2 (Core Business) | Sprint 3 (Analytics) | Sprint 4 (Release) |
|----------------|:---:|:---:|:---:|:---:|
| **CORE** | CORE-01/02/03 | | | |
| **AUTH** | | AUTH-01/02/03 | | |
| **EVALUACIONES**| | EVAL-01..05 | | |
| **HISTORIAL** | | | HIST-01/02 | |
| **DASHBOARD** | | | DASH-01/02 | |
| **AIFEED** | | | AIFEED-01 | |
| **ENTREGA** | | (DELIV-04 parcial) | | DELIV-01..04 |
