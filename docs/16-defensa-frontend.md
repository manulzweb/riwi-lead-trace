# 🛡️ Guía de Defensa Técnica: CAPA FRONTEND (Vanilla JS)

Este documento capacita al equipo para defender las decisiones arquitectónicas del cliente web (Frontend), construido enteramente sin frameworks.

---

## 1. Single Page Application (SPA) desde Cero
Si el jurado pregunta: *"¿Por qué SPA si no están usando React o Angular?"*
**Respuesta Defensiva:**
> "Decidimos implementar una Single Page Application nativa usando la **History API** de HTML5 (`window.history.pushState`). Esto significa que el navegador carga el `index.html` una sola vez. Cuando el usuario navega entre vistas, usamos JavaScript para destruir y recrear el DOM dinámicamente (en `router.js` y `routes.js`). Esto reduce el consumo de ancho de banda y elimina el parpadeo de pantalla (Page Reload), ofreciendo una experiencia idéntica a React pero sin los 200MB de dependencias de `node_modules`."

## 2. Gestión de Estado (State Management)
Si el jurado pregunta: *"¿Cómo guardan los datos del usuario si no tienen Redux o Context API?"*
**Respuesta Defensiva:**
> "Implementamos una gestión de estado efímera basada en la API de **`localStorage`** del navegador. Al hacer login, nuestro módulo `auth.service.js` serializa el objeto del usuario (ID y Rol) en formato JSON y lo guarda. El resto de la aplicación lee de este almacenamiento para decidir qué renderizar. No construimos un *Store Global* (Zustand/Redux) porque el alcance del MVP no presentaba un *Prop Drilling* (paso de variables) tan profundo que justificara el sobrecosto de un manejador de estados complejo."

## 3. Patrón de Servicios (API Fetching)
Si preguntan: *"¿Cómo comunican el Front con el Back?"*
**Respuesta Defensiva:**
> "Desacoplamos completamente las vistas de las llamadas de red. Tenemos un módulo base `api.service.js` que envuelve la API `fetch` nativa de JS. Todos los demás servicios (ej. `evaluations.service.js`, `forms.service.js`) importan este módulo. Si mañana el servidor cambia de URL o decidimos migrar a Axios, solo cambiamos un archivo. Además, este módulo inyecta headers comunes dinámicamente y mapea los errores JSON a excepciones capturables."

## 4. Route Guards (Seguridad en Cliente)
Si preguntan: *"¿Cómo evitan que un Coder entre al Dashboard del Admin?"*
**Respuesta Defensiva:**
> "El enrutador (`router.js`) funciona como un Middleware. Antes de renderizar una vista, revisa las meta-reglas de la ruta en `routes.js`. Si la ruta requiere el rol `admin` y el estado de `localStorage` dice `coder`, el enrutador bloquea el renderizado y fuerza un redireccionamiento al Home (`/`). Esto se conoce como un **Route Guard**."
*(Nota interna importante: Se debe aclarar que esta seguridad es visual; si el Coder intentara enviar un payload al servidor para cosas de Admin, fallaría o requeriría blindaje Backend. Para el MVP, el Guard front-end resuelve el requerimiento funcional).*

## 5. Renderizado Dinámico e Inyección del DOM
Si preguntan: *"¿Cómo funcionan los formularios de evaluación si las preguntas cambian?"*
**Respuesta Defensiva:**
> "El DOM es 100% dinámico. Al cargar la vista, hacemos un request a `GET /forms?target_role=...`. Con la respuesta, iteramos el array de preguntas usando literales de plantilla (Template Literals) en JS (`innerHTML = ...`). Para proteger el sistema de ataques XSS (Cross-Site Scripting), los textos de las preguntas vienen de una base de datos controlada por el Administrador. No usamos herramientas form-builders genéricas, creamos una experiencia 'una pregunta a la vez' (Single-Question Paging) manipulando las clases CSS para transicionar de vista."

## 6. Estilos y CSS
Si preguntan: *"¿Cómo estructuraron los estilos?"*
**Respuesta Defensiva:**
> "Aplicamos el principio **Mobile-First**. Todo está diseñado para funcionar nativamente a 320px, usando *Media Queries* expansivas para resoluciones mayores. Para evitar colisiones de estilos al no tener 'Scoping' automático (como en React/Vue), aplicamos metodologías arquitectónicas como BEM (Block Element Modifier) o agrupaciones lógicas en componentes (Tailwind utilidades) para asegurar baja especificidad CSS y modularidad."

---

### 🧠 Conceptos clave para memorizar:
*   **Vanilla JS:** JavaScript puro sin librerías externas (jQuery, React). Todo se manipula con `document.getElementById` o `querySelector`.
*   **History API:** La herramienta nativa que permite cambiar la URL (`/dashboard`) sin que el navegador envíe una petición al servidor web.
*   **Fetch:** API asíncrona moderna usada en lugar del viejo XMLHttpRequest (AJAX).
