# 11 — Entregables y Auditoría de Criterios de Evaluación

Este documento establece la trazabilidad entre los requisitos técnicos del Proyecto Integrador y los artefactos de software desplegados por la arquitectura de **Riwi Lead Trace**. Funciona como matriz de comprobación (Checklist) para la auditoría técnica.

## 1. Entregables Obligatorios del Ecosistema

### 1.1. Gestión de Repositorio Central (Git)
- [x] **Código Fuente Monorepo:** Estructura consolidada (`/frontend`, `/backend`, `/database`).
- [x] **README Arquitectónico:** Especificación de topología, rutinas de instalación de dependencias, variables de entorno y *deployment pipelines* (`/README.md`).
- [x] **Evidencia VCS (Version Control System):** Traza de contribuciones individuales, ramas aisladas (`feature/*`), y revisiones de código mediante Pull Requests.

### 1.2. Documentación Técnica (Arquitectura de Software)
Consolidada íntegramente en el directorio `/docs`:
- **Definición de Dominio:** `01-vision-y-producto.md`
- **Scope y Limitaciones:** `09-mvp-alcance.md`
- **Backlog Ágil:** `02-product-backlog.md`, `03-historias-de-usuario.md`
- **Topología Arquitectónica:** `06-arquitectura.md`
- **Modelo de Datos y DDL:** `07-base-de-datos.md`
- **Protocolos Operativos:** `08-diseno-tecnico.md`
- **Manejo de Excepciones:** `14-manejo-de-excepciones.md`

### 1.3. Artefactos de Diseño UI/UX
- [x] Maquetado de alta fidelidad exportado en `/mockups` (referencia a componentes de interfaz en Figma).

### 1.4. Pitch Técnico y Comercial
- [x] **Business Pitch (Inglés, 10m):** Alineación de la propuesta de valor y retorno de inversión del feedback ascendente.
- [x] **Technical Pitch (Español, 20m):** Defensa de decisiones arquitectónicas complejas: Monolito modular, abstención del uso de JWT, supresión del ORM (uso de SQL plano), y desacoplamiento de identidades para anonimato estructural.

### 1.5. Infraestructura Desplegada
- [x] **Frontend:** Despliegue en red global de distribución de contenido (CDN / Vercel / GitHub Pages).
- [x] **Backend & Database:** Alojamiento en entornos PaaS (Render, Railway). Contrato REST funcional accesible al público.

---

## 2. Auditoría Técnica (Rúbrica de Validación)

### 2.1. Backend (Python + FastAPI)
- [x] **Lógica de Negocio (Core Domain):** Segmentada rígidamente en `/services`. Prevención transaccional de carrera (no-duplicados), cálculo estadístico on-read, y RBAC abstracto.
- [x] **Capa HTTP (Routing):** Enrutamiento segmentado e inyección de dependencias (`Depends()`).
- [x] **Contratos de Datos (DTOs):** Fronteras de I/O blindadas mediante validación de modelos Pydantic V2.
- [x] **Resiliencia (Error Handling):** Manejadores globales y polimorfismo de excepciones (`14-manejo-de-excepciones.md`).
- [x] **Capa de Persistencia:** Acceso a Base de Datos nativo con `sqlalchemy.text()` (Connection Pooling optimizado).

### 2.2. Frontend (SPA)
- [x] **Motor de Enrutamiento (History API):** Renderizado de vistas y control de acceso simulado.
- [x] **Rendimiento UI:** Implementación estricta de metodologías asíncronas para el consumo de la API.
- [x] **Diseño Fluido:** Sistema de grillas responsivas (Tailwind CSS) con diseño Mobile-First.

### 2.3. Estructura de Datos (MySQL)
- [x] **Normalización 3FN:** Minimización absoluta de anomalías de inserción/borrado.
- [x] **Integridad Referencial:** Llaves foráneas (`FK`), restricciones únicas compuestas y operaciones lógicas precalculadas (Vistas).
- [x] **Disponibilidad Transaccional:** Operaciones CRUD completas y *Soft-Deletes* defensivos.

### 2.4. Diferenciación Funcional (Beyond CRUD)
- [x] Algoritmos matemáticos y lógicos evidentes (ICP).
- [x] Integración de Inteligencia Artificial (LLM - Gemini) aplicada a resumen estadístico de metadatos no numéricos.

---

## 3. Telemetría de Aseguramiento de Calidad (QA)
- [ ] Construcción de *Test Suites* usando `pytest` para inyectar *Mocks* y validar aserciones del dominio (services).
- [ ] Retención de *stacktraces* crudos en logs del servidor, contrastados con UUIDs opacos presentados al usuario final.

## 4. Evaluaciones Individuales (Defensa del Código)

La arquitectura impone que la base de código debe ser comprendida íntegramente por todos los ingenieros. **No existen cajas negras**.
- Cada ingeniero es responsable penal de la defensa arquitectónica de sus PRs y contribuciones en Git.
- Las intervenciones de herramientas de Generación de Código AI (Copilot, Gemini) están documentadas y suceptibles a refactorización profunda para demostrar apropiación intelectual técnica del código.
