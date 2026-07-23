# 13 — Glosario Arquitectónico y Técnico

Este documento centraliza y define la terminología técnica empleada en el diseño, desarrollo y arquitectura del proyecto Riwi Lead Trace. Está estructurado en categorías y subconjuntos lógicos para facilitar la comprensión de las interacciones entre los distintos componentes del sistema.

---

## 1. Patrones de Diseño y Arquitectura

Esta categoría agrupa los enfoques estructurales utilizados para organizar el código y mantener la escalabilidad.

### 1.1. Patrones Estructurales
| Término | Definición Técnica y Contexto |
|---------|-------------------------------|
| **Monolito Modular** | Arquitectura donde todo el código (ej. el backend) se despliega como una sola unidad, pero internamente está estrictamente dividido en módulos independientes (rutas, servicios, repositorios) para evitar el alto acoplamiento. |
| **Separación Horizontal (Por Capas)** | Estrategia de organización donde el código se agrupa por su función técnica (ej. todos los controladores juntos, todos los accesos a datos juntos) en lugar de agruparse por característica de negocio (separación vertical). |
| **Dominio (Domain)** | Es el "corazón" del problema que el software intenta resolver. Contiene las "Reglas de Negocio" (ej. *un usuario no puede evaluarse a sí mismo*). Todo el desarrollo gira en torno a modelar el dominio de forma aislada. |
| **ORM (Object-Relational Mapping)** | Técnica para convertir datos entre sistemas de tipos incompatibles utilizando lenguajes orientados a objetos. Permite tratar tablas de BD como Clases de Python. En el proyecto se decidió **no** usar un ORM completo para evitar su *overhead*. |

### 1.2. Patrones de Comportamiento y Desacoplamiento
| Término | Definición Técnica y Contexto |
|---------|-------------------------------|
| **Repository Pattern (Patrón Repositorio)** | Capa de abstracción entre la lógica de negocio y la base de datos. En el proyecto (`repositories/`), encapsula las sentencias SQL (`text()`) para que los servicios no interactúen directamente con el motor de base de datos. |
| **Dependency Injection (Inyección de Dependencias)** | Técnica donde un objeto recibe sus dependencias externas en lugar de crearlas internamente. En FastAPI, se usa `Depends()` para inyectar servicios en las rutas o repositorios en los servicios, facilitando las pruebas unitarias (Mocking). |
| **CQRS Ligero (Command Query Responsibility Segregation)** | Separación de las operaciones de escritura (Commands, vía Repositorios) de las operaciones complejas de lectura (Queries). En el proyecto, se evidencia al usar Vistas SQL virtualizadas (`vw_period_metrics`) para calcular el ICP sin saturar la lógica de Python. |

### 1.3. Abstracciones de Datos (DTO vs. Entity vs. Model)
| Término | Definición Técnica y Contexto |
|---------|-------------------------------|
| **Entity (Entidad)** | Representa un concepto central del dominio del negocio (ej. un *Usuario* o una *Evaluación*). Las entidades tienen identidad única e inmutable (un ID) y persisten a través del tiempo. |
| **Model (Modelo)** | Representación a nivel de código de una tabla en la base de datos (usualmente acoplado a un ORM como SQLAlchemy). En nuestro diseño prescindimos de modelos de ORM completos en Python a favor de sentencias SQL puras sobre las entidades físicas. |
| **DTO (Data Transfer Object)** | Objeto diseñado **exclusivamente** para transportar datos entre procesos (ej. del backend al frontend). Carece de lógica de negocio o conexión a BD. En el proyecto, los DTOs se implementan usando esquemas de **Pydantic** (`schemas/`), definiendo los contratos exactos de entrada/salida. |

### 1.3.1. Caso de Estudio: El Trade-off de Entities vs. Schemas (Pydantic)
En arquitecturas corporativas masivas (ej. Java Spring Boot), es obligatorio aislar estrictamente las capas, forzando a crear tres objetos y mapeadores para un solo flujo:
1. **DTO (Red):** `UserCreateDTO { password_plain }`
2. **Model (Dominio):** `UserDomain { hash_password() }`
3. **Entity (ORMs):** `UserEntity { password_hashed }`

**La decisión arquitectónica del MVP (FastAPI):**
Programar "mapeadores" (Traducciones de DTO a Entity) hubiera sido *Overengineering* (Sobre-ingeniería). El equipo optimizó el flujo fusionando capas inteligentemente:
*   **Capa de Red (DTO):** Se usan los **Schemas de Pydantic** (`schemas/`) para validar los JSON de entrada de forma ultra-rápida.
*   **Capa de Persistencia (Entity):** En lugar de instanciar Modelos de ORM (SQLAlchemy Entities) pesados en memoria, el repositorio toma los datos limpios del Schema y los inserta en la Base de Datos mediante **SQL Crudo (`text()`)**. La Base de Datos MySQL es la única dueña de la entidad física, reduciendo drásticamente la huella de memoria (RAM) y acelerando el tiempo de respuesta.

---

## 2. Conceptos de la API y Flujo de Peticiones

Términos relacionados con cómo se comunican las distintas partes del sistema a través de la red y cómo viajan los datos.

### 2.1. Comunicación y Contratos
| Término | Definición Técnica y Contexto |
|---------|-------------------------------|
| **API REST** | Interfaz de programación que usa HTTP y sus verbos (GET, POST, PUT, DELETE) para operar sobre recursos predecibles (ej. `/evaluations`). |
| **Flujo de Peticiones (Request Flow)** | El ciclo de vida unidireccional de una solicitud: `Router` (recibe y valida) → `Service` (aplica reglas de negocio) → `Repository` (escribe/lee BD) → Respuesta HTTP. |
| **CORS (Cross-Origin Resource Sharing)** | Mecanismo de seguridad de los navegadores que restringe cómo una web (Frontend) solicita recursos a otro dominio (Backend). |

### 2.2. Seguridad y Estado
| Término | Definición Técnica y Contexto |
|---------|-------------------------------|
| **JWT (JSON Web Token)** | Estándar para transmitir claims verificables criptográficamente entre partes. **Consciente trade-off:** El MVP del proyecto **no** usa JWT, delegando el estado de la sesión al cliente (SPA) para simplificar la infraestructura inicial. |
| **RBAC (Role-Based Access Control)** | Sistema de control de acceso basado en el rol del usuario (`admin`, `team_leader`, `coder`). En el frontend se implementa mediante *Route Guards*. |
| **Trade-off** | Un compromiso o concesión de diseño. Por ejemplo, decidir no usar un ORM complejo (SQLAlchemy ORM) para ganar control sobre las consultas SQL puras, a costa de escribir más sentencias a mano. |
| **Manejo Opaco de Errores** | Estrategia de ciberseguridad donde las fallas internas (Error 500) devuelven un UUID genérico al cliente, mientras el detalle técnico (Stacktrace, sentencias SQL) se registra exclusivamente en los logs del servidor para prevenir fugas de información. |

---

## 3. Base de Datos y Persistencia

Conceptos vinculados a cómo se almacenan, protegen y normalizan los datos en el motor relacional.

### 3.1. Estructuras Relacionales
| Término | Definición Técnica y Contexto |
|---------|-------------------------------|
| **3FN (Tercera Forma Normal)** | Regla de normalización de bases de datos que elimina la redundancia asegurando que los atributos no clave dependan únicamente de la clave primaria. |
| **Vista Materializada / Virtual** | Una consulta SQL guardada como una tabla virtual en la base de datos (ej. `vw_period_metrics`). Permite delegar cálculos matemáticos pesados (como el promedio ponderado del ICP) al motor de base de datos. |

### 3.2. Integridad de Datos
| Término | Definición Técnica y Contexto |
|---------|-------------------------------|
| **Índice Único Compuesto** | Restricción a nivel de base de datos (`uq_submission_once`) que previene condiciones de carrera (Race Conditions) al impedir que existan dos filas con la misma combinación de `evaluator_id`, `evaluatee_id` y `period_id`. |
| **Soft Delete (Borrado Lógico)** | Práctica de marcar un registro como inactivo (ej. `is_active = FALSE` en preguntas) en lugar de eliminarlo físicamente de la base de datos (Hard Delete). Esencial para mantener el histórico de evaluaciones pasadas intacto. |

---

## 4. Frontend y Experiencia de Usuario

Términos del lado del cliente.

### 4.1. Componentes y Rendimiento
| Término | Definición Técnica y Contexto |
|---------|-------------------------------|
| **SPA (Single Page Application)** | Aplicación web que carga un solo documento HTML y actualiza dinámicamente el contenido mediante JavaScript, sin requerir recargas de página completas. |
| **ES Modules** | Estándar de JavaScript para estructurar el código en módulos (`import`/`export`), permitiendo la separación de vistas (`*.view.js`) y servicios (`*.service.js`) sin depender de un empaquetador pesado en entornos de desarrollo. |
| **Graceful Degradation** | Filosofía de diseño donde el sistema emplea capacidades modernas si están disponibles (ej. *View Transitions API*), pero asegura un funcionamiento base (fallback) en navegadores menos capaces. |

---

## 5. Lógica de Dominio del Negocio (Business Rules)

Términos exclusivos de la problemática que resuelve *Riwi Lead Trace*.

### 5.1. Evaluación y Métricas
| Término | Definición Técnica y Contexto |
|---------|-------------------------------|
| **ICP (Índice de Calidad Percibida)** | Métrica principal (0 a 100) que cuantifica el desempeño de un líder basándose en el promedio ponderado de las respuestas de evaluación recibidas. Se calcula *on-read* (en tiempo de consulta). |
| **Feedback Ascendente** | Modelo de evaluación donde los subordinados (Coders) evalúan el desempeño de sus superiores o mentores (Team Leaders y Tutores). |
| **Anonimato (Application-Level Filtering)** | Trade-off arquitectónico. Para garantizar que el Coder pueda releer su propio historial, el vínculo físico de la evaluación sí se guarda en disco. Sin embargo, el anonimato se impone a Nivel de Aplicación: las vistas SQL y los endpoints destruyen u ocultan dinámicamente la identidad del autor si el envío se marcó como anónimo, impidiendo al Admin y al evaluado rastrear la autoría. |
| **Deriva Semántica** | Riesgo de que la alteración del texto de una pregunta cambie su propósito original. Mitigado versionando preguntas (desactivando la anterior y creando una nueva) y validando la coherencia semántica mediante **Google Gemini**. |
