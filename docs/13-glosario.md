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

---

## 3. Backend (FastAPI) y sus 4 capas

El backend está organizado en **capas**: cada una tiene **un solo trabajo**. Una petición pasa por
ellas en orden (como una fábrica en línea):

```
router  →  service  →  repository  →  model  →  (MySQL)
```

| Capa / término | En simple |
|----------------|-----------|
| **FastAPI** | El framework de Python que usamos para construir la API. |
| **Router** | La "puerta de entrada". Define los endpoints, valida lo que llega y devuelve la respuesta. **No** tiene reglas de negocio. |
| **Service** | El **cerebro**: aquí viven las **reglas de negocio** (calcular ICP, revisar anonimato, evitar duplicados). Es la parte "que no es solo CRUD". |
| **Repository** | El "bibliotecario": el único que sabe **cómo buscar/guardar** datos en la BD (las consultas). |
| **Model** | La representación en Python de una **tabla** de la BD (ej. `User`, `Evaluation`). |
| **Schema (Pydantic)** | El "molde" que define **qué forma** deben tener los datos que entran y salen. Si no cumplen, se rechazan. |
| **`deps.py`** | Funciones reutilizables que FastAPI "inyecta": obtener la BD, saber quién es el usuario, exigir un rol. |
| **CRUD** | Create, Read, Update, Delete = crear, leer, actualizar, borrar. Lo básico de una BD. La rúbrica pide **más que CRUD** (por eso el ICP y la lógica de negocio). |

> **¿Por qué separar en capas?** Para que cada archivo sea pequeño y fácil de entender, no repetir
> código (**DRY**) y que cada persona pueda explicar "su" capa. Si mañana cambia la BD, solo se toca
> `repositories/`; el resto no se entera.

---

## 4. Seguridad y usuarios

| Término | En simple |
|---------|-----------|
| **Autenticación** | Comprobar **quién eres** (login con correo y contraseña). |
| **Autorización** | Comprobar **qué puedes hacer** (tu rol). Autenticado ≠ autorizado. |
| **JWT** (JSON Web Token) | Un "carnet" digital firmado que el backend te da al iniciar sesión. En cada petición lo muestras para probar quién eres, sin volver a poner la contraseña. |
| **Token** | El texto de ese carnet. Se guarda en el navegador y viaja en cada petición. |
| **Hash / bcrypt** | Convertir la contraseña en un texto irreversible antes de guardarla. Así, **nunca** guardamos la contraseña real. `bcrypt` es el algoritmo que usamos. |
| **RBAC** (Role-Based Access Control) | Control de acceso **según el rol**. Ej: solo `admin` ve el dashboard. Se aplica de verdad en el backend. |
| **Rol** | El "tipo" de usuario: `coder`, `tutor`, `team_leader`, `admin`. Define qué ve y hace. |
| **`401` / `403`** | `401` = no has iniciado sesión (o el carnet venció). `403` = estás logueado pero **no tienes permiso**. |
| **CORS** | Permiso que el backend da para que el frontend (que corre en otra dirección) pueda llamarlo. |

---

## 5. Base de datos

| Término | En simple |
|---------|-----------|
| **MySQL** | El motor de base de datos que guarda todo en **tablas** (filas y columnas). |
| **Tabla** | Una "hoja de Excel": cada fila es un registro (un usuario), cada columna un dato (su correo). |
| **ORM** | "Object-Relational Mapping": una traducción para manejar las tablas como **objetos de Python** en vez de escribir SQL a mano. |
| **SQLAlchemy** | El ORM que usamos en Python. |
| **PyMySQL** | El "cable" que conecta SQLAlchemy con MySQL. |
| **FK (Foreign Key / llave foránea)** | Una columna que **apunta** a otra tabla. Ej: una evaluación guarda el `id` del usuario evaluado. Mantiene los datos conectados y consistentes. |
| **3FN (Tercera Forma Normal)** | Regla de diseño para **no repetir datos** y evitar inconsistencias. En resumen: cada dato vive en un solo lugar. |
| **Índice único** | Regla en la BD que impide filas repetidas. Ej: evita que un coder evalúe dos veces a la misma persona en el mismo periodo. |
| **Seed** | Datos iniciales de ejemplo que se cargan en la BD para poder probar (usuarios, formularios). |

---

## 6. Lógica de negocio propia del proyecto

| Término | En simple |
|---------|-----------|
| **Feedback ascendente** | Que los **coders evalúen a quienes los acompañan** (Team Leaders y Tutores), no al revés. |
| **ICP** (Índice de Calidad Percibida) | Un puntaje de **0 a 100** que resume qué tan bien acompaña un TL/Tutor **según la percepción de los Coders**, calculado a partir de las evaluaciones. Es el corazón "no-CRUD" del backend. Mide percepción, no aprendizaje real (por eso se llama "percibida"). |
| **ICP "derivado, no se persiste"** | El ICP **no se guarda** en la BD: se **calcula al momento** de pedirlo, a partir de las evaluaciones. Así siempre está actualizado. |
| **SET** (Student Evaluation of Teaching) | El tipo de instrumento al que pertenece el ICP: encuestas donde el estudiante evalúa a quien le enseña/acompaña. Muy estudiado en educación superior. |
| **SEEQ** | Cuestionario validado (Marsh, 1982) del que salen las **categorías del ICP para Tutores**: valor del aprendizaje, claridad/organización, cercanía, disponibilidad. |
| **MCA-21** | Instrumento validado de **competencias de mentoría** del que salen las **categorías del ICP para Team Leaders**: comunicación, expectativas, comprensión, independencia, desarrollo. Un TL es más mentor que profesor. |
| **Ponderado / pesos** | Algunas categorías del ICP "valen" más que otras. Los **pesos** dicen cuánto. Son constantes fijas en el código (sustentables); el admin **no** puede cambiarlos. |
| **Confianza** | Aviso de si hay **suficientes respuestas** para confiar en el ICP (con pocas, decimos "datos insuficientes"). |
| **Tendencia** | Si el ICP **subió o bajó** respecto al periodo anterior. Se compara **por categoría**, así que cambiar la redacción de una pregunta no la daña. |
| **Periodo** | La ventana de tiempo de una ronda de evaluaciones (ej. un sprint/mes). |
| **Periodo activo** | El único periodo "abierto": mientras esté activo, los Coders ven y envían formularios. El **admin** lo activa/cierra. Sin periodo activo, la SPA muestra "No hay formularios por realizar". |
| **Versionar una pregunta** | Cuando el admin edita el texto de una pregunta, **no se sobrescribe**: se crea una pregunta nueva y la vieja se desactiva. Las respuestas históricas conservan el texto original que respondieron. |
| **Deriva semántica** | El riesgo de que una pregunta editada **deje de medir su categoría** (ej. una de cercanía reescrita como desempeño general): las respuestas se pesarían bajo la categoría equivocada. Se previene con la regla **"reformular, no re-temar"**: editar solo mejora la redacción; para otro tema, se desactiva la pregunta y se crea una nueva en su categoría. Al guardar, **la IA comprueba** que el texto siga midiendo su categoría y advierte si no (el admin debe confirmar). Y como se edita con periodo cerrado y versionando, cualquier desvío se revierte antes de que alguien responda. |
| **Anonimato real** | Si una evaluación es anónima, **nunca** se guarda quién la hizo. Ni el admin puede saberlo. |
| **No-duplicado** | Un coder no puede evaluar dos veces a la misma persona en el mismo periodo. |
| **Resumen con IA** | Un texto ejecutivo que **Claude** (IA) genera para el **admin**, resumiendo el feedback. Solo se le envían **datos agregados y anónimos**. |
| **Agregado / anonimizado** | "Agregado" = promedios y conteos, no respuestas individuales. "Anonimizado" = sin nombres ni identidades. |
| **Claude API** | El servicio de IA de Anthropic al que el backend llama para generar ese resumen. |

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
