# 🛡️ Guía de Defensa Técnica: CAPA BACKEND (FastAPI)

Este documento es una guía de estudio intensiva para que **cualquier miembro del equipo** pueda defender las decisiones arquitectónicas del Backend durante el pitch técnico. 

---

## 1. Patrón Arquitectónico: Monolito Modular
El backend no es un script plano. Está estructurado en un patrón de capas horizontales estrictas. Si el jurado pregunta *"¿Cómo organizaron el código?"*, la respuesta es:

*   **`routes/` (Controladores):** Es la frontera de la aplicación. Su única responsabilidad es recibir peticiones HTTP, validar que el JSON de entrada tenga la forma correcta (usando Pydantic) y devolver códigos de estado HTTP (200, 201). **Los routes NUNCA tocan la base de datos.**
*   **`services/` (Lógica de Dominio):** Aquí vive el "cerebro" (ej. `evaluation_service.py`). Si hay que calcular el ICP, validar que un Coder no se evalúe a sí mismo, o hablar con la IA de Google Gemini, se hace aquí. Los servicios no saben qué es una petición HTTP ni un JSON.
*   **`repositories/` (Persistencia):** Su única función es ejecutar código SQL crudo (`sqlalchemy.text()`). Aislamos el SQL aquí para que, si mañana cambiamos de base de datos, no tengamos que reescribir los servicios.

## 2. Abstracción del ORM (¿Por qué SQL Crudo?)
Si el jurado pregunta: *"Si usan SQLAlchemy, ¿por qué no usaron modelos ORM?"*
**Respuesta Defensiva:** 
> "Decidimos prescindir de los modelos declarativos del ORM para evitar la penalización de rendimiento (*overhead*). Nuestro motor analítico requiere consultas de agregación complejas (`AVG`, `SUM`, múltiples `JOINs`). Ejecutar consultas SQL nativas a través del motor de base de datos (`sqlalchemy.text()`) nos da control absoluto sobre los índices y la velocidad, manteniendo una capa de repositorios limpia."

### 2.1. ¿Y por qué usar SQLAlchemy si solo escriben SQL?
Aunque no usamos los modelos del ORM, dependemos de SQLAlchemy como nuestro *driver* principal por dos factores críticos de seguridad y rendimiento:
1. **Connection Pooling:** SQLAlchemy mantiene un *Pool* de conexiones abiertas con MySQL, reutilizándolas en cada request. Esto es vital para la latencia; evita tener que negociar una nueva conexión TCP en cada clic del usuario.
2. **Sanitización Nativa:** Al usar `text()`, inyectamos las variables como parámetros vinculados (ej. `:score`). SQLAlchemy se encarga de escapar y sanitizar estos valores a bajo nivel, haciendo que el sistema sea inmune a la **Inyección SQL (SQL Injection)**. Nunca concatenamos strings de Python para armar un query.

## 3. Autenticación Stateless (El "Talón de Aquiles" Justificado)
Si preguntan: *"¿Cómo manejan la seguridad? ¿Usan JWT o Sesiones?"*
**Respuesta Defensiva:**
> "Adoptamos una estrategia **Stateless**. Las contraseñas nunca se guardan en texto plano; usamos criptografía de una vía (`bcrypt` con salt). Por alcance de MVP, **decidimos no emitir un JWT en el servidor**. En su lugar, el frontend gestiona el estado de sesión y el Control de Acceso (RBAC) enviando los identificadores requeridos en el *payload*. Somos conscientes de que en producción real implementaríamos validación de firma criptográfica de JWT, pero para la validación de nuestra hipótesis central (feedback ascendente), esta simplificación fue una decisión de negocio consciente (YAGNI)."

## 4. Manejo Global de Excepciones (Sin código repetido)
Si revisan `main.py` y preguntan: *"¿Por qué tienen handlers de excepciones globales?"*
**Respuesta Defensiva:**
> "Para cumplir con los principios DRY (Don't Repeat Yourself) y SOLID. Creamos una jerarquía de errores (`ApplicationException`) en `exceptions/base.py`. Si un usuario no existe, nuestro servicio simplemente lanza `UserNotFoundException()`. El framework FastAPI intercepta ese error a nivel global y lo traduce dinámicamente al código HTTP que la excepción tiene definido en su clase (ej. 404). Esto limpia nuestros controladores de interminables bloques `try/except`."

## 5. Cierre de Condiciones de Carrera (Race Conditions)
Si preguntan: *"¿Qué pasa si un usuario presiona el botón Enviar 10 veces rápido? ¿Se duplica la evaluación?"*
**Respuesta Defensiva:**
> "No, es imposible. Aunque tenemos una validación en código (`if repo.check_evaluation_exists(...)`), sabemos que dos peticiones simultáneas podrían superar ese chequeo en milisegundos. Por ello, la validación real la hace el motor de base de datos mediante un `UNIQUE INDEX`. Si hay peticiones concurrentes, MySQL lanza un `IntegrityError`, nuestro backend lo atrapa y devuelve un `HTTP 409 Conflict`. La Base de Datos es la única autoridad de verdad."

---

### 🧠 Conceptos clave para memorizar:
*   **Pydantic:** Librería que valida que los datos de entrada (JSON) sean correctos *antes* de que nuestro código falle.
*   **Google Gemini (IA):** Lo usamos asíncronamente en los servicios. No enviamos datos personales (PII), solo texto agregado.
*   **ASGI:** A diferencia de WSGI (Flask), usamos FastAPI que es asíncrono, permitiendo mejor concurrencia.
