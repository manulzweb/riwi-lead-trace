# 🛡️ Guía de Defensa Técnica: PREGUNTAS DEL JURADO (Q&A)

Este es un simulador de las preguntas más difíciles (y tramposas) que un jurado técnico podría hacer durante el Pitch Técnico de 20 minutos. El equipo debe ensayar estas respuestas.

---

### 1. "He notado que no usan un framework como React o Vue. ¿Por qué?"
**Respuesta:**
> "La rúbrica del Proyecto Integrador restringe explícitamente el uso de frameworks para el Frontend. Sin embargo, no queríamos perder la experiencia de usuario fluida (sin recargas de página) de las aplicaciones modernas. Por eso, implementamos nuestra propia arquitectura **SPA (Single Page Application)** usando JavaScript Vanilla puro y la *History API* del navegador. Renderizamos y destruimos el DOM dinámicamente, logrando el mismo comportamiento de React pero respetando la restricción técnica."

### 2. "Si alguien sabe programar, ¿no podría interceptar la petición y evaluarse a sí mismo o hacerlo varias veces?"
**Respuesta:**
> "No. Aunque validamos en el Frontend para dar feedback visual rápido, la **verdadera barrera** está en la Base de Datos y en el Backend. En la tabla `evaluation_submissions` tenemos un Índice Único Compuesto (`evaluator_id, evaluatee_id, period_id`). Si intentan enviar una evaluación duplicada, MySQL bloquea la transacción (`IntegrityError`) y nuestro Backend devuelve un código HTTP 409 Conflict. Además, la capa de Servicios en FastAPI tiene una validación explícita que bloquea si `evaluator_id == evaluatee_id`."

### 3. "¿Cómo manejan la seguridad? ¿Dónde está su JWT?"
**Respuesta:**
> "Para este MVP, y aplicando el principio de **YAGNI (You Aren't Gonna Need It)**, diseñamos un sistema *Stateless* simplificado. Verificamos la contraseña encriptada (bcrypt) en el servidor, pero el mantenimiento de la sesión (el Rol y el ID) se delega al `localStorage` del cliente. El tiempo del Sprint (4 semanas) nos obligó a priorizar la lógica fuerte de negocio (cálculo del ICP, prevención de concurrencia y anonimato estructural) sobre una infraestructura criptográfica como JWT, que será el primer paso en la v2."

### 4. "Veo que usan Inteligencia Artificial (Gemini). ¿No están violando la privacidad de las evaluaciones al enviar eso a Google?"
**Respuesta:**
> "No, diseñamos la integración bajo el principio de **Zero-PII** (Personal Identifiable Information). Al servidor de Google Gemini solo enviamos los textos de los comentarios y las puntuaciones numéricas agregadas; **jamás enviamos el ID, nombre o correo del evaluador ni del evaluado**. Además, las respuestas de IA están cacheadas (`ai_feedback_cache`) en el servidor para evitar llamadas redundantes a la API de Google y optimizar costos."

### 5. "En su Base de Datos usan SQLAlchemy, pero escriben SQL a mano. ¿Por qué no usar el ORM para todo?"
**Respuesta:**
> "Usamos el ORM de SQLAlchemy solo para el manejo del Pool de Conexiones (`engine`). Decidimos usar SQL crudo (`sqlalchemy.text()`) por rendimiento y control arquitectónico. El cálculo de nuestro Índice de Calidad Percibida (ICP) depende de consultas matemáticas complejas (`AVG`, `SUM`). Usar Vistas Materializadas en la Base de Datos (`vw_period_metrics`) y consultarlas con SQL nativo es órdenes de magnitud más rápido que traer miles de filas a Python para promediarlas con objetos del ORM."

### 6. "¿Cómo funciona su modelo de anonimato en la base de datos?"
**Respuesta:**
> "Dividimos el proceso en dos tablas: `evaluations` (contenido) y `evaluation_submissions` (autoría). Como regla de negocio (YAGNI), priorizamos que el Coder SIEMPRE pueda releer su propio historial de feedback en su dashboard, incluso si fue enviado de forma anónima. Por ende, el vínculo sí existe físicamente en la base de datos, pero el anonimato se aplica a través de **Application-Level Filtering**: nuestras consultas (vistas SQL y endpoints) destruyen u ocultan dinámicamente el `evaluator_id` para terceros si el flag `is_anonymous` es verdadero. El Admin y el Evaluado jamás ven quién fue, pero el Coder no pierde acceso a su bitácora."

### 7. "Veo que en la capa `routes/` apenas hay código, todo está en `services/`. ¿Por qué?"
**Respuesta:**
> "Es el patrón de **Separación de Responsabilidades**. `routes/` solo se encarga de hablar HTTP (recibir el JSON y devolver un status 200 o 201). Toda la inteligencia de nuestra aplicación vive en `services/`. Esto nos permite que, si mañana queremos cambiar FastAPI por Django o crear un bot de Telegram, nuestros servicios no tienen que cambiar en absoluto porque no saben nada de frameworks web."

### 8. "Si solo están ejecutando SQL puro, ¿por qué instalaron SQLAlchemy en lugar de usar un driver básico como `mysql-connector` o `pymysql`?"
**Respuesta:**
> "Aunque no usamos los modelos del ORM, SQLAlchemy nos provee de tres características críticas a nivel de infraestructura:
> 1. **Pool de Conexiones (Connection Pooling):** En lugar de abrir y cerrar una conexión TCP a la base de datos en cada petición, SQLAlchemy mantiene un grupo de conexiones vivas, reutilizándolas y mejorando el rendimiento bajo concurrencia.
> 2. **Prevención de Inyección SQL (Parametrización Segura):** A través del método `text()`, SQLAlchemy se encarga de sanitizar los inputs (ej. `:score`, `:comment`), mitigando cualquier ataque.
> 3. **Manejo Transaccional (Context Managers):** Al usar `with engine.begin()`, SQLAlchemy asume automáticamente el `COMMIT` si el código termina bien, o hace un `ROLLBACK` seguro si nuestro servicio lanza una excepción, ahorrándonos lidiar con cierres manuales de transacción."
