# 🧠 Riwi LeadTrace - Capa Backend (API)

Este directorio contiene la arquitectura del servidor **FastAPI**, implementada bajo un patrón de **Monolito Modular**. Está diseñado para garantizar escalabilidad, aislamiento de lógica de negocio y alta integridad transaccional sobre MySQL.

---

## 🏗️ Topología Arquitectónica

La separación de responsabilidades (SRP) es estricta. El código fluye desde la capa externa (web) hacia la interna (persistencia):

*   **`routes/` (Controladores HTTP):** Frontera de la aplicación. Su único trabajo es interceptar la petición, validar el JSON con esquemas Pydantic y devolver códigos HTTP `200`, `201`, etc. Nunca ejecutan reglas de negocio.
*   **`services/` (Lógica de Dominio):** El "cerebro". Aquí vive el control de anonimato, los cálculos analíticos (ICP), la orquestación de inteligencia artificial (Gemini) y las máquinas de estados. No importan objetos de FastAPI; son funciones puras o clases de negocio.
*   **`repositories/` (Persistencia de Datos):** Abstracción de I/O. Ejecutan el SQL crudo (`sqlalchemy.text()`) sobre el Pool de conexiones.
*   **`schemas/` (Contratos Pydantic):** Validación de tipos (DTOs). Garantizan que ninguna data corrupta entre a los servicios.
*   **`exceptions/` (Polimorfismo de Errores):** Jerarquía de excepciones de dominio (ej. `PeriodNotActiveException`).

## 🛡️ Decisiones de Ingeniería Clave

### 1. SQL Crudo sobre ORM (Rendimiento)
Aunque usamos `SQLAlchemy` para el **Connection Pooling** y prevención de SQL Injection (parametrización segura), prescindimos intencionalmente de sus Modelos Declarativos (ORM). Todo el CRUD y la agregación de métricas complejas (OLAP) operan mediante vistas SQL y comandos nativos (`text()`). Esto evita el *overhead* de instanciación de objetos en Python, crítico para los Dashboards administrativos.

### 2. Autenticación Stateless (MVP)
Para el *Minimum Viable Product*, las contraseñas se protegen criptográficamente vía `bcrypt`. No obstante, **no se emite JWT ni cookies de sesión en el servidor**. El control de roles (RBAC) está delegado funcionalmente al cliente. La API asume transaccionalmente el ID que el cliente inyecta en el Payload.

### 3. Mitigación de Race Conditions (ACID)
Si dos *requests* intentan registrar la misma evaluación simultáneamente (Doble Clic), el servicio no depende solo del código Python. MySQL lanza un `IntegrityError` provocado por el `UNIQUE INDEX` en `evaluation_submissions`. Nuestro interceptor global en `main.py` lo traduce limpiamente a un `409 Conflict`.

---

## 🚀 Guía de Despliegue Local

### 1. Pre-requisitos
*   Python 3.12+
*   Servidor MySQL (Corriendo en puerto 3306)

### 2. Creación del Entorno (Virtual Env)
```bash
# Navegar al directorio del backend
cd backend

# Crear entorno virtual
python -m venv venv

# Activar (En Windows)
venv\Scripts\activate
# Activar (En Linux/Mac)
source venv/bin/activate
```

### 3. Instalación de Dependencias
```bash
pip install -r requirements.txt
```

### 4. Configuración (Variables de Entorno)
Crea un archivo `.env` en el directorio `backend/` basándote en `.env.example`:
```env
DATABASE_URL=mysql+pymysql://root:root@localhost/riwi_lead_trace
GEMINI_API_KEY=tu_clave_de_google_ai_studio
FRONTEND_ORIGIN=http://localhost:5173
```
*(Asegúrate de que la BD haya sido poblada usando los scripts SQL de la carpeta `/database` del proyecto).*

### 5. Inicializar Servidor (ASGI)
```bash
uvicorn app.main:app --reload
```
La API estará disponible en `http://localhost:8000`.
Puedes probar todos los Endpoints interactivamente en el Swagger Auto-Generado: **`http://localhost:8000/docs`**
