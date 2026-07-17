# Documento Técnico — Riwi LeadTrace

Este es el documento único que exige el enunciado del Proyecto Integrador (Ruta Básica). Reúne, en un
solo lugar y en lenguaje simple, todo lo que está repartido en el resto de `/docs`. Si solo vas a leer
un archivo de este repo, que sea este.

## 1. Nombre del proyecto

**Riwi LeadTrace**.

## 2. Problema identificado

Dentro del ecosistema Riwi no existe un canal formal para que los Coders evalúen la calidad del
acompañamiento que reciben de sus Team Leaders y Tutores. Lo que hoy existe es informal y de una sola
vía: los Coders no tienen forma estructurada, segura ni anónima de decir "esto funcionó" o "esto no",
y el Admin (Jefe de TL/tutores) no tiene datos consolidados para saber quién está acompañando bien y
quién necesita apoyo.

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

La idea en una frase: los Coders evalúan —con formularios, y si quieren de forma anónima— a sus Team
Leaders y Tutores. El sistema calcula una nota de 0 a 100 por persona (el ICP) y le arma al Admin un
tablero más un resumen escrito por IA.

**Dentro del MVP:** login (verificacion de contrasena con bcrypt, **sin JWT**, ver
`06-arquitectura.md`), 4 roles (coder/tutor/team_leader/admin; un usuario puede tener **mas de
uno a la vez**, ver sección 8), listar evaluables, evaluar
Team Leader y Tutor con formulario estructurado e interactivo (una pregunta a la vez), feedback anónimo
opcional, historial del Coder, **gestión del periodo de evaluación por el Admin** (activa/cierra la
ventana; sin periodo activo los Coders ven "No hay formularios por realizar"), **edición mínima de
preguntas por el Admin** (texto y activar/desactivar, con periodo cerrado), dashboard con ICP para el
Admin, resumen de feedback con IA, despliegue accesible.

**Fuera del MVP** (post-validación): segmentación multi-área, bitácora descendente TL→Tutor, analítica
de talento, pesos del ICP configurables por el Admin, editor completo de formularios (crear plantillas
y tipos de pregunta), notificaciones, i18n. Detalle completo y el porqué de cada recorte en
[`09-mvp-alcance.md`](./09-mvp-alcance.md).

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
SPA (frontend/)  ──HTTP/REST (JSON, sin JWT)──>  API (backend/ FastAPI)  ──SQLAlchemy `text()`──>  MySQL
```

El backend está organizado en capas — `routes` (validan entrada/salida con Pydantic) y `services`
(la lógica de negocio: ICP, anonimato, no-duplicado, filtros por rol, **y** las queries SQL) —
para que cada pieza tenga una sola responsabilidad y nadie mezcle reglas de negocio con endpoints.
**No hay capas `repositories/` ni `models/`** (se eliminaron a propósito por ser indirección sin
beneficio en un MVP de este tamaño: las queries viven directo en `services/` y la forma de las
tablas vive solo en `database/01_ddl.sql`). Tampoco hay JWT: el login solo verifica el hash con
bcrypt, no emite token, y el rol/ID de quien llama se confía al valor que manda el propio front
(tradeoff de seguridad para mantener el MVP simple, ver `06-arquitectura.md`).
El detalle completo, con diagramas y el contrato REST, está en
[`06-arquitectura.md`](./06-arquitectura.md).

## 8. Modelo de datos

Base de datos relacional en MySQL, normalizada hasta 3FN, con las entidades principales: `users`,
`roles`, `user_roles`, `team_leader_clans`, `periods`, `form_templates` + `questions`,
`evaluations` + `evaluation_answers`, y `ai_feedback_cache`. El **ICP no se persiste**: se calcula
al momento a partir de las evaluaciones, así siempre refleja los datos más recientes.

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
| Frontend | HTML5 + CSS3 + JS Vanilla (SPA) | Requisito del proyecto (sin frameworks) |
| Backend | Python + FastAPI | Alineado a lo aprendido en la Ruta Básica; validación y docs automáticas |
| Base de datos | MySQL | Dominio naturalmente relacional; consultas agregadas para el dashboard |
| Auth | Sin JWT | El rol/ID lo manda el propio front y el backend lo confía; simplifica el MVP a costa de no verificar identidad criptográficamente |
| IA | Claude API | Resume el feedback en lenguaje natural para el Admin |

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
