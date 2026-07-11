# Guía de estudio: cómo funciona el backend de Riwi LeadTrace

Este documento es material de estudio personal (no es parte de `/docs` oficial del repo). El objetivo:
que puedas recrear cualquier endpoint de esta API vos mismo, entendiendo cada pieza, sin depender de que
alguien más te dé el código.

---

## 1. Panorama general: la arquitectura en capas

Cuando el navegador (o Swagger) le pide algo a la API, la petición viaja así:

```
Cliente HTTP
   │  GET /periods
   ▼
routes/          → recibe el request, decide qué status code devolver
   │
   ▼
services/        → lógica de negocio (reglas, decisiones)
   │
   ▼
repositories/    → las únicas funciones que hacen preguntas a la base de datos
   │
   ▼
models/          → describen cómo son las tablas (y la forma del JSON de salida)
   │
   ▼
Base de datos (MySQL)
```

**Regla de oro: cada capa solo le habla a su vecina inmediata.** Una `route` nunca hace una query
directamente; un `service` nunca arma una respuesta HTTP; un `repository` nunca decide reglas de negocio.

¿Por qué separar así? Es el principio **SRP** (Single Responsibility Principle, la "S" de SOLID):
cada archivo tiene una sola razón para cambiar. Si mañana cambia la regla de negocio de "quién puede ver
qué periodo", tocás `services/`, no `routes/` ni `repositories/`. Si cambia la query SQL, tocás
`repositories/`, y nada más se entera.

---

## 2. Conceptos de SQL (la base de datos relacional)

MySQL es una **base de datos relacional**: guarda la información en **tablas** (como hojas de Excel).

- Cada **tabla** tiene **columnas** (campos, ej. `id`, `name`, `starts_at`) y **filas** (registros, ej. un
  periodo concreto).
- La **primary key** (`id`) identifica una fila de forma única.
- Una **foreign key** (`clan_id` en `users`, por ejemplo) es una columna que apunta al `id` de otra tabla
  — así se relacionan las tablas entre sí sin repetir datos (esto es lo que hace que sea "relacional").
- Ejemplo real del proyecto: `clans.cohort_id` apunta a `cohorts.id`. Cada clan pertenece a una
  cohorte, pero la info de la cohorte solo vive una vez en su propia tabla.

El lenguaje para hablarle a la base de datos es **SQL** (Structured Query Language). Ejemplos:

```sql
-- Traer todos los periodos, del más nuevo al más viejo
SELECT * FROM periods ORDER BY starts_at DESC;

-- Traer un usuario por su email
SELECT * FROM users WHERE email = 'coder@riwi.edu';

-- Traer los clanes de una cohorte específica (join)
SELECT clans.* FROM clans
JOIN cohorts ON clans.cohort_id = cohorts.id
WHERE cohorts.number = 5;
```

En este proyecto **casi nunca vas a escribir SQL a mano** — para eso usamos SQLAlchemy (sección
siguiente). Pero entender el SQL de abajo te ayuda a leer errores y a razonar qué está pasando
realmente.

---

## 3. Qué es SQLAlchemy (el ORM)

**ORM** = Object-Relational Mapper. Es una librería que te deja trabajar con la base de datos usando
**clases y objetos de Python**, en vez de escribir SQL a mano.

Ejemplo — esto:

```python
db.query(Period).order_by(Period.starts_at.desc()).all()
```

Es lo mismo que este SQL, pero escrito con sintaxis de Python:

```sql
SELECT * FROM periods ORDER BY starts_at DESC;
```

### 3.1 El "modelo" SQLAlchemy

Cada tabla de la base de datos se representa como una **clase Python** que hereda de `Base`:

```python
# backend/app/models/period.py
from sqlalchemy import Boolean, Column, Date, Integer, String
from app.core.database import Base


class Period(Base):
    __tablename__ = "periods"          # nombre real de la tabla en MySQL

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(60), nullable=False)
    starts_at = Column(Date, nullable=False)
    ends_at = Column(Date, nullable=False)
    is_active = Column(Boolean, nullable=False, default=False)
```

- `__tablename__` conecta la clase con la tabla real.
- Cada `Column(...)` es una columna: el primer argumento es el tipo SQL (`Integer`, `String(60)`,
  `Date`, `Boolean`...), y los argumentos con nombre (`nullable`, `primary_key`, `default`) son las
  mismas reglas que verías en un `CREATE TABLE` de `database/schema.sql`.
- `relationship("Clan")` (lo ves en `models/user.py`) no crea una columna nueva: le dice a SQLAlchemy
  "cuando accedas a `user.clan`, andá a buscar la fila relacionada usando la foreign key". Es azúcar
  sintáctico para no escribir el `JOIN` a mano.

### 3.2 El `engine` y la `Session`

Dos piezas clave viven en `core/database.py` (esa carpeta la maneja el equipo/vos, no yo):

```python
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
```

- **`engine`**: sabe *cómo* conectarse a MySQL (el driver, el host, el puerto). No abre la conexión
  todavía, solo la deja lista para usar.
- **`SessionLocal`**: es una "fábrica" de sesiones. Cada vez que la llamás (`SessionLocal()`), te da una
  conversación nueva con la base de datos — como abrir una pestaña de MySQL Workbench.
- **`Base`**: la clase madre de la que heredan todos los modelos (`Period`, `User`, `Clan`...). Es lo que
  le permite a SQLAlchemy saber "estas son todas mis tablas" (`Base.metadata`).

### 3.3 Cómo se usa una `Session` para consultar

```python
# backend/app/repositories/period_repository.py
from sqlalchemy.orm import Session
from app.models.period import Period


def list_periods(db: Session) -> list[Period]:
    return db.query(Period).order_by(Period.starts_at.desc()).all()
```

- `db.query(Period)` = "quiero traer filas de la tabla `periods`".
- `.order_by(Period.starts_at.desc())` = "ordenadas por fecha, de más reciente a más vieja".
- `.all()` = "dame todas las filas como una lista de objetos `Period`". Otras opciones comunes:
  `.first()` (una sola fila o `None`), `.filter(Period.is_active == True)` (el equivalente al `WHERE`).

---

## 4. Cómo se arma la conexión a la base de datos (paso a paso)

1. **`.env`** tiene la cadena de conexión:
   ```
   DATABASE_URL=mysql+pymysql://usuario:password@localhost:3306/riwi_lead_trace
   ```
   Formato: `dialecto+driver://usuario:contraseña@host:puerto/nombre_bd`.
   - `mysql` = el motor de base de datos.
   - `pymysql` = el driver de Python que sabe "hablar" el protocolo de MySQL (por eso está en
     `requirements.txt`).

2. **`core/config.py`** lee esa variable de entorno con Pydantic Settings:
   ```python
   class Settings(BaseSettings):
       DATABASE_URL: str
       ...
       class Config:
           env_file = ".env"

   settings = Settings()
   ```
   `pydantic-settings` valida que las variables de entorno existan y tengan el tipo correcto (si falta
   `DATABASE_URL`, la app ni siquiera arranca — falla rápido, en vez de fallar más tarde a mitad de un
   request).

3. **`core/database.py`** usa esa `settings.DATABASE_URL` para crear el `engine` (sección 3.2).

4. **`deps.py`** expone `get_db()`, la función que **cada endpoint** usa para pedir una sesión:
   ```python
   def get_db():
       db = SessionLocal()
       try:
           yield db
       finally:
           db.close()
   ```
   Esto es un **generador** (`yield` en vez de `return`). FastAPI lo entiende como: "abrí la sesión,
   dásela al endpoint, y cuando el endpoint termine (aunque sea con un error), cerrala". Es el patrón
   que garantiza que nunca se quede una conexión abierta colgada.

---

## 5. Dos tipos de clases: modelo SQLAlchemy vs esquema Pydantic

Esto confunde al principio porque parecen lo mismo, pero cumplen roles distintos:

| | SQLAlchemy (`Period`) | Pydantic (`PeriodOut`) |
|---|---|---|
| Para qué | Representa la fila en la BD | Representa el JSON de salida/entrada de la API |
| Vive en | `models/period.py` | `models/period.py` (mismo archivo, por simplicidad) |
| Hereda de | `Base` | `BaseModel` |
| Sabe hacer queries | Sí | No, solo valida datos |

```python
from datetime import date
from pydantic import BaseModel, ConfigDict


class PeriodOut(BaseModel):
    id: int
    name: str
    starts_at: date
    ends_at: date
    is_active: bool

    model_config = ConfigDict(from_attributes=True)
```

`model_config = ConfigDict(from_attributes=True)` es la línea clave: le dice a Pydantic "podés
construirte a partir de un objeto que tiene estos atributos" (un objeto `Period` de SQLAlchemy), no
solo a partir de un diccionario. Sin esto, FastAPI no podría convertir automáticamente lo que devuelve
`db.query(Period).all()` en JSON.

**Por qué separarlas:** si la tabla `users` tiene `password_hash`, jamás querés que ese campo termine en
una respuesta JSON. Con un esquema de salida propio, vos decidís explícitamente qué campos salen —
la clase SQLAlchemy puede tener más columnas de las que el `Out` expone.

---

## 6. FastAPI: las piezas que usamos

### 6.1 `APIRouter`

Un router agrupa endpoints relacionados (todo lo de `periods` en un archivo, todo lo de `health` en
otro):

```python
# backend/app/routes/period_routes.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.deps import get_db
from app.models.period import PeriodOut
from app.services import period_service

router = APIRouter()


@router.get("/periods", response_model=list[PeriodOut])
def get_periods(db: Session = Depends(get_db)):
    return period_service.get_periods(db)
```

- `@router.get("/periods", ...)` = "cuando llegue un `GET /periods`, ejecutá esta función".
- `response_model=list[PeriodOut]` = "la salida tiene que tener esta forma". FastAPI valida el
  resultado contra `PeriodOut` automáticamente y lo convierte a JSON — si el `service` devolviera algo
  con forma incorrecta, FastAPI tira un error 500 en vez de mandar datos rotos al cliente.
- `db: Session = Depends(get_db)` es **inyección de dependencias**: le decís a FastAPI "antes de correr
  esta función, ejecutá `get_db()` y pasame lo que devuelva como el parámetro `db`". Así el endpoint
  nunca abre la sesión a mano, ni se olvida de cerrarla.

### 6.2 Registrar el router en `main.py`

```python
from app.routes import health, period_routes

app.include_router(health.router, tags=["health"])
app.include_router(period_routes.router, tags=["periods"])
```

`include_router` "pega" las rutas del router dentro de la app principal. `tags=[...]` es solo cosmético:
agrupa los endpoints en `/docs` bajo ese nombre.

### 6.3 `Depends()` en general

`Depends()` no es solo para la BD. También se usa para autenticación:

```python
# deps.py
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    payload = decode_access_token(credentials.credentials)
    ...
    return {"id": ..., "role": ...}


def require_role(*roles: str):
    def checker(current_user: dict = Depends(get_current_user)):
        if current_user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Sin permiso")
        return current_user
    return checker
```

- `get_current_user` lee el header `Authorization: Bearer <token>`, lo decodifica, y devuelve quién es
  el usuario. Cualquier endpoint que lo pida como dependencia queda protegido: si el token es inválido,
  ni siquiera entra a la función del endpoint.
- `require_role("admin")` es una **fábrica de dependencias**: es una función que devuelve otra función
  (`checker`). Así podés escribir `Depends(require_role("admin"))` en un endpoint y `Depends(require_role("coder", "tutor"))`
  en otro, reutilizando la misma lógica de verificación con distintos roles permitidos — DRY en acción.

### 6.4 CORS

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Por seguridad, un navegador bloquea por defecto que una página en `http://localhost:5173` (la SPA) le
pida datos a `http://localhost:8000` (la API) — son "orígenes" distintos. Este middleware le dice al
navegador "confío en pedidos que vengan de `FRONTEND_ORIGIN`, dejalos pasar".

### 6.5 `/docs` gratis

FastAPI genera automáticamente una interfaz interactiva (Swagger UI) en `http://localhost:8000/docs`,
leyendo los `response_model`, los tipos de los parámetros y los docstrings. No hay que escribir nada
extra para tenerla — es una ventaja grande de declarar bien los tipos con Pydantic.

---

## 7. `requirements.txt` explicado paquete por paquete

```
fastapi==0.111.0            # el framework web: define rutas, valida requests/responses, genera /docs
uvicorn[standard]==0.29.0   # el servidor que realmente corre la app (FastAPI no se ejecuta solo)
sqlalchemy==2.0.30          # el ORM (sección 3)
pymysql==1.1.1              # el driver que le permite a SQLAlchemy hablar con MySQL
pydantic==2.7.1             # validación de datos y tipos (los BaseModel, como PeriodOut)
pydantic-settings==2.2.1    # extensión de Pydantic para leer configuración desde variables de entorno / .env
python-jose[cryptography]==3.3.0  # crear y decodificar tokens JWT (login)
passlib[bcrypt]==1.7.4      # hashear y verificar contraseñas de forma segura
python-dotenv==1.0.1        # carga el archivo .env para que esté disponible como variables de entorno
anthropic==0.28.0           # SDK oficial para llamar a la API de Claude (resúmenes de feedback con IA)
python-multipart==0.0.9     # necesario para que FastAPI pueda leer formularios/archivos subidos
```

**Analogía:** `fastapi` es el mesero (recibe pedidos, entrega platos), `uvicorn` es el que abre el
restaurante y lo mantiene funcionando, `sqlalchemy` + `pymysql` es quien va a la cocina (la BD) a buscar
los ingredientes, y `pydantic` es el que revisa que cada plato tenga la forma correcta antes de salir.

---

## 8. Cómo correr el proyecto (paso a paso)

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt

# Asegurate de tener un archivo .env (basado en .env.example) con tu DATABASE_URL real

uvicorn app.main:app --reload
```

- `--reload` reinicia el servidor automáticamente cada vez que guardás un archivo — útil en desarrollo,
  nunca en producción.
- Una vez corriendo: abrí `http://localhost:8000/docs` y probá los endpoints ahí mismo, sin necesitar
  Postman ni curl.

---

## 9. Caso de estudio completo: `GET /periods` de punta a punta

Este es el ejemplo real que ya está armado en el repo — servite de receta para las próximas entidades.

1. **`models/period.py`** — define la tabla (`Period`, SQLAlchemy) y la forma de salida (`PeriodOut`,
   Pydantic).
2. **`repositories/period_repository.py`** — la única función que sabe hacer la query:
   ```python
   def list_periods(db: Session) -> list[Period]:
       return db.query(Period).order_by(Period.starts_at.desc()).all()
   ```
3. **`services/period_service.py`** — hoy no tiene lógica de negocio propia (todavía), solo delega. Es
   el lugar donde, si mañana la historia pide "solo devolver periodos activos", agregás esa regla sin
   tocar la query ni la ruta:
   ```python
   def get_periods(db: Session) -> list[Period]:
       return period_repository.list_periods(db)
   ```
4. **`routes/period_routes.py`** — conecta el HTTP con el service (sección 6.1).
5. **`main.py`** — registra el router (sección 6.2).

Petición real: `GET http://localhost:8000/periods` → FastAPI ejecuta `get_periods` → inyecta `db` vía
`get_db()` → llama a `period_service.get_periods(db)` → llama a `period_repository.list_periods(db)` →
SQLAlchemy arma y ejecuta el `SELECT` → devuelve objetos `Period` → FastAPI los valida/convierte con
`PeriodOut` → responde JSON.

---

## 10. Ejercicio guiado: repetí el patrón con otra entidad

Para practicar sin ayuda, elegí una tabla simple que ya existe en `database/schema.sql` (por ejemplo
`cohorts`) y recreá los 5 archivos siguiendo exactamente el mismo orden que en la sección 9:

1. ¿Ya existe la clase SQLAlchemy en `models/`? Si no, creala primero (columnas = columnas del `CREATE
   TABLE`).
2. Agregá la clase Pydantic de salida (`CohortOut`) en el mismo archivo.
3. `repositories/cohort_repository.py` → función `list_cohorts(db)`.
4. `services/cohort_service.py` → función `get_cohorts(db)` (por ahora solo delega).
5. `routes/cohort_routes.py` → `GET /cohorts` con `response_model=list[CohortOut]`.
6. Registrar el router nuevo en `main.py`.
7. Probar en `/docs`.

Si en algún paso no estás seguro de qué escribir, volvé a la sección correspondiente de esta guía antes
de pedir ayuda — la idea es que puedas defender cada línea en la sustentación.
