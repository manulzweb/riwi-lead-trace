# Documento Técnico — Riwi LeadTrace

Este documento proporciona la especificación técnica general de Riwi LeadTrace, consolidando los aspectos principales del sistema, arquitectura, decisiones de diseño y alcance del producto.

## 1. Nombre del proyecto

**Riwi LeadTrace**.

## 2. Problema identificado

Actualmente, el ecosistema carece de un mecanismo formal y estructurado para la evaluación de desempeño y seguimiento del acompañamiento proporcionado por los Team Leaders y Tutores. La ausencia de un canal estructurado, seguro y con soporte de anonimato dificulta la recolección de métricas fiables, limitando la capacidad de la administración para tomar decisiones basadas en datos consolidados.

## 3. Objetivo general

Validar, con un MVP funcional, que un proceso de **feedback ascendente estructurado** mejora la
visibilidad sobre la calidad del acompañamiento de Team Leaders y Tutores, entregando al Admin
información accionable para tomar decisiones.

## 4. Objetivos específicos

1. Dar a los Coders un canal formal, seguro y opcionalmente anónimo para evaluar a sus líderes y tutores.
2. Medir la **calidad percibida** del acompañamiento con un índice propio, el **ICP**: promedio
   de las respuestas tipo escala, normalizado de 0 a 100, con un mínimo de respuestas para
   calcularlo (ver [`06-arquitectura.md`](./06-arquitectura.md)).
3. Dejar trazabilidad y métricas de seguimiento histórico por líder, tutor y periodo.
4. Habilitar decisiones basadas en datos para el Admin, apoyadas en un resumen generado por IA.
5. Fomentar la mejora continua dentro del ecosistema de aprendizaje de Riwi.

## 5. Alcance (MVP)

Descripción de alto nivel: El sistema provee una plataforma para la evaluación ascendente mediante formularios estructurados, garantizando el anonimato opcional del evaluador. El núcleo analítico procesa estas interacciones para calcular el Índice de Calidad Percibida (ICP) por líder y genera un análisis cualitativo mediante integración con modelos de lenguaje grande (LLMs).

**Alcance funcional (MVP):** Autenticación de usuarios (verificación de contraseñas mediante bcrypt), control de acceso basado en roles (RBAC, soportando la asignación de múltiples roles concurrentes), listado de entidades evaluables, captura de evaluaciones estructuradas con protección de identidad (anonimato), histórico de evaluaciones por usuario, gestión del ciclo de vida de los periodos de evaluación por parte del administrador, administración básica de plantillas de formularios (activación/desactivación y actualización de texto), visualización de métricas (dashboard administrativo con cálculo de ICP) e integración de resúmenes procesados por IA.

## 6. Historias de usuario

20 historias organizadas en 7 épicas (CORE, AUTH, EVALUACIONES, HISTORIAL, DASHBOARD, AIFEED, ENTREGA),
79 Story Points en total, priorizadas con MoSCoW. El detalle historia por historia —con sus criterios
de aceptación— está en [`03-historias-de-usuario.md`](./03-historias-de-usuario.md); el backlog
completo con estimaciones en [`02-product-backlog.md`](./02-product-backlog.md).

Las dos historias que sostienen que este proyecto no es un CRUD básico son **EVAL-05** (registrar una
evaluación con anonimato real y no-duplicado por periodo) y **DASH-01** (calcular y mostrar el ICP).

## 7. Arquitectura de la solución

Monorepo full-stack: una SPA en HTML/CSS/JS Vanilla habla por REST con un backend FastAPI, que a su vez
habla con MySQL vía SQLAlchemy (SQL plano con `text()`, sin ORM declarativo).

```
SPA (Vite/Tailwind)  ──HTTP/REST (JSON)──>  API (backend/ FastAPI)  ──SQLAlchemy `text()`──>  MySQL
```

El backend está organizado en tres capas — `routes` (validan entrada/salida con Pydantic),
`services` (la lógica de negocio: ICP, anonimato, no-duplicado, filtros por rol) y `repositories`
(las queries SQL con `text()`, un archivo por entidad) — para que cada pieza tenga una sola
responsabilidad y nadie mezcle reglas de negocio con endpoints ni con SQL. El flujo es
`routes/ → services/ → repositories/ → MySQL`. **No hay `models/`** (la forma de las tablas vive
solo en `database/01_ddl.sql`; `repositories/` no reintroduce SQLAlchemy Core ni `Table`, solo
agrupa las mismas queries `text()` por entidad). El login solo verifica el hash con
bcrypt, y el rol/ID de quien llama se confía al valor que manda el propio front.
El detalle completo, con diagramas y el contrato REST, está en
[`06-arquitectura.md`](./06-arquitectura.md).

## 8. Modelo de datos

Base de datos relacional (MySQL), normalizada hasta 3FN. Entidades principales: `users`, `roles`, `user_roles`, `team_leader_clans`, `periods`, `forms`, `categories`, `questions`, `evaluations`, `evaluation_submissions`, `evaluation_details`, y `ai_feedback_cache`. La persistencia de una evaluación (`evaluations`) y la de su autoría (`evaluation_submissions`) se manejan en tablas desacopladas, estableciendo el anonimato como una restricción estructural del modelo (la ausencia del vínculo garantiza imposibilidad de trazabilidad). El **ICP es un campo derivado**: su valor se calcula en tiempo de consulta (on-read) agregando los datos más recientes.

**Roles múltiples por usuario:** un usuario puede tener más de un rol a la vez (relación N:M
`users`↔`roles` vía `user_roles`, no un `role_id` único). Un Team Leader puede además tener **dos
o más clanes a cargo** (tabla `team_leader_clans`), distinto del `clan_id` 1:1 que usan
coder/tutor. Ver el detalle en [`07-base-de-datos.md`](./07-base-de-datos.md).

Modelo entidad-relación completo, diccionario de datos y el
script SQL ejecutable en [`07-base-de-datos.md`](./07-base-de-datos.md) y
[`database/01_ddl.sql`](../database/01_ddl.sql) + [`database/02_dml.sql`](../database/02_dml.sql).

## 9. Justificación tecnológica

| Capa | Elección | Por qué |
|---|---|---|
| Frontend | Vite + Vanilla JS + TailwindCSS | Empaquetado rapido y estilos modulares con utilidad |
| Backend | Python + FastAPI | Alineado a lo aprendido en la Ruta Básica; validación y docs automáticas |
| Base de datos | MySQL | Dominio naturalmente relacional; consultas agregadas para el dashboard |
| Auth | Login basico con bcrypt | El backend valida credenciales localmente sin emitir token. |
| IA | Google Gemini | Resume el feedback en lenguaje natural para el Admin |

Justificación ampliada, comparación contra alternativas y las decisiones que evitan sobreingeniería en
[`06-arquitectura.md`](./06-arquitectura.md).

## 10. Evidencias Scrum

- **Product Backlog** y **Sprint Backlog**: [`02-product-backlog.md`](./02-product-backlog.md) y
  [`05-sprint-planning.md`](./05-sprint-planning.md).
- **Tablero**: GitHub Issues + Milestones por sprint, con etiquetas de épica y prioridad MoSCoW.
- **Cronograma**: 4 sprints, entrega el 17 de julio de 2026.
- **GitFlow**: ramas `feature/<historia>`, Pull Requests hacia `develop`, commits por integrante.
  Convenciones en [`08-diseno-tecnico.md`](./08-diseno-tecnico.md).

## 11. MVP definido

Ya cubierto en la sección 5 (Alcance). Se considera validado si, durante el piloto, se alcanzan las
métricas de éxito definidas en [`01-vision-y-producto.md`](./01-vision-y-producto.md): adopción ≥60%,
completitud ≥80%, y al menos un Admin usando el dashboard semanalmente.

---

¿Necesitas más detalle de algún punto? Cada sección enlaza al documento fuente correspondiente.
