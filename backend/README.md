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
- **bcrypt** (`passlib`) para hashear contraseñas — login verifica en servidor, **sin JWT**: el rol/ID de quien llama se confía al valor que manda el propio front, sin verificación criptográfica de sesión en el backend
- **Claude API** (`anthropic`) para el resumen de feedback

## Requisitos previos

- Python 3.12+
- MySQL corriendo localmente (o accesible por red) con la base ya creada a partir de
  [`database/01_ddl.sql`](../database/01_ddl.sql) + [`database/02_dml.sql`](../database/02_dml.sql)

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

El esquema **no** se crea con SQLAlchemy — se ejecutan los scripts SQL directamente (DDL primero,
luego el seed):

```bash
mysql -u root -p < ../database/01_ddl.sql
mysql -u root -p riwi_lead_trace < ../database/02_dml.sql
```

Esto crea las tablas normalizadas a 3FN (`roles`, `cohorts`, `clans`, `users`, `user_roles`,
`team_leader_clans`, `periods`, `form_templates`, `questions`, `evaluations`,
`evaluation_answers`, `ai_feedback_cache`). Los roles de cada usuario son N:M (`user_roles`): un
usuario puede tener más de un rol a la vez, y un Team Leader puede tener varios clanes a cargo
(`team_leader_clans`). Ver [`docs/07-base-de-datos.md`](../docs/07-base-de-datos.md) para el
modelo entidad-relación completo.

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
| GET | `/users?role=` | Listar usuarios, opcionalmente filtrados por rol (`coder`\|`team_leader`\|`tutor`\|`admin`) | cualquiera |
| GET | `/users/{id}` | Obtener un usuario | cualquiera |
| POST | `/users` | Crear usuario | admin |
| PUT | `/users/{id}` | Actualizar usuario | admin |
| DELETE | `/users/{id}` | Eliminar usuario | admin |
| GET | `/periods` | Listar periodos | cualquiera |
| GET | `/periods/{id}` | Obtener un periodo | cualquiera |
| POST | `/periods` | Crear periodo | admin |
| PUT | `/periods/{id}` | Actualizar periodo (activarlo desactiva cualquier otro) | admin |
| DELETE | `/periods/{id}` | Eliminar periodo | admin |
| GET | `/forms?target_role=` | Plantilla de formulario para `team_leader` o `tutor` | cualquiera |
| POST | `/evaluations` | Registrar evaluación (borrador o enviada) — valida anonimato, no-duplicado por periodo y periodo activo | cualquiera |
| GET | `/evaluations?evaluator_id=` | Historial de evaluaciones hechas por un Coder | cualquiera |
| GET | `/evaluations?evaluatee_id=&period_id=&viewer_role=` | Histórico de evaluaciones recibidas; `viewer_role=admin` revela al evaluador en no-anónimas | cualquiera |
| GET | `/questions?template_id=` | Preguntas activas de un template (texto + peso) | admin |
| PATCH | `/questions/{id}` | Reformular el texto de una pregunta — siempre versiona, solo con periodo cerrado | admin |
| PUT | `/questions/weights` | Actualizar los pesos de las preguntas de escala de un template — deben sumar 100, solo con periodo cerrado | admin |
| GET | `/metrics/summary?period_id=` | KPIs globales + ICP ponderado por persona en un periodo | admin, team_leader, tutor |
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
[`database/01_ddl.sql`](../database/01_ddl.sql) (seed en
[`database/02_dml.sql`](../database/02_dml.sql)), y cada `service` arma su propio SQL con `text()`.

Reglas de negocio clave (no romper sin acordarlo con el equipo):

- Evaluación anónima → nunca se persiste ni se expone `evaluator_id` (`hide_evaluator` en
  `evaluation_service.get_evaluations_by_evaluatee`).
- Un Coder no puede evaluar dos veces a la misma persona en el mismo periodo — validado **solo en
  `evaluation_service.create_evaluation`** (`SELECT` previo antes del `INSERT`, sin transacción).
  El índice único `uq_eval_once` que reforzaría esto en la BD está **comentado a propósito** en
  `database/01_ddl.sql`; queda una condición de carrera teórica entre dos requests concurrentes
  del mismo evaluador.
- Los evaluables tienen rol vía `user_roles` (N:M): un usuario puede tener varios roles a la vez.
  Al evaluar a un Team Leader, `evaluation_service` valida el clan contra `team_leader_clans` (un
  TL puede tener varios clanes a cargo); para tutor/coder valida contra el `clan_id` 1:1 de
  `users`.
- `POST /evaluations` rechaza con `409` si el `period_id` no corresponde a un periodo activo
  (`is_active=TRUE`) o con `404` si el periodo no existe.
- Solo puede haber **un periodo activo a la vez**: activar uno (al crearlo o al actualizarlo)
  desactiva automaticamente cualquier otro (`period_service._deactivate_other_periods`).
- El ICP (`average_score` + `status`) se calcula on-read en `metrics_service.py`, no se persiste.
  Es un **promedio ponderado**: cada pregunta de escala pesa lo que diga su `weight_percent`
  (`questions.weight_percent`, que las preguntas de escala activas de un template deben sumar
  exactamente 100 — se valida en `question_service.update_weights`). Con menos de
  `MIN_EVALUATIONS` (3) respuestas, no se publica (`average_score: null`). El estado
  (`Sólido` / `Estable` / `En riesgo` / `Datos insuficientes`) sale de comparar contra dos umbrales
  fijos en código, no hay tendencia contra el periodo anterior.
- Las preguntas (texto o pesos) solo se editan con el periodo cerrado. Editar el texto **versiona**
  (fila nueva + `is_active=FALSE` en la anterior); `category`/`input_type`/`sort_order`/
  `weight_percent` se heredan sin tocar. Al guardar, la IA revisa que el texto siga encajando en la
  categoria (`ai_service.check_question_category_coherence`); si no, hace falta `confirm: true`.
- A Claude API solo se le envían agregados anonimizados (nunca `evaluator_id` ni identidades).

Detalle completo en [`CLAUDE.md`](../CLAUDE.md) y [`docs/`](../docs).

## Pruebas

```bash
pytest
```

Suite en [`backend/tests/`](./tests): `test_auth.py`, `test_evaluations.py`, `test_metrics.py`,
`test_periods.py`, `test_questions.py`. También podés probar a mano en `http://localhost:8000/docs`
(Swagger).
