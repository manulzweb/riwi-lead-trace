# 🛡️ Guía de Defensa Técnica: BASE DE DATOS (MySQL)

Este documento prepara al equipo para defender la estructura, normalización y decisiones del modelo de datos frente al jurado técnico. Es **crítico** conocer este documento porque la rúbrica exige que no sea un "CRUD básico".

---

## 1. Cumplimiento Estricto de la 3FN (Tercera Forma Normal)
Si el jurado pregunta: *"¿Por qué eligieron una BD Relacional y cómo aseguran que está normalizada?"*
**Respuesta Defensiva:**
> "El dominio del problema es inherentemente estructurado y transaccional: un usuario evalúa a alguien en base a un formulario compuesto de preguntas. 
> Cumplimos la **Tercera Forma Normal (3FN)** a cabalidad:
> 1. **1FN (Atomicidad):** Las respuestas no se guardan como columnas infinitas (`pregunta1`, `pregunta2`) en la tabla padre. Tienen su propia tabla hija (`evaluation_details`), una fila por respuesta.
> 2. **2FN (Llaves simples):** Toda tabla tiene un ID (PK) único; no hay dependencias parciales.
> 3. **3FN (Sin dependencias transitivas):** El atributo `cohorte` no se guarda en la tabla `users`. El usuario pertenece a un clan, y el clan pertenece a una cohorte. Almacenar la cohorte directamente en el usuario violaría la 3FN (sería una dependencia transitiva derivable con un JOIN)."

## 2. El "Trade-Off" del Anonimato a Nivel de Aplicación
Si el jurado pregunta: *"Si las respuestas son anónimas, ¿por qué veo un vínculo entre el evaluador y la evaluación en la base de datos?"*
**Respuesta Defensiva:**
> "Es una decisión consciente de arquitectura conocida como **Trade-off**. Originalmente consideramos un 'Anonimato Estructural' donde el ID de conexión entre autor y contenido se guardaba como NULL. Sin embargo, la regla número 1 del producto era que *'El Coder debe poder revisar su historial de evaluaciones en su dashboard, incluso las anónimas'*. 
> Para cumplir esto, el vínculo físico (`evaluation_id` en la tabla `evaluation_submissions`) SÍ se guarda en disco. El anonimato se garantiza a **Nivel de Aplicación (Application-Level Filtering)**: las consultas de nuestro Backend destruyen dinámicamente el `evaluator_id` cuando `is_anonymous` es True, impidiendo que el Admin o el Evaluado sepan quién fue, pero permitiendo al propio Coder retener el acceso a su bitácora. Elegimos priorizar la Experiencia de Usuario por encima de un anonimato criptográfico duro."

## 3. Resolución de la Regla de "No-Duplicidad"
Si el jurado nota las reglas de negocio y dice: *"¿Cómo evitan que yo evalúe a mi líder dos veces en el mismo periodo?"*
**Respuesta Defensiva:**
> "No dejamos esa responsabilidad a la aplicación web. En la tabla `evaluation_submissions`, declaramos un índice único compuesto: `UNIQUE (evaluator_id, evaluatee_id, period_id)`. Todas las columnas son de restricción `NOT NULL`. Esto significa que es matemáticamente imposible insertar dos filas con esos mismos tres datos. La Base de Datos opera como la última barrera de integridad (ACID)."

## 4. Preservación Histórica (Soft-Deletes y Versionado)
Si el Admin edita una pregunta: *"¿Qué pasa con las respuestas de hace tres meses a esa misma pregunta?"*
**Respuesta Defensiva:**
> "Las preguntas no permiten ser editadas o eliminadas directamente de la tabla (Mutación In-Place) si el periodo está activo. Cuando el Admin cambia un texto con el periodo cerrado, aplicamos **Versionado (Soft-Delete)**: 
> Se cambia el atributo `is_active = FALSE` a la pregunta original y se inserta una fila completamente nueva con el texto corregido. Así, las llaves foráneas (`FK`) de las respuestas viejas siguen apuntando a la versión inactiva que leyeron originalmente. Esto evita la Deriva Semántica y protege el cálculo estadístico a lo largo del tiempo."

## 5. El ICP y las Vistas Materializadas (Derivación On-Read)
Si preguntan: *"¿En qué tabla guardan el valor del ICP de cada Team Leader?"*
**Respuesta Defensiva:**
> "**En ninguna tabla.** Persistir el Índice de Calidad Percibida (ICP) violaría la normalización porque es un dato puramente derivado (calculable a partir de `evaluation_details`). Si los pesos de las preguntas cambiaran, el valor guardado quedaría obsoleto. 
> En su lugar, aplicamos un patrón de CQRS Ligero: abstrajimos los cálculos (promedios ponderados) utilizando **Vistas SQL Virtuales (`vw_period_metrics`)**. Cada vez que el backend solicita el Dashboard, MySQL corre la vista al vuelo (on-read) asegurando datos siempre precisos."

---

### 🧠 Conceptos clave para memorizar:
*   **DDL (Data Definition Language):** `01_ddl.sql` crea la estructura.
*   **DML (Data Manipulation Language):** `02_dml.sql` inserta la metadata (roles, clanes, settings).
*   **Integridad Referencial:** Reglas dictaminadas por las Llaves Foráneas (`FK`), impidiendo tener registros huérfanos.
*   **Constraint:** Restricción a nivel DB (como el `UNIQUE` o el `CHECK`).
