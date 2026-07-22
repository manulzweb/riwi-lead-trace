# Auditoría Técnica Completa — Riwi LeadTrace

**Fecha:** 2026-07-22 · **Alcance:** todo el repositorio (`backend/`, `frontend/`, `database/`, `/docs`, raíz) · **Método:** lectura del código como única fuente de verdad; la documentación se contrastó contra el código y cada divergencia se reporta.
**Regla de la auditoría:** no se modificó ni una línea de código. Cada hallazgo cita archivo y ubicación.

---

## 1. Mapa del proyecto (lo que el código realmente hace)

```
SPA (frontend/src)                         API (backend/app)                        MySQL
──────────────────                         ─────────────────                        ─────
main.js → router/router.js                 main.py (CORS, handler global 500)       15 tablas (3FN)
  ROUTES (routes.js, 15 rutas)             13 routers → 10 services → 10 repos      4 vistas (04_views.sql)
  render(view) + initSetup(view)           schemas/ Pydantic · exceptions/ por      constraint uq_submission_once
services/*.service.js (fetch único)          módulo · constants/ · config/          FKs RESTRICT/CASCADE/SET NULL
components/ · utils/ · styles/global.css   services abren conn (`with engine…`)     system_settings (fila única)
sesión: localStorage (sin store)           y la pasan a repositories (text())       ai_feedback_cache
```

**Flujo de escritura típico (POST /evaluations):**
`evaluate.view.js` → `evaluation.service.js` → `api.service.request()` → `evaluation_routes.create_evaluation` (valida Pydantic, mapea excepciones→HTTP) → `evaluation_service.create_evaluation` (transacción `engine.begin()`: valida periodo activo → chequeo duplicado → permisos rol/clan → INSERT `evaluations` → INSERT `evaluation_submissions` con capura de `IntegrityError`→409 → bulk INSERT `evaluation_details`) → MySQL.

La arquitectura por capas declarada (routes→services→repositories) **sí existe y en general se respeta**, con las excepciones que se listan abajo (`cohort_routes`, `clan_routes`, dos queries inline en services).

---

## 2. Hallazgos CRÍTICOS

### C1. `DELETE /forms/{id}` está roto: siempre devuelve 500
- **Archivo:** `backend/app/services/form_service.py:139` → llama `self.repo.delete_form(conn, form_id)`.
- **Evidencia:** `backend/app/repositories/form_repository.py` **no tiene** ningún método `delete_form` (tiene `deactivate_form`). La llamada lanza `AttributeError` en runtime.
- **Confirmación independiente:** el propio test `backend/tests/test_forms.py:181` (`test_borrar_plantilla_la_desactiva_sin_borrarla_fisicamente`) espera 204 + soft-delete; hoy ese test falla. La suite está roja.
- **Impacto:** el admin no puede borrar/desactivar plantillas desde la UI (el flujo del constructor de formularios `formsService.deleteForm` lo usa).
- **Causa probable:** regresión al migrar a patrón repository (el service quedó llamando un método que nunca se creó).
- **Solución:** implementar `FormRepository.delete_form` como soft-delete (`UPDATE forms SET is_active = FALSE`) o cambiar el service para usar `deactivate_form`; además el bloque `if existing["is_active"]: deactivate_form` posterior al "delete" es lógica muerta que hay que limpiar. El test existente sirve de red.
- **Riesgo del fix:** bajo. **Prioridad:** inmediata. **Esfuerzo:** ~1 h con test.

### C2. Las respuestas de texto abierto se pierden al enviar una evaluación
- **Archivo:** `frontend/src/views/coder/evaluate.view.js:478`.
- **Evidencia:** `comment: (type === "open_text" || type === "yes_no") ? (val || null) : null` — pero el `input_type` real que manda el backend es **`text`** (ver `database/01_ddl.sql:181`, CHECK `('scale','text','yes_no')`). Para preguntas `text`, ni `score` ni `comment` se llenan: la respuesta viaja `{score:null, comment:null}`.
- **Confirmación independiente:** `Mejoras_o_arreglos.txt`: *"las preguntas abiertas aparecen 'sin respuesta' en el modal"*. Es exactamente este bug: el dato nunca llegó a la BD.
- **Impacto:** pérdida silenciosa del feedback cualitativo — el insumo principal del resumen IA (`ai_repository.get_anonymized_comments` filtra `input_type='text'`) y de la vista "Mis resultados". Los comentarios que hoy existen en la BD vienen del mock, no de la app.
- **Solución:** incluir `"text"` en la condición (y de paso eliminar los tipos fantasma `open_text`/`scale_1_5` del schema zod local, que solo existen en el builder del admin vía `forms.service.js` y confunden).
- **Riesgo:** nulo. **Prioridad:** inmediata. **Esfuerzo:** 15 min + test manual.

### C3. `ai_auto_summary` fue cableado a un método que no existe (feature fantasma que además contradice CLAUDE.md y la propia UI)
- **Archivos:** `backend/app/services/period_service.py:68-73`, `backend/app/services/ai_service.py:173-201`, `backend/app/services/metrics_service.py`.
- **Evidencia encadenada:**
  1. Al cerrar un periodo, `period_service.update_period` lee `system_settings.ai_auto_summary` (default **TRUE** en BD) y agenda `generate_missing_summaries_for_period` como BackgroundTask.
  2. Esa función llama `metrics_service.get_overall_ranking(period_id)` — **método que no existe en `MetricsService`** → `AttributeError` en cada ejecución (tragado por el `try/except` y logueado; nunca genera nada).
  3. `ai_service.py:25-39` contiene un bloque de comentario que afirma "AJUSTE SIN FUNCIONALIDAD DETRÁS… no hay disparo al cerrar un periodo en todo el backend" — **falso desde que se agregó el punto 1** (commit `3161679`).
  4. `frontend/src/views/admin/settings.view.js:114-128` muestra el toggle **deshabilitado** con insignia "Próximamente" y tooltip "no hay tarea programada ni disparo por evento" — también falso ahora. Y como está `disabled`, el admin **no puede apagar** un disparo que sí ocurre (y que falla).
  5. `CLAUDE.md` lista `ai_auto_summary` entre los "NO CABLEADOS".
- **Impacto:** código muerto-pero-activo que falla en producción en cada cierre de periodo; documentación, comentarios y UI describen tres realidades distintas. En una sustentación esto es indefendible.
- **Solución (decisión de equipo, dos caminos):** (a) revertir el disparo en `period_service` y mantener el ajuste como decorativo (restaura coherencia con CLAUDE.md/UI), o (b) terminar la feature: implementar el ranking (puede reutilizar `get_evaluatees_with_metrics`), habilitar el toggle y actualizar CLAUDE.md + tooltips. No dejar el estado intermedio actual.
- **Riesgo:** bajo (a) / medio (b). **Prioridad:** inmediata. **Esfuerzo:** 1 h (a) / 4-6 h (b).

### C4. El frontend, el README y la UI implementan/describen un modelo de anonimato distinto del que tiene el backend (regla de negocio nº 1)
- **Modelo real (backend + BD, verificado):** `evaluation_submissions.evaluation_id` se guarda **siempre**, también en anónimas (`evaluation_service.py:77-98`, `01_ddl.sql:256-284`). El coder puede releer su historial anónimo completo: `get_submissions_by_evaluator` hace LEFT JOIN y devuelve contenido y respuestas también de las anónimas. El anonimato es "de aplicación" (dos filtros: `vw_evaluations_summary` y `get_evaluator_ids_for_evaluations`).
- **Lo que dice/hace todo lo demás (modelo viejo):**
  - `README.md` (Notas técnicas): *"Si la evaluación es anónima esa columna queda en NULL… no hay consulta —ni acceso directo a la base— que permita reconstruirlo… el propio autor tampoco puede volver a ver sus respuestas anónimas"* — **falso en los tres enunciados**, y además es exactamente la afirmación que CLAUDE.md prohíbe hacer en la sustentación.
  - `frontend/src/services/evaluation.service.js` (comentarios + `isAnonymousParticipation`/`hasVisibleDetail`): asume `evaluation_id === null` en anónimas y **oculta el detalle**.
  - `frontend/src/views/coder/my-evaluations.view.js:100-133`: no pinta botón de detalle en anónimas y muestra al usuario: *"Nadie puede recuperarlas ni saber que fueron tuyas — tampoco el equipo administrador"*.
  - `frontend/src/views/coder/evaluate.view.js:91-94` (texto junto al toggle anónimo): *"tus respuestas se guardan sin ningún vínculo con tu identidad… el detalle tampoco aparecerá en tu historial. Es irreversible."*
  - `backend/app/schemas/evaluation_details.py:11-19` (docstring de `evaluator_id`): *"si `is_anonymous` es True el vínculo con el contenido nunca llega a guardarse"* — contradice el propio service dos capas más abajo.
- **Impacto:** (1) la funcionalidad que motivó la decisión del equipo (2026-07-21: "historial del coder por encima de anonimato duro") **no está disponible en la UI** — el backend manda las respuestas anónimas y el front las tira; (2) la app le hace al usuario una promesa de privacidad ("irreconstruible") que la BD no cumple — un problema ético/de confianza, no solo técnico; (3) README contradice CLAUDE.md en la regla más sensible del dominio.
- **Solución:** decisión de equipo primero (¿cuál modelo va?). Si se mantiene el actual: reescribir README, textos de UI (`evaluate.view`, `my-evaluations`), predicados de `evaluation.service.js` (mostrar detalle propio de anónimas) y el docstring del schema. Si se vuelve al modelo estructural: cambiar `evaluation_service` para guardar NULL y arreglar antes `EvaluationHistoryOut.is_anonymous` (CLAUDE.md ya documenta ese prerrequisito).
- **Prioridad:** inmediata (como decisión); el cambio es mediano. **Esfuerzo:** 3-5 h el camino "alinear con backend".

---

## 3. Hallazgos ALTOS

### A1. Dashboard del coder: contadores rotos por `window.evaluablesService` inexistente
- `frontend/src/views/dashboard.view.js:332-341`: usa `window.evaluablesService` (nunca definido; el service real es un módulo ES que **no se importa** aquí) → `evaluables` siempre `[]` → `pending` siempre 0. El comentario del código lo delata: *"Suponiendo que es una variable global…"* (código generado sin verificar). Confirmado por `Mejoras_o_arreglos.txt` ("las cards no muestran las evaluaciones pendientes").
- Agravantes en el mismo archivo: (a) línea 152 define un `isPendingParticipation` **local** con el magic string `"evaluado"` (estado que no existe) que *sombrea* la versión de módulo (línea 26) cuidadosamente corregida y comentada; (b) `window.__coderStats` (línea 343) reintroduce el global que el comentario de la línea 66 dice haber eliminado; (c) `import { Chart } from 'chart.js/auto'` (línea 11) sin uso, con dynamic import duplicado en línea 521.
- **Solución:** importar `evaluablesService`, borrar el shadow local y el global. **Esfuerzo:** 1 h.

### A2. Dashboard admin: la dona de "Tasa de Participación" nunca se dibuja
- `dashboard.view.js:29-38` crea el canvas `participation-chart`, pero en todo el archivo no hay `new Chart` para ese id (solo para `coder-participation-chart`). El admin ve el % en texto sobre un lienzo vacío. **Esfuerzo:** 30 min.

### A3. XSS: tres vectores concretos
1. `frontend/src/components/evaluation_detail_modal.js` interpola `ans.comment`, `questionText`, `evaluateeName` **sin `escapeHtml`** en el HTML de Swal (líneas 13-51). Hoy el componente está **muerto** (nadie lo importa), pero es una mina activada por cualquier import futuro; la vista `my-evaluations` tiene un duplicado casi idéntico que **sí** escapa — señal de la divergencia.
2. `marked.parse(summary)` → `innerHTML` sin sanitizar en `views/admin/ai-summary.view.js:158` y `views/team-leader/my-results.view.js:197`. `marked` no sanitiza: cualquier HTML que venga en el resumen (salida del LLM o fila manipulada de `ai_feedback_cache`) se ejecuta en el navegador del admin/TL.
3. `dashboard.view.js:365`: `user.name.split(' ')[0]` sin escapar (el resto del archivo sí escapa `name`).
- **Contexto:** el resto de vistas usa `escapeHtml` de forma bastante consistente — esto es cierre de brechas, no rediseño. **Solución:** borrar el componente muerto, pasar la salida de `marked` por un sanitizador (DOMPurify) o renderizar como texto, escapar el nombre. **Esfuerzo:** 2 h.

### A4. `cohort_routes.py` / `clan_routes.py` rompen la arquitectura por capas
- `backend/app/routes/cohort_routes.py` y `clan_routes.py`: SQL inline en el route, sin service, sin repository, sin manejo de errores, sin `response_model` — únicos endpoints así en el backend. Fueron generados por el script suelto `rename_routes.py` (raíz del repo, con rutas absolutas `C:\Users\manue\...`) y quedaron sin integrar al patrón. **Solución:** crear `master_data` (o `cohort`/`clan`) service+repository mínimos, mismo patrón del resto. **Esfuerzo:** 1-2 h.

### A5. Conexión global de BD abierta al importar, en producción
- `backend/app/config/database.py:22`: `conn = engine.connect().execution_options(isolation_level="AUTOCOMMIT")` a nivel de módulo. El propio comentario dice que **solo la usan los tests**, pero se ejecuta en cada import de la app: todo proceso de producción mantiene un checkout permanente del pool que nadie usa ni cierra. **Solución:** mover esa conexión a `tests/conftest.py` (crearla allí desde `engine`). **Esfuerzo:** 30 min + correr suite.

### A6. Enumeración de usuarios en el login
- `backend/app/services/auth_service.py:13-17` + `auth_routes` devuelven **404 "El correo no está registrado"** vs **401 "Contraseña incorrecta"**, y `login.js:118-121` muestra esos textos distintos. Cualquiera puede sondear qué correos existen. Dado que el MVP ya asume "sin JWT", es el arreglo de seguridad más barato disponible: un solo 401 "Credenciales inválidas" para ambos casos. **Esfuerzo:** 30 min (toca 1 test: `test_auth.py`).

### A7. Infraestructura de tests rota para quien llegue de cero + suite roja
- `backend/tests/conftest.py:41-48` y `CLAUDE.md` instruyen `cp .env.test.example .env.test` y `python tests/bootstrap_test_db.py`: **ninguno de los dos archivos existe** en el repo (verificado en el árbol completo). Nadie puede montar la BD de pruebas siguiendo la guía.
- Además la suite tiene al menos un test que falla hoy (C1). 47 tests en total, buenos en reglas de negocio (duplicado anónimo, periodo cerrado, pesos), pero 0 tests de frontend salvo `validators.test.js`.
- **Solución:** commitear `bootstrap_test_db.py` y `.env.test.example` (o corregir la guía), y poner la suite verde. **Esfuerzo:** 1-2 h.

### A8. Autoría concentrada (riesgo de rúbrica, no de código)
- `git log`: 166 de ~221 commits son de una sola persona (ManulzWeb/Manuel), 37 de `smendozab097`, y 3 integrantes con 1-3 commits. La rúbrica exige commits/ramas/PRs por integrante. No es un hallazgo de código, pero es el riesgo de evaluación más medible del repo.

---

## 4. Hallazgos MEDIOS

| # | Hallazgo | Archivo / evidencia | Impacto y solución |
|---|----------|--------------------|--------------------|
| M1 | `GET /users?role=X` devuelve la lista de roles **truncada** para usuarios multi-rol: el `WHERE r.name = :role` recorta las filas del JOIN antes del `GROUP_CONCAT` | `user_repository.get_users` (líneas 21-34) | Un tutor+TL consultado con `role=tutor` sale con `roles=["tutor"]`. Filtrar con `HAVING` o subquery `EXISTS` |
| M2 | El frontend ignora el multi-rol (diseño N:M del dominio): sidebar y dashboard usan `user.roles[0]` | `components/sidebar.js` (`const role = user.roles[0]`), `dashboard.view.js:78` | Un usuario tutor+team_leader pierde la navegación/vista de su segundo rol. Decidir una jerarquía o fusionar menús |
| M3 | Duplicación (DRY): `has_active_period` copiado en `question_repository` y `form_repository` (CLAUDE.md lo prohíbe explícitamente); `_base_user_query` duplica la vista `vw_users_with_roles`; dos modales de detalle de evaluación (uno muerto); `QuestionOut` definido dos veces con formas distintas (`schemas/question.py` vs `schemas/form.py`); fachadas module-level en los 10 services (~60 líneas de wrappers, casi todos sin uso — los routes importan el singleton) | citados | Consolidar; borrar fachadas sin consumidores (solo `activity_log_service` y `ai_service` se usan como módulo) |
| M4 | Queries inline en services (rompe la regla services→repositories): `question_service._assert_no_active_period` (text() + import local), `metrics_service.get_metrics_summary` (`SELECT COUNT(id) FROM periods` inline, línea 118) | citados | Mover a los repositorios correspondientes |
| M5 | Basura en la raíz del repo: `rename_routes.py`, `update_filters.py`, `update_metrics.py` (scripts one-shot con rutas Windows), `temp_evals.json`, `temp_summary.json`, `openapi.json` (0 bytes) | raíz | Borrar; contaminan el repo entregable |
| M6 | Código/dependencias muertas en frontend: `components/evaluation_detail_modal.js`, `components/badge.js` (sin imports), dependencia `html2pdf.js` (jamás importada; el modo impresión usa `window.print()`), import estático de Chart en dashboard | `package.json`, citados | Eliminar |
| M7 | Identidad de plantilla ajena: `index.html` describe "gestión de tareas… CRUD de tareas" en metadatos/OG; `theme.service.js` usa la clave `taskflow_theme`; navbar no autenticada enlaza a `/register` que **no existe** (→404) | `frontend/index.html`, `services/theme.service.js:1`, `components/navbar.js` | Corregir metadatos (es lo primero que ve un evaluador al compartir el link), quitar `/register` |
| M8 | Controles que mienten adicionales a los documentados: el selector de idioma ES/EN solo cambia el estilo del botón y `<html lang>` (no traduce nada) — mismo antipatrón que CLAUDE.md censura en settings; y la vista `ai-summary` dice "usando **Claude AI**" cuando el motor es **Gemini** | `components/lang-switcher.js`, `views/admin/ai-summary.view.js:19` | Quitar el switcher o rotularlo "Próximamente"; corregir el texto |
| M9 | Assets con ruta `../../public/icons/...` (navbar, sidebar): funciona en dev pero en el build de Vite `public/` se copia a la raíz (`/icons/...`) → logos rotos en producción/Vercel | `components/navbar.js`, `components/sidebar.js` | Usar `/icons/riwi_logo.png` |
| M10 | README afirma que a la IA "nunca" se le mandan los comentarios — falso: `get_anonymized_comments` los envía (anonimizados, permitido por regla 7) y `_build_prompt` incluye además **nombre y rol del evaluado**, que sí es un dato personal saliendo a un tercero | `README.md`, `ai_repository.py:21-39`, `ai_service.py:97-116` | Corregir README; decidir si el nombre del evaluado debe salir a Gemini (bastaría el rol) |
| M11 | Borrador local frágil: clave fija `evaluation_draft` sin usuario ni evaluado — otro usuario en el mismo navegador (o el mismo coder cambiando de persona dentro del mismo rol) hereda respuestas precargadas | `evaluate.view.js:150,429-460` | Incluir `userId+evaluateeId` en la clave |
| M12 | El botón "Guardar borrador" solo guarda en localStorage; el estado `draft` del backend (columna `status`, contrato REST) **nunca se usa desde la UI** — los "borradores" del dashboard vienen solo del mock | `evaluate.view.js:421-426` vs `schemas/evaluation_details.py:41` | Decidir: o borradores de servidor o quitar el estado del contrato |
| M13 | `router.js`: `JSON.parse(localStorage…)` sin try/catch — una sesión corrupta rompe todo el routing (pantalla en blanco); y `getSession` se llama sin validar shape | `services/auth.service.js:12-14` | try/catch + clearSession en fallo |
| M14 | Carrera en cache IA: `cache_summary` hace INSERT plano contra `uq_ai_cache_evaluatee_period` → dos generaciones simultáneas = `IntegrityError` = 500 | `ai_repository.py:58-72` | `INSERT ... ON DUPLICATE KEY UPDATE` o capturar y releer |
| M15 | `get_or_generate_ai_summary` mantiene una conexión del pool abierta mientras llama a Gemini (red externa, segundos) y anida el checkout de `get_score_history` — contradice la disciplina anti-doble-checkout que el propio código documenta en `_get_summary_temperature` y `_load_policy` | `ai_service.py:59-95` | Leer datos, cerrar conn, llamar a Gemini, abrir para cachear (ya lo hace en parte) |
| M16 | Magic numbers/strings de negocio: `period_id == 0` = "todos los periodos" (no documentado en el contrato); baseline `total_coders * 2` para participación; `MIN_EVALUATIONS = 3` en `ai_service` duplica `required_evaluations` configurable (el mensaje de error puede mentir si el admin cambió el ajuste) | `metrics_service.py:114-124`, `metrics_repository.py:12`, `ai_service.py:12` | Constantes nombradas + usar el ajuste real en el mensaje |
| M17 | Validaciones duplicadas e inconsistentes de contraseña: login exige mín. 8 (zod), `getPasswordRules` exige 6, el backend no exige nada al crear usuario | `login.js:12`, `utils/validators.js`, `user_service.create_user` | Unificar (la autoridad debería ser Pydantic) |
| M18 | Manejo de errores backend: ~40 bloques try/except idénticos en routes (boilerplate que FastAPI resuelve con `app.add_exception_handler` por tipo); `logger.error(f"{e}")` sin `exc_info` pierde tracebacks; el handler global usa `print()` en vez de `logging` | todos los routes, `main.py:80` | Handlers globales por excepción de dominio; logging estructurado |
| M19 | Índices: no hay índice compuesto para los patrones de consulta más frecuentes (`evaluations(evaluatee_id, period_id, status)` — alimenta `vw_period_metrics`, historial y comentarios IA; `evaluation_submissions(evaluator_id)` sí queda cubierto por `uq_submission_once`) | `01_ddl.sql` | A escala Riwi (cientos de filas) no duele; para escalar, agregar el compuesto |
| M20 | El formulario de evaluación **no** es "una pregunta a la vez" como exige el alcance del MVP (regla 10 de CLAUDE.md): renderiza todas las preguntas agrupadas por categoría en una sola página | `evaluate.view.js:304-418` vs `CLAUDE.md` regla 10 | Decisión de equipo: cambiar la UI o actualizar el alcance documentado |

---

## 5. Hallazgos BAJOS (selección)

- `evaluation_service.create_evaluation:57`: `if eval_data.evaluator_id is not None` — muerto: el schema lo declara `int` obligatorio.
- `user_service` fachada `get_evaluables()` no acepta el parámetro `evaluator_id` que el método real sí usa (fachada muerta y desalineada).
- `dashboard.view.js:461`: `let filteredClans = []` sin uso.
- `pytest` listado en `requirements.txt` de producción.
- Prompt del resumen IA contempla "Si es un Admin…" (`ai_service.py:104`) — rama imposible: los admin no son evaluables.
- `n_evals = "Múltiples"` como placeholder en el prompt del resumen (`ai_service.py:75`) — el dato real existe en la vista y no se pasa.
- `check.py` monta el health-check en `/` — funciona, pero convierte la raíz de la API en health en vez de un 404/redirect documentado.
- `activity_log_routes.py:35`: BOM `﻿` incrustado como literal en el string — funciona, pero es invisible y frágil al editar.
- Tag OpenAPI `master-data` para cohorts/clans no está en `tags_metadata` (aparece sin descripción en Swagger).
- `.claude/skills/guia-generativa/SKILL.md` menciona "Claude API" e "ICA por área" (el proyecto usa Gemini e ICP) y capas front (`store`) que ya no existen — skill desactualizado que instruye mal a los asistentes.
- `evaluate.view.js`: se puede enviar sin seleccionar persona (`parseInt('') → NaN → null`) y el error llega como 422 crudo del backend en vez de validación de UX.
- IN-clauses con tupla en `text()` (`WHERE id IN :ids`) dependen del render de tuplas de PyMySQL — funciona, pero lo portable en SQLAlchemy es `bindparam(..., expanding=True)`.

---

## 6. Inconsistencias documentación ↔ código (inventario)

| Doc | Afirmación | Código real |
|-----|-----------|-------------|
| `README.md` | Anónimas: `evaluation_id` NULL, vínculo irreconstruible, autor no puede releer | `evaluation_id` se guarda **siempre**; el vínculo existe y una query lo revela; el backend sí devuelve el historial anónimo (C4) |
| `README.md` | "La IA recibe solo promedios y conteos, nunca los comentarios" | Los comentarios de texto se envían (anonimizados) + nombre del evaluado (M10) |
| `CLAUDE.md` | `ai_auto_summary` "sin cablear, no hay disparo por evento" | `period_service` lo consume y agenda un BackgroundTask (roto) al cerrar periodo (C3) |
| `CLAUDE.md` (contrato REST) | No lista `GET /metrics/history`, `GET /evaluables`, `GET /cohorts`, `GET /clans`, CRUD completo de `/forms`, `/categories`, `/users` (PUT/PATCH/DELETE), `PATCH /users` | Todos existen en `main.py`/routers |
| `CLAUDE.md` regla 10 / `docs/09` | Formulario "una pregunta a la vez" | `evaluate.view.js` muestra todas las preguntas en una página (M20) |
| `CLAUDE.md` / `conftest.py` | "`cp .env.test.example .env.test` + `python tests/bootstrap_test_db.py`" | Ninguno de los dos archivos está en el repo (A7) |
| `schemas/evaluation_details.py` | Docstring: en anónimas "el vínculo nunca llega a guardarse" | El service lo guarda siempre (C4) |
| `settings.view.js` tooltips | "No hay tarea programada ni disparo por evento" (ai_auto_summary) | Sí lo hay desde commit `3161679` (C3) |
| `ai-summary.view.js` | "usando Claude AI" | Google Gemini (`ai_service.py`) |
| `frontend/src/services/evaluation.service.js` (comentarios) | "en las anónimas `form_id/status/submitted_at` llegan en null" | El LEFT JOIN los puebla siempre salvo evaluación borrada (C4) |
| `.claude/skills/guia-generativa` | "Claude API", "ICA por área", capas `store/`, `models/` | Gemini, ICP, no existen esas capas |
| `docs/06-arquitectura.md` | En general **sí** está alineado (sin JWT, sin store, sin models, repositories) | ✔ el doc más confiable del repo junto con `01_ddl.sql` |

---

## 7. Evaluación por principios

- **SOLID/SRP:** buena en backend (módulo por entidad, excepciones por dominio, DI opcional en services). Se rompe en `dashboard.view.js` (585 líneas mezclando datos, estado, markup y charts de 3 roles) y `admin/evaluations.view.js` (909 líneas).
- **DRY:** el punto más débil. Duplicados citados en M3, medallas SVG copiadas 6 veces en dashboard, dos pipelines de error fetch (api.service vs settings.service — este último al menos documentado como deuda), fachadas repetidas en 10 services.
- **KISS/YAGNI:** el backend es razonablemente simple. YAGNI violado por: fachadas sin consumidores, tipos fantasma (`open_text`/`scale_1_5`) filtrándose del builder al formulario del coder (¡causando C2!), `hasDangerousChars` que rechaza `/` en contraseñas (falso positivo de "seguridad").
- **Separation of concerns:** correcta en general; violaciones puntuales A4 y M4. En frontend, las vistas respetan services→fetch; el DOM no se toca desde services. ✔
- **Fail fast / programación defensiva:** los guards de conftest (BD `_test`) son ejemplares. En cambio `generate_missing_summaries_for_period` traga todas las excepciones y convierte un bug duro (C3) en silencio.
- **Ley de Demeter / Tell-don't-ask:** sin violaciones graves; los services orquestan dicts simples.

## 8. Seguridad (resumen)

- **SQL Injection:** no encontrada. Todo el SQL usa parámetros ligados; los dos `set_clause` dinámicos (`user_repository.update_user`, `form_repository.update_form`, `period_repository.update_period`) interpolan **nombres de columna** provenientes de whitelists del service, no input del usuario. ✔
- **XSS:** 3 vectores (A3). El resto escapa consistentemente.
- **AuthN/AuthZ:** inexistente por diseño documentado (sin JWT; RBAC solo cosmético). Esto convierte en públicos: CRUD de usuarios, settings, resúmenes IA, export de bitácora, activación de periodos. Está asumido y documentado en CLAUDE.md/docs/06 como tradeoff — el reporte lo registra como **riesgo estructural aceptado**, con la nota de que la única corrección real es un mecanismo de sesión verificable, no parches.
- **Enumeración de usuarios:** A6.
- **Contraseñas:** bcrypt correcto, nunca devueltas (UserOut las excluye), hash malformado tratado como credencial inválida. ✔
- **Fugas de información:** el `error_id` opaco del handler global está bien resuelto. `login` con `verify_password` no tiene rate-limit (aceptable MVP).
- **CSRF:** irrelevante sin cookies de sesión.
- **CORS:** lista explícita de orígenes; correcto.

## 9. Performance

- Sin N+1: `_attach_answers`, `get_questions_for_forms` y `get_evaluator_ids_for_evaluations` baten por lotes con `IN`. ✔
- `vw_period_metrics` recalcula todo on-read sin índices compuestos (M19) — fino hoy, límite conocido a futuro.
- Dashboard TL hace 2 requests de `metrics/summary` secuenciales (actual + anterior) y el flujo admin recarga todo el dashboard al cambiar de periodo — aceptable, mejorable con caché en memoria de la vista.
- `generate_missing_summaries_for_period` (si se arreglara) mantendría una conexión abierta durante N llamadas a Gemini (M15).
- Frontend: `renderRoute` re-renderiza la vista completa con `innerHTML` (patrón asumido del stack vanilla); listeners delegados correctamente en las vistas nuevas; el listener global de dropdowns se auto-limpia con `document.contains`. Sin leaks graves detectados.

## 10. Base de datos

- **Normalización:** 3FN real (catálogos `roles`/`categories`, N:M `user_roles`/`team_leader_clans`, sin grupos repetidos, sin dependencias parciales). ✔
- **Integridad:** FKs completas con políticas deliberadas y comentadas (RESTRICT para histórico, SET NULL en `evaluation_id`, CASCADE en detalles). `uq_submission_once` es la joya del esquema: convierte la regla de negocio nº 2 en autoridad de BD. CHECKs en rangos y singleton de settings. ✔
- **Tipos:** correctos (`DECIMAL(5,2)` para umbrales con el fix documentado, ENUM para status + CHECK redundante para portabilidad).
- **Deudas:** `forms.is_form` con semántica invertida al nombre (TRUE = plantilla base, no formulario) — confusión garantizada; el catálogo de plantillas (`is_form`) **no está documentado en CLAUDE.md ni en docs/07**; falta índice compuesto (M19); tres copias de los defaults de settings (documentado como decisión consciente).

---

## 11. Plan de refactor priorizado (sin ejecutar — para decisión del equipo)

| # | Cambio | Por qué | Beneficio | Riesgo | Prioridad | Esfuerzo |
|---|--------|---------|-----------|--------|-----------|----------|
| 1 | Fix C2 (respuestas `text` en evaluate.view) | Pérdida de datos activa | Feedback cualitativo vuelve a existir | Nulo | P0 | 15 min |
| 2 | Fix C1 (`FormRepository.delete_form` soft-delete) | Endpoint roto + test rojo | CRUD de plantillas completo, suite verde | Bajo | P0 | 1 h |
| 3 | Resolver C3 (revertir disparo o terminar feature) | Estado incoherente en 4 sitios | Coherencia código/doc/UI | Bajo/Medio | P0 | 1-6 h |
| 4 | Alinear modelo de anonimato (C4): README + UI + evaluation.service | Regla nº 1 del dominio contada de dos formas | Sustentación defendible; feature decidida disponible | Medio | P0 | 3-5 h |
| 5 | Fix A1/A2 (dashboard: import real, quitar shadow y globals, dibujar dona admin) | Cards principales mienten | Dashboard confiable (quejas del equipo resueltas) | Bajo | P1 | 2 h |
| 6 | A7: commitear bootstrap de tests + suite verde | Onboarding y CI imposibles hoy | Cualquiera corre pytest | Bajo | P1 | 1-2 h |
| 7 | A3: sanitizar marked + borrar modal muerto + escapes sueltos | XSS | Cierre de vectores | Bajo | P1 | 2 h |
| 8 | A6: unificar 401 en login (backend + front) | Enumeración gratuita | Seguridad barata | Bajo | P1 | 30 min |
| 9 | M5/M6: limpiar raíz + dependencias muertas (`html2pdf.js`, badge, modal) | Higiene del entregable | Repo presentable | Nulo | P1 | 30 min |
| 10 | A4: llevar cohorts/clans a service+repository | Única ruptura de capas en routes | Arquitectura uniforme (rúbrica) | Bajo | P2 | 1-2 h |
| 11 | A5: mover `conn` global a tests | Conexión fantasma en prod | Pool limpio | Bajo | P2 | 30 min |
| 12 | M7/M9: metadatos index.html + rutas de assets | Identidad y build de producción | Deploy sin logos rotos ni SEO de "tareas" | Nulo | P2 | 30 min |
| 13 | M3/M4: DRY backend (has_active_period, fachadas, queries inline) | Deuda estructural | Mantenibilidad | Bajo | P2 | 2-3 h |
| 14 | M1/M2: multi-rol correcto (SQL + sidebar) | Diseño N:M a medias | Consistencia de dominio | Medio | P3 | 2-4 h |
| 15 | M18: handlers globales de excepciones + logging con traceback | 40 bloques repetidos | Menos boilerplate, mejor diagnóstico | Medio | P3 | 3-4 h |

---

## 12. Resumen ejecutivo y métricas

**Volumen:** backend ~3.900 LOC Python (43 módulos) · frontend ~6.400 LOC JS + 361 CSS (57 módulos) · SQL ~6.000 líneas (5.300 son mock) · 47 tests de integración backend, 1 archivo de tests frontend.

| Dimensión | Nota (1-10) | Justificación |
|-----------|------------|---------------|
| Arquitectura | 7.5 | Capas reales y respetadas casi siempre; docs/06 y el DDL son de calidad notable. Penalizan A4, M4 y los dos "modelos de verdad" del anonimato |
| Backend | 7 | Patrón consistente, transacciones correctas, constraint-first. Penalizan C1, C3, boilerplate de errores y fachadas muertas |
| Frontend | 5 | Services/vistas bien separados y buen trabajo de a11y en partes (dropdown, modales), pero C2, A1-A3, código muerto, textos que mienten y archivos de 600-900 líneas |
| Base de datos | 8.5 | Lo mejor del proyecto: 3FN real, integridad deliberada y documentada en el propio DDL, unicidad de negocio en BD |
| Pruebas | 5.5 | Buenas pruebas de reglas de negocio, pero suite roja, bootstrap ausente y cero cobertura del front |
| Documentación | 5 | Extensa y en partes excelente (DDL, docs/06, comentarios de services), pero con contradicciones activas en lo más sensible (anonimato, ai_auto_summary, README) |
| **Mantenibilidad global** | **6** | Deuda concentrada y bien localizada; nada exige reescritura |
| **Escalabilidad** | **7** | Pool + vistas + batch queries aguantan la escala Riwi; límites conocidos (índices, ICP on-read) |
| **Deuda técnica** | **Media-alta, mapeada** | La mayor parte está *documentada por el propio equipo* (rasgo positivo poco común); lo grave es lo no documentado: C1-C4 |

**Fortalezas principales:**
1. Esquema de BD con integridad de negocio real (`uq_submission_once`, FKs con política razonada, singleton CHECK) — defendible en sustentación.
2. Lógica de negocio identificable y no-CRUD: ICP ponderado on-read, ventana de periodo única, versionado de preguntas con chequeo semántico IA, anti-duplicado en dos capas.
3. Patrón routes→services→repositories aplicado con disciplina en 10 entidades, con transacciones (`engine.begin`) y traducción de `IntegrityError` a 409.
4. Cultura de documentar tradeoffs en el código (comentarios de `evaluation_service`, `settings_service`, `conftest`) — cuando el comentario y el código coinciden, es de lo mejor del repo.
5. Accesibilidad por encima de lo esperable en un MVP vanilla (aria en dropdowns, focus-trap, estados aria-busy/aria-live).

**Debilidades principales:**
1. Dos funcionalidades núcleo rotas en silencio (C1, C2) — una con test rojo que nadie miró.
2. La regla de negocio insignia (anonimato) contada de tres formas incompatibles entre backend, frontend/UX y README (C4).
3. Cambios recientes que violaron el propio modo de operación del repo: features cableadas a métodos inexistentes (C3), rutas fuera de capas (A4), globals `window.*` con comentario de "suponiendo que existe" (A1) — patrón de código generado sin verificar ("vibe coding") que CLAUDE.md prohíbe explícitamente.
4. Frontend con restos de otra plantilla (taskflow, "gestión de tareas", /register) y controles decorativos.
5. Evidencia Git muy concentrada en una persona frente a una rúbrica que puntúa autoría individual.

**Estado general:** MVP funcional en sus flujos principales (login, evaluar con escala/sí-no, métricas, resumen IA, administración de periodos/pesos), con una base de datos y una capa de servicios sólidas, y una capa de presentación que quedó por detrás del backend tras la migración al modelo `evaluation_submissions`. Ninguno de los 4 críticos exige rediseño: los cuatro son corregibles en un total estimado de 1-2 días de trabajo, y el nº 3 y nº 4 requieren primero una decisión del equipo, no código.
