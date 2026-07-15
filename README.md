# Riwi LeadTrace

> Proyecto Integrador de Riwi. La idea es simple: los Coders pueden evaluar a sus Team Leaders y Tutores, con opción de hacerlo anónimo, y el Admin ve los resultados agregados por periodo con un resumen armado por IA.

![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=fff)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=fff)
![MySQL](https://img.shields.io/badge/MySQL-3FN-4479A1?logo=mysql&logoColor=fff)
![Vanilla JS](https://img.shields.io/badge/Vanilla_JS-ES6+-f7df1e?logo=javascript&logoColor=000)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=fff)
![pytest](https://img.shields.io/badge/Tested_with-pytest-0A9EDC?logo=pytest&logoColor=fff)

---

## Decisiones que tomamos por el camino

Cuando una evaluación se marca como anónima, el `evaluator_id` directamente no se guarda en la base de datos. No es un checkbox que solo oculta el nombre en pantalla — el dato no queda en la fila, así que después no hay forma de reconstruir quién la escribió.

Para que un Coder no pueda evaluar dos veces a la misma persona en el mismo periodo, el backend revisa el `evaluator_id` antes de insertar. Ese id llega en el cuerpo de la petición, lo manda el cliente (no usamos JWT, ver el punto de abajo), así que en la práctica la validación confía en que el front se porte bien. Es una limitación que tenemos identificada y no un descuido.

El ICP, o Índice de Calidad Percibida, se calcula en el momento de la consulta y no se guarda en ninguna tabla. Si a alguien todavía no le llegan suficientes evaluaciones en el periodo, simplemente no se le publica un puntaje. El estado que se muestra (Sólido, Estable, En riesgo) sale de comparar ese puntaje contra dos umbrales fijos definidos en el código, nada más sofisticado que eso.

El login sí valida la contraseña contra el hash con bcrypt del lado del servidor. Ahí no cedimos. Lo que decidimos dejar afuera fue JWT: después de loguearse, el front recibe al usuario ya validado y confía en el rol que le llega para decidir qué mostrar. Es menos robusto que verificar el rol en cada petición al backend, pero para lo que pedía el proyecto nos pareció suficiente y bastante más fácil de explicar en la sustentación que un esquema de tokens completo.

Los resúmenes con IA (usamos la API de Claude) reciben solo promedios y conteos, nunca los comentarios originales ni quién los escribió. También se guardan en caché, así que si ya se generó un resumen para esa persona en ese periodo, no se vuelve a llamar al modelo.

Para las consultas a la base de datos escribimos SQL directo con `text()` de SQLAlchemy en vez de usar el ORM completo. Al principio se había armado con los objetos `Table()`, pero terminaba siendo una sintaxis más que aprender encima del SQL que el equipo ya sabía escribir, así que se simplificó a queries planas.

## Cómo está organizado el repo

```text
riwi-lead-trace/
├── frontend/      # SPA Vanilla JS (ES Modules) + Vite
├── backend/       # API REST: FastAPI + SQLAlchemy (SQL plano) + MySQL
├── database/      # schema.sql (3FN) + datos semilla
├── docs/          # documentación Scrum y técnica
└── mockups/       # prototipos de las pantallas del MVP
```

El backend tiene su propio README con más detalle: [`backend/README.md`](./backend/README.md).

## Cómo levantarlo en local

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

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | HTML5 + CSS3 + JavaScript Vanilla (SPA, sin frameworks) + Vite |
| Backend | Python + FastAPI, SQLAlchemy (`text()`), Pydantic |
| Base de datos | MySQL, normalizada a 3FN |
| Auth | bcrypt en el login + sesión en `localStorage`, el rol se confía del lado del front |
| IA | Claude API (`anthropic`), con caché de resúmenes |

## Tests

```bash
cd backend && pytest      # login, permisos, evaluaciones y las métricas
cd frontend && npm test   # validadores y utilidades del front
```

## Documentación

Si quieres ver el proyecto completo de una sola vez, arranca por [`docs/00-documento-tecnico.md`](./docs/00-documento-tecnico.md). El resto de `/docs` entra en detalle por tema: visión, backlog, arquitectura, base de datos y convenciones del equipo.

## Equipo

[@manulzweb](https://github.com/manulzweb) · [@YamitGC](https://github.com/YamitGC) · [@karl26chy](https://github.com/karl26chy) · [@smendozab097](https://github.com/smendozab097) · [@SaebGC](https://github.com/SaebGC)

Trabajamos con GitFlow y Conventional Commits. Cada historia sale en su propia rama `feature/<ID>-<slug>` desde `develop`.

---

Usamos IA como apoyo para escribir parte del código y de esta documentación. Todo pasó por revisión del equipo antes de integrarse — la rúbrica pide que cada quien pueda sustentar lo suyo, así que primero nos aseguramos de entenderlo.
