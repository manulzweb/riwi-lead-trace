# 03 — Historias de Usuario

Formato: **Como** [rol] / **Quiero** [funcionalidad] / **Para** [beneficio].
Cada historia incluye criterios de aceptacion (CA), prioridad y Story Points.

---

## CORE

### CORE-01 — Preparar repo + estructura base de la SPA · `Must` · `5 SP`
**Como** developer **quiero** una base de proyecto SPA modular con router, store y cliente HTTP **para** construir las funcionalidades de forma ordenada y rapida.

**Criterios de aceptacion**
- [ ] Monorepo con `frontend/` y `backend/` segun [`06-arquitectura.md`](./06-arquitectura.md).
- [ ] El frontend arranca con `npm run dev` y muestra una vista inicial.
- [ ] Existe un router cliente que cambia de vista sin recargar la pagina.
- [ ] Hay un modulo `store` (estado) y un modulo `http` (fetch) reutilizables.

### CORE-02 — Estructura base del backend (FastAPI) + BD · `Must` · `5 SP`
**Como** developer **quiero** un backend FastAPI por capas conectado a MySQL **para** exponer la API REST que consumira la SPA.

**Criterios de aceptacion**
- [ ] `uvicorn app.main:app --reload` levanta la API y expone `/docs` (Swagger).
- [ ] Estructura por capas: `routers/`, `services/`, `repositories/`, `models/`, `schemas/`, `deps.py`.
- [ ] Conexion a MySQL configurable por `.env`; la BD se crea con `database/schema.sql` (seed incluido).
- [ ] Endpoint de salud (`GET /health`) responde `200`.
- [ ] CORS habilitado para el origen del frontend.

### CORE-03 — Layout y navegacion responsive · `Must` · `5 SP`
**Como** usuario **quiero** una interfaz con navegacion clara y adaptable **para** usar la plataforma comodamente desde movil o escritorio.

**Criterios de aceptacion**
- [ ] Header con navegacion que cambia segun el rol autenticado.
- [ ] Layout mobile-first; se adapta a >=320px, tablet y escritorio.
- [ ] La vista activa se resalta en la navegacion.
- [ ] Estados de carga y vacio con un componente comun.

---

## AUTH

### AUTH-01 — Inicio de sesion · `Must` · `3 SP`
**Como** usuario registrado **quiero** iniciar sesion con mis credenciales **para** acceder a la plataforma de forma segura.

**Criterios de aceptacion**
- [ ] Formulario con email y contrasena validados en cliente.
- [ ] `POST /auth/login` verifica la contrasena con **hash** (passlib/bcrypt) y emite un **JWT**.
- [ ] Mensaje de error claro ante credenciales invalidas (`401`).
- [ ] Al autenticar, se redirige a la vista inicial segun el rol.
- [ ] Boton deshabilitado y feedback de carga durante la peticion.

### AUTH-02 — Sesion y rutas protegidas · `Must` · `5 SP`
**Como** usuario autenticado **quiero** mantener mi sesion y que las rutas privadas esten protegidas **para** no tener que reingresar y proteger mi informacion.

**Criterios de aceptacion**
- [ ] El token (JWT) se persiste en `localStorage` y se envia en cada peticion.
- [ ] El backend valida el token (`get_current_user`) y rechaza peticiones sin token o expirado (`401`).
- [ ] Acceder a una ruta privada sin sesion redirige a login.
- [ ] Existe accion de logout que limpia la sesion.
- [ ] Si el token expira (401), se cierra sesion y se redirige a login.

### AUTH-03 — Gestion de roles / autorizacion · `Must` · `3 SP`
**Como** sistema **quiero** mostrar funcionalidades segun el rol **para** que cada usuario vea solo lo que le corresponde.

**Criterios de aceptacion**
- [ ] El Coder ve evaluaciones e historial propio; no ve el dashboard.
- [ ] El Admin ve dashboard, ICA, resumenes IA e historico.
- [ ] Las rutas no autorizadas redirigen o muestran "no autorizado" (front).
- [ ] El backend aplica `require_role` y responde `403` ante accesos no autorizados (autoridad real).
- [ ] La navegacion se construye dinamicamente segun los permisos del rol.

---

## EVALUACIONES

### EVAL-01 — Listar evaluables · `Must` · `3 SP`
**Como** Coder **quiero** ver la lista de Team Leaders y Tutores que puedo evaluar **para** elegir a quien dar feedback.

**Criterios de aceptacion**
- [ ] Lista obtenida desde la API, filtrable por tipo (Team Leader / Tutor).
- [ ] Indica si ya evalue a esa persona en el periodo actual.
- [ ] No me incluye a mi mismo (un tutor no se autoevalua).
- [ ] Estado vacio si no hay evaluables asignados.

### EVAL-02 — Evaluar Team Leader · `Must` · `5 SP`
**Como** Coder **quiero** completar un formulario estructurado para evaluar a un Team Leader **para** retroalimentar su acompanamiento.

**Criterios de aceptacion**
- [ ] Formulario con criterios por categoria y escala (p.ej. 1-5) + comentario opcional.
- [ ] Validacion: no se envia incompleto; muestra errores por campo.
- [ ] Se puede guardar como borrador y retomar.
- [ ] Confirmacion visual al enviar.

### EVAL-03 — Evaluar Tutor · `Must` · `3 SP`
**Como** Coder **quiero** evaluar a un Tutor con un formulario estructurado **para** retroalimentar su apoyo tecnico.

**Criterios de aceptacion**
- [ ] Reutiliza el motor de formularios de EVAL-02 con la plantilla de Tutor.
- [ ] Criterios propios del rol Tutor cargados desde la API.
- [ ] Mismas reglas de validacion y confirmacion.

### EVAL-04 — Feedback anonimo opcional · `Should` · `2 SP`
**Como** Coder **quiero** poder enviar mi evaluacion de forma anonima **para** dar feedback honesto sin temor.

**Criterios de aceptacion**
- [ ] Toggle "Enviar de forma anonima" visible antes de enviar.
- [ ] Si esta activo, la evaluacion se registra sin asociar la identidad del evaluador.
- [ ] El sistema informa que el anonimato es irreversible una vez enviado.

### EVAL-05 — Registrar evaluacion (API) · `Must` · `5 SP`
**Como** Coder **quiero** que mi evaluacion se guarde de forma confiable **para** que cuente en las metricas.

**Criterios de aceptacion**
- [ ] La evaluacion se persiste via `POST /evaluations` con validacion Pydantic en servidor.
- [ ] Maneja estados: borrador y enviada.
- [ ] **Regla de negocio:** rechaza (`409`) una segunda evaluacion del mismo evaluado en el mismo **periodo**.
- [ ] Manejo de errores de red con reintento y mensaje claro.
- [ ] Tras enviar, la persona evaluada aparece como "ya evaluada".

---

## HISTORIAL

### HIST-01 — Historial del Coder · `Should` · `3 SP`
**Como** Coder **quiero** consultar las evaluaciones que he enviado **para** llevar registro de mi participacion.

**Criterios de aceptacion**
- [ ] Lista de evaluaciones propias con fecha, evaluado y estado.
- [ ] Detalle de cada evaluacion enviada (no editable).
- [ ] Las anonimas se muestran al propio autor pero marcadas como anonimas.

### HIST-02 — Seguimiento historico · `Should` · `3 SP`
**Como** Admin **quiero** consultar el historico de evaluaciones por lider/tutor y periodo **para** dar seguimiento a su evolucion.

**Criterios de aceptacion**
- [ ] Filtros por persona evaluada, rol y periodo.
- [ ] Vista agregada que respeta el anonimato (sin exponer evaluadores anonimos).
- [ ] Estado vacio y de carga.

---

## DASHBOARD

### DASH-01 — Dashboard de resultados · `Must` · `5 SP`
**Como** Admin **quiero** un panel con resultados agregados y el **ICA** **para** entender rapidamente la calidad del acompanamiento.

**Criterios de aceptacion**
- [ ] Tarjetas resumen: no de evaluaciones, promedio general, participacion.
- [ ] Ranking/listado de lideres y tutores con su **ICA (0-100)** y **estado** (Solido/Estable/En riesgo/Datos insuficientes).
- [ ] Filtro por **periodo**.

### DASH-02 — ICA por criterio e indicadores · `Should` · `3 SP`
**Como** Admin **quiero** ver el ICA desglosado por criterio **para** identificar fortalezas y debilidades.

**Criterios de aceptacion**
- [ ] Promedio por categoria/criterio (componentes del ICA) para una persona seleccionada.
- [ ] Indicador de participacion (% de Coders que evaluaron) y nivel de **confianza**.
- [ ] **Datos insuficientes** cuando `n < N_MIN`: no se publica el ICA (se indica explicitamente).

---

## AIFEED

### AIFEED-01 — Resumen de feedback con IA · `Should` · `5 SP`
**Como** Admin **quiero** un resumen en lenguaje natural del feedback de una persona **para** decidir mas rapido.

**Criterios de aceptacion**
- [ ] `GET /metrics/ai-summary?evaluatee_id=...&period_id=...` (solo admin) devuelve texto generado por Claude API.
- [ ] **Regla de privacidad:** el prompt solo incluye agregados anonimizados; nunca `evaluator_id` ni identidades.
- [ ] El resumen se **cachea** (`ai_feedback_cache`); una segunda consulta no vuelve a llamar al modelo.
- [ ] Si falta `ANTHROPIC_API_KEY` o la API falla, responde un mensaje claro (no `500` sin contexto); el dashboard funciona sin IA.

---

## ENTREGA

### DELIV-01 — Despliegue de la app · `Must` · `5 SP`
**Como** equipo **queremos** la app desplegada con URL publica **para** que el jurado pueda usarla durante la sustentacion.

**Criterios de aceptacion**
- [ ] Backend FastAPI desplegado (Render/Railway/Fly) y accesible por HTTPS.
- [ ] Frontend SPA desplegado (Vercel/Netlify/GitHub Pages) y conectado al backend.
- [ ] MySQL hospedado y poblado con el seed (`database/schema.sql`).
- [ ] Variables de entorno configuradas en produccion (`DATABASE_URL`, `JWT_SECRET`, `ANTHROPIC_API_KEY`).
- [ ] README con la URL publica, credenciales de usuarios demo y pasos para correr en local.

### DELIV-02 — Pitch comercial (ingles) · `Must` · `3 SP`
**Como** equipo **queremos** un pitch comercial de 3-5 min en ingles **para** demostrar dominio del idioma y vender el valor del producto.

**Criterios de aceptacion**
- [ ] Slides en ingles con problema, solucion, mercado, diferenciador (IA + ICA) y modelo de negocio.
- [ ] Script escrito y ensayado por **todos** los integrantes (no solo uno).
- [ ] Duracion objetivo: 3-5 min cronometrados.
- [ ] Version exportada (PDF/PPT) en `mockups/` o en el repo.

### DELIV-03 — Pitch tecnico (espanol) · `Must` · `3 SP`
**Como** equipo **queremos** un pitch tecnico de 5-8 min en espanol **para** sustentar arquitectura, logica de negocio y decisiones tecnicas ante los jurados.

**Criterios de aceptacion**
- [ ] Slides en espanol: arquitectura full-stack, modelo de datos (3FN), logica de negocio (ICA, IA), GitFlow.
- [ ] **Demo en vivo** de la app desplegada (login -> evaluar -> dashboard con ICA -> resumen IA).
- [ ] Cada integrante explica una parte (evidencia individual).
- [ ] Version exportada (PDF/PPT) en el repo.

### DELIV-04 — Documento tecnico final · `Must` · `5 SP`
**Como** equipo **queremos** un documento tecnico final consolidado **para** entregar la evidencia escrita que pide la rubrica.

**Criterios de aceptacion**
- [ ] Compila los `/docs` en un solo documento (PDF o Markdown maestro) con: vision, backlog, arquitectura, BD (MER + 3FN), endpoints, logica de negocio, evidencias.
- [ ] Incluye **capturas** de la app desplegada y de las consultas SQL clave.
- [ ] **Mockups finales** (Figma) exportados y enlazados.
- [ ] README actualizado con badges (estado de despliegue, lenguaje, licencia).
- [ ] Casos de prueba / matriz de errores corregidos (evidencias QA).
