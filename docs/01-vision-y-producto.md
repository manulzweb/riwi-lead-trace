# 01 — Vision y Producto

## La idea, en simple

> **LeadTrace** es una app web donde los **Coders** evaluan —con formularios, y si quieren de forma **anonima**— a sus **Team Leaders** y **Tutores**. El sistema junta esas evaluaciones, calcula una **nota de 0 a 100 por persona (el ICP)** y le arma al **Admin** (jefe de TL/tutores) un **tablero + un resumen escrito por IA**, para que sepa quien acompana bien y quien necesita apoyo.

## Product Vision

> **Para** el ecosistema Riwi **que** no cuenta con un canal formal para evaluar la calidad del acompanamiento, **Riwi LeadTrace es** una plataforma web de **feedback ascendente** **que** permite a los Coders evaluar —de forma estructurada y opcionalmente anonima— a Team Leaders y Tutores, **a diferencia de** los procesos informales o unidireccionales actuales, **nuestro producto** calcula un **Indice de Calidad Percibida (ICP)** y **resumenes con IA** que impulsan decisiones del Admin (Jefe de TL/tutores).

## Product Goal

Validar, mediante un MVP funcional, que un proceso de **feedback ascendente estructurado** mejora la visibilidad sobre la calidad del acompanamiento de Team Leaders y Tutores, entregando a los responsables academicos informacion accionable para la toma de decisiones.

## Objetivos de negocio

1. **Dar voz a los Coders** con un canal formal, seguro y opcionalmente anonimo para evaluar a sus lideres y tutores.
2. **Mejorar la calidad del acompanamiento** con el **ICP** (indice ponderado, accionable).
3. **Crear trazabilidad y metricas** de seguimiento historico por lider, tutor y periodo.
4. **Habilitar decisiones basadas en datos** para el Admin (Jefe de TL/tutores), apoyadas en **IA**.
5. **Fomentar la mejora continua** dentro del ecosistema de aprendizaje de Riwi.

## Metricas de exito del MVP

| Metrica | Indicador | Meta MVP |
|--------|-----------|----------|
| Adopcion | % de Coders que completan al menos una evaluacion | >= 60 % |
| Cobertura | % de Team Leaders/Tutores con al menos 3 evaluaciones | >= 70 % |
| Completitud | % de evaluaciones iniciadas que se envian | >= 80 % |
| Calidad del dato | % de evaluaciones con comentario cualitativo | >= 40 % |
| Calidad accionable | % de TL/Tutores con **ICP** calculado (datos suficientes) | >= 70 % |
| Uso analitico | No de admins (Jefe de TL) que consultan el dashboard semanalmente | >= 1 |
| Confianza | % de evaluaciones enviadas usando la opcion anonima (senal de seguridad percibida) | medicion base |
| Satisfaccion | NPS interno del proceso de feedback | establecer linea base |

> Las metricas se miden sobre los datos registrados por la propia plataforma (dashboard) mas una encuesta breve post-MVP.

## Propuesta de valor

- **Para el Coder:** voz formal y segura sobre su experiencia de acompanamiento.
- **Para el Team Leader:** feedback concreto y accionable para crecer como lider.
- **Para el Tutor:** feedback para mejorar su apoyo tecnico.
- **Para el Admin (Jefe de TL/tutores):** panel con **ICP**, tendencias y **resumenes IA** para decidir.
- **Para Riwi:** mejora medible y continua de la calidad academica.

## Supuestos y restricciones

- Lo desarrolla un **equipo de 5 Coders** bajo Scrum (Proyecto Integrador, Ruta Basica) -> priorizar simplicidad, paralelizacion y evidencia de contribucion individual.
- Aplicacion **full-stack**: SPA en **HTML5 + CSS3 + JS Vanilla** + backend **FastAPI** + **MySQL** (3FN).
- Debe incluir **logica de negocio** identificable (no limitarse a CRUD basico).
- Alcance **MVP**: validar la idea con una solucion funcional, estable y con valor para el usuario.
- Cronograma del **20 de junio al 17 de julio de 2026** (~4 semanas), metodologia Scrum y **GitFlow** obligatorios.
