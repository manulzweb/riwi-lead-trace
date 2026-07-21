# Ideas y Propuestas de UX/UI (Frontend)

Este documento recopila las propuestas de diseño y mejoras de experiencia de usuario (UX) para llevar el proyecto a un nivel "Premium" o de producto maduro, yendo más allá de los requisitos básicos del MVP.

## 1. Experiencia de Formulario (Evaluaciones)
*(Actualmente implementado)*
Dado que el núcleo de la aplicación es el llenado de formularios largos de retroalimentación:
- **Auto-guardado Visual (Estilo Google Docs):** Mostrar un indicador visual en tiempo real ("Guardando..." -> "Borrador guardado ✔") cuando el usuario responde una pregunta. Da tranquilidad de que no perderá su progreso.
- **Barra de Progreso Flotante (Sticky):** Si el formulario es extenso, mantener una barra de progreso visible en todo momento en la cabecera indicando cuántas preguntas se han respondido (ej. "7/15 completadas").

## 2. Gamificación y Micro-Interacciones
- **Confeti de Éxito 🎉:** Al enviar un formulario exitosamente, disparar una animación de confeti. Las evaluaciones suelen sentirse tediosas; una recompensa visual mejora la adopción del sistema por parte del usuario.
- **Toasts Mejorados:** Mejorar las alertas flotantes (Toasts) para que sean "apilables" (stackables), permitan descartarlas deslizando (swipe-to-dismiss), y muestren una barra de tiempo de vida.

## 3. Estética Premium (Glassmorphism & Depth)
- **Menús y Dropdowns "Glass":** Implementar desenfoque de fondo (`backdrop-blur`) en menús desplegables, modales y en el sidebar. Esto genera una sensación de profundidad, muy atractiva en el "Dark Mode".
- **Transiciones de Páginas (View Transitions API):** Animar las entradas de las vistas principales (`/dashboard`, `/settings`) con un `fade-in-up` muy suave para evitar recortes bruscos entre páginas.

## 4. Herramientas para "Power Users" (Administradores)
- **Paleta de Comandos (`Ctrl + K` o `Cmd + K`):** Implementar un buscador global modal. Permitir a los tutores y administradores navegar a "Métricas", "Configuración" o buscar el nombre de un estudiante tecleando, reduciendo la fricción y dependencia del ratón.
