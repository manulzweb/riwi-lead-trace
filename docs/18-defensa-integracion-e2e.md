# 🛡️ Guía de Defensa Técnica: INTEGRACIÓN END-TO-END (El Ciclo de Vida de una Petición)

Para demostrar maestría completa (Full-Stack), debes ser capaz de narrar el viaje exacto de un dato desde el ratón del usuario hasta el disco duro del servidor y su regreso. 

Imagina que el jurado te dice: **"Cuéntame paso a paso qué pasa cuando el Coder hace clic en el botón de Enviar Evaluación."**

Aquí tienes el guion exacto de la arquitectura End-to-End:

---

### Fase 1: Capa de Presentación (Frontend DOM)
1. **El Click:** El usuario (Coder) presiona "Enviar". El evento Javascript (`addEventListener`) detiene el envío nativo de formularios usando `event.preventDefault()`.
2. **Validación Cliente:** El frontend valida que ningún campo obligatorio esté vacío directamente en la memoria del navegador. Si falta algo, bloquea la petición y muestra error en rojo, ahorrando un viaje a la red.
3. **Mapeo de Datos:** El módulo transaccional junta las respuestas visuales y construye un objeto (Payload) JSON que incluye si es "Anónima", y el `ID` de a quién están evaluando.

### Fase 2: Red y Transmisión (API Fetch & CORS)
4. **Fetch API:** El servicio `evaluations.service.js` usa `fetch()` hacia `https://miservidor.com/evaluations/`. 
5. **CORS (Cross-Origin Resource Sharing):** El navegador dispara un request `OPTIONS` (Preflight) al backend. El Middleware CORS en `main.py` de FastAPI responde: *"Sí, acepto peticiones del puerto 5173 del frontend"*.
6. **Transporte:** El JSON viaja a través de la red (idealmente mediante túneles seguros HTTPS).

### Fase 3: Capa de Enrutamiento (FastAPI Router & Pydantic)
7. **Recepción:** El request impacta en `routes/evaluation_routes.py`.
8. **Validación Estricta:** Antes de correr una sola línea lógica, el modelo `EvaluationCreate` (de Pydantic) agarra el JSON entrante. Verifica que los IDs sean enteros, que los puntajes no sean letras y que el formato coincida. Si falla, Pydantic lanza un `HTTP 422 Unprocessable Entity` automáticamente devolviéndolo al Front.

### Fase 4: Lógica de Dominio (Services)
9. **Reglas de Negocio:** El router despacha el DTO (Data Transfer Object) válido hacia `evaluation_service.py`. Aquí el sistema piensa:
   - *"¿Hay un periodo activo?"* (Revisa la tabla `periods`).
   - *"¿El evaluador es un Coder y el evaluado es su TL?"* (Revisa roles y clanes).
10. Si el Servicio detecta una falla en el negocio, lanza una excepción de dominio pura (ej. `PeriodNotActiveException()`), el interceptor en `main.py` la atrapa y devuelve un `409 Conflict`.

### Fase 5: Capa de Persistencia (Repositories & MySQL)
11. **Pool de Conexiones:** El repositorio pide un *Checkout* de conexión a `engine.begin()`, abriendo una transacción de MySQL.
12. **Comandos Preparados:** El Repositorio envía SQL nativo (`sqlalchemy.text()`). Los datos entran como parámetros (`:score`, `:comment`), previniendo 100% ataques de inyección SQL (SQL Injection).
13. **Escritura e Índices (Integridad):** 
    - Se hace un `INSERT` en `evaluations` (contenido). 
    - Se hace un `INSERT` en `evaluation_submissions` (autoría).
    - *Momento Crítico:* Si el sistema intenta escribir la sumisión y descubre que las tres llaves `(evaluator_id, evaluatee_id, period_id)` ya existen, MySQL grita `IntegrityError`. El servicio de Python atrapa el grito y hace un *Rollback* masivo: nada se guarda en disco.
14. **Commit:** Si todo salió bien, Python cierra el contexto y los datos se vuelven persistentes e inmutables en el Disco Duro.

### Fase 6: Retorno y Renderizado (El fin del viaje)
15. **Response:** FastAPI genera una respuesta en JSON `{"id": 105, "status": "submitted"}` con código HTTP 201 Created.
16. **Promesa Resuelta:** El `fetch()` en el frontend recibe el 201.
17. **Destrucción del DOM:** El frontend cambia el estado, elimina el formulario de la pantalla usando JS y pinta un mensaje en verde de "¡Gracias por tu Evaluación!". Todo sin que la pestaña haya parpadeado (comportamiento puro SPA).

---

### 🧠 Comodines Transversales a tener en cuenta:
*   **¿Dónde están los WebSockets?** No usamos. Nuestra API es puramente transaccional (Petición - Respuesta).
*   **¿Por qué es rápido?** Vite minificó el JS (menos peso) y FastAPI al ser asíncrono libera el hilo del servidor mientras espera que MySQL escriba en disco.
*   **JSON (JavaScript Object Notation):** Es la "lingua franca" del sistema. FastAPI lo parsea desde bytes y el front lo convierte a Objetos de JS. Ambos extremos hablan el mismo contrato.
