# 08 — Especificación de Diseño Técnico y Metodología

Este documento codifica las convenciones sintácticas, el flujo de ciclo de vida del código (VCS) y las directrices de aseguramiento de calidad (QA) exigidas para el mantenimiento y evolución del sistema Riwi Lead Trace.

## 1. Convenciones Lexicográficas y Nombrado

Para mitigar la carga cognitiva y mantener la uniformidad en el monorepo, se imponen las siguientes reglas de nombrado, separadas por dominio:

### 1.1. Frontend (Ecosistema JavaScript)
- **Topología de Archivos:** `kebab-case` estricto (ej. `my-evaluations.view.js`). Adopción de sufijos funcionales (`*.view.js`, `*.service.js`) para inferencia rápida de responsabilidad. Ausencia de `*.store.js` confirmando la carencia de estado global centralizado.
- **Variables y Métodos:** `camelCase` (ej. `fetchEvaluables()`). Funciones de visibilidad interna o privada precedidas por un guion bajo (`_renderFallback()`).
- **Estados Lógicos:** Booleanos prefijados semánticamente (`isAuth`, `hasPermission`, `canEvaluate`).
- **Módulos:** Restricción a ES Modules (`import`/`export`). Prohibición absoluta de mutación del espacio global (`window`).

### 1.2. Backend (Ecosistema Python - PEP 8)
- **Módulos y Paquetes:** `snake_case` (ej. `evaluation_repository.py`).
- **Métodos y Variables:** `snake_case`.
- **Clases (DTOs, Excepciones, Servicios):** `PascalCase` (ej. `ApplicationException`, `EvaluationCreate`).
- **Constantes:** `UPPER_SNAKE_CASE` (ej. `MAX_RETRIES`).
- **Tipado (Type Hinting):** Obligatorio en firmas de funciones. Las herramientas de análisis estático (MyPy/Ruff) lo exigen para comprobación *ahead-of-time*.

### 1.3. Base de Datos (DDL) y Red (REST)
- **Esquema Relacional:** Tablas y atributos en `snake_case` pluri-nominal (`evaluation_details`).
- **Rutas de API:** Estándar RESTful. Colecciones en plural (`/evaluations`). Identificadores compuestos en `kebab-case` (`/activity-log`).

## 2. Metodología de Integración y VCS (GitFlow)

La orquestación del código fuente opera bajo un modelo **GitFlow** restringido para asegurar la trazabilidad de contribuciones individuales y proteger las ramas de producción.

### 2.1. Topología de Ramas
- `main`: Refleja el artefacto de producción (Release Candidate). Inmutable salvo por *Merges* controlados y etiquetados (`v1.0.0`).
- `develop`: Rama de integración principal. Contiene la línea base del sprint en curso.
- `feature/<id-historia>-<slug>`: Ramas efímeras asignadas a desarrolladores específicos (ej. `feature/EVAL-05-anonimato`).
- `hotfix/<slug>`: Correcciones críticas emergentes despachadas directamente hacia `main`.

### 2.2. Flujo Operativo y Pipeline de Integración
1. Todo desarrollo inicia bifurcando desde `develop`.
2. Consolidación de *commits* atómicos y frecuentes localmente.
3. Apertura de un **Pull Request (PR)** hacia `develop`. 
4. **Code Review Obligatorio:** Requiere aprobación por pares (Peer Review) para mitigar silos de conocimiento y detectar vectores de falla de manera temprana.
5. Fusión (Merge) hacia `develop` únicamente cuando se cumple la *Definition of Done (DoD)*.

### 2.3. Semántica de Commits (Conventional Commits)
Se requiere el estándar *Conventional Commits* para facilitar la auto-generación de *Changelogs* y la auditoría forense:
```text
<tipo>(<dominio>): <código_jira/trello> <descripción corta en imperativo>
```
Tipos admitidos: `feat` (característica), `fix` (parche), `docs` (documentación), `refactor` (reestructuración sin alteración de comportamiento), `chore` (tareas de infraestructura).
*Ejemplo: `feat(evaluations): EVAL-05 implementar desacoplamiento para anonimato`*

## 3. Aseguramiento de Calidad (Quality Assurance) y Herramientas

Se prioriza un conjunto de herramientas de bajo *overhead* para no ralentizar el ciclo iterativo del MVP.

- **Frontend:** 
  - Formateo estricto delegado a **Prettier**.
  - Análisis estático AST mediante **ESLint** configurado para ECMAScript moderno (`eslint:recommended`).
  - Metodología de CSS: **BEM (Block Element Modifier)** para aislamiento de especificidad y prevención de colisiones.
- **Backend:**
  - Formateo determinista delegado a **Black** (longitud de línea, *quotes*).
  - Linter ultra-rápido: **Ruff** (reemplazo en Rust para Flake8).
  - Testing Automatizado: **Pytest**, con foco de cobertura concentrado en la capa de `services/` (reglas de negocio complejas).

## 4. Gestión Estructural del Repositorio (Monorepo)

La arquitectura de repositorio único consolida todos los artefactos de software:

- `/frontend`: SPA instanciada con Vite.
- `/backend`: Servidor ASGI y servicios en Python.
- `/database`: Artefactos DDL, DML y Scripts analíticos.
- `/docs`: Registro histórico, especificaciones Scrum (Backlog) y arquitectura.

Las configuraciones críticas (Secrets, URIs de conexión) se abstraen estrictamente del control de versiones mediante variables de entorno (archivos `.env.example` en repositorios).
