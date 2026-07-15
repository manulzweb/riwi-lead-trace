# Riwi LeadTrace

> Feedback ascendente para el Proyecto Integrador de Riwi: los Coders evalúan a sus Team Leaders y Tutores (con opción anónima), y el Admin consulta resultados agregados y resúmenes generados con IA.

![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=fff)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=fff)
![MySQL](https://img.shields.io/badge/MySQL-3FN-4479A1?logo=mysql&logoColor=fff)
![Vanilla JS](https://img.shields.io/badge/Vanilla_JS-ES6+-f7df1e?logo=javascript&logoColor=000)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=fff)
![JWT](https://img.shields.io/badge/Auth-JWT-000000?logo=jsonwebtokens&logoColor=fff)
![pytest](https://img.shields.io/badge/Tested_with-pytest-0A9EDC?logo=pytest&logoColor=fff)

---

## Por qué no es un CRUD más

- **Anonimato real.** Si una evaluación se marca anónima, `evaluator_id` nunca se persiste — es irreversible, no un simple filtro de UI.
- **No-duplicado a prueba de manipulación.** Un Coder no puede evaluar dos veces a la misma persona en el mismo periodo; la regla corre en el backend contra el ID real del evaluador, no contra lo que mande el cliente.
- **ICP (Índice de Calidad Percibida)** calculado on-read por periodo, con un mínimo de evaluaciones antes de publicarse y estado por umbral fijo (`Sólido` / `Estable` / `En riesgo`).
- **RBAC por endpoint**, no solo en el router del front: cada ruta valida rol y, donde aplica, que el que pregunta sea el dueño del dato (o admin).
- **Resúmenes con IA (Claude)** que solo reciben agregados anonimizados — nunca identidades — y se cachean para no regenerar en cada consulta.
- **SQL plano** (`text()` + parámetros) en vez de un ORM declarativo: se prefirió que el código se lea igual que el SQL real, sin una capa de traducción extra que aprender.

## Estructura del monorepo

```text
riwi-lead-trace/
├── frontend/      # SPA Vanilla JS (ES Modules) + Vite
├── backend/       # API REST: FastAPI + SQLAlchemy (SQL plano) + MySQL
├── database/      # schema.sql (3FN) + datos semilla
├── docs/          # documentación Scrum y técnica
└── mockups/       # prototipos de las pantallas del MVP
```

Detalle del backend: [`backend/README.md`](./backend/README.md).

## Puesta en marcha

```bash
# Base de datos
mysql -u root -p < database/schema.sql

# Backend
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload                      # http://localhost:8000/docs

# Frontend
cd frontend
npm install
npm run dev                                         # http://localhost:5173
```

## Stack técnico

| Capa | Tecnología |
|---|---|
| Frontend | HTML5 + CSS3 + JavaScript Vanilla (SPA, sin frameworks) + Vite |
| Backend | Python + FastAPI, SQLAlchemy (`text()`), Pydantic |
| Base de datos | MySQL, normalizada a 3FN |
| Auth | JWT + bcrypt, RBAC por endpoint |
| IA | Claude API (`anthropic`), resúmenes cacheados |

## Testing

```bash
cd backend && pytest      # integración: auth, RBAC, evaluaciones, métricas
cd frontend && npm test   # unitarios: validators, utilidades
```

## Documentación

Punto de entrada único: [`docs/00-documento-tecnico.md`](./docs/00-documento-tecnico.md). El resto de `/docs` desglosa visión, backlog, arquitectura, base de datos y convenciones de equipo.

## Equipo

[@manulzweb](https://github.com/manulzweb) · [@YamitGC](https://github.com/YamitGC) · [@karl26chy](https://github.com/karl26chy) · [@smendozab097](https://github.com/smendozab097) · [@SaebGC](https://github.com/SaebGC)

GitFlow + Conventional Commits — cada historia se trabaja en `feature/<ID>-<slug>` desde `develop`.

---

Parte de la documentación y del código de este repo se construyó con asistencia de IA. Todo se revisó y se entiende antes de integrarlo — la rúbrica exige que cada integrante pueda sustentar su parte.
