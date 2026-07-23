# 03 — Especificación de Historias de Usuario

Formato: **Como** [rol] / **Quiero** [funcionalidad] / **Para** [beneficio].
Cada artefacto contiene criterios de aceptación técnicos y funcionales, priorización y dimensionamiento (Story Points).

---

## CORE (Arquitectura Base)

### CORE-01 — Setup de Repositorio y Topología SPA · `Must` · `5 SP`
**Como** ingeniero frontend **quiero** una base de proyecto modular fundamentada en el patrón Single Page Application (SPA), provista de un cliente HTTP y enrutador asíncrono, **para** posibilitar la construcción incremental del producto de forma eficiente.

**Criterios de aceptación (DoD)**
- [ ] Topología monorepo (`frontend/`, `backend/`) documentada en `06-arquitectura.md`.
- [ ] Inicialización exitosa del *bundler* local (`npm run dev`) con renderizado del componente raíz.
- [ ] Enrutamiento gestionado vía *History API* evitando recargas de *viewport*.
- [ ] Implementación de capa de abstracción HTTP (`api.service.js`). Ausencia estricta de contenedores de estado global (Redux/Zustand), relegando la sesión transitoria a la API de `localStorage`.

### CORE-02 — Setup de Capas del Backend (FastAPI) y Persistencia · `Must` · `5 SP`
**Como** ingeniero backend **quiero** instanciar el servidor ASGI (FastAPI) bajo una arquitectura horizontal de capas acoplada a un motor relacional MySQL, **para** exponer contratos RESTful escalables.

**Criterios de aceptación (DoD)**
- [ ] Arranque asíncrono del servidor (`uvicorn app.main:app --reload`) y exposición exitosa de la especificación OpenAPI (`/docs`).
- [ ] Aislamiento arquitectónico: `routes/`, `services/`, `repositories/`, `schemas/`. Exclusión consciente de la capa `models/` (ORM declarativo).
- [ ] Configuración inyectada vía variables de entorno (`.env`). Instanciación transaccional con `database/01_ddl.sql` y población de catálogos paramétricos (`database/02_dml.sql`).
- [ ] Endpoint de telemetría (`GET /health`) operativo (`HTTP 200 OK`).
- [ ] Intercambio de recursos de origen cruzado (CORS) limitado a la URI del cliente frontend.

### CORE-03 — Enrutamiento Condicional y Framework CSS · `Must` · `5 SP`
**Como** usuario final **quiero** un *layout* reactivo, responsivo y adaptativo a los privilegios de mi perfil, **para** consumir la interfaz sin disonancias cognitivas desde cualquier dispositivo.

**Criterios de aceptación (DoD)**
- [ ] Construcción de *Shell Application* con menú contextual dependiente del rol autenticado.
- [ ] Diseño CSS fundamentado en la filosofía *Mobile-First*, garantizando adaptabilidad desde resoluciones de 320px hacia arriba.
- [ ] Gestión visual de estados asíncronos (Spinners de red, esqueletos de carga y *Fallbacks* de estado vacío).

---

## AUTH (Seguridad y Autorización)

### AUTH-01 — Autenticación Stateless (Login) · `Must` · `3 SP`
**Como** usuario provisionado **quiero** autenticarme transaccionalmente **para** instanciar mi sesión en la plataforma.

**Criterios de aceptación (DoD)**
- [ ] Validación sintáctica en cliente (Regex para email y longitud de contraseña).
- [ ] Delegación criptográfica a `POST /auth/login`. Comparación de colisiones hash mediante `bcrypt`. Abstención arquitectónica de emisión de JWT.
- [ ] Propagación de excepción de dominio (`HTTP 401 Unauthorized`) ante colisiones fallidas.
- [ ] Enrutamiento automático hacia el *dashboard* o historial dependiendo del *claim* del rol.

### AUTH-02 — Persistencia de Sesión Local · `Must` · `5 SP`
**Como** usuario recurrente **quiero** que mi identidad perdure entre recargas de la SPA **para** evitar re-autenticaciones superfluas.

**Criterios de aceptación (DoD)**
- [ ] Serialización del payload de identidad y roles al `localStorage` tras la respuesta del servidor.
- [ ] Despliegue de *Route Guards* (Interceptores de enrutamiento) para proteger vistas no públicas, con redirección forzosa al Login ante carencia de estado.
- [ ] Invocación destructiva (*Logout*) que purgue el estado de persistencia local.

### AUTH-03 — Control de Acceso por Capas (RBAC) · `Must` · `3 SP`
**Como** ingeniero de seguridad **quiero** restringir las áreas operativas dependiendo de la matriz de privilegios del usuario, **para** mitigar escaladas de privilegios.

**Criterios de aceptación (DoD)**
- [ ] Renderizado condicional estricto: El perfil *Coder* carece de trazas DOM para acceso analítico; el perfil *Admin* visualiza consolas gerenciales.
- [ ] El backend efectúa saneamiento y filtrado de recursos confiando en los parámetros provistos por la capa de presentación (Ausencia de firma criptográfica de rol).

---

## EVALUACIONES (Core Business Domain)

### EVAL-01 — Resolución de Entidades Objetivo · `Must` · `3 SP`
**Como** Coder **quiero** visualizar el directorio operativo de mis mentores asignados **para** seleccionar la entidad a auditar.

**Criterios de aceptación (DoD)**
- [ ] Población dinámica vía `GET /users?role=...`.
- [ ] Etiquetado condicional marcando mentores ya auditados dentro de la ventana de periodo activo.
- [ ] Prevención lógica de ciclos de evaluación reflexivos (auto-evaluación rechazada estructuralmente).
- [ ] Despliegue del componente "Carencia de Formularios (Empty State)" si la máquina de estados del periodo se encuentra inactiva o cerrada.

### EVAL-02 — Transacción de Evaluación (Team Leader) · `Must` · `5 SP`
**Como** Coder **quiero** iterar un instrumento estructurado de retroalimentación **para** consolidar mi feedback cualitativo y cuantitativo.

**Criterios de aceptación (DoD)**
- [ ] Generación de DOM dinámico fundamentado en la hidratación de datos provenientes del `GET /forms` (Exigencia de no incorporar *hard-coding* de plantillas).
- [ ] UX interactiva fraccionada (Single Question Paging), libre de librerías acopladas de formularios, manejada por DOM APIs estándar (Vanilla JS).
- [ ] Accesibilidad estricta: Navegación de interfaz con enfoque de teclado (Tabulación e índices de selección).
- [ ] Restricción transaccional de campos requeridos; prevención de envío de *payloads* mutilados.

### EVAL-03 — Transacción de Evaluación (Tutor) · `Must` · `3 SP`
**Como** Coder **quiero** evaluar a los perfiles de apoyo técnico (Tutor) utilizando herramientas equiparables **para** sostener la cohesión de la plataforma.

**Criterios de aceptación (DoD)**
- [ ] Reciclaje completo del motor lógico (Componente UI) provisto por EVAL-02.
- [ ] Hidratación cruzada contra el catálogo paramétrico de preguntas orientado al rol de Tutor.

### EVAL-04 — Enmascaramiento de Identidad (Anonimato Arquitectónico) · `Should` · `2 SP`
**Como** Coder **quiero** poseer la opción inmutable de ocultar mi identidad **para** suprimir sesgos de represalia en mis juicios de valor.

**Criterios de aceptación (DoD)**
- [ ] Inyección paramétrica de *Flag* de anonimato en la petición saliente.
- [ ] El backend fragmenta el proceso físico: La traza de sumisión (`evaluation_submissions`) graba una clave nula (`evaluation_id = NULL`) hacia el contenedor de contenido (`evaluations`), imposibilitando la reconstrucción forense mediante operaciones relacionales complejas (`JOIN`).
- [ ] Notificación asertiva en la interfaz de usuario informando que la pérdida de trazabilidad es destructiva e irreversible (el mismo evaluador perderá capacidad de relectura).

### EVAL-05 — Consolidación de Feedback en Base de Datos · `Must` · `5 SP`
**Como** nodo transaccional **quiero** sanitizar y registrar el *payload* de entrada de forma segura **para** preservar la integridad del dato para su posterior análisis estadístico.

**Criterios de aceptación (DoD)**
- [ ] El controlador API captura el flujo en `POST /evaluations`, ejecutando verificación estática vía contratos Pydantic.
- [ ] **Lógica de Concurrencia:** Emisión de `HTTP 409 Conflict` (excepción mapeada) frente a detección de violación al índice único por periodo, evaluador y evaluado.
- [ ] **Restricción Temporal:** Bloqueo incondicional de sumisiones si el servicio detecta cierre transaccional del periodo de captura activo.
- [ ] Serialización atómica y *commit* a disco (MySQL) con actualización refleja en el *State* visual del frontend (marcaje de entidad completada).

---

## ADMIN (Operaciones Jerárquicas)

### ADMIN-01 — Máquina de Estados del Periodo Operativo · `Must` · `3 SP`
**Como** Admin **quiero** mutar la ventana temporal hábil para la recolección de feedback, **para** tener control granular sobre la ingesta de los instrumentos y su análisis estacional.

**Criterios de aceptación (DoD)**
- [ ] Consola administrativa de activación/cierre de periodos temporales (`PUT /periods/:id`).
- [ ] **Restricción Transaccional:** El subsistema garantiza que el estado *Activo* es mutuamente excluyente (la activación de un nodo deshabilita transaccionalmente los restantes).
- [ ] Una vez invocado un cierre, las validaciones subyacentes rechazan de facto cualquier mutación sobre evaluaciones borrador hacia un estado consumado.

### ADMIN-02 — Control de Deriva Semántica (Instrumentos) · `Should` · `3 SP`
**Como** Admin **quiero** aplicar modificaciones controladas al texto de los criterios base **para** mitigar ambigüedades sin vulnerar la métrica comparativa longitudinal del sistema.

**Criterios de aceptación (DoD)**
- [ ] Acceso perimetral restringido a catálogos paramétricos (edición de preguntas, activación de nodos en plantilla).
- [ ] **Protección Temporal:** Bloqueo estricto del *endpoint* de parcheo (`PATCH`) si existe un periodo activo, para aislar la contaminación paramétrica.
- [ ] **Manejo Forense (Versionado):** La mutación lógica efectúa un descarte blando (*Soft-Delete*) del nodo obsoleto e inserta un registro nuevo; el *Foreign Key* de las evaluaciones pasadas permanece apuntando irrevocablemente a la versión antigua.
- [ ] **Módulo de NLP Preventivo:** Ejecución de *Middleware* semántico (Google Gemini Lite, Temperatura `0.0` para reproducibilidad determinista) que compara el desvío categórico del nuevo texto. Inyección de barrera cognitiva UI en caso de que la heurística alerte un cambio de dominio semántico crítico.

---

*(Resto de las historias omitidas en esta presentación de ejemplo. Su formato interno respeta el mismo nivel técnico, focalizando la atención en los criterios de QA y métricas de completitud exigidas en las historias HIST, DASH, AIFEED, y ENTREGA).*
