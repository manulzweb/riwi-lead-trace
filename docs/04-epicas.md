# 04 — Épicas

Las historias se organizan en épicas. `CORE` es transversal (habilitadora); las demás representan valor de negocio. Todas son **full-stack** (frontend SPA + backend FastAPI + MySQL).

---

## ÉPICA CORE — Plataforma full-stack base
**Objetivo:** disponer del andamiaje del monorepo: SPA modular navegable + API FastAPI conectada a MySQL.
**Valor:** habilitador técnico; sin esto no hay producto.
**Historias:** CORE-01, CORE-02, CORE-03
**Done:** la SPA arranca y navega sin recargar; el backend responde y consulta MySQL con datos seed; UI responsive.

---

## ÉPICA AUTH — Autenticación y gestión de roles
**Objetivo:** login con JWT y autorización por rol en cliente y servidor.
**Valor:** seguridad y segmentación de la experiencia.
**Historias:** AUTH-01, AUTH-02, AUTH-03
**Done:** un usuario se autentica, su sesión persiste, y rutas/acciones se restringen por rol (RBAC verificado en backend).

---

## ÉPICA EVAL — Evaluaciones
**Objetivo:** que los Coders evalúen Team Leaders y Tutores (con opción anónima) y se persista con sus reglas de negocio.
**Valor:** **núcleo del producto** — la hipótesis del MVP.
**Historias:** EVAL-01, EVAL-02, EVAL-03, EVAL-04, EVAL-05
**Done:** un Coder selecciona a quién evaluar, completa el formulario (anónimo o no) y la evaluación queda registrada vía API con validación, anonimato real y no-duplicado por periodo.

---

## ÉPICA HIST — Historial y trazabilidad
**Objetivo:** consultar evaluaciones pasadas y su evolución.
**Valor:** trazabilidad y seguimiento histórico.
**Historias:** HIST-01, HIST-02
**Done:** Coders ven su historial; el Admin consulta el histórico por líder/tutor, área y periodo, respetando el anonimato.

---

## ÉPICA AREA — Áreas y modelo 360°
**Objetivo:** introducir la dimensión **área** (Desarrollo, Inglés, HSE, BLS) en usuarios, plantillas y evaluaciones, y los **4 roles** (coder, tutor, team_leader, admin).
**Valor:** habilita medir cada área por separado; base del 360°.
**Historias:** AREA-01, AREA-02
**Done:** TL/Tutores tienen área; evaluables y plantillas se filtran por área; RBAC por los 4 roles.

---

## ÉPICA TLEVAL — Bitácora TL → Tutor
**Objetivo:** que un Team Leader registre notas continuas sobre sus Tutores (una por tutoría), visibles solo para él.
**Valor:** historial cualitativo del desempeño del tutor; insumo del ICA y del resumen IA.
**Historias:** TLEVAL-01, TLEVAL-02
**Done:** el TL crea y consulta su bitácora; ningún otro rol ve las notas crudas (verificado en backend).

---

## ÉPICA DASH — Dashboard, métricas e ICA
**Objetivo:** transformar las evaluaciones en información accionable: **ICA** (índice ponderado por área), indicadores y tendencias.
**Valor:** soporte a la toma de decisiones académicas.
**Historias:** DASH-01, DASH-02, DASH-03, DASH-04, DASH-05
**Done:** el Admin visualiza el ICA por área, indicadores, tendencias, puede configurar los pesos del ICA (con reset) y exportar un reporte básico.

---

## ÉPICA AIFEED — Resumen de feedback con IA
**Objetivo:** generar, con **Claude API**, un resumen en lenguaje natural del feedback agregado por persona/área/periodo para el Admin.
**Valor:** síntesis accionable; diferenciador. Privacidad: solo agregados anonimizados.
**Historias:** AIFEED-01, AIFEED-02, AIFEED-03
**Done:** el Admin obtiene un resumen IA cacheado y el propio TL/Tutor recibe mejoras por IA; el prompt nunca incluye identidades.

---

## ÉPICA TALENT — Analítica de talento
**Objetivo:** calcular un **Talent Score** por tutor y rankear quién está listo para ser TL.
**Valor:** apoya decisiones de contratación/promoción.
**Historias:** TALENT-01
**Done:** el Admin ve un ranking de tutores por preparación para TL, por área y periodo.

---

## ÉPICA ENTREGA — Despliegue, pitches y documento técnico
**Objetivo:** asegurar todos los **entregables no-código** que evalúa la rúbrica: app desplegada con URL pública, pitch comercial en inglés, pitch técnico en español y documento técnico final.
**Valor:** sin esto el proyecto no se entrega aunque el código esté listo; es la diferencia entre "tener producto" y "ganar la sustentación".
**Historias:** DELIV-01, DELIV-02, DELIV-03, DELIV-04
**Done:** la app está desplegada y accesible vía URL pública; los dos pitches están listos y ensayados; el documento técnico y los mockups finales están en el repo.

---

## Mapa épica → sprint (cronograma de 5 semanas)

| Épica   | Sprint 0 (Sem. 1) | Sprint 1 (Sem. 2–3) | Sprint 2 (Sem. 4–5) |
|---------|:-----------------:|:-------------------:|:-------------------:|
| CORE    | ✅ (CORE-01/02) | ✅ (CORE-03) | |
| AUTH    | | ✅ | |
| AREA    | ✅ (modelo) | ✅ | |
| EVAL    | | ✅ | |
| TLEVAL  | | ✅ | |
| HIST    | | | ✅ |
| DASH    | | | ✅ (ICA) |
| AIFEED  | | | ✅ |
| TALENT  | | | ✅ |
| ENTREGA | | parcial (DELIV-04 doc) | ✅ (despliegue + pitches) |
