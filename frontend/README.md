# 🎨 Riwi LeadTrace - Capa Frontend (Client)

Este directorio aloja la Interfaz de Usuario (UI) estructurada como una **Single Page Application (SPA)** nativa, operando exclusivamente con **JavaScript Vanilla** (ES6+), HTML5, y CSS3 (a través de utilidades).

---

## 🏗️ Filosofía de Arquitectura (Sin Frameworks)

Para cumplir con la restricción de la rúbrica (No React, No Angular, No Vue), aplicamos patrones de ingeniería avanzados sobre APIs nativas del navegador, garantizando un rendimiento óptimo (Zero JavaScript framework overhead).

### 1. Enrutamiento Asíncrono (History API)
Toda la navegación entre vistas (ej. Login -> Dashboard) se realiza sin que la pestaña se recargue. El `router.js` intercepta los clics, bloquea el comportamiento normal de `<a>`, y modifica la barra de direcciones usando `window.history.pushState()`. Luego, el JS localiza la vista en `routes.js`, inyectando el nuevo DOM dinámicamente en el `#app`.

### 2. Seguridad en Cliente (Route Guards)
Nuestro router funciona como un *Middleware*. Antes de inyectar una vista en el DOM, verifica los permisos del usuario activo frente a la ruta solicitada. Si un `Coder` intenta acceder a `/dashboard` (restringido a `admin`), el router lo intercepta y redirige forzosamente, previniendo escalada de privilegios a nivel de UI.

### 3. Gestión de Estado (State Management)
Carecemos de contenedores masivos (Zustand/Redux) por principio *YAGNI*. La sesión (Auth) se almacena y serializa transitoriamente en el **`localStorage`** del navegador. Los componentes visuales que requieren conocer el rol del usuario simplemente consultan este repositorio local.

### 4. Fetching Dinámico e Inyección Segura (DOM Manipulation)
La comunicación con FastAPI se centraliza en `api.service.js`. Los formularios (Ej. Evaluación de Tutor) no están "Hard-codeados" en el HTML. Se consultan asíncronamente vía API, y se construyen inyectando literales de plantilla (Template Literals) en el contenedor usando Javascript. Esto nos permite un flujo *Typeform-like* de una pregunta a la vez (Single-Question Paging).

---

## 📂 Estructura de Directorios

```text
src/
├── components/    # Fragmentos de UI reutilizables (Modales, Spinners)
├── router/        # Cerebro de la SPA (router.js, routes.js)
├── services/      # Llamadas asíncronas a la API separadas por dominio
├── styles/        # CSS Base (Mobile-First)
├── utils/         # Helpers matemáticos o transformadores de datos
├── views/         # Lógica y renderizado de cada "página" (DOM Injection)
└── main.js        # Punto de entrada (Bootstrapping)
```

## 🚀 Guía de Despliegue Local

Utilizamos **Vite** como empaquetador de módulos (Bundler). Vite reemplaza a Webpack, ofreciendo un servidor de desarrollo ultra-rápido gracias al uso de *ES Modules* nativos.

### 1. Pre-requisitos
*   Node.js (v18+)
*   NPM o Yarn

### 2. Instalación de Dependencias
```bash
cd frontend
npm install
```

### 3. Variables de Entorno
Crea un archivo `.env` (Vite requiere el prefijo `VITE_`):
```env
VITE_API_BASE_URL=http://localhost:8000
```

### 4. Servidor de Desarrollo (Hot Module Replacement)
```bash
npm run dev
```
La SPA estará lista para usarse en `http://localhost:5173`. Cualquier cambio en el código refrescará la vista instantáneamente.

### 5. Compilación a Producción
Para desplegar la aplicación en Vercel, Netlify o GitHub Pages:
```bash
npm run build
```
Generará un directorio `dist/` con el HTML, JS y CSS minificado y ofuscado, optimizado para cargar en milisegundos.
