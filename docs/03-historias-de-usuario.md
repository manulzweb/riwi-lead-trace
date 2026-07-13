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
- [ ] El Admin ve dashboard, ICP, resumenes IA e historico.
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
- [ ] Si **no hay periodo activo**, se muestra el estado vacio **"No hay formularios por realizar"**
      (componente `emptyState`) en lugar de la lista, y no se puede iniciar ninguna evaluacion.

### EVAL-02 — Evaluar Team Leader · `Must` · `5 SP`
**Como** Coder **quiero** completar un formulario estructurado para evaluar a un Team Leader **para** retroalimentar su acompanamiento.

**Criterios de aceptacion**
- [ ] Formulario con criterios por categoria y escala (p.ej. 1-5) + comentario opcional. Las
      preguntas se cargan desde la API (plantilla + preguntas **activas**), nunca hardcodeadas.
- [ ] **Experiencia interactiva "una pregunta a la vez"** (estilo Typeform) construida en
      **JS Vanilla + CSS** (sin paquetes de formularios): se muestra una pregunta por pantalla,
      con barra de progreso, navegacion adelante/atras y transiciones suaves.
- [ ] Navegable 100% por teclado (Enter avanza, las opciones de escala se eligen con teclado).
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
- [ ] **Regla de negocio:** rechaza (`409`) el registro/envio si **no hay periodo activo**; los
      borradores existentes no se pierden, pero no pueden enviarse hasta que el Admin reabra un periodo.
- [ ] Manejo de errores de red con reintento y mensaje claro.
- [ ] Tras enviar, la persona evaluada aparece como "ya evaluada".

---

## ADMIN

### ADMIN-01 — Gestion del periodo de evaluacion · `Must` · `3 SP`
**Como** Admin **quiero** activar o cerrar el periodo de evaluacion **para** controlar cuando los
Coders pueden ver y responder los formularios.

**Criterios de aceptacion**
- [ ] Vista de admin con la lista de periodos y su estado (activo/cerrado), con accion de
      activar/cerrar (`PATCH /periods/:id`, solo rol `admin` via `require_role`).
- [ ] **Regla de negocio:** solo puede existir **un periodo activo a la vez**; al activar uno, el
      backend desactiva cualquier otro (transaccional).
- [ ] Con el periodo **cerrado**, los Coders ven el estado vacio **"No hay formularios por
      realizar"** y el backend rechaza envios (`409`) — la SPA sola no es la autoridad.
- [ ] Con el periodo **activo**, el flujo de evaluacion funciona normal (listar evaluables,
      formulario, envio).
- [ ] Confirmacion antes de cerrar un periodo (accion con efecto global sobre los Coders).

### ADMIN-02 — Editar preguntas del formulario (version minima) · `Should` · `3 SP`
**Como** Admin **quiero** ajustar el texto de las preguntas y activarlas/desactivarlas **para**
mejorar el formulario entre rondas sin depender del equipo tecnico.

**Criterios de aceptacion**
- [ ] Vista de admin que lista las plantillas (TL / Tutor) con sus preguntas, mostrando categoria
      y estado (activa/inactiva). Solo rol `admin`.
- [ ] Puede **editar el texto** de una pregunta y **activarla/desactivarla** (`PATCH /questions/:id`).
      **No** puede cambiar la categoria, el tipo, ni crear/eliminar plantillas (eso es v2).
- [ ] **Regla de negocio (integridad del ICP):** editar solo esta permitido **con el periodo
      cerrado**; con periodo activo el backend responde `409` (el instrumento se congela dentro
      del periodo).
- [ ] **Regla de negocio (versionado):** editar el texto **no sobrescribe**: crea una pregunta
      nueva (misma categoria y orden) y desactiva la anterior. Las respuestas historicas siguen
      apuntando a la pregunta original con su texto intacto.
- [ ] Las evaluaciones nuevas cargan **solo preguntas activas**; el calculo del ICP agrega por
      **categoria** con pesos fijos, por lo que la edicion de redaccion no altera el indice.
- [ ] **Regla de negocio (anti deriva semantica — "reformular, no re-temar"):** editar el texto
      sirve para mejorar la redaccion **dentro de la misma categoria**. Una pregunta **no se
      convierte** en una de otro tema: si el admin necesita preguntar otra cosa, **desactiva** la
      pregunta actual y la nueva se crea en su categoria correcta (creacion = v2/equipo). Si esto
      no se respeta, las respuestas futuras se ponderarian bajo la categoria equivocada.
- [ ] La UI del editor refuerza la regla: muestra de forma prominente la **categoria y su
      definicion de una linea** (ej. *"Estas editando una pregunta de Cercania individual: mide si
      el coder se siente tratado con respeto y en confianza"*) y el **texto anterior** como
      referencia mientras se edita.
- [ ] **Reversibilidad garantizada:** como la edicion solo ocurre con periodo cerrado y versiona,
      una edicion desviada se corrige **antes de reabrir**: se desactiva la version mala y se
      reactiva la original. Ninguna respuesta llega a registrarse contra una pregunta desviada.
- [ ] **Chequeo de coherencia con IA:** al guardar una edicion, el backend pide a Claude validar
      si el texto nuevo sigue midiendo su categoria (via `ai_service`; solo se envia el texto de
      la pregunta y la definicion de la categoria — ningun dato personal). Si la IA detecta que la
      pregunta se salio de su categoria, el admin ve una **advertencia clara** y debe **confirmar
      explicitamente** para guardar de todos modos (la IA advierte y exige confirmacion; la
      decision final es humana).
- [ ] Si la IA no esta disponible (sin `ANTHROPIC_API_KEY` o error de la API), la edicion
      funciona igual **sin el chequeo** (degradacion elegante, mismo patron que AIFEED-01).

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
**Como** Admin **quiero** un panel con resultados agregados y el **ICP** **para** entender rapidamente la calidad del acompanamiento.

**Criterios de aceptacion**
- [ ] Tarjetas resumen: no de evaluaciones, promedio general, participacion.
- [ ] Ranking/listado de lideres y tutores con su **ICP (0-100)** y **estado** (Solido/Estable/En riesgo/Datos insuficientes).
- [ ] Filtro por **periodo**.

### DASH-02 — ICP por criterio e indicadores · `Should` · `3 SP`
**Como** Admin **quiero** ver el ICP desglosado por criterio **para** identificar fortalezas y debilidades.

**Criterios de aceptacion**
- [ ] Promedio por categoria/criterio (componentes del ICP) para una persona seleccionada.
- [ ] Indicador de participacion (% de Coders que evaluaron) y nivel de **confianza**.
- [ ] **Datos insuficientes** cuando `n < N_MIN`: no se publica el ICP (se indica explicitamente).

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
- [ ] Slides en ingles con problema, solucion, mercado, diferenciador (IA + ICP) y modelo de negocio.
- [ ] Script escrito y ensayado por **todos** los integrantes (no solo uno).
- [ ] Duracion objetivo: 3-5 min cronometrados.
- [ ] Version exportada (PDF/PPT) en `mockups/` o en el repo.

### DELIV-03 — Pitch tecnico (espanol) · `Must` · `3 SP`
**Como** equipo **queremos** un pitch tecnico de 5-8 min en espanol **para** sustentar arquitectura, logica de negocio y decisiones tecnicas ante los jurados.

**Criterios de aceptacion**
- [ ] Slides en espanol: arquitectura full-stack, modelo de datos (3FN), logica de negocio (ICP, IA), GitFlow.
- [ ] **Demo en vivo** de la app desplegada (login -> evaluar -> dashboard con ICP -> resumen IA).
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
