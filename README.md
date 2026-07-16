# Riwi LeadTrace

<<<<<<< HEAD
> MVP de **feedback ascendente** para el **Proyecto Integrador — CodeUp Riwi: Beyond Limits (Ruta Basica)**. Aplicacion web full-stack: los Coders evaluan a Team Leaders y Tutores (con opcion anonima). Calcula un **Indice de Calidad de Acompanamiento (ICA)** y **resumenes con IA (Claude)** para el Admin (Jefe de TL/tutores).

## Que es?

Hoy los Team Leaders evaluan a los Coders, pero **no existe un mecanismo formal para que los Coders evaluen a sus lideres y tutores**. Riwi LeadTrace cierra ese ciclo: habilita feedback ascendente (con opcion anonima), identifica fortalezas y debilidades del acompanamiento, y entrega metricas accionables a los responsables academicos.

No es un CRUD basico: incorpora **logica de negocio** real (reglas de anonimato, prevencion de evaluaciones duplicadas por periodo, **ICA** —indice ponderado por criterio con confianza, tendencia y estado—, resumenes con IA anonimizados y control de acceso por rol).

## Equipo (5 integrantes)

Proyecto desarrollado por un equipo Scrum de **5 Coders** de la misma jornada. Roles (de referencia; todos desarrollan y comprenden la solucion completa):

| Integrante | Rol Scrum | Foco tecnico |
|-----------|-----------|--------------|
| 1 | Scrum Master / Lider | Coordinacion + Fullstack |
| 2 | Product Owner | Backlog + Frontend |
| 3 | Backend Developer | FastAPI + MySQL |
| 4 | Backend Developer | FastAPI + logica de negocio |
| 5 | Frontend Developer | SPA Vanilla JS |

> Cada integrante debe evidenciar commits propios, ramas y Pull Requests bajo **GitFlow** (ver [`docs/08-diseno-tecnico.md`](./docs/08-diseno-tecnico.md)).

## Stack tecnico

| Capa | Tecnologia | Justificacion (resumen) |
|------|------------|--------------------------|
| Frontend | HTML5 + CSS3 + **JavaScript Vanilla** (SPA) | Requisito del proyecto; sin frameworks |
| Estilos | CSS3 + Custom Properties (Tailwind/Bootstrap permitidos) | Responsive mobile-first |
| Backend | **Python + FastAPI** | Python alineado a la Ruta Basica; validacion con Pydantic, docs OpenAPI automaticas, dependencias para auth/RBAC |
| ORM/DB driver | SQLAlchemy + PyMySQL | Acceso a datos limpio y mantenible |
| Base de datos | **MySQL** (relacional, **3FN**) | Integridad referencial; consultas agregadas para el dashboard |
| Auth | JWT (JSON Web Tokens) | Sesion sin estado; RBAC por rol |
| Tooling front (dev) | Vite | Dev server / bundler (no es framework de UI) |

Justificacion tecnologica completa: [`docs/12-justificacion-tecnologica.md`](./docs/12-justificacion-tecnologica.md).

## Documentacion

Planeacion Scrum y diseno tecnico en [`/docs`](./docs):

| Documento | Contenido |
|-----------|-----------|
| [01 — Vision y Producto](./docs/01-vision-y-producto.md) | Vision, Goal, objetivos, metricas |
| [02 — Product Backlog](./docs/02-product-backlog.md) | Backlog full-stack priorizado con SP |
| [03 — Historias de Usuario](./docs/03-historias-de-usuario.md) | Historias + criterios de aceptacion |
| [04 — Epicas](./docs/04-epicas.md) | Epicas y mapa a sprints |
| [05 — Sprint Planning](./docs/05-sprint-planning.md) | 4 sprints (entrega 17 jul 2026) |
| [06 — Arquitectura](./docs/06-arquitectura.md) | Arquitectura full-stack (SPA + FastAPI + MySQL) |
| [07 — Base de Datos](./docs/07-base-de-datos.md) | MER, 3FN, modelo relacional y CRUD |
| [08 — Diseno Tecnico](./docs/08-diseno-tecnico.md) | Convenciones, GitFlow de equipo, repo |
| [09 — Alcance MVP](./docs/09-mvp-alcance.md) | Dentro/fuera del MVP |
| [10 — Requisitos No Funcionales](./docs/10-requisitos-no-funcionales.md) | Seguridad, rendimiento, accesibilidad |
| [11 — Entregables y Evaluacion](./docs/11-entregables-y-evaluacion.md) | Entregables del proyecto integrador |
| [12 — Justificacion Tecnologica](./docs/12-justificacion-tecnologica.md) | Por que FastAPI + MySQL + SPA Vanilla |

Script SQL inicial: [`/database/schema.sql`](./database/schema.sql).

## Estructura del repositorio (monorepo)

```
riwi-lead-trace/
├── frontend/      # SPA: HTML5 + CSS3 + JS Vanilla (Vite dev server)
├── backend/       # API REST: Python + FastAPI + SQLAlchemy
├── database/      # schema.sql + seed (MySQL, 3FN)
├── docs/          # documentacion Scrum + tecnica (01..12)
├── mockups/       # enlaces/exports de Figma (o ./docs)
└── README.md
```

## Puesta en marcha

### 1) Base de datos (MySQL)
```bash
mysql -u root -p < database/schema.sql
```

### 2) Backend (FastAPI)
```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                # configurar DB_URL y JWT_SECRET
uvicorn app.main:app --reload                       # http://localhost:8000  (docs: /docs)
```

### 3) Frontend (SPA)
```bash
=======
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

El ICP (Indice de Calidad Percibida) se calcula al consultar, no se guarda en tablas. Con menos del minimo de evaluaciones no se publica puntaje. El estado (Solido, Estable, En riesgo) sale de comparar contra dos umbrales fijos en el codigo.

El login valida la contrasena con bcrypt en el servidor. No usamos JWT: el front recibe el usuario ya validado y decide que mostrar segun el rol que le llega.

Los resumenes con IA (API de Claude) reciben solo promedios y conteos, nunca los comentarios ni quien los escribio. Se cachean por persona y periodo.

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
>>>>>>> upstream/develop
cd frontend
npm install
npm run dev                                         # http://localhost:5173
```

<<<<<<< HEAD
> Los comandos asumen la estructura objetivo descrita en [`docs/06-arquitectura.md`](./docs/06-arquitectura.md). El codigo aun no esta implementado: el repo esta en fase de planeacion.

## Despliegue previsto

- **Frontend:** GitHub Pages o Vercel.
- **Backend + DB:** plataforma en la nube (Render/Railway) o ejecucion local documentada.

Ver [`docs/11-entregables-y-evaluacion.md`](./docs/11-entregables-y-evaluacion.md).

## Roles del sistema (usuarios)

`Coder` · `Tutor` · `Team Leader` · `Admin (Jefe de TL / tutores)`
=======
## Stack

| Capa | Tecnologia |
|---|---|
| Frontend | HTML5 + CSS3 + JavaScript Vanilla (SPA, sin frameworks) + Vite |
| Backend | Python + FastAPI, SQLAlchemy (`text()`), Pydantic |
| Base de datos | MySQL, normalizada a 3FN |
| Auth | bcrypt en el login + sesion en `localStorage` |
| IA | Claude API (`anthropic`), con cache de resumenes |

## Tests

```bash
cd backend && pytest      # login, permisos, evaluaciones y metricas
cd frontend && npm test   # validadores y utilidades del front
```

## Documentacion

Punto de partida: [`docs/00-documento-tecnico.md`](./docs/00-documento-tecnico.md). El resto de `/docs` desglosa vision, backlog, arquitectura, base de datos y convenciones del equipo.

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
>>>>>>> upstream/develop
