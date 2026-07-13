# Riwi LeadTrace

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

Justificacion tecnologica completa: [`docs/06-arquitectura.md`](./docs/06-arquitectura.md).

## Documentacion

**Empieza por [`docs/00-documento-tecnico.md`](./docs/00-documento-tecnico.md)** — resume todo el proyecto en un solo lugar. El resto de `/docs` es el detalle de cada tema:

| Documento | Contenido |
|-----------|-----------|
| [00 — Documento Tecnico](./docs/00-documento-tecnico.md) | Resumen completo del proyecto (1 solo documento) |
| [01 — Vision y Producto](./docs/01-vision-y-producto.md) | Vision, Goal, objetivos, metricas |
| [02 — Product Backlog](./docs/02-product-backlog.md) | Backlog full-stack priorizado con SP |
| [03 — Historias de Usuario](./docs/03-historias-de-usuario.md) | Historias + criterios de aceptacion |
| [05 — Sprint Planning](./docs/05-sprint-planning.md) | Epicas + 4 sprints (entrega 17 jul 2026) |
| [06 — Arquitectura](./docs/06-arquitectura.md) | Arquitectura full-stack + justificacion tecnologica |
| [07 — Base de Datos](./docs/07-base-de-datos.md) | MER, 3FN, modelo relacional y CRUD |
| [08 — Diseno Tecnico](./docs/08-diseno-tecnico.md) | Convenciones, GitFlow de equipo, repo |
| [09 — Alcance MVP](./docs/09-mvp-alcance.md) | Dentro/fuera del MVP + requisitos no funcionales |
| [11 — Entregables y Evaluacion](./docs/11-entregables-y-evaluacion.md) | Entregables del proyecto integrador |

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
cd frontend
npm install
npm run dev                                         # http://localhost:5173
```

> Los comandos asumen la estructura objetivo descrita en [`docs/06-arquitectura.md`](./docs/06-arquitectura.md). El codigo aun no esta implementado: el repo esta en fase de planeacion.

## Despliegue previsto

- **Frontend:** GitHub Pages o Vercel.
- **Backend + DB:** plataforma en la nube (Render/Railway) o ejecucion local documentada.

Ver [`docs/11-entregables-y-evaluacion.md`](./docs/11-entregables-y-evaluacion.md).

## Roles del sistema (usuarios)

`Coder` · `Tutor` · `Team Leader` · `Admin (Jefe de TL / tutores)`
