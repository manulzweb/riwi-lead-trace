# 09 — Alcance Técnico del MVP

Este documento define la delimitación estricta del perímetro funcional y no funcional del Producto Mínimo Viable (MVP). Bajo una filosofía de *Lean Startup*, se ha priorizado la validación del modelo de negocio sobre la implementación de abstracciones prematuras (Sobreingeniería). Todo flujo no crítico para la validación de la hipótesis central (Feedback Ascendente) queda exiliado del MVP.

## 1. Perímetro Funcional Crítico (Core Features)

| Dominio Funcional | Racional Arquitectónico / Negocio |
|-------------------|-----------------------------------|
| **Estructura Full-Stack** | Acoplamiento mediante contrato REST entre Frontend (SPA) y Backend (FastAPI + MySQL). Condición indispensable para la evaluación. |
| **Lógica de Dominio Pura** | Desacoplamiento de operaciones de base de datos a favor de procesos de negocio complejos: prevención de concurrencia, métricas ICP, algoritmos de anonimato. |
| **Gestión de Sesión Stateless** | Autenticación basada en comprobación criptográfica Bcrypt en servidor. Se prescinde de la emisión de Tokens (JWT) en favor de un manejo de estado efímero del lado del cliente, reduciendo la complejidad del MVP. |
| **Control de Acceso (RBAC Múltiple)** | Autorización basada en perfiles (Coder, TL, Tutor, Admin) gestionada en cliente. Un usuario puede poseer concurrentemente Múltiples Roles (Relación N:M). |
| **Formularios de Evaluación** | Inyección dinámica de plantillas estructuradas contra destinatarios (Team Leaders, Tutores). |
| **Restricción de Anonimato** | Capacidad del Coder de aislar criptográficamente su identidad de los resultados (Carencia de Foreign Key en evaluaciones anónimas). |
| **Inmutabilidad e Integridad** | Prevención a nivel de motor SQL de evaluaciones duplicadas en el mismo periodo. |
| **Control de Ciclos (Periodos)** | Máquina de estados temporal administrada. Sin un periodo *Activo*, el flujo de captura de datos se bloquea transaccionalmente. |
| **Integridad de Instrumentos** | Administración de preguntas y formularios condicionada al cierre de periodos (bloqueo) y versionado *Soft-Delete* para preservar referencias históricas. |
| **Cálculo Derivado (ICP)** | Procesamiento algebraico de agregados mediante Vistas SQL materializadas para la consolidación del Dashboard Administrativo. |
| **Integración Analítica NLP** | Despacho de agregados anonimizados a **Google Gemini** para la extracción de tópicos e *insights* (Síntesis Cualitativa). |
| **Settings en Caliente** | Modificación dinámica de umbrales del ICP y control termodinámico de la IA (`system_settings`) sin necesidad de re-desplegar binarios. |
| **Trazabilidad Forense (Auditoría)** | Bitácora *append-only* de transacciones administrativas sensibles (mutación de periodos, instrumentos, configuraciones), exportable a formato crudo (CSV). |

*Nota: La consolidación del seguimiento histórico a largo plazo por cohortes queda categorizada como prioridad "Should", sujeta a capacidad técnica residual.*

## 2. Criterios de Validación (Success Criteria)

La validación del MVP se certifica al superar los umbrales de adopción y completitud expuestos en `01-vision-y-producto.md` (Adopción ≥60%, Completitud ≥80%), corroborando la reducción del sesgo cognitivo en evaluaciones cualitativas.

## 3. Requisitos No Funcionales (NFRs)

La estabilidad del sistema se rige bajo los siguientes requerimientos, dimensionados para operar de manera resiliente durante el piloto:

| NFR | Directriz Técnica | Criterio de Aceptación (DoD) |
|-----|-------------------|------------------------------|
| **Seguridad y Criptografía** | Hashes unidireccionales (Bcrypt). Anonimato garantizado por carencia relacional (`evaluation_id = NULL`). Prevención de Inyecciones SQL vía comandos pre-compilados (`text()`). Prevención de XSS en renders. Protocolo HTTPS. | 0 credenciales en texto plano. Inviabilidad matemática de identificar autores anónimos. |
| **Arquitectura de Software** | Diseño escalable, segmentación horizontal rigurosa (`Routes`, `Services`, `Repositories`). Carencia absoluta de modelos ORM para máxima transferencia de rendimiento al motor DB. | Capas 100% aisladas. Lógica de negocio restringida a la capa `services`. |
| **Rendimiento (Performance)** | Transmisión de *Bundles* SPA ultra-minificados (Vite). Descarga de la CPU del servidor delegando métricas complejas al motor SQL. Control de asincronía. | FCP (First Contentful Paint) < 2s. Ausencia de cuellos de botella (N+1 queries). |
| **Usabilidad (UX/UI)** | Patrón *Mobile-First*. Feedback háptico o visual concurrente. Validación robusta (Client-Side). | Flujo transaccional de evaluación concretado en ≤ 3 clics o interacciones. |
| **Mantenibilidad** | Aplicación rigurosa de Convenciones Semánticas (Conventional Commits, PEP-8, BEM). Documentación en vivo. | Ausencia de "Código Espagueti" (Spaghetti Code). Módulos testeables unitariamente. |
| **Accesibilidad** | Adherencia transversal al estándar semántico HTML5. Inserción de atributos ARIA. Contraste radiométrico WCAG AA. | Interactividad garantizada 100% mediante uso exclusivo de periféricos de teclado. |
