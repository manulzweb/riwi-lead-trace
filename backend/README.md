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
- **JWT** (`python-jose`) + **bcrypt** (`passlib`) para autenticación
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
| `SECRET_KEY` | Clave para firmar los JWT. Generá una propia, no uses la de ejemplo. | `openssl rand -hex 32` |
| `ALGORITHM` | Algoritmo de firma del JWT | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Minutos de validez del token de sesión | `60` |
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

## Correr el servidor

```bash
uvicorn app.main:app --reload
```

- API disponible en `http://localhost:8000`
- Documentación interactiva (Swagger) en `http://localhost:8000/docs`

## Endpoints

Todos los endpoints (salvo `/auth/login` y `/`) requieren `Authorization: Bearer <token>`. Los
marcados con un rol específico además exigen ese rol (`403` si no coincide); los marcados
"propio o admin" solo dejan ver/editar tus propios datos salvo que seas admin.

| Método | Endpoint | Uso | Quién |
|---|---|---|---|
| GET | `/` | Health check | público |
| POST | `/auth/login` | Login → `{ user, access_token }` | público |
| GET | `/users` | Listar usuarios | cualquier sesión |
| GET | `/users/{id}` | Obtener un usuario | cualquier sesión |
| POST | `/users` | Crear usuario | admin |
| PUT | `/users/{id}` | Actualizar usuario | admin |
| DELETE | `/users/{id}` | Eliminar usuario | admin |
| GET | `/periods` | Listar periodos | cualquier sesión |
| GET | `/periods/{id}` | Obtener un periodo | cualquier sesión |
| POST | `/periods` | Crear periodo | admin |
| PUT | `/periods/{id}` | Actualizar periodo | admin |
| DELETE | `/periods/{id}` | Eliminar periodo | admin |
| GET | `/forms?target_role=` | Plantilla de formulario para `team_leader` o `tutor` | cualquier sesión |
| POST | `/evaluations` | Registrar evaluación (borrador o enviada) — valida anonimato y no-duplicado por periodo | cualquier sesión |
| GET | `/evaluations?evaluator_id=` | Historial de evaluaciones hechas por un Coder | propio o admin |
| GET | `/evaluations?evaluatee_id=&period_id=` | Histórico de evaluaciones recibidas | propio o admin |
| GET | `/questions?template_id=` | Preguntas activas de un template (texto + peso) | admin |
| PATCH | `/questions/{id}` | Reformular el texto de una pregunta — siempre versiona, solo con periodo cerrado | admin |
| PUT | `/questions/weights` | Actualizar los pesos de las preguntas de escala de un template — deben sumar 100, solo con periodo cerrado | admin |
| GET | `/metrics/summary?period_id=` | KPIs globales + ICP ponderado por persona en un periodo | admin, team_leader, tutor |
| GET | `/metrics/ai-summary?evaluatee_id=&period_id=` | Resumen de feedback generado con Claude (cacheado) | admin |

## Estructura del proyecto

```
app/
├── main.py       # arma la app FastAPI, CORS, registra los routers
├── deps.py       # get_current_user, require_role(*roles) — auth/RBAC
├── config/       # settings (.env), conexión a MySQL, hashing/JWT
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
`test_questions.py`. También podés probar a mano en `http://localhost:8000/docs` (Swagger).
