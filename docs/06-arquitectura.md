# 06 — Arquitectura del Software

## 1. Visión General y Estilo Arquitectónico

El sistema **Riwi Lead Trace** implementa un patrón de arquitectura de **Monolito Modular por Capas**. Esta decisión técnica garantiza un despliegue unificado y simplificado tanto para el backend (API REST) como para el frontend (Single Page Application). 

La segmentación interna de la base de código se rige por una separación **horizontal** (por responsabilidades técnicas o capas) en lugar de una separación vertical (Feature-Sliced Design). Esta estructura centraliza los flujos de control, el procesamiento de dominio y la persistencia de datos de la siguiente manera:
- **Capa de Enrutamiento (`routes/`):** Exposición de endpoints y validación de contratos (DTOs).
- **Capa de Dominio (`services/`):** Encapsulación estricta de la lógica de negocio.
- **Capa de Acceso a Datos (`repositories/`):** Abstracción de operaciones de persistencia mediante consultas preparadas.

## 2. Elección de Framework y Tecnologías Base

La selección tecnológica responde a criterios de rendimiento, mantenibilidad y restricciones de tiempo (MVP):

- **Backend (Python + FastAPI):**
  - **Por qué FastAPI:** Se seleccionó por su soporte nativo para asincronía (ASGI), la integración fluida con **Pydantic V2** para validación estricta de esquemas (I/O) y su capacidad para autogenerar especificaciones OpenAPI (Swagger). Esto reduce drásticamente el *boilerplate* de documentación y validación de tipos, ventajas críticas frente a alternativas como Flask o Django.
- **Frontend (Vanilla JS + Vite + TailwindCSS):**
  - **Por qué Vanilla JS:** Para mantener el footprint de la aplicación al mínimo, prescindiendo del *overhead* de reconciliación del DOM y curva de aprendizaje de frameworks como React o Angular. La gestión de estado se mantiene efímera o persistida en `localStorage`, evitando la complejidad de stores globales (Redux, Vuex). Vite actúa como empaquetador ultrarrápido (HMR) y TailwindCSS centraliza el sistema de diseño mediante clases utilitarias.
- **Base de Datos (MySQL):**
  - **Por qué MySQL:** El dominio del problema (evaluaciones, usuarios, roles, métricas) es intrínsecamente relacional. Se diseñó un esquema en 3FN que asegura la integridad de los datos (e.g., restricciones `UNIQUE` para evitar colisiones en evaluaciones concurrentes).
- **IA (Google Gemini API):**
  - Integración mediante `google-generativeai` con una estrategia de dos modelos (`3.5-flash` para síntesis masiva y `2.5-flash-lite` para validaciones semánticas ultrarrápidas). Se justifica su uso para delegar el procesamiento de lenguaje natural cualitativo, agregando valor analítico (no-CRUD).

## 3. Patrones de Diseño Implementados

La arquitectura adopta patrones consolidados para garantizar la escalabilidad y testabilidad del sistema:

### Backend
1. **Repository Pattern:** Desacopla la lógica de negocio de la tecnología de persistencia. Los servicios no ejecutan SQL directo; invocan métodos de repositorios (e.g., `evaluation_repository.create(...)`). Esto centraliza las sentencias SQL (ejecutadas crudas mediante `sqlalchemy.text()`) y facilita el mocking en pruebas unitarias.
2. **Dependency Injection (Inyección de Dependencias):** Utilizado intensivamente vía el mecanismo `Depends()` de FastAPI. Permite la inyección de repositorios en servicios, y de servicios en rutas, promoviendo la inversión de dependencias y el desacoplamiento.
3. **Data Transfer Object (DTO):** Implementado a través de esquemas Pydantic (`schemas/`). Define fronteras estrictas (contratos) de lo que entra y sale de la API, previniendo vulnerabilidades como el *Mass Assignment* y fugas de datos sensibles (e.g., hashes de contraseñas).
4. **CQRS (Command Query Responsibility Segregation) Simplificado:** Las mutaciones (Commands) ocurren mediante transacciones explícitas en los repositorios, mientras que las consultas complejas de lectura (Queries, como el cálculo del ICP) se abstraen a nivel de motor de base de datos mediante **Vistas SQL Materializadas/Virtuales** (`vw_period_metrics`), mitigando el problema de consultas *N+1*.

### Frontend
1. **Module Pattern:** Utilización de ES Modules (`*.service.js`, `*.view.js`) para encapsular variables y métodos, exponiendo únicamente la API pública necesaria.
2. **Front Controller:** Centralización del enrutamiento en `router.js` (`renderRoute`), que intercepta peticiones del History API, evalúa *Route Guards* (permisos por rol y sesión) y delega el renderizado a la vista correspondiente.

## 4. Evolución y Lecciones Aprendidas

Durante el desarrollo del MVP, el diseño arquitectónico sufrió refinamientos sustanciales basados en hallazgos empíricos:

- **Evolución del ORM:** Inicialmente se consideró el uso completo de SQLAlchemy ORM. Sin embargo, se evidenció que la complejidad de mapear relaciones compuestas (y la curva de aprendizaje asociada) superaba el beneficio. Se refactorizó hacia la ejecución de sentencias SQL planas (`text()`) dentro de los repositorios, recuperando control total sobre el plan de ejecución y el rendimiento, sacrificando la portabilidad del motor de BD (trade-off aceptado).
- **Manejo de Autenticación (Supresión de JWT):** Se descartó la implementación de JWT tras evaluar el alcance del MVP. La sobreingeniería de gestionar revocación de tokens, firmas criptográficas y almacenamiento seguro no aportaba valor inmediato a las métricas del negocio. Se optó por una autenticación *Stateless* donde el cliente maneja la sesión vía headers (`evaluator_id`), un compromiso consciente en seguridad en favor de la agilidad.
- **Resolución de Condición de Carrera en Evaluaciones:** La implementación inicial verificaba duplicados desde la capa lógica (`SELECT` previo al `INSERT`), lo que permitía *race conditions*. La lección aprendida resultó en el traslado de esta responsabilidad al motor de base de datos mediante un índice único compuesto (`uq_submission_once`), delegando el control de concurrencia a nivel transaccional y capturando el `IntegrityError` (HTTP 409) en el backend.

## 5. Ciclo de Vida de la Petición (Request Flow)

El ciclo de vida de una solicitud HTTP típica hacia la API sigue un conducto unidireccional estricto:

1. **Ingreso (Router/Gateway):** El cliente (SPA) emite la solicitud (ej., `POST /evaluations`). FastAPI recibe la petición.
2. **Middleware y Excepciones Globales:** La petición atraviesa middlewares (e.g., CORS). Si ocurre un fallo catastrófico en cualquier punto subsiguiente, el **Global Exception Handler** intercepta el error, registrando el traceback y devolviendo un UUID opaco al cliente (Error 500).
3. **Validación (Pydantic DTO):** El router procesa el cuerpo de la petición contra el modelo `EvaluationCreate`. Si hay discrepancias de tipado o formato, se aborta el flujo (HTTP 422).
4. **Inyección y Controlador:** El enrutador invoca la función controladora. Mediante `Depends()`, FastAPI inyecta la instancia del `EvaluationService`.
5. **Capa de Dominio (Service):** El controlador delega la ejecución al servicio. Aquí ocurre la validación de reglas de negocio (e.g., verificar si el periodo está activo, anonimización). Si una regla se viola, el servicio lanza una `ApplicationException` específica que será traducida por el *Exception Handler* a su código HTTP (ej. 403, 404, 409).
6. **Persistencia (Repository):** El servicio invoca métodos del `EvaluationRepository`. Este extrae una conexión del **Connection Pool** y ejecuta sentencias SQL (e.g., inserciones en `evaluations` y `evaluation_submissions`).
7. **Respuesta:** Los datos recuperados (o el ID del recurso creado) retornan al servicio, luego al enrutador, el cual los empaqueta en el modelo de respuesta Pydantic correspondiente y serializa el JSON resultante para el cliente.

## 6. Integración con otros módulos de documentación

- **Modelo de Base de Datos:** Los detalles a nivel de esquema (tablas, índices, vistas) se abordan en el documento `07-base-de-datos.md`.
- **Manejo de Excepciones:** La estructura detallada de las clases de error y su resolución jerárquica se documentan en `14-manejo-de-excepciones.md`.
- **Glosario:** Términos como *Monolito Modular*, *CQRS*, *Repository Pattern*, y *Inyección de Dependencias* cuentan con definiciones técnicas en `13-glosario.md`.
