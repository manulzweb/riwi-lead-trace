# Riwi LeadTrace

> Proyecto Integrador de Riwi. Los Coders evaluan a sus Team Leaders y Tutores (pueden marcarlo como anonimo) y el Admin ve los resultados por periodo, con un resumen generado por IA.

![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=fff)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=fff)
![MySQL](https://img.shields.io/badge/MySQL-3FN-4479A1?logo=mysql&logoColor=fff)
![Vanilla JS](https://img.shields.io/badge/Vanilla_JS-ES6+-f7df1e?logo=javascript&logoColor=000)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=fff)
![pytest](https://img.shields.io/badge/Tested_with-pytest-0A9EDC?logo=pytest&logoColor=fff)

---

## Notas tecnicas

Si una evaluacion es anonima, el `evaluator_id` no se guarda en la base de datos. No hay forma de recuperar despues quien la hizo.

El backend revisa el `evaluator_id` antes de insertar, para que un Coder no evalue dos veces a la misma persona en el mismo periodo. Ese id llega en el body de la peticion, no de un token.

El ICP (Indice de Calidad Percibida) se calcula al consultar, no se guarda en tablas. Es un promedio ponderado por pregunta (`questions.weight_percent`, que las preguntas de escala activas de un template deben sumar 100). Con menos del minimo de evaluaciones no se publica puntaje. El estado (Solido, Estable, En riesgo) sale de comparar contra dos umbrales fijos en el codigo.

El login valida la contrasena con bcrypt en el servidor. No usamos JWT: el front recibe el usuario ya validado y decide que mostrar segun el rol que le llega.

Los resumenes con IA (API de Gemini) reciben solo promedios y conteos, nunca los comentarios ni quien los escribio. Se cachean por persona y periodo. La IA tambien revisa, al editar el texto de una pregunta, que siga encajando en su categoria.

Las queries son SQL directo con `text()` de SQLAlchemy, sin ORM declarativo.

## Estructura

```text
riwi-lead-trace/
├── frontend/      # SPA Vanilla JS (ES Modules) + Vite
├── backend/       # API REST: FastAPI + SQLAlchemy (SQL plano) + MySQL
├── database/      # schema.sql (3FN) + datos semilla
├── docs/          # documentacion Scrum y tecnica
└── mockups/       # prototipos de las pantallas del MVP
```

Detalle del backend en [`backend/README.md`](./backend/README.md).

## Local

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

## Despliegue

- **Frontend:** GitHub Pages o Vercel (`npm run build` genera el estatico).
- **Backend + MySQL:** plataforma en la nube (Render/Railway) o ejecucion local documentada arriba.
- La SPA en produccion apunta al backend desplegado via la variable de entorno `VITE_API_BASE_URL` (ver `frontend/.env.example`).

Detalle en [`docs/11-entregables-y-evaluacion.md`](./docs/11-entregables-y-evaluacion.md).

## Stack

| Capa | Tecnologia |
|---|---|
| Frontend | HTML5 + CSS3 + JavaScript Vanilla (SPA, sin frameworks) + Vite |
| Backend | Python + FastAPI, SQLAlchemy (`text()`), Pydantic |
| Base de datos | MySQL, normalizada a 3FN |
| Auth | bcrypt en el login + sesion en `localStorage` |
| IA | Gemini API (`google-generativeai`), con cache de resumenes |

## Tests

```bash
cd backend && pytest      # login, evaluaciones, periodos, preguntas y metricas
cd frontend && npm test   # validadores y utilidades del front
```

## Documentacion

Punto de partida: [`docs/00-documento-tecnico.md`](./docs/00-documento-tecnico.md). El resto de [`/docs`](./docs) desglosa vision, backlog, arquitectura, base de datos y convenciones del equipo:

| Documento | Contenido |
|-----------|-----------|
| [00 — Documento tecnico](./docs/00-documento-tecnico.md) | Resumen completo del proyecto |
| [01 — Vision y producto](./docs/01-vision-y-producto.md) | Vision, objetivos, metricas |
| [02 — Product backlog](./docs/02-product-backlog.md) | Backlog priorizado con story points |
| [03 — Historias de usuario](./docs/03-historias-de-usuario.md) | Historias + criterios de aceptacion |
| [04 — Epicas](./docs/04-epicas.md) | Epicas y mapa a sprints |
| [05 — Sprint planning](./docs/05-sprint-planning.md) | Cronograma de sprints |
| [06 — Arquitectura](./docs/06-arquitectura.md) | Arquitectura full-stack + justificacion tecnologica |
| [07 — Base de datos](./docs/07-base-de-datos.md) | MER, 3FN, modelo relacional |
| [08 — Diseno tecnico](./docs/08-diseno-tecnico.md) | Convenciones, GitFlow del equipo |
| [09 — Alcance MVP](./docs/09-mvp-alcance.md) | Dentro/fuera del MVP + requisitos no funcionales |
| [11 — Entregables y evaluacion](./docs/11-entregables-y-evaluacion.md) | Entregables del proyecto integrador |
| [13 — Glosario](./docs/13-glosario.md) | Terminos del dominio, en simple |

## Roles del sistema

`Coder` · `Tutor` · `Team Leader` · `Admin` (Jefe de TL/tutores)

## Equipo

| Integrante | Rol | Foco |
|---|---|---|
| Manuel Vasquez ([@manulzweb](https://github.com/manulzweb)) | Scrum Master / Lider | Coordinacion + backend (FastAPI + MySQL) |
| Carlos Charris ([@karl26chy](https://github.com/karl26chy)) | Product Owner | Backlog + frontend |
| Yamit Garcia ([@YamitGC](https://github.com/YamitGC)) | Backend Developer | Auth, sesiones y permisos |
| Sebastian Mendoza ([@smendozab097](https://github.com/smendozab097)) | Frontend Developer | SPA en Vanilla JS |
| Saeb Garcia ([@SaebGC](https://github.com/SaebGC)) | Frontend Developer | SPA en Vanilla JS |

GitFlow + Conventional Commits. Cada historia en su rama `feature/<ID>-<slug>` desde `develop`.

---

Usamos IA como apoyo para parte del codigo y de esta documentacion. Todo paso por revision del equipo antes de integrarse.