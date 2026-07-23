# 14 — Manejo de Excepciones

El sistema de **Riwi Lead Trace** implementa una arquitectura robusta de captura y resolución de errores. Para evitar fugas de información, proteger el stack de ejecución y asegurar contratos de API estables, se optó por un sistema de excepciones personalizadas acoplado a un Interceptor (Exception Handler) global.

---

## 1. Filosofía de Diseño: Excepciones Personalizadas vs. Errores Genéricos

En lugar de propagar diccionarios de error manualmente en cada servicio (e.g. `return {"error": "Usuario no encontrado"}`) o levantar genéricos `ValueError`, el proyecto instaura un árbol jerárquico de excepciones de dominio (Domain Exceptions).

### Ventajas de esta decisión:
- **Alta Cohesión:** El dominio (la carpeta `services/`) es agnóstico del framework web (FastAPI). Los servicios lanzan una `ApplicationException` en lugar de una `HTTPException` de FastAPI. Esto desacopla el negocio de la capa de transporte HTTP.
- **Trazabilidad (Type Hinting):** Permite capturar errores de forma explícita basándose en el tipo de excepción (`except UserNotFoundException:`).
- **Consistencia:** Todo el equipo sabe exactamente qué excepciones existen simplemente inspeccionando la carpeta `app/exceptions/`.

---

## 2. Relación con la Programación Orientada a Objetos (POO)

El diseño se apoya en los pilares fundamentales de la herencia y el polimorfismo. 

### La Clase Base: `ApplicationException`
Toda excepción del sistema hereda de una raíz común alojada en `app/exceptions/base.py`:

```python
class ApplicationException(Exception):
    """
    Toda excepción de dominio hereda de aquí.
    El atributo `http_status` delega el código HTTP a la excepción misma, 
    eliminando la lógica de mapeo en los handlers.
    """
    http_status: int = 500
```

### Subclases de Dominio
Cada módulo de la aplicación posee su propio archivo de excepciones (e.g., `user_exceptions.py`, `evaluation_exceptions.py`). A partir de `ApplicationException`, se derivan jerarquías específicas:

```python
# Ejemplo de herencia en form_exceptions.py
class FormException(ApplicationException):
    pass

class FormNotFoundException(FormException):
    http_status = 404

class InvalidRoleException(FormException):
    http_status = 422
```

> **Encapsulamiento del Código HTTP:** Observa que el código HTTP pertenece a la clase misma. Esto soluciona un problema arquitectónico complejo: la colisión de nombres. Existen dos excepciones llamadas `InvalidRoleException` en el proyecto (una en formularios que retorna `422` y otra en evaluaciones que retorna `403`). Al usar polimorfismo, el interceptor global no se confunde; simplemente extrae el valor `http_status` de la instancia que llega.

---

## 3. Captura Global: Interceptor de Excepciones

Para eliminar el *boilerplate* de bloques `try/except` repetitivos en la capa de controladores (`routes/`), la aplicación delega la serialización de errores a un interceptor global ubicado en `main.py`.

### Flujo de Captura:
1. **Lanzamiento:** El `UserService` falla al encontrar a alguien y lanza un `UserNotFoundException("Usuario inexistente")`.
2. **Propagación:** La excepción atraviesa el controlador intacta.
3. **Intercepción:** FastAPI delega el control a la función decorada con `@app.exception_handler(ApplicationException)`.

```python
@app.exception_handler(ApplicationException)
async def application_exception_handler(request: Request, exc: ApplicationException):
    """Traduce TODA excepcion de dominio a su respuesta HTTP consistente."""
    return JSONResponse(
        status_code=exc.http_status, # Lee el código (ej. 404) dinámicamente
        content={"detail": str(exc)}, # Empaqueta el mensaje
    )
```

### Manejo Opaco de Errores Críticos (Fallback)
Cualquier error no heredado de `ApplicationException` (por ejemplo, fallos de base de datos `SQLAlchemyError`, `KeyError` no previstos) caerá en el handler raíz de `Exception`. 

Este handler aplica una **Estrategia Opaca**:
- No retorna el *Stack Trace* ni sentencias SQL al Frontend.
- Retorna un código HTTP `500` con un `error_id` (UUID).
- Registra internamente (vía `logger.exception`) el rastro real con el mismo UUID, permitiendo a los ingenieros correlacionar un reporte de usuario con un error exacto del servidor de manera segura.

---

## 4. Transparencia Técnica 

En resumen: la arquitectura se rige bajo la premisa de que los servicios fallan (arrojan excepciones) y el framework web responde (traduce esas excepciones al protocolo HTTP). 

Al separar conceptualmente los **Errores de Dominio** de los **Errores de Red/Transporte**, se garantiza que la lógica central del software pueda ser porteada a otro framework (ej., un script de terminal CLI) sin arrastrar dependencias de FastAPI (como `HTTPException`).
