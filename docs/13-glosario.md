# 13 — Glosario de términos (en palabras simples)

Este documento explica, en lenguaje sencillo, los términos que aparecen en el proyecto. La idea es
que **cualquier integrante pueda sustentar su parte** sin miedo al vocabulario técnico. Cada término
trae una analogía o ejemplo.

> Regla mental: casi todo el proyecto es **"el frontend pide, el backend responde, la base de datos
> guarda"**. El resto son detalles de cómo se organiza cada parte.

---

## 1. Conceptos generales

| Término | En simple |
|---------|-----------|
| **Frontend** | Lo que el usuario ve y toca en el navegador (pantallas, botones, formularios). Vive en `frontend/`. |
| **Backend** | El "cerebro" que corre en un servidor: recibe peticiones, aplica reglas y habla con la base de datos. Vive en `backend/`. |
| **Base de datos (BD)** | Donde se guarda la información de forma permanente (usuarios, evaluaciones). Aquí usamos **MySQL**. |
| **API REST** | El "menú" de acciones que el backend ofrece al frontend, por internet. Cada acción es una **URL** (ej. `/auth/login`). REST es solo un estilo ordenado de nombrar esas URLs. |
| **Endpoint** | Una dirección concreta de la API. Ej: `POST /evaluations` = "crear una evaluación". |
| **JSON** | El formato de texto en que frontend y backend se mandan datos. Parecen objetos: `{ "nombre": "Ana" }`. |
| **HTTP / HTTPS** | El idioma en que viajan las peticiones por internet. HTTPS es lo mismo pero cifrado (seguro). |
| **Petición / Respuesta** | El frontend **pide** (request) y el backend **responde** (response). Como pedir en un restaurante y recibir el plato. |
| **Código HTTP** | Un número que resume cómo salió la petición: `200` ok, `400` pediste mal, `401` no autenticado, `403` sin permiso, `404` no existe, `409` conflicto (ej. duplicado), `500` error del servidor. |

---

## 2. Frontend (la SPA)

| Término | En simple |
|---------|-----------|
| **SPA** (Single Page Application) | Una web de **una sola página** que cambia el contenido sin recargar. Da sensación de app. |
| **HTML / CSS / JS Vanilla** | HTML = estructura, CSS = estilos, JavaScript "vanilla" = JS puro **sin frameworks** (sin React/Vue/Angular). |
| **ES Modules** | Forma moderna de dividir el JS en archivos que se **importan** entre sí (`import`/`export`). Como piezas de Lego. |
| **Vista (`*.view.js`)** | Una pantalla completa (login, dashboard, evaluar). Devuelve el HTML de esa pantalla. |
| **Componente** | Un pedacito de UI reutilizable (navbar, badge, alerta). Se usa dentro de varias vistas. |
| **Router** | El que decide **qué vista mostrar** según la URL (`/dashboard`, `/login`). Sin recargar la página. |
| **Guard (guardia de ruta)** | Chequeo antes de mostrar una vista: "¿está logueado? ¿tiene el rol?". Si no, redirige. Es solo **experiencia de usuario**, no seguridad real. |
| **Store** | Una "cajita" central de estado compartido (ej. el usuario logueado) que varias partes leen. |
| **pub/sub** | "Publicar / suscribir": cuando el store cambia, **avisa** a quien esté escuchando para que se actualice. |
| **Service (`*.service.js`)** | La **única** capa del front que llama a la API. Las vistas no hacen `fetch` directo; le piden al service. |
| **`fetch`** | La función del navegador para llamar a la API por internet. |
| **Responsive / mobile-first** | Que se vea bien en celular y en PC. "Mobile-first" = se diseña primero para celular. |
| **BEM** | Convención para nombrar clases CSS de forma ordenada: `bloque__elemento--modificador`. |
| **History API** | Función de los navegadores que permite a la SPA cambiar la URL (ej. `/dashboard`) y guardar el historial sin tener que recargar toda la página web. |
| **View Transitions API** | Tecnología moderna del navegador que permite crear animaciones fluidas al cambiar de una vista a otra, sin requerir librerías pesadas. |
| **Graceful Degradation** | "Degradación elegante". Diseñar el sistema para que use tecnología avanzada si está disponible, pero si el usuario tiene un navegador viejo, siga funcionando con una experiencia más simple en lugar de romperse. |

---

## 3. Backend (FastAPI) y sus capas

El backend está organizado en **capas**: cada una tiene **un solo trabajo**. Una petición pasa por
ellas en orden (como una fábrica en línea):

```
route  →  service  →  repository  →  MySQL
```

En este proyecto son **3 capas** de código propio (no hay `model` separado): `route` valida y
delega, `service` tiene las reglas de negocio, y `repository` es quien de verdad escribe y ejecuta
el SQL contra MySQL.

| Capa / término | En simple |
|----------------|-----------|
| **FastAPI** | El framework de Python que usamos para construir la API. |
| **Route** | La "puerta de entrada" (carpeta `routes/`). Define los endpoints, valida lo que llega y devuelve la respuesta. **No** tiene reglas de negocio. |
| **Service** | El **cerebro**: aquí viven las **reglas de negocio** (calcular métricas, revisar anonimato, evitar duplicados). Es la parte "que no es solo CRUD". Ya **no** ejecuta SQL: se lo pide al `repository` correspondiente. |
| **Model** | No hay una capa `models/` en Python: la forma de cada tabla vive en `database/01_ddl.sql`. |
| **Repository** | Sí existe: `backend/app/repositories/`, **un archivo por entidad** (10 en total). Guarda las consultas SQL (`text()`) para que los `services/` no las tengan mezcladas con las reglas de negocio. El flujo completo es `routes/ → services/ → repositories/ → MySQL`. |
| **Schema (Pydantic)** | El "molde" que define **qué forma** deben tener los datos que entran y salen. Si no cumplen, se rechazan. **Pydantic** es la librería líder en Python para hacer esta validación ultra-rápida basada en tipos. |
| **CRUD** | Create, Read, Update, Delete = crear, leer, actualizar, borrar. Lo básico de una BD. La rúbrica pide **más que CRUD** (por eso las métricas y la lógica de negocio). |
| **DTO (Data Transfer Object)** | Objeto (como una caja) que se usa puramente para llevar datos de un lado a otro (ej. del backend al frontend) sin lógica. Los Schemas de Pydantic cumplen esta función. |
| **Manejo Opaco de Errores** | Estrategia de seguridad donde, si el servidor falla, no le cuenta al usuario *por qué* falló (para no revelar código o SQL), sino que le da un código (UUID) y guarda el secreto en los logs internos para que los desarrolladores lo revisen. |

> **¿Por qué separar en capas?** Para que cada archivo sea pequeño y fácil de entender, no repetir
> código (**DRY**) y que cada persona pueda explicar "su" capa. Si mañana cambia una regla de
> negocio, solo se toca el archivo de `services/` de esa entidad; el route no se entera.

---

## 4. Seguridad y usuarios

| Término | En simple |
|---------|-----------|
| **Autenticación** | Comprobar **quién eres** (login con correo y contraseña). |
| **Autorización** | Comprobar **qué puedes hacer** (tu rol). Autenticado ≠ autorizado. |
| **JWT** (JSON Web Token) | Un "carnet" digital firmado que un backend con sesión te daría al iniciar sesión, para probar quién eres en cada petición sin repetir la contraseña. **Riwi LeadTrace no lo usa**: no se emiten tokens (ver `CLAUDE.md`, "Sin JWT"). |
| **Token** | El texto de ese carnet. En este proyecto no existe: el login devuelve `{ user }`, sin token que guardar. |
| **Hash / bcrypt** | Convertir la contraseña en un texto irreversible antes de guardarla. Así, **nunca** guardamos la contraseña real. `bcrypt` es el algoritmo que usamos. |
| **RBAC** (Role-Based Access Control) | Control de acceso **según el rol**. Ej: solo `admin` debería ver el dashboard. **En este proyecto NO se aplica de verdad en el backend** (no hay JWT ni sesión para verificar el rol): el backend confía en el rol/ID que manda el propio front (`viewer_role`, `?role=`, etc.) y solo lo usa para filtrar datos. La única barrera real hoy es la del **frontend** (oculta rutas/opciones), que es UX, no seguridad. |
| **Rol** | El "tipo" de usuario: `coder`, `tutor`, `team_leader`, `admin`. Un usuario puede tener **más de uno a la vez** (tabla `user_roles`, N:M) — por ejemplo, ser `tutor` y `team_leader` al mismo tiempo. Define qué ve y hace. |
| **`401` / `403`** | `401` = no has iniciado sesión (o el carnet venció). `403` = estás logueado pero **no tienes permiso**. |
| **CORS** | Permiso que el backend da para que el frontend (que corre en otra dirección) pueda llamarlo. |

---

## 5. Base de datos

| Término | En simple |
|---------|-----------|
| **MySQL** | El motor de base de datos que guarda todo en **tablas** (filas y columnas). |
| **Tabla** | Una "hoja de Excel": cada fila es un registro (un usuario), cada columna un dato (su correo). |
| **ORM** | "Object-Relational Mapping": una traducción para manejar las tablas como **objetos de Python** en vez de escribir SQL a mano. |
| **SQLAlchemy** | La libreria que usamos para hablarle a MySQL desde Python. Tiene una capa ORM completa, pero en este proyecto **solo usamos su motor de conexion y `text()`** (SQL plano) — no mapeamos tablas a clases ni usamos su ORM declarativo. |
| **PyMySQL** | El "cable" que conecta SQLAlchemy con MySQL. |
| **Connection Pooling** | "Piscina de conexiones". Mantener un grupo de conexiones a la base de datos abiertas y listas para usarse, en lugar de conectar y desconectar desde cero con cada petición (lo cual es muy lento). |
| **CQRS (Ligero)** | "Command Query Responsibility Segregation". Patrón arquitectónico que separa la forma en que *escribes* datos (Commands, en repositorios) de la forma en que los *lees* (Queries, usando vistas SQL virtuales para métricas). |
| **FK (Foreign Key / llave foránea)** | Una columna que **apunta** a otra tabla. Ej: una evaluación guarda el `id` del usuario evaluado. Mantiene los datos conectados y consistentes. |
| **3FN (Tercera Forma Normal)** | Regla de diseño para **no repetir datos** y evitar inconsistencias. En resumen: cada dato vive en un solo lugar. |
| **Índice único** | Regla en la BD que impide filas repetidas. Aquí es `uq_submission_once (evaluator_id, evaluatee_id, period_id)` sobre la tabla **`evaluation_submissions`**: evita que un coder evalúe dos veces a la misma persona en el mismo periodo, **incluidas las anónimas**, porque esas tres columnas nunca son NULL. El índice viejo `uq_eval_once` (sobre `evaluations`) **ya no existe**: indexaba `evaluator_id`, que era NULL en las anónimas, y MySQL permite **varios NULL** en un índice único — por eso dejaba pasar duplicados anónimos. Ver la regla 2 de `CLAUDE.md`. |
| **Seed** | Datos iniciales de ejemplo que se cargan en la BD para poder probar (usuarios, formularios). |

---

## 6. Lógica de negocio propia del proyecto

| Término | En simple |
|---------|-----------|
| **Feedback ascendente** | Que los **coders evalúen a quienes los acompañan** (Team Leaders y Tutores), no al revés. |
| **ICP** (Índice de Calidad Percibida) | Un puntaje de **0 a 100** que resume qué tan bien acompaña un TL/Tutor **según la percepción de los Coders**: es el promedio de sus respuestas tipo escala, normalizado. Es el corazón "no-CRUD" del backend. Mide percepción, no aprendizaje real (por eso se llama "percibida"). |
| **ICP "derivado, no se persiste"** | El ICP **no se guarda** en la BD: se **calcula al momento** de pedirlo, a partir de las evaluaciones. Así siempre está actualizado. |
| **Mínimo de respuestas** | El ICP solo se muestra si hay al menos N evaluaciones enviadas; con menos, se muestra "datos insuficientes" en vez de un puntaje poco confiable. N **ya no es una constante fija**: es el ajuste configurable `system_settings.required_evaluations` (default 3), que aplica `metrics_repository.py`. Ya no existe ninguna constante `MIN_EVALUATIONS`. |
| **Periodo** | La ventana de tiempo de una ronda de evaluaciones (ej. un sprint/mes). |
| **Periodo activo** | El único periodo "abierto": mientras esté activo, los Coders ven y envían formularios. El **admin** lo activa/cierra. Sin periodo activo, la SPA muestra "No hay formularios por realizar". |
| **Versionar una pregunta** | Cuando el admin edita el texto de una pregunta, **no se sobrescribe**: se crea una pregunta nueva y la vieja se desactiva. Las respuestas históricas conservan el texto original que respondieron. |
| **Deriva semántica** | El riesgo de que una pregunta editada **deje de medir su categoría** (ej. una de cercanía reescrita como desempeño general): las respuestas se pesarían bajo la categoría equivocada. Se previene con la regla **"reformular, no re-temar"**: editar solo mejora la redacción; para otro tema, se desactiva la pregunta y se crea una nueva en su categoría. Al guardar, **la IA comprueba** que el texto siga midiendo su categoría y advierte si no (el admin debe confirmar). Y como se edita con periodo cerrado y versionando, cualquier desvío se revierte antes de que alguien responda. |
| **Anonimato real** | Si una evaluación es anónima, **nunca se guarda el vínculo** entre la persona y lo que respondió. La BD sabe *que* participaste (fila en `evaluation_submissions`) y sabe *qué respuestas* hay (fila en `evaluations`), pero **no hay nada que las una**: la columna de enlace `evaluation_id` queda en NULL. Ni el admin, ni nadie con acceso directo a la base, puede reconstruirlo. Efecto secundario buscado: **tú tampoco** puedes volver a ver tus respuestas anónimas — si pudieras tú, podría el admin. |
| **`evaluation_submissions`** | Tabla que guarda **la participación** (quién evaluó a quién, en qué periodo), separada de `evaluations`, que guarda **el contenido**. Es lo que hace posible tener a la vez anonimato real y control de duplicados: el evaluador siempre se registra, pero solo se conecta con sus respuestas si la evaluación **no** es anónima. |
| **No-duplicado** | Un coder no puede evaluar dos veces a la misma persona en el mismo periodo. |
| **Resumen con IA** | Un texto ejecutivo que **Gemini** (IA) genera para el **admin**, resumiendo el feedback. Solo se le envían **datos agregados y anónimos**. |
| **Agregado / anonimizado** | "Agregado" = promedios y conteos, no respuestas individuales. "Anonimizado" = sin nombres ni identidades. |
| **Google Gemini** | El servicio de IA de Google al que el backend llama para generar ese resumen (y para el chequeo de coherencia de preguntas). |

---

## 7. Git y entrega

| Término | En simple |
|---------|-----------|
| **GitFlow** | Forma ordenada de usar ramas: `main` (producción) ← `develop` (integración) ← `feature/...` (una tarea). |
| **Rama (branch)** | Una copia paralela del código para trabajar sin romper lo demás. |
| **Commit** | Una "foto" guardada de tus cambios, con un mensaje que explica qué hiciste. |
| **Conventional Commits** | Convención para los mensajes: `feat(...)` nueva función, `fix(...)` arreglo, `docs(...)` documentación. |
| **Pull Request (PR)** | Propuesta de unir tu rama a otra, para que el equipo la revise antes de mezclar. |
| **DoD (Definition of Done)** | La lista de condiciones para considerar una historia **terminada**. |
| **MVP** | "Producto Mínimo Viable": lo **mínimo** que sirve para probar la idea. Lo que sobra, se pospone (ver `09-mvp-alcance.md`). |
| **`.env`** | Archivo con datos secretos/configuración (contraseña de BD, clave de IA). **No** se sube a Git. |

---

## ¿Sigo con dudas de un término?

1. Búscalo aquí primero.
2. Si no está, mira dónde aparece en `/docs` (tabla en `CLAUDE.md`).
3. Si aún no queda claro, pídele a la IA que te lo explique **con una analogía y un ejemplo del
   propio proyecto** — para eso está el modo *guía generativa*.
