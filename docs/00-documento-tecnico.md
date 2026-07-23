# 00 — Documento Técnico: Riwi Lead Trace

## 1. Visión Arquitectónica y Alcance

Este documento establece la especificación técnica fundacional de **Riwi Lead Trace**, consolidando los lineamientos arquitectónicos, decisiones de diseño de alto nivel y el perímetro funcional del Minimum Viable Product (MVP).

## 2. Definición del Problema

El ecosistema actual adolece de un canal estructurado y auditable para la evaluación del desempeño de Team Leaders y Tutores. La carencia de un mecanismo formal y asíncrono con soporte de anonimato criptográfico o estructural imposibilita la recolección de métricas no sesgadas (bias-free), limitando la capacidad analítica y operativa de la administración para ejecutar toma de decisiones basada en datos (Data-Driven Decision Making).

## 3. Objetivo General

Validar, mediante el despliegue de un MVP funcional, que un proceso de **feedback ascendente (Bottom-Up Feedback) estructurado** incrementa la visibilidad y trazabilidad sobre la calidad del acompañamiento, suministrando a los administradores *insights* accionables mediante agregación de datos y análisis de lenguaje natural (NLP).

## 4. Objetivos Específicos

1. **Canal Estructurado:** Proveer una interfaz formal y segura que garantice el anonimato estructural en evaluaciones ascendentes.
2. **Métrica Cuantitativa:** Sintetizar el desempeño a través del **Índice de Calidad Percibida (ICP)**, una métrica de agregación ponderada, calculada dinámicamente en tiempo de lectura (on-read) con mitigación de sesgos por insuficiencia de datos.
3. **Trazabilidad Continua:** Preservar la inmutabilidad histórica del feedback por líder, tutor y ciclo (periodo).
4. **Data Analytics:** Habilitar interfaces administrativas (Dashboards) respaldadas por análisis cualitativo generado por Inteligencia Artificial (LLMs).

## 5. Perímetro del Sistema (MVP)

El MVP consolida una plataforma de evaluación asíncrona segmentada en dos dominios principales:

- **Dominio Transaccional:** Autenticación Stateless (bcrypt), Control de Acceso Basado en Roles (RBAC múltiple), captura de evaluaciones con protección de identidad (desacoplamiento de autoría y contenido) y gestión del ciclo de vida de plantillas e instrumentos de medición.
- **Dominio Analítico:** Agregación de métricas (ICP) mediante vistas SQL materializadas y delegación del procesamiento NLP a modelos de Google Gemini, cacheando resultados para eficiencia de red y costos.

## 6. Historias de Usuario (Resumen Ejecutivo)

El *Product Backlog* consta de 20 historias mapeadas en 7 épicas, priorizadas bajo el framework MoSCoW, totalizando 79 Story Points. El desglose se halla en `03-historias-de-usuario.md`.

El núcleo de valor (Core Business Logic), que distancia este sistema de un CRUD transaccional, reside en:
- **EVAL-05:** Inserción concurrente de evaluaciones con garantía de anonimato y evasión de *Race Conditions* (Duplicados).
- **DASH-01:** Motor de cálculo estadístico para el ICP y agregación de reportes.

## 7. Arquitectura Topológica

El sistema se estructura como un **Monolito Modular Full-Stack**, comunicado exclusivamente a través de contratos REST (JSON).

```text
SPA (Vite/Vanilla JS) ── HTTPS / REST ──> API (FastAPI) ── SQLAlchemy text() ──> MySQL (3FN)
```

La segmentación horizontal del backend garantiza el Principio de Responsabilidad Única (SRP):
- **Routes:** Aislamiento del protocolo HTTP y validación perimetral (Pydantic).
- **Services:** Concentración pura de lógica de negocio y reglas de dominio.
- **Repositories:** Abstracción del dialecto SQL y gestión de transacciones (Connection Pooling).

La justificación rigurosa de las tecnologías adoptadas se encuentra documentada en el artefacto `06-arquitectura.md`.

## 8. Persistencia y Modelo de Datos

El motor relacional (MySQL) soporta un esquema altamente normalizado en Tercera Forma Normal (3FN). Elementos críticos de diseño:
- **Separación de Identidad:** La entidad `evaluations` (contenido) está físicamente desvinculada de `evaluation_submissions` (autoría) en casos de anonimato, imposibilitando la reconstrucción del vínculo mediante inferencia SQL.
- **Roles Concurrentes:** Relaciones N:M que permiten a una entidad ostentar roles híbridos (e.g. Tutor y Team Leader simultáneamente).

El diccionario de datos y los diagramas relacionales residen en `07-base-de-datos.md`.

## 9. Criterios de Éxito del MVP

La validación del producto se fundamenta en las siguientes métricas de telemetría operativa (Adoption Metrics):
- Tasa de adopción de la plataforma ≥ 60%.
- Completitud de formularios requeridos ≥ 80%.
- Retención administrativa: Acceso concurrente o recurrente semanal al Dashboard de métricas.

## 10. Índice Documental Completo

El repositorio documental (`/docs`) está segmentado para abarcar desde la visión estratégica hasta la defensa arquitectónica granular.

**Especificaciones Core:**
- [`00-documento-tecnico.md`](./00-documento-tecnico.md) - Visión Arquitectónica y Alcance (este documento).
- [`01-vision-y-producto.md`](./01-vision-y-producto.md) - KPIs Operativos y Propuesta de Valor.
- [`02-product-backlog.md`](./02-product-backlog.md) - Backlog de MVP bajo MoSCoW.
- [`03-historias-de-usuario.md`](./03-historias-de-usuario.md) - Artefactos funcionales con DoD técnicos.
- [`04-epicas.md`](./04-epicas.md) - Habilitadores técnicos.
- [`05-sprint-planning.md`](./05-sprint-planning.md) - Topología de iteraciones y manejo de riesgos.

**Ingeniería y Arquitectura:**
- [`06-arquitectura.md`](./06-arquitectura.md) - Decisiones de diseño estructural.
- [`07-base-de-datos.md`](./07-base-de-datos.md) - Normalización 3FN y transacciones.
- [`08-diseno-tecnico.md`](./08-diseno-tecnico.md) - Convenciones GitFlow, CI/CD y código.
- [`09-mvp-alcance.md`](./09-mvp-alcance.md) - Criterios Lean Startup y NFRs.
- [`11-entregables-y-evaluacion.md`](./11-entregables-y-evaluacion.md) - Matriz de auditoría QA.
- [`13-glosario.md`](./13-glosario.md) - Definiciones de dominio (ORM, DTO, Entity, etc.).
- [`14-manejo-de-excepciones.md`](./14-manejo-de-excepciones.md) - Jerarquía polimórfica de errores.

**Guías de Defensa Técnica (Preparación para Pitch):**
- [`15-defensa-backend.md`](./15-defensa-backend.md) - Defensa de FastAPI, SQL crudo y Auth.
- [`16-defensa-frontend.md`](./16-defensa-frontend.md) - Defensa de SPA Vanilla JS.
- [`17-defensa-basedatos.md`](./17-defensa-basedatos.md) - Defensa de 3FN y anonimato estructural.
- [`18-defensa-integracion-e2e.md`](./18-defensa-integracion-e2e.md) - Ciclo de vida de la petición.
- [`19-preguntas-jurado.md`](./19-preguntas-jurado.md) - Simulador de Q&A para el jurado técnico.
