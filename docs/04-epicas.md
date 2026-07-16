# 04 — Epicas

Las historias se organizan en epicas. `CORE` es transversal (habilitadora); las demas representan valor de negocio. Todas son **full-stack** (frontend SPA + backend FastAPI + MySQL).

---

## CORE — Plataforma base
**Objetivo:** disponer de la estructura base del monorepo: SPA modular navegable + API FastAPI conectada a MySQL.
**Valor:** habilitador tecnico; sin esto no hay producto.
**Historias:** CORE-01, CORE-02, CORE-03
**Done:** la SPA arranca y navega sin recargar; el backend responde y consulta MySQL con datos seed; UI responsive.

---

## AUTH — Autenticacion y roles
**Objetivo:** login con JWT y autorizacion por rol en cliente y servidor.
**Valor:** seguridad y segmentacion de la experiencia.
**Historias:** AUTH-01, AUTH-02, AUTH-03
**Done:** un usuario se autentica, su sesion persiste, y rutas/acciones se restringen por rol (RBAC verificado en backend).

---

## EVALUACIONES — Feedback ascendente
**Objetivo:** que los Coders evaluen Team Leaders y Tutores (con opcion anonima) y se persista con sus reglas de negocio.
**Valor:** **nucleo del producto** — la hipotesis del MVP.
**Historias:** EVAL-01, EVAL-02, EVAL-03, EVAL-04, EVAL-05
**Done:** un Coder selecciona a quien evaluar, completa el formulario (anonimo o no) y la evaluacion queda registrada via API con validacion, anonimato real y no-duplicado por periodo.

---

## HISTORIAL — Trazabilidad
**Objetivo:** consultar evaluaciones pasadas y su evolucion.
**Valor:** trazabilidad y seguimiento historico.
**Historias:** HIST-01, HIST-02
**Done:** Coders ven su historial; el Admin consulta el historico por lider/tutor y periodo, respetando el anonimato.

---

## DASHBOARD — Metricas e ICA
**Objetivo:** transformar las evaluaciones en informacion accionable: **ICA** (indice ponderado) e indicadores.
**Valor:** soporte a la toma de decisiones academicas.
**Historias:** DASH-01, DASH-02
**Done:** el Admin visualiza el ICA, indicadores y participacion.

---

## AIFEED — Resumen de feedback con IA
**Objetivo:** generar, con **Claude API**, un resumen en lenguaje natural del feedback agregado por persona/periodo para el Admin.
**Valor:** sintesis accionable; diferenciador. Privacidad: solo agregados anonimizados.
**Historias:** AIFEED-01
**Done:** el Admin obtiene un resumen IA cacheado; el prompt nunca incluye identidades.

---

## ENTREGA — Despliegue, pitches y documento tecnico
**Objetivo:** asegurar todos los **entregables no-codigo** que evalua la rubrica: app desplegada con URL publica, pitch comercial en ingles, pitch tecnico en espanol y documento tecnico final.
**Valor:** sin esto el proyecto no se entrega aunque el codigo este listo.
**Historias:** DELIV-01, DELIV-02, DELIV-03, DELIV-04
**Done:** la app esta desplegada y accesible via URL publica; los dos pitches estan listos y ensayados; el documento tecnico y los mockups finales estan en el repo.

---

## Mapa epica -> sprint (entrega 17 jul 2026)

| Epica         | Sprint 1 Setup | Sprint 2 Funcionalidad | Sprint 3 Metricas | Sprint 4 Entrega |
|---------------|:--------------:|:---------------------:|:-----------------:|:----------------:|
| CORE          | CORE-01/02/03  |                       |                   |                  |
| AUTH          |                | AUTH-01/02/03         |                   |                  |
| EVALUACIONES  |                | EVAL-01..05           |                   |                  |
| HISTORIAL     |                |                       | HIST-01/02        |                  |
| DASHBOARD     |                |                       | DASH-01/02        |                  |
| AIFEED        |                |                       | AIFEED-01         |                  |
| ENTREGA       |                | parcial (DELIV-04)    |                   | DELIV-01..04     |
