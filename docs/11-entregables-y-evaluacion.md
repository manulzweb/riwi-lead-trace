# 11 — Entregables y Evaluación

Mapeo de los requisitos del **Proyecto Integrador (Ruta Básica)** a cómo los cumple Riwi LeadTrace.

## Entregables obligatorios

### 1. Repositorio Git
- [x] Código fuente completo (monorepo `frontend/` + `backend/`).
- [x] **README** estructurado (overview, stack, instalación, despliegue) → [`/README.md`](../README.md).
- [x] Instrucciones de instalación → README + este doc.
- [ ] **Evidencia de GitFlow:** ramas `feature/*`, Pull Requests y commits por integrante.

### 2. Documento técnico
Cubierto por `/docs` (este conjunto):

| Requisito | Dónde |
|-----------|-------|
| Nombre del proyecto | README · 01 |
| Objetivo general y específicos | 01 (Vision/Goal/objetivos) |
| Problema identificado | 01 |
| Alcance | 09 (MVP) |
| Historias de usuario | 03 |
| Arquitectura de la solución | 06 |
| Modelo de datos | 07 + `database/schema.sql` |
| Evidencias Scrum | 02, 03, 05 + tablero |
| MVP definido | 09 |
| Justificación tecnológica | 06 |

### 3. Mockups / Prototipos
- Carpeta [`/mockups`](../mockups) con exports o enlace a **Figma** (sugerido) / Miro / Draw.io.
- Pantallas mínimas: login, listado de evaluables, formulario de evaluación, historial, dashboard.

### 4. Pitch comercial (10 min, **inglés**)
- Enfoque **comercial**, sin tecnicismos: problema, solución, valor, impacto.
- Responsable sugerido: PO + SM/Líder.

### 5. Pitch técnico (20 min, **español**)
- Decisiones técnicas: arquitectura, FastAPI + MySQL, lógica de negocio, seguridad, GitFlow.
- Todos los integrantes deben poder explicar su parte.

### 6. Aplicación funcional (desplegada)
- **Frontend:** GitHub Pages o Vercel.
- **Backend + MySQL:** plataforma en la nube (Render/Railway) o ejecución local documentada.
- Debe estar **funcional para la sustentación**.

## Requisitos técnicos (checklist de la rúbrica)

**Backend**
- [ ] Lógica de negocio implementada (anonimato, no-duplicado, métricas, RBAC).
- [ ] Gestión adecuada de rutas (routers FastAPI).
- [ ] Validación de datos (Pydantic).
- [ ] Manejo de errores (HTTPException + handlers globales).
- [ ] Integración con base de datos (SQLAlchemy + MySQL).

**Frontend**
- [ ] Interfaz funcional y navegación **SPA**.
- [ ] Diseño responsive.
- [ ] Validaciones de formularios.
- [ ] Consumo de API.

**Base de datos**
- [ ] Modelo normalizado **3FN**.
- [ ] Relaciones entre tablas.
- [ ] Consultas funcionales.
- [ ] CRUD completo.

**No solo CRUD**
- [ ] Lógica de negocio claramente identificable (ver 02 y 06).

## Evidencia de pruebas
- [ ] Casos de prueba (incl. `pytest` para servicios de negocio).
- [ ] Evidencias funcionales (capturas / grabación de la demo).
- [ ] Registro de errores encontrados y correcciones.

## Evaluación individual (cómo prepararse)
Cada integrante deberá:
- Explicar funcionalidades del proyecto y **su** participación.
- Demostrar conocimiento técnico y justificar decisiones.
- Evidenciar contribución en Git (commits, ramas, PRs propios).

> ⚠️ La incapacidad de sustentar un componente impacta la nota individual: **todos deben comprender el código**, también el generado con apoyo de IA.

## Uso responsable de IA
- Permitida como apoyo (investigación, desarrollo, documentación).
- Sin dependencia total; todos comprenden y pueden explicar el código.
- Las decisiones técnicas quedan documentadas en `/docs`.

## Reglas generales relevantes
- Proyecto **original**; no limitado a CRUD básico.
- Lógica de negocio claramente identificable.
- Participación activa y evidencia en Git de **todos**.
- MVP funcional para la sustentación; sin cambios tras el cierre de entregas.
- Gestión vía herramienta de control de proyecto (GitHub Projects / Trello / Jira).
- El grupo no puede tener más de un tutor como miembro.
