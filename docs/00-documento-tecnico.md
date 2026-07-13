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
2. Medir la calidad del acompañamiento con un índice propio y ponderado: el **ICA**.
3. Dejar trazabilidad y métricas de seguimiento histórico por líder, tutor y periodo.
4. Habilitar decisiones basadas en datos para el Admin, apoyadas en un resumen generado por IA.
5. Fomentar la mejora continua dentro del ecosistema de aprendizaje de Riwi.

## 5. Alcance (MVP)

La idea en una frase: los Coders evalúan —con formularios, y si quieren de forma anónima— a sus Team
Leaders y Tutores. El sistema calcula una nota de 0 a 100 por persona (el ICA) y le arma al Admin un
tablero más un resumen escrito por IA.

**Dentro del MVP:** login con JWT, 4 roles (coder/tutor/team_leader/admin), listar evaluables, evaluar
Team Leader y Tutor con formulario estructurado, feedback anónimo opcional, historial del Coder,
dashboard con ICA para el Admin, resumen de feedback con IA, despliegue accesible.

**Fuera del MVP** (post-validación): segmentación multi-área, bitácora descendente TL→Tutor, analítica
de talento, pesos del ICA configurables por el Admin, notificaciones, i18n. Detalle completo y el
porqué de cada recorte en [`09-mvp-alcance.md`](./09-mvp-alcance.md).

## 6. Historias de usuario

20 historias organizadas en 7 épicas (CORE, AUTH, EVALUACIONES, HISTORIAL, DASHBOARD, AIFEED, ENTREGA),
79 Story Points en total, priorizadas con MoSCoW. El detalle historia por historia —con sus criterios
de aceptación— está en [`03-historias-de-usuario.md`](./03-historias-de-usuario.md); el backlog
completo con estimaciones en [`02-product-backlog.md`](./02-product-backlog.md).

Las dos historias que sostienen que este proyecto no es un CRUD básico son **EVAL-05** (registrar una
evaluación con anonimato real y no-duplicado por periodo) y **DASH-01** (calcular y mostrar el ICA).

## 7. Arquitectura de la solución

Monorepo full-stack: una SPA en HTML/CSS/JS Vanilla habla por REST con un backend FastAPI, que a su vez
habla con MySQL vía SQLAlchemy.

```
SPA (frontend/)  ──HTTP/REST (JSON, JWT)──>  API (backend/ FastAPI)  ──SQLAlchemy──>  MySQL
```

El backend está organizado en capas — `routers` (validan entrada/salida), `services` (la lógica de
negocio: ICA, anonimato, no-duplicado, RBAC), `repositories` (acceso a datos) y `models` (SQLAlchemy) —
para que cada pieza tenga una sola responsabilidad y nadie mezcle reglas de negocio con endpoints.
El detalle completo, con diagramas y el contrato REST, está en
[`06-arquitectura.md`](./06-arquitectura.md).

## 8. Modelo de datos

Base de datos relacional en MySQL, normalizada hasta 3FN, con las entidades principales: `users`,
`roles`, `periods`, `form_templates` + `questions`, `evaluations` + `evaluation_answers`, y
`ai_feedback_cache`. El **ICA no se persiste**: se calcula al momento a partir de las evaluaciones, así
siempre refleja los datos más recientes. Modelo entidad-relación completo, diccionario de datos y el
script SQL ejecutable en [`07-base-de-datos.md`](./07-base-de-datos.md) y
[`database/schema.sql`](../database/schema.sql).

## 9. Justificación tecnológica

| Capa | Elección | Por qué |
|---|---|---|
| Frontend | HTML5 + CSS3 + JS Vanilla (SPA) | Requisito del proyecto (sin frameworks) |
| Backend | Python + FastAPI | Alineado a lo aprendido en la Ruta Básica; validación y docs automáticas |
| Base de datos | MySQL | Dominio naturalmente relacional; consultas agregadas para el dashboard |
| Auth | JWT | Encaja con una SPA sin estado |
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
