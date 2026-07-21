# Guía de Arquitectura: Cómo funciona el Backend de Riwi LeadTrace

Este documento explica **exactamente** cómo está construido el backend actual. El objetivo es que cualquier miembro del equipo entienda la arquitectura, el flujo de datos y las decisiones de diseño (como no usar ORM ni JWT) para poder contribuir sin romper las reglas de negocio.

---

## 1. Arquitectura: El Patrón "Router-Service" (Sin ORM)

El backend evita intencionalmente capas de abstracción excesivas (no hay carpetas `models/` ni `repositories/`). Todo el flujo se divide estrictamente en dos capas:

```
Cliente HTTP (Frontend)
   │  POST /evaluations
   ▼
routes/          → (Controladores) Recibe HTTP, valida el JSON con Pydantic, delega al servicio.
   │
   ▼
services/        → (Reglas y Datos) Lógica de negocio, consultas SQL planas y transacciones.
   │
   ▼
Base de datos (MySQL)
```

**¿Por qué no hay ORM?**
Para evitar indirecciones en consultas complejas y optimizar el rendimiento. Las tablas se crean con un script (`database/01_ddl.sql`) y en los `services` se escriben sentencias SQL reales usando `sqlalchemy.text()`.

---

## 2. La Base de Datos: Conexiones e Hilos

En `app/config/database.py`, inicializamos SQLAlchemy puramente como un **gestor del pool de conexiones**, no como un mapeador de objetos.

```python
engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
_local = threading.local()

def get_connection():
    if not hasattr(_local, "conn"):
        _local.conn = engine.connect()
    return _local.conn
```

*   **`threading.local()`**: FastAPI corre las rutas síncronas en un ThreadPool. Usamos memoria local por hilo para asegurar que **cada request HTTP tenga su propia conexión exclusiva**. Esto evita colisiones (race conditions) cuando dos usuarios envían evaluaciones al mismo tiempo.
*   En los `services`, accedes a la base de datos simplemente importando `conn`:
    ```python
    from app.config.database import conn
    ```

---

## 3. Transaccionalidad y Rollbacks

Dado que ejecutamos SQL a mano, es **crítico** asegurar la integridad referencial. Cuando una operación inserta datos en múltiples tablas (ej. crear una evaluación y sus respuestas), usamos un bloque `try/except` con `conn.rollback()`:

```python
def create_evaluation(eval_data: EvaluationCreate):
    try:
        # 1. Insertar la cabecera
        conn.execute(text("INSERT INTO evaluations ..."))
        
        # 2. Insertar los hijos
        conn.execute(text("INSERT INTO detalles_evaluacion ..."))
        
        # 3. Confirmar transacción
        conn.commit()
    except Exception as e:
        # Si algo falla en el paso 2, se deshace el paso 1.
        conn.rollback()
        raise e
```
**Regla:** Toda mutación múltiple debe tener un `conn.rollback()` en el except.

---

## 4. Validaciones de Datos: Pydantic (Schemas)

Al no usar modelos SQLAlchemy (`models/`), toda la validación de entrada y salida recae sobre **Pydantic** (`app/schemas/`).

```python
class PeriodCreate(BaseModel):
    name: str = Field(..., max_length=60)
    starts_at: date
    ends_at: date
    is_active: bool = False
```

FastAPI intercepta la petición HTTP y la choca contra este `BaseModel`. Si el frontend manda un `starts_at` que no es una fecha válida, la API responde automáticamente con HTTP 422 Unprocessable Entity, protegiendo a los `services` de recibir basura.

---

## 5. Decisiones de Diseño: Stateless Auth (Sin JWT)

El proyecto asume que es un **MVP cerrado**. No implementa firmas criptográficas (JWT) ni mantiene sesiones en memoria.

1.  **Login (`POST /auth/login`)**: Verifica el correo y compara la contraseña contra el hash `Bcrypt` de la base de datos. Retorna la información del usuario en texto plano.
2.  **Identidad**: En operaciones posteriores, el Frontend envía su ID (ej. `evaluator_id`) en el body de la petición JSON.
3.  **Seguridad Delegada**: El backend confía en el ID proporcionado. Las barreras de autorización (RBAC) están a cargo de la Interfaz de Usuario (UI).

---

## 6. Flujo Práctico: De la Ruta al Servicio

Tomemos como ejemplo la obtención del resumen de métricas con Inteligencia Artificial.

### Paso 1: El Router (`app/routes/metrics_routes.py`)
```python
@router.get("/metrics/ai-summary")
def get_ai_summary(evaluatee_id: int, period_id: int):
    """Delega al servicio la generación NLP. Documentación expuesta vía Swagger."""
    summary = ai_service.get_or_generate_ai_summary(evaluatee_id, period_id)
    return {"summary": summary}
```

### Paso 2: El Servicio (`app/services/ai_service.py`)
```python
def get_or_generate_ai_summary(evaluatee_id: int, period_id: int):
    # 1. Buscar en caché relacional (SQL Plano)
    cache = conn.execute(text("SELECT summary FROM ai_feedback_cache ...")).first()
    if cache: return cache.summary

    # 2. Compilar métricas crudas (Raw SQL)
    raw_data = conn.execute(text("SELECT text, score FROM evaluations JOIN ...")).mappings()
    
    # 3. Invocar SDK (google-generativeai / Gemini 1.5)
    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content(prompt)
    
    # 4. Guardar en caché relacional
    conn.execute(text("INSERT INTO ai_feedback_cache ..."))
    conn.commit()
    
    return response.text
```

### Resumen del flujo:
El Router abstrae el protocolo HTTP (Queries, Status Codes). El Servicio abstrae la base de datos (SQL, Caché, Transactions) y los proveedores de terceros (Gemini).

---

## 7. Referencia Rápida de Librerías (`requirements.txt`)

*   `fastapi`: Framework web y ruteador HTTP.
*   `uvicorn[standard]`: Servidor ASGI para correr FastAPI.
*   `sqlalchemy` + `pymysql`: Utilizados estrictamente para conexión a MySQL y ejecución de texto crudo.
*   `pydantic`: Tipado estricto y validación de schemas de entrada/salida.
*   `bcrypt` (`passlib`): Hashing asimétrico de contraseñas de un solo sentido.
*   `google-generativeai`: SDK de Gemini para análisis sintáctico de preguntas y NLP de métricas.

## 8. Siguientes Pasos (Para el equipo)

Si vas a agregar una nueva entidad (ej. `Reclamaciones`):
1. Añade la tabla a `database/01_ddl.sql`.
2. Crea un archivo en `app/schemas/claim.py` definiendo la entrada/salida.
3. Crea un archivo `app/services/claim_service.py` con tus SQL `text()`.
4. Expón la lógica en `app/routes/claim_routes.py` y regístralo en `main.py`.
