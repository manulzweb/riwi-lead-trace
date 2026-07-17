# Riwi LeadTrace — Backend

API REST del proyecto **Riwi LeadTrace**: evaluación ascendente de Coders hacia Team Leaders y
Tutores, con anonimato opcional, un Índice de Calidad Percibida (ICP) por periodo y resúmenes de
feedback generados con IA (Claude API).

Para entender *cómo* funciona cada capa del código (con ejemplos guiados), ver
[`GUIA-BACKEND.md`](./GUIA-BACKEND.md). Este README es para poner el proyecto a correr y consultar
la lista de endpoints.

## Stack

- **Python 3.12 + FastAPI**
- **SQL plano** vía SQLAlchemy `text()` + `conn.execute()` (sin ORM, sin capa `models/`) + **PyMySQL** sobre **MySQL**
- **Pydantic** para validación de entrada/salida
- **bcrypt** (`passlib`) para hashear contraseñas — login verifica en servidor, **sin JWT** (decisión de equipo para simplificar el MVP: el rol/ID de quien llama se confía al valor que manda el propio front, no hay verificación criptográfica de sesión en el backend)
- **Claude API** (`anthropic`) para el resumen de feedback

## Requisitos previos

- Python 3.12+
- MySQL corriendo localmente (o accesible por red) con la base ya creada a partir de
  [`database/schema.sql`](../database/schema.sql)

## Instalación

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
```

## Variables de entorno

Copiá `.env.example` a `.env` y completá los valores:

```bash
cp .env.example .env
```

| Variable | Descripción | Ejemplo |
|---|---|---|
| `DATABASE_URL` | Cadena de conexión a MySQL (`dialecto+driver://usuario:password@host:puerto/bd`) | `mysql+pymysql://root:password@localhost:3306/riwi_lead_trace` |
| `ANTHROPIC_API_KEY` | API key de Claude, para `/metrics/ai-summary`. Si falta, ese endpoint responde un mensaje claro en vez de fallar. | `sk-ant-...` |
| `FRONTEND_ORIGIN` | Origen permitido por CORS (la URL de la SPA) | `http://localhost:5173` |

## Base de datos

El esquema **no** se crea con SQLAlchemy — se ejecuta el script SQL directamente:

```bash
mysql -u root -p < ../database/schema.sql
```

Esto crea las tablas normalizadas a 3FN (`roles`, `cohorts`, `clans`, `users`, `periods`,
`form_templates`, `questions`, `evaluations`, `evaluation_answers`, `ai_feedback_cache`). Ver
[`docs/07-base-de-datos.md`](../docs/07-base-de-datos.md) para el modelo entidad-relación completo.

`app/config/database.py` expone un `conn` que cada `service` usa directo (`conn.execute(...)`,
`conn.commit()`). Por dentro le da a **cada hilo su propia `Connection`** de SQLAlchemy (FastAPI
corre los endpoints sync de este proyecto en un threadpool) para que dos requests concurrentes no
compartan el mismo objeto de conexion/transaccion.

## Correr el servidor

```bash
uvicorn app.main:app --reload
```

- API disponible en `http://localhost:8000`
- Documentación interactiva (Swagger) en `http://localhost:8000/docs`

## Endpoints

**Ninguno de estos endpoints verifica sesión ni rol en el servidor** (no hay JWT — ver "Stack").
La columna "Rol esperado" es solo lo que el *frontend* respeta al armar la UI y, en algunos casos,
un parámetro (`viewer_role`, `evaluator_id`) que el propio cliente manda y el backend usa tal cual
para filtrar datos, sin poder confirmar que sea real. No lo trates como control de acceso real.

| Método | Endpoint | Uso | Rol esperado (front) |
|---|---|---|---|
| GET | `/` | Health check | público |
| POST | `/auth/login` | Login → `{ user }` (sin token) | público |
| GET | `/users` | Listar usuarios | cualquiera |
| GET | `/users/{id}` | Obtener un usuario | cualquiera |
| POST | `/users` | Crear usuario | admin |
| PUT | `/users/{id}` | Actualizar usuario | admin |
| DELETE | `/users/{id}` | Eliminar usuario | admin |
| GET | `/periods` | Listar periodos | cualquiera |
| GET | `/periods/{id}` | Obtener un periodo | cualquiera |
| POST | `/periods` | Crear periodo | admin |
| PUT | `/periods/{id}` | Actualizar periodo (activar/cerrar) | admin |
| DELETE | `/periods/{id}` | Eliminar periodo | admin |
| GET | `/forms?target_role=` | Plantilla de formulario para `team_leader` o `tutor` | cualquiera |
| POST | `/evaluations` | Registrar evaluación (borrador o enviada) — valida anonimato, no-duplicado por periodo y periodo activo | cualquiera |
| GET | `/evaluations?evaluator_id=` | Historial de evaluaciones hechas por un Coder | cualquiera |
| GET | `/evaluations?evaluatee_id=&period_id=&viewer_role=` | Histórico de evaluaciones recibidas; `viewer_role=admin` revela al evaluador en no-anónimas | cualquiera |
| GET | `/metrics/summary?period_id=` | KPIs globales + ICP por persona en un periodo | admin, team_leader, tutor |
| GET | `/metrics/ai-summary?evaluatee_id=&period_id=` | Resumen de feedback generado con Claude (cacheado) | admin |

## Estructura del proyecto

```
app/
├── main.py       # arma la app FastAPI, CORS, registra los routers
├── config/       # settings (.env), conexión a MySQL, hashing de contraseñas (bcrypt)
├── schemas/      # Pydantic — forma de entrada/salida de cada endpoint
├── routes/       # un router por recurso; valida y delega a services
└── services/     # lógica de negocio + queries SQL (auth, user, period, form, question, evaluation, metrics, ai)
```

No hay carpeta `models/`: la forma de las tablas vive solo en
[`database/schema.sql`](../database/schema.sql), y cada `service` arma su propio SQL con `text()`.

Reglas de negocio clave (no romper sin acordarlo con el equipo):

- Evaluación anónima → nunca se persiste ni se expone `evaluator_id` (`hide_evaluator` en
  `evaluation_service.get_evaluations_by_evaluatee`).
- Un Coder no puede evaluar dos veces a la misma persona en el mismo periodo.
- El ICP (`average_score` + `status`) se calcula on-read en `metrics_service.py`, no se persiste.
  Con menos de `MIN_EVALUATIONS` (3) respuestas, no se publica (`average_score: null`). El estado
  (`Sólido` / `Estable` / `En riesgo` / `Datos insuficientes`) sale de comparar contra dos umbrales
  fijos en código, no hay tendencia contra el periodo anterior.
- A Claude API solo se le envían agregados anonimizados (nunca `evaluator_id` ni identidades).

Detalle completo en [`CLAUDE.md`](../CLAUDE.md) y [`docs/`](../docs).

## Pruebas

```bash
pytest
```

Suite en [`backend/tests/`](./tests): `test_auth.py`, `test_evaluations.py`, `test_metrics.py`.
También podés probar a mano en `http://localhost:8000/docs` (Swagger).
