# 12 — Glosario de términos (en palabras simples + referencias técnicas)

Este documento explica, en lenguaje sencillo, los términos que aparecen en el proyecto. La idea es
que **cualquier integrante pueda sustentar su parte** sin miedo al vocabulario técnico. Cada término
trae una analogía o ejemplo, y ahora también **dónde aparece exactamente en el código** (archivo o
carpeta), para que puedas ir directo a verlo.

> Regla mental: casi todo el proyecto es **"el frontend pide, el backend responde, la base de datos
> guarda"**. El resto son detalles de cómo se organiza cada parte.


---

## 1. Conceptos generales

| Término | En simple | Dónde se ve en el proyecto |
|---------|-----------|-----------------------------|
| **Frontend** | Lo que el usuario ve y toca en el navegador (pantallas, botones, formularios). Vive en `frontend/`. | Carpeta `frontend/src/` completa (componentes, vistas, servicios, router). |
| **Backend** | El "cerebro" que corre en un servidor: recibe peticiones, aplica reglas y habla con la base de datos. Vive en `backend/`. | Carpeta `backend/app/` (routes, services, schemas, config). |
| **Base de datos (BD)** | Donde se guarda la información de forma permanente (usuarios, evaluaciones). Aquí usamos **MySQL**. | `database/schema.sql`, conexión en `backend/app/config/database.py`. |
| **API REST** | El "menú" de acciones que el backend ofrece al frontend, por internet. Cada acción es una **URL** (ej. `/auth/login`). REST es solo un estilo ordenado de nombrar esas URLs. | Construida con **FastAPI**; endpoints como `GET /periods`, `POST /periods`. |
| **Endpoint** | Una dirección concreta de la API. Ej: `POST /evaluations` = "crear una evaluación". | Definidos con decoradores `@router.get(...)`, `@router.post(...)` en `backend/app/routes/`. |
| **JSON** | El formato de texto en que frontend y backend se mandan datos. Parecen objetos: `{ "nombre": "Ana" }`. | Cuerpo de las peticiones/respuestas de la API; validado por los `schemas/` (Pydantic). |
| **HTTP / HTTPS** | El idioma en que viajan las peticiones por internet. HTTPS es lo mismo pero cifrado (seguro). | Todas las llamadas frontend→backend. |
| **Petición / Respuesta** | El frontend **pide** (request) y el backend **responde** (response). Como pedir en un restaurante y recibir el plato. | Encapsulado en `frontend/src/services/api.service.js` mediante la función `request()` (usa **Fetch API** del navegador). |
| **Código HTTP** | Un número que resume cómo salió la petición: `200` ok, `400` pediste mal, `401` no autenticado, `403` sin permiso, `404` no existe, `409` conflicto (ej. duplicado), `500` error del servidor. | Usados con `HTTPException`/`status` de FastAPI en los `services/` del backend, ej. `status.HTTP_409_CONFLICT` en `evaluation_service.py`. |

---

## 2. Frontend (la SPA)

| Término | En simple | Dónde se ve en el proyecto |
|---------|-----------|-----------------------------|
| **SPA** (Single Page Application) | Una web de **una sola página** que cambia el contenido sin recargar. Da sensación de app. | Toda la app en `frontend/`, enrutamiento manejado en `router/router.js`. |
| **HTML / CSS / JS Vanilla** | HTML = estructura, CSS = estilos, JavaScript "vanilla" = JS puro **sin frameworks** (sin React/Vue/Angular). | Todo `frontend/src/`; no hay dependencia de React/Vue en `package.json`. |
| **ES Modules** | Forma moderna de dividir el JS en archivos que se **importan** entre sí (`import`/`export`). Como piezas de Lego. | `"type": "module"` en `package.json`; imports en todos los `.js` del frontend. |
| **Vite** | Herramienta de build y servidor de desarrollo rápido para proyectos web modernos. Es lo que empaqueta y sirve el JS vanilla de arriba. | `vite.config.ts`; scripts `dev`/`build`/`preview` en `package.json`. |
| **Vitest** | Framework de pruebas unitarias, integrado con Vite (mismo motor, para no montar otra herramienta aparte). | Script `test` en `package.json`; pruebas como `utils/validators.test.js`. |
| **Tailwind CSS** | Framework CSS de utilidades: en vez de escribir CSS a mano, usas clases ya hechas (`rounded-2xl`, `bg-...`). | Dependencias `tailwindcss` y `@tailwindcss/vite`; clases visibles en todas las vistas y componentes. |
| **Variables CSS (Custom Properties)** | Variables reutilizables para colores/tamaños, para no repetir el mismo valor en 20 archivos (relacionado con el principio **DRY**, ver sección 3). | `--brand-bg`, `--text-main`, `--border-main` definidas en `styles/global.css` y usadas en toda la UI (theming). |
| **Vista (`*.view.js`)** | Una pantalla completa (login, dashboard, evaluar). Devuelve el HTML de esa pantalla. | Carpeta `frontend/src/views/`, separada por rol: `admin/`, `coder/`, `tutor/`, `team-leader/`. |
| **Componente** | Un pedacito de UI reutilizable (navbar, badge, alerta). Se usa dentro de varias vistas. | Carpeta `frontend/src/components/`: `navbar.js`, `dropdown.js`, `badge.js`, `sidebar.js`, `emptyState.js`, `statusBadge.js`. |
| **Router** | El que decide **qué vista mostrar** según la URL (`/dashboard`, `/login`). Sin recargar la página. | `frontend/src/router/router.js` y `routes.js`; escucha `popstate` y clics en `<a>`. |
| **Guard (guardia de ruta)** | Chequeo antes de mostrar una vista: "¿está logueado? ¿tiene el rol?". Si no, redirige. Es solo **experiencia de usuario**, no seguridad real (la seguridad real la hace el backend). | Lógica dentro de `router.js`, apoyada en `authService.getSession()`. |
| **Store** | Una "cajita" central de estado compartido (ej. el usuario logueado) que varias partes leen. | En este proyecto la sesión se guarda directamente en **localStorage** (ver fila siguiente), sin un store dedicado como Redux. |
| **localStorage** | Memoria del navegador donde el store guarda datos que sobreviven aunque cierres la página. | `frontend/src/services/auth.service.js`: `setSession`/`getSession`/`clearSession` sobre la clave `SESSION_KEY = "SESSION_ACTUAL"`. |
| **DOM (Document Object Model)** | La representación en "árbol" del HTML que JavaScript puede leer y modificar directamente. | Las vistas generan HTML como texto (template strings) que luego se inserta en el DOM. |
| **pub/sub** | "Publicar / suscribir": cuando el store cambia, **avisa** a quien esté escuchando para que se actualice. | Patrón mencionado como referencia de diseño; en la práctica el router vuelve a renderizar la vista tras cambios de sesión. |
| **Service (`*.service.js`)** | La **única** capa del front que llama a la API. Las vistas no hacen `fetch` directo; le piden al service. | Carpeta `frontend/src/services/`: `api.service.js`, `auth.service.js`, `evaluables.service.js`, `evaluation.service.js`, `metrics.service.js`, `periods.service.js`, `theme.service.js`, `users.service.js`. |
| **`fetch` / Fetch API** | La función nativa del navegador para llamar a la API por internet de forma asíncrona. | Usada dentro de `api.service.js`, encapsulada en la función `request()` para no repetirla en cada service. |
| **Responsive / mobile-first** | Que se vea bien en celular y en PC. "Mobile-first" = se diseña primero para celular. | Clases responsive de Tailwind; imágenes de fondo específicas `fondo-horizontal.webp` / `fondo-vertical.webp` en `public/backgrounds/`. |
| **BEM** | Convención para nombrar clases CSS de forma ordenada: `bloque__elemento--modificador`. | Convención de referencia para CSS a medida (fuera de las utilidades de Tailwind). |
| **i18n / Lang Switcher** | Internacionalización: preparar la interfaz para mostrarse en más de un idioma. | Componente `frontend/src/components/lang-switcher.js`. |
| **Toast / Alert** | Notificación visual temporal para avisar algo al usuario (éxito, error, confirmación). | Componente `alerts.js` con `showToast`, apoyado en la librería `sweetalert2`. |
| **Exportar a PDF** | Generar un archivo PDF desde lo que se ve en el navegador, sin pasar por el backend. | Librería `html2pdf.js`, incluida como dependencia del frontend. |

---

## 3. Backend (FastAPI) y sus capas

El backend está organizado en **capas**: cada una tiene **un solo trabajo**. Una petición pasa por
ellas en orden (como una fábrica en línea):

```
router  →  service  →  (SQL directo vía SQLAlchemy)  →  MySQL
```

| Capa / término | En simple | Dónde se ve en el proyecto |
|----------------|-----------|-----------------------------|
| **FastAPI** | El framework de Python que usamos para construir la API: valida datos automáticamente y genera documentación sola. | `requirements.txt` (`fastapi==0.111.0`), punto de entrada `backend/app/main.py`. |
| **Route / Router (`APIRouter`)** | La "puerta de entrada" (carpeta `routes/`). Define los endpoints, valida lo que llega y devuelve la respuesta. **No** tiene reglas de negocio. | Cada archivo en `routes/` crea su propio `router = APIRouter()`: `auth_routes.py`, `evaluation_routes.py`, `period_routes.py`, `metrics_routes.py`, `question_routes.py`, `user_routes.py`, `form_routes.py`. |
| **Service** | El **cerebro**: aquí viven las **reglas de negocio** (calcular métricas, revisar anonimato, evitar duplicados) **y** las consultas a la BD. Es la parte "que no es solo CRUD". | Carpeta `backend/app/services/`: `evaluation_service.py`, `metrics_service.py`, `period_service.py`, `ai_service.py`, `auth_service.py`, etc. |
| **Model** | No hay una capa `models/` en Python: la forma de cada tabla vive en `database/schema.sql` y los `services/` escriben SQL directo contra ella. | `database/schema.sql`. |
| **Schema (Pydantic)** | El "molde" que define **qué forma** deben tener los datos que entran y salen. Si no cumplen, se rechazan automáticamente. | `backend/app/schemas/`: `auth.py`, `evaluation.py`, `period.py`, `question.py`, `user.py`, `form_template.py`. |
| **Query (consulta SQL)** | La instrucción concreta que se le manda a MySQL para leer o modificar datos. | SQL crudo dentro de `text("...")`, ejecutado con `conn.execute(...)` en cada `*_service.py`. |
| **`deps.py`** | Funciones reutilizables que FastAPI "inyecta": saber quién es el usuario (`get_current_user`), exigir un rol (`require_role`). | Referencia de diseño en la documentación del proyecto; no se encontró un archivo `deps.py` explícito en el código actual empaquetado — la validación de sesión hoy vive del lado del frontend (ver sección 4). |
| **Uvicorn** | El servidor que realmente "prende" y corre la aplicación FastAPI. | Dependencia `uvicorn[standard]` en `requirements.txt`, usado para levantar `main.py`. |
| **Middleware / CORS** | Capa intermedia que procesa peticiones/respuestas antes de llegar a las rutas; CORS es el permiso para que el frontend (en otra dirección) pueda llamar al backend. | Configurado en `backend/app/main.py`. |
| **Pytest** | Framework de pruebas para Python: revisa que las reglas de negocio no se rompan al cambiar código. | Carpeta `backend/tests/`: `test_auth.py`, `test_evaluations.py`, `test_metrics.py`, `test_periods.py`, `test_questions.py`, `test_users.py`. |
| **CRUD** | Create, Read, Update, Delete = crear, leer, actualizar, borrar. Lo básico de una BD. La rúbrica pide **más que CRUD** (por eso las métricas y la lógica de negocio). | Ejemplo simple de CRUD: `period_routes.py` (crear/leer/actualizar/borrar periodos). Ejemplo de lógica "no-CRUD": `evaluation_service.py` y `metrics_service.py`. |

> **¿Por qué separar en capas?** Para que cada archivo sea pequeño y fácil de entender, no repetir
> código (**DRY**) y que cada persona pueda explicar "su" capa. Si mañana cambia una regla de
> negocio, solo se toca el archivo de `services/` de esa entidad; el route no se entera.

---

## 4. Seguridad y usuarios

| Término | En simple | Dónde se ve en el proyecto |
|---------|-----------|-----------------------------|
| **Autenticación** | Comprobar **quién eres** (login con correo y contraseña). | `backend/app/services/auth_service.py`, endpoint en `auth_routes.py`. |
| **Autorización** | Comprobar **qué puedes hacer** (tu rol). Autenticado ≠ autorizado. | Reglas de negocio por rol dentro de cada `service` (ej. "solo Admin" en `period_service.py`). |
| **Token** | El texto de ese "carnet". Se guarda en el navegador y viaja en cada petición. | Ver nota de JWT arriba: en el código actual no hay un token firmado; lo que viaja es el `evaluator_id` u otros datos planos en el body de la petición (ver comentario en `evaluation_service.py`: *"evaluator_id viene del body (sin JWT...)"*, lo cual **confirma** la discrepancia). |
| **Hash / bcrypt** | Convertir la contraseña en un texto irreversible antes de guardarla. Así, **nunca** guardamos la contraseña real. `bcrypt` es el algoritmo que usamos. | `backend/app/config/security.py`: `CryptContext(schemes=["bcrypt"])`, funciones `hash_password` / `verify_password` (vía librería `passlib`). |
| **RBAC** (Role-Based Access Control) | Control de acceso **según el rol**. Ej: solo `admin` ve el dashboard. Se aplica de verdad en el backend. | Roles `admin`, `coder`, `tutor`, `team-leader`; vistas separadas por rol en `frontend/src/views/`, reglas de "solo Admin" en comentarios de `period_service.py`, etc. |
| **Rol** | El "tipo" de usuario: `coder`, `tutor`, `team_leader`, `admin`. Define qué ve y hace. | Tabla `roles` en `database/schema.sql`; carpetas de vistas por rol en el frontend. |
| **`401` / `403` / `409`** | `401` = no has iniciado sesión (o credenciales inválidas). `403` = estás logueado pero **no tienes permiso**. `409` = conflicto, ej. algo duplicado. | `401` en `auth_service.py` (credenciales inválidas / usuario inactivo); `409` en `evaluation_service.py` (evaluación duplicada o periodo inactivo). |
| **CORS** | Permiso que el backend da para que el frontend (que corre en otra dirección) pueda llamarlo. | Configurado en `backend/app/main.py`. |
| **Variables de entorno (`.env`)** | Archivo con datos secretos/configuración (contraseña de BD, clave de IA). **No** se sube a Git. | `.env.example` en `frontend/` y `backend/`; cargado con `python-dotenv` en el backend. |

---

## 5. Base de datos

| Término | En simple | Dónde se ve en el proyecto |
|---------|-----------|-----------------------------|
| **MySQL** | El motor de base de datos que guarda todo en **tablas** (filas y columnas). | Motor de BD del proyecto. |
| **Tabla** | Una "hoja de Excel": cada fila es un registro (un usuario), cada columna un dato (su correo). | Definidas en `database/schema.sql` (`users`, `evaluations`, `periods`, `roles`, `questions`, `form_templates`, etc.). |
| **Esquema (schema.sql)** | El plano completo de cómo están armadas todas las tablas y sus relaciones. | `database/schema.sql`. |
| **ORM** | "Object-Relational Mapping": una traducción para manejar las tablas como **objetos de Python** en vez de escribir SQL a mano. En este proyecto se usa parcialmente: se usa SQLAlchemy pero con SQL crudo (`text()`), no con modelos ORM completos. | `backend/app/config/database.py`. |
| **SQLAlchemy** | La librería de Python que usamos para conectarnos y ejecutar consultas contra MySQL. | Importada como `from sqlalchemy import text` en todos los `*_service.py`. |
| **PyMySQL** | El "cable" (driver) que conecta SQLAlchemy con MySQL. | Dependencia `pymysql==1.1.1` en `requirements.txt`. |
| **FK (Foreign Key / llave foránea)** | Una columna que **apunta** a otra tabla. Ej: una evaluación guarda el `id` del usuario evaluado. Mantiene los datos conectados y consistentes. | Relaciones entre `evaluations` ↔ `users`, `periods`, `form_templates`; `questions` ↔ `form_templates`, en `schema.sql`. |
| **3FN (Tercera Forma Normal)** | Regla de diseño para **no repetir datos** y evitar inconsistencias. En resumen: cada dato vive en un solo lugar. | Principio de diseño aplicado en `database/schema.sql`. |
| **Índice único** | Regla en la BD que impide filas repetidas. Ej: evita que un coder evalúe dos veces a la misma persona en el mismo periodo. | Reforzado también a nivel de aplicación en `evaluation_service.py` (consulta de existencia antes de insertar). |
| **Seed** | Datos iniciales de ejemplo que se cargan en la BD para poder probar (usuarios, formularios). | Mencionado en comentario de `security.py` ("datos semilla de prueba"). |

---

## 6. Lógica de negocio propia del proyecto

| Término | En simple | Dónde se ve en el proyecto |
|---------|-----------|-----------------------------|
| **Feedback ascendente** | Que los **coders evalúen a quienes los acompañan** (Team Leaders y Tutores), no al revés. | Reflejado en las vistas `coder/evaluables.view.js`, `coder/evaluate.view.js`. |
| **Evaluación (Evaluation)** | El registro concreto de un feedback: quién evalúa, a quién, en qué periodo, con qué respuestas. | Entidad central: `evaluation_service.py`, `evaluation_routes.py`, tabla `evaluations`. |
| **ICP "derivado, no se persiste"** | El puntaje **no se guarda** en la BD: se **calcula al momento** de pedirlo, a partir de las evaluaciones. Así siempre está actualizado. | `metrics_service.py`, expuesto vía endpoint `GET /metrics/summary` en `metrics_routes.py`. |
| **Mínimo de respuestas** | El puntaje solo se calcula si hay al menos 3 evaluaciones enviadas (`MIN_EVALUATIONS`); con menos, se muestra "datos insuficientes" en vez de un puntaje poco confiable. | Constante `MIN_EVALUATIONS` en `metrics_service.py`, verificada en `test_metrics.py`. |
| **KPI (Key Performance Indicator)** | Indicador clave de desempeño en general (el ICP/ICA es un ejemplo de KPI del proyecto). | Calculado y agrupado en `metrics_service.py`, expuesto vía `/metrics/summary`. |
| **Periodo** | La ventana de tiempo de una ronda de evaluaciones (ej. un sprint/mes). | `period_service.py`, tabla `periods`. |
| **Periodo activo** | El único periodo "abierto": mientras esté activo, los Coders ven y envían formularios. El **admin** lo activa/cierra. Sin periodo activo, la SPA muestra "No hay formularios por realizar". | Verificado tanto en frontend (oculta el formulario) como forzado en backend, en `evaluation_service.py` (`period_row[0]` debe ser `True`, si no lanza `409`). |
| **Plantilla de formulario (Form Template)** | El conjunto de preguntas que le corresponde a cada rol (un Coder no responde el mismo formulario que un Tutor). | `form_service.py`: `get_form_template_by_role`, tabla `form_templates` filtrada por `target_role_id`. |
| **Versionar una pregunta** | Cuando el admin edita el texto de una pregunta, **no se sobrescribe**: se crea una pregunta nueva y la vieja se desactiva. Las respuestas históricas conservan el texto original que respondieron. | Lógica de negocio descrita en la documentación del proyecto (`question_service.py` es donde debería vivir esta regla). |
| **Deriva semántica** | El riesgo de que una pregunta editada **deje de medir su categoría** (ej. una de cercanía reescrita como desempeño general): las respuestas se pesarían bajo la categoría equivocada. Se previene con la regla **"reformular, no re-temar"**. | Regla de diseño documentada; conviene revisar `question_service.py` para confirmar su implementación actual. |
| **Anonimato real** | Si una evaluación es anónima, **nunca** se guarda quién la hizo. Ni el admin puede saberlo. | `evaluation_service.py`: `db_evaluator_id = None if eval_data.is_anonymous else evaluator_id`. |
| **No-duplicado** | Un coder no puede evaluar dos veces a la misma persona en el mismo periodo. | Consulta de existencia (`evaluator_id` + `evaluatee_id` + `period_id`) antes de insertar, en `evaluation_service.py`; lanza `409` si ya existe. |
| **Resumen con IA** | Un texto ejecutivo que **Gemini** (IA) genera para el **admin**, resumiendo el feedback. Solo se le envían **datos agregados y anónimos**. | `ai_service.py` (`get_or_generate_ai_summary`), endpoint `GET /metrics/ai-summary`, vista `admin/ai-summary.view.js`. |
| **Agregado / anonimizado** | "Agregado" = promedios y conteos, no respuestas individuales. "Anonimizado" = sin nombres ni identidades. | Regla de negocio explícita en `.claude/skills/guia-generativa/SKILL.md`: a la API de Gemini solo van agregados anonimizados, nunca identidades. |
| **Gemini API** | El servicio de IA de Google al que el backend llama para generar el resumen ejecutivo. | Librería `google-generativeai==0.8.2` en `requirements.txt`, usada en `ai_service.py`. |
| **LLM (Large Language Model)** | El tipo de modelo de IA que hay detrás de Gemini: entiende y genera texto en lenguaje natural. | Concepto general detrás del uso de la Gemini API. |
| **Prompt** | El texto de instrucciones que el backend arma y le manda a Gemini para pedirle el resumen. | Construido en `ai_service.py` a partir de los datos agregados y anonimizados del evaluado/periodo. |

---

## 7. Git y entrega

| Término | En simple | Dónde se ve en el proyecto |
|---------|-----------|-----------------------------|
| **GitFlow** | Forma ordenada de usar ramas: `main` (producción) ← `develop` (integración) ← `feature/...` (una tarea). | Obligatorio según la guía del proyecto; auditado por el agente `gitflow-auditor.md` (`.claude/agents/`). |
| **Rama (branch)** | Una copia paralela del código para trabajar sin romper lo demás. | Flujo de trabajo estándar del equipo (no visible como archivo, es práctica de Git). |
| **Commit** | Una "foto" guardada de tus cambios, con un mensaje que explica qué hiciste. | Práctica de Git del equipo. |
| **Conventional Commits** | Convención para los mensajes: `feat(...)` nueva función, `fix(...)` arreglo, `docs(...)` documentación, referenciando el ID de la historia de usuario. | Requerida en `.claude/skills/guia-generativa/SKILL.md` (punto 6, "Trazabilidad individual"). |
| **Pull Request (PR)** | Propuesta de unir tu rama a otra, para que el equipo la revise antes de mezclar. | Plantilla en `.github/pull_request_template.md`. |
| **Plantilla de Issue** | Formato estándar para reportar bugs u otros pendientes, para no perder información clave. | `.github/ISSUE_TEMPLATE/bug_report.md`. |
| **DoD (Definition of Done)** | La lista de condiciones para considerar una historia **terminada**. | Documentado en `docs/03-historias-de-usuario.md` (referenciado desde la guía generativa). |
| **MVP** | "Producto Mínimo Viable": lo **mínimo** que sirve para probar la idea. Lo que sobra, se pospone. | `docs/09-mvp-alcance.md`. |
| **SOLID** | 5 principios de diseño para que el código sea fácil de mantener y extender sin romper todo. | Exigido como principio no negociable en `.claude/skills/guia-generativa/SKILL.md`. |
| **DRY (Don't Repeat Yourself)** | No repetir la misma lógica en varios lugares; si se repite, se extrae a una función/servicio compartido. | Mismo documento de guía generativa; también aplicado en la capa `services/` (ver sección 3). |
| **Agentes de Claude Code** | Asistentes configurados para tareas específicas del equipo (revisar código, auditar GitFlow, escribir tests, sincronizar docs). | `.claude/agents/`: `code-reviewer.md`, `docs-sync.md`, `gitflow-auditor.md`, `rubric-fixer.md`, `test-writer.md`. |
| **`.env`** | Archivo con datos secretos/configuración (contraseña de BD, clave de IA). **No** se sube a Git. | `.env.example` en `frontend/` y `backend/` (plantilla pública, sin secretos reales). |

---

## ¿Sigo con dudas de un término?

1. Búscalo aquí primero.
2. Si no está, mira dónde aparece en `/docs` (tabla en `CLAUDE.md`).
3. Si aún no queda claro, pídele a la IA que te lo explique **con una analogía y un ejemplo del
   propio proyecto** — para eso está el modo *guía generativa*.