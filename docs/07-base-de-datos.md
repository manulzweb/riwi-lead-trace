# 07 — Diseño Estructural de la Base de Datos

El subsistema de persistencia de Riwi Lead Trace reposa sobre un motor relacional **MySQL**. El esquema está rigurosamente normalizado hasta la **Tercera Forma Normal (3FN)**, garantizando integridad referencial estricta, mitigación de anomalías de actualización y soporte optimizado para consultas de agregación (OLAP ligero) requeridas por los módulos analíticos.

## 1. Racional Tecnológico: ¿Por qué MySQL?

La adopción de un modelo relacional estricto frente a alternativas NoSQL se justifica por la naturaleza del dominio:
- **Acoplamiento de Entidades:** El sistema requiere enlaces fuertes (Foreign Keys) entre usuarios, roles, plantillas, preguntas y evaluaciones.
- **Integridad Transaccional (ACID):** Se precisan restricciones de nivel de motor (e.g., restricciones `UNIQUE` compuestas) para evitar *Race Conditions* y duplicidad de envíos.
- **Agregación Matemática:** El cálculo del Índice de Calidad Percibida (ICP) y métricas de participación dependen de operaciones algebraicas complejas (`AVG`, `SUM`, `COUNT`) optimizadas en motores SQL.

## 2. Diccionario de Datos y Entidades Core

| Entidad Física | Propósito en el Dominio |
|----------------|-------------------------|
| `roles` | Catálogo maestro de privilegios de sistema (`coder`, `tutor`, `team_leader`, `admin`). |
| `cohortes` | Agrupación macro de ecosistemas de aprendizaje. |
| `clanes` | Subdivisión jerárquica atada a una cohorte. Un coder se asocia estrictamente a 1 clan. |
| `users` | Entidad raíz de autenticación e identidad de usuarios. |
| `user_roles` | Tabla pivot (N:M) que habilita perfiles multifacéticos (ej. Tutor y Coder a la vez). |
| `team_leader_clans`| Tabla pivot (N:M) que vincula Team Leaders a múltiples clanes operativos. |
| `periods` | Ciclos temporales de evaluación. La lógica de negocio impone que solo 1 periodo puede estar `is_active = TRUE`. |
| `forms` | Estructuras de evaluación base (Plantillas inertes) o formularios instanciados activos. |
| `categories` | Metadato transversal (Catálogo) para clasificar temáticamente las preguntas. |
| `questions` | Criterios de evaluación. Sujetas a *Soft-Deletes* y versionado estricto para proteger el historial. |
| `evaluations` | **Contenido** (payload) de una evaluación (puntajes y comentarios). Desvinculada de la autoría si es anónima. |
| `evaluation_submissions` | **Registro de Autoría** y participación. Actúa como mecanismo de control de concurrencia y no-duplicidad (`uq_submission_once`). |
| `evaluation_details` | Relación 1:N desde `evaluations`. Almacena la resolución atómica por pregunta. |
| `ai_feedback_cache` | Caché materializado (Result Set) proveniente del servicio LLM (Google Gemini) para minimizar llamadas de red. |
| `system_settings` | Configuración global Singleton (1 sola fila) para mutar el comportamiento del sistema en caliente. |

## 3. Decisiones Arquitectónicas del Esquema

El diseño físico introduce abstracciones complejas para resolver requerimientos de negocio conflictivos:

### 3.1. Anonimato Estructural Robusto
El anonimato no se maneja mediante convención de código (dejando un campo en nulo en la misma tabla de contenido), sino mediante **desacoplamiento físico**:
- `evaluations` preserva el contenido (respuestas). No posee llave foránea al evaluador.
- `evaluation_submissions` preserva el hecho de que alguien evaluó a alguien.
- Si la evaluación es anónima, el puntero (Foreign Key) `evaluation_id` en la tabla de sumisiones queda en `NULL`. **El vínculo relacional no existe**, haciendo criptográficamente imposible (incluso para el DBA) reconstruir la autoría mediante inferencia SQL.

### 3.2. Control Transaccional de Concurrencia
La prevención de envíos duplicados por el mismo actor en el mismo periodo se traslada de la lógica de aplicación al motor de base de datos.
- Se impone un índice único compuesto: `UNIQUE(evaluator_id, evaluatee_id, period_id)` en la tabla `evaluation_submissions`.
- Todas las columnas son `NOT NULL`. Esto erradica el vector de falla donde MySQL permitía múltiples valores `NULL` en índices únicos. Todo cruce concurrente genera un `IntegrityError` que el Backend captura como un HTTP 409 Conflict.

### 3.3. Integridad del Historial vs. Mutabilidad
La alteración de instrumentos de evaluación (formularios y preguntas) presenta un riesgo de **deriva semántica**.
- Los formularios vivos no se modifican *in-place*. Crear un nuevo formulario desactiva el anterior (`is_active = FALSE`).
- La edición del texto de una pregunta realiza un **versionado**: aplica un *Soft-Delete* a la anterior e inserta un nuevo registro. Esto garantiza que las referencias (Foreign Keys) de las evaluaciones pasadas (`evaluation_details`) sigan apuntando al texto exacto que el usuario leyó al momento de evaluar.

### 3.4. Derivación On-Read (CQRS Ligero)
Las métricas matemáticas complejas, fundamentalmente el **ICP (Índice de Calidad Percibida)**, no se persisten de manera redundante. Persistirlos induciría anomalías de actualización si se modifican los pesos (`weight_percent`) históricos. En cambio, estas métricas se extraen mediante un enfoque similar a CQRS utilizando **Vistas SQL Virtuales (`vw_period_metrics`)**. 

## 4. Cumplimiento de Normalización (3FN)

El diseño adhiere estrictamente a los preceptos de Codd:
- **Ausencia de dependencias transitivas:** El identificador de la cohorte de un Coder no reside en `users`. Se infiere navegando la relación `clan_id -> clanes -> cohorte_id`. Almacenarlo en la tabla base constituiría redundancia.
- **Atomicidad (1FN):** Las respuestas a un formulario se serializan verticalmente en `evaluation_details` (registro por pregunta), evitando columnas repetitivas (`pregunta_1`, `pregunta_2`) en la tabla padre.

## 5. Scripts Estructurales y Migraciones

La base de datos carece intencionalmente de una herramienta de migración (ej. Alembic) por el alcance del MVP. La infraestructura asume un despliegue idempotente dividido en cuatro fases estrictas:
1. **DDL (`01_ddl.sql`):** Definición de tablas, índices y restricciones (`DROP TABLE IF EXISTS` inicial).
2. **DML (`02_dml.sql`):** Inserción de catálogos paramétricos (Seed data).
3. **Mock (`03_mock_history.sql`):** Inyección de datos simulados para entornos de staging.
4. **Views (`04_views.sql`):** Compilación de proyecciones lógicas requeridas por el servicio de métricas.
