# 02 — Product Backlog

Especificación del backlog para el MVP bajo arquitectura **Full-Stack** (Frontend SPA + Backend FastAPI + Motor Relacional MySQL). La estimación de esfuerzo se cuantifica en **Story Points (SP)** empleando la sucesión de Fibonacci (1, 2, 3, 5, 8). La priorización estratégica sigue el framework **MoSCoW** (Must / Should / Could). Cada SP dimensiona el ciclo de vida completo de la funcionalidad (UI, lógica de dominio, enrutamiento y persistencia de datos), excluyendo las historias de infraestructura base (CORE-01, CORE-02).

| ID | Nombre | Descripción Técnica | Épica | Prioridad | SP | Dependencias |
|----|--------|---------------------|-------|-----------|:--:|--------------|
| CORE-01 | Setup repositorio y estructura SPA | Topología de Monorepo, inicialización `frontend/`, router asíncrono y módulo `api.service.js` (Arquitectura sin store de estado centralizado, ver `06-arquitectura.md`). | CORE | Must | 5 | — |
| CORE-02 | Setup Backend FastAPI y DB | Capas lógicas `routes/`, `services/`, `repositories/` (sin abstracción de `models/`), orquestación de MySQL y script seed (DDL/DML). | CORE | Must | 5 | — |
| CORE-03 | Arquitectura Layout Responsive | Shell estructural SPA, renderizado condicional de navegación por perfil de usuario, CSS Mobile-First. | CORE | Must | 5 | CORE-01 |
| AUTH-01 | Autenticación Stateless | UI login + Endpoint `POST /auth/login`. Validación criptográfica de hash bcrypt en el servidor, sin emisión de JWT. | AUTH | Must | 3 | CORE-02, CORE-03 |
| AUTH-02 | Sesión en Capa Cliente | Persistencia de sesión y claim de roles en `localStorage`. Inyección de Route Guards en la SPA para restricción de acceso no autorizado. | AUTH | Must | 5 | AUTH-01 |
| AUTH-03 | Control de Acceso (RBAC Client-Side) | Restricción de interfaces por rol. El backend implementa filtrado contextual confiando en la aserción de identidad delegada por el cliente. | AUTH | Must | 3 | AUTH-02 |
| EVAL-01 | Resolver entidades evaluables | UI + Endpoint `GET /users?role=...`. Resolución de Team Leaders y Tutores asociados. | EVAL | Must | 3 | AUTH-03 |
| EVAL-02 | Transacción de Evaluación (Team Leader) | Motor de renderizado de formulario + Inyección dinámica de plantilla `GET /forms?target_role=team_leader`. | EVAL | Must | 5 | EVAL-01 |
| EVAL-03 | Transacción de Evaluación (Tutor) | Reutilización polimórfica del motor de formularios aplicando la plantilla para Tutores. | EVAL | Must | 3 | EVAL-02 |
| EVAL-04 | Enmascaramiento de Identidad (Anonimato) | Inyección condicional en backend: supresión del vínculo relacional (`evaluation_submissions.evaluation_id = NULL`). | EVAL | Should | 2 | EVAL-02 |
| EVAL-05 | Commit Transaccional de Evaluación | `POST /evaluations`: Validación estricta Pydantic, manejo de estados, **prevención de duplicidad transaccional**, condicionada a **periodo activo**. | EVAL | Must | 5 | EVAL-02 |
| ADMIN-01 | Orquestación de Periodos | Mutación de estado de periodo (`PUT /periods/:id`). Bloqueo concurrente: máximo un periodo activo, restringiendo la captura de evaluaciones a nivel servidor. | ADMIN | Must | 3 | AUTH-03 |
| ADMIN-02 | Mantenimiento de Instrumentos (Formularios) | Mutación de texto y flag de actividad (`PATCH /questions/:id`), restringido a ventana de periodo cerrado. Ejecución por **Soft-Delete (Versionado)** para preservación del ICP, con **validación heurística de IA**. | ADMIN | Should | 3 | ADMIN-01 |
| HIST-01 | Trazabilidad del Coder | Interfaz de historial + Endpoint `GET /evaluations?evaluator_id=...` para resolución de evaluaciones emitidas. | HIST | Should | 3 | EVAL-05 |
| HIST-02 | Analítica Histórica (Admin) | Resolución agregada por perfil evaluado/periodo, bajo estricto cumplimiento del pacto de anonimato estructural. | HIST | Should | 3 | EVAL-05 |
| DASH-01 | Consolidación de Dashboard e ICP | Interfaz administrativa + `GET /metrics/summary`. Cálculo analítico del **Índice de Calidad Percibida (ICP)**. | DASH | Must | 5 | EVAL-05 |
| DASH-02 | Desglose Analítico por Categoría | **Lógica de Dominio:** Resolución de ICP particionado por categoría semántica, tasa de adopción y métrica de confianza (volumen de anonimato). | DASH | Should | 3 | DASH-01 |
| AIFEED-01 | Ingesta NLP de Feedback | Endpoint `GET /metrics/ai-summary`. Delegación de síntesis de lenguaje natural a LLM (Google Gemini), con anonimización estricta y caché materializado. | AIFEED | Should | 5 | DASH-01 |
| DELIV-01 | Orquestación de Despliegue (Deployment) | Pipeline de despliegue: Hosting Frontend, Backend y MySQL. Exposición de URL pública y configuración de secretos operacionales. | ENTREGA | Must | 5 | EVAL-05 |
| DELIV-02 | Pitch Ejecutivo (Business Pitch - EN) | Formulación estratégica del retorno de inversión y valor de mercado (3-5 min). | ENTREGA | Must | 3 | — |
| DELIV-03 | Defensa Arquitectónica (Technical Pitch - ES) | Defensa técnica y operativa frente a panel. Demostración de flujos y abstracciones. | ENTREGA | Must | 3 | DELIV-01 |
| DELIV-04 | Documentación Final y Artefactos | Consolidación de métricas de QA, *snapshots* de `/docs`, maquetas finales y evidencias forenses. | ENTREGA | Must | 5 | — |

**Total de Puntos de Historia (MVP):** 85 SP (22 Historias).

## Dominio Fundamental y Core Business Logic

El valor del sistema radica en su complejidad lógica más allá del modelo transaccional básico (CRUD), evidenciado en los siguientes dominios:
- **EVAL-05:** Prevención estricta de *Race Conditions* y sumisiones duplicadas utilizando índices únicos compuestos. Manejo de estados y bloqueos (`HTTP 409 Conflict`) ante la ausencia de un periodo hábil.
- **EVAL-04:** Implementación de anonimato criptográficamente seguro (ausencia total de llave foránea en base de datos; la traza es irrecuperable por diseño).
- **AUTH-03:** Restricción de visibilidad a nivel de presentación (SPA) y negación de acceso a nivel de API (Control de Acceso basado en Roles).
- **ADMIN-01:** Máquina de estados para periodos. El flag de estado de un periodo muta dinámicamente la viabilidad operativa de toda la plataforma.
- **ADMIN-02:** Estrategia de versionado (Inmutabilidad del Historial). Las modificaciones a las preguntas desactivan la versión antigua (Soft-Delete) y generan un nuevo registro para prevenir deriva semántica del ICP histórico.
- **DASH-01/02:** Agregación estadística ponderada para generar el ICP, normalizado sobre base 100, con factor de corrección por muestra insuficiente.
- **AIFEED-01:** Integración inteligente de LLMs, limitando el payload a datos puramente agregados (Zero-PII o datos no identificables) y optimizando el ciclo de vida de la petición con caching asíncrono.

## Pipeline de Refinamiento (Flujo de Entrega)

1. **CORE** (Cimientos topológicos y despliegue inicial).
2. **AUTH** (Identidad y autorización, bloqueante funcional primario).
3. **EVAL** (Dominio de negocio: captura transaccional del feedback).
4. **HIST + DASH** (Módulos analíticos: transformación de data cruda a Insights).
5. **AIFEED** (Diferenciador competitivo: Ingesta de NLP).
6. **ENTREGA** (Operaciones de Release: Documentación, QA final y exposición orquestada).

## Definition of Ready (DoR)
- La historia posee requerimientos funcionales, criterios de aceptación estrictos y estimación paramétrica (SP).
- Las dependencias de infraestructura y arquitectura están resueltas (o agendadas secuencialmente en el mismo sprint).
- Contratos REST (DTOs) estipulados y validados según `06-arquitectura.md`.

## Definition of Done (DoD)
- Cumplimiento íntegro de la matriz de Criterios de Aceptación.
- **Backend:** Frontera de datos blindada vía esquemas Pydantic. Códigos HTTP estandarizados y propagación controlada de excepciones (Exception Handlers globales).
- **Frontend:** Estándares *Mobile-First* aprobados, navegación fluida, resiliencia a latencia (estados de carga).
- Aislamiento riguroso del Dominio: la lógica no está delegada a un controlador transaccional básico, sino abstraída en la capa `services/`.
- Adherencia al manifiesto de convenciones `08-diseno-tecnico.md`.
- Integración en `develop` vía proceso de Pull Request revisado por pares.
