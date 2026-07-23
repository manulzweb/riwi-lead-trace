# 05 — Sprint Planning & Ejecución

## 1. Topología de Épicas y Trazabilidad Funcional

Las iteraciones se estructuran lógicamente sobre siete épicas fundacionales. Todas demandan competencias **Full-Stack** y un rigor técnico adherido a la normalización de la base de datos (3FN) y la segmentación del dominio.

| Épica | Objetivo de Negocio y Arquitectura | Alcance Operativo |
|---|---|---|
| **CORE** | Instanciación topológica: Inicialización del repositorio base (SPA asíncrona, Servidor ASGI FastAPI, Conexiones a Motor DB MySQL). | CORE-01/02/03 |
| **AUTH** | Validación criptográfica de identidad y abstracción de seguridad (Stateless / Carencia intencional de JWT). | AUTH-01/02/03 |
| **EVALUACIONES** | Núcleo de valor (Core Business): Flujo de agregación de métricas de desempeño, garantizando *anonimato estructural* y mitigando asimetrías de información. | EVAL-01..05 |
| **HISTORIAL** | Trazabilidad forense inmutable de eventos de *feedback*, manteniendo la integridad relacional y opacidad sobre las fuentes anónimas. | HIST-01/02 |
| **DASHBOARD** | Procesamiento OLAP ligero (On-Read): Transformación del repositorio en indicadores de gestión (*Índice de Calidad Percibida - ICP*). | DASH-01/02 |
| **AIFEED** | Integración asíncrona con ecosistema LLM (Google Gemini) para abstracción semántica automatizada y prevención de sobrecarga cognitiva administrativa. | AIFEED-01 |
| **ENTREGA** | Cadena de despliegue y liberación operativa (CI/CD / Hosting). Protocolización y auditoría documental final. | DELIV-01..04 |

---

## 2. Marco Metodológico Operacional

La cadencia de producción se enmarca bajo iteraciones Scrum rigurosas (4 semanas), priorizando un modelo ágil ajustado a la capacidad técnica instalada.

- **Fuerza Operativa:** 5 ingenieros dedicados, asimilados orgánicamente como constructores multifuncionales.
- **Periodo Operacional:** 20 de Junio – 17 de Julio (2026).
- **Capacidad Instalada (Velocity Estimada):** ~20 Story Points (SP) por Sprint, totalizando 79 SP nominales requeridos para la estabilización del MVP (Referirse a `02-product-backlog.md`).

### Ceremonias Estándar
- **Sincronización Diaria (Daily Stand-Up):** Desbloqueo concurrente de dependencias (15 min).
- **Planeación, Revisión y Retrospectiva:** Orquestadas como límites transaccionales de cada iteración temporal.
- **Tablero de Concurrencia:** Trazabilidad estricta de incidencias bajo pipeline visual (Backlog, In Progress, Review/QA, Done).

---

## 3. Iteraciones de Desarrollo (Sprints)

### Sprint 1 — Fase Fundacional (Bootstrapping) (20 Jun – 1 Jul)
**Meta de Sprint (Goal):** Ensamblaje estructural operativo. El entorno debe certificar flujos de compilación, enrutamientos perimetrales del framework e inyección de datos semilla paramétricos en el entorno de pruebas.
**Rendimiento Acumulado:** 15 SP. Tareas subyacentes no cuantificadas incluyen: modelado DDL/DML de 3FN, prototipado de fidelidad de interfaces, y acoplamiento estructural.

### Sprint 2 — Despliegue Transaccional Core (2 Jul – 9 Jul)
**Meta de Sprint (Goal):** Desbloqueo del ecosistema de transacciones de negocio. Autenticación completa y habilitación del ciclo de vida de captura de instrumentos evaluativos (Envío de datos asíncronos y protección atómica de persistencia DB).
**Rendimiento Acumulado (Sobrecarga de Riesgo):** 29 SP. La ejecución demanda un procesamiento paralelo estricto entre desarrolladores backend (controladores/repositorios) e ingenieros UI (consumo de API). Se advierte recorte potencial de funcionales secundarios (Should).

### Sprint 3 — Módulo de Agregación Analítica (10 Jul – 13 Jul)
**Meta de Sprint (Goal):** Aterrizaje del dominio analítico del proyecto. Derivación algorítmica del **ICP** utilizando *Vistas Materializadas* relacionales, e interconexión asíncrona robusta al motor LLM de inferencia (Gemini) priorizando un manejo opaco de errores.
**Rendimiento Acumulado:** 19 SP. Representa el diferenciador de software más allá de un CRUD monolítico.

### Sprint 4 — Liberación a Producción (Release) (14 Jul – 17 Jul)
**Meta de Sprint (Goal):** Promoción a los entornos productivos finales (CDN/PaaS). Convalidación heurística final, blindaje documental arquitectónico y preparación para exposición técnica ejecutiva.
**Rendimiento Acumulado:** 16 SP. Actividades de despliegue y auditoría QA manual.

---

## 4. Matriz de Riesgos y Resiliencia del Proyecto

| Vector de Riesgo Identificado | Estrategia de Mitigación Operativa |
|-------------------------------|------------------------------------|
| **Compresión Temporal Sprints 2-4** | Aplicación agresiva de recortes de alcance basados en *MoSCoW*. La reducción de funcionalidades prioritarias (*Should*) ampara la viabilidad de la entrega fundamental. |
| **Cuellos de Botella I/O (API Contract)** | Bloqueo absoluto de interfaces (*Mocking*) en paralelo tras acordar los esquemas RESTful (OpenAPI) durante el *Bootstrapping*. |
| **Discrepancia de Concurrencia (Sprint 2)** | Focalización en asincronía. Mientras Backend desarrolla el RBAC, Frontend avanza integrando componentes reutilizables (Forms) desvinculados del servidor. |
| **Latencia e Inestabilidad LLM Externo** | Patrón arquitectónico de Degradación Elegante. Frente al colapso del proveedor (Gemini) o llaves ausentes, la UI intercepta y notifica sin derivar en pánicos nucleares (`HTTP 500`). Caching local habilitado. |
| **Filtraciones de Privacidad Criptográfica** | Auditoría interna obligatoria para asegurar que los metadatos suministrados al LLM operan con agregaciones abstractas sin exponer la matriz PII (Personal Identifiable Information). |
