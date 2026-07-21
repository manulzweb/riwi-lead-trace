# 09 — Alcance del MVP

Filosofia: **startup validando una idea**. El MVP debe ser lo minimo para comprobar que el feedback ascendente estructurado (con ICP e IA) aporta valor. Todo lo que no sirva a esa validacion se pospone.

## Dentro del MVP (obligatorio)

| Funcionalidad | Por que es obligatoria |
|---------------|------------------------|
| **Backend FastAPI + MySQL** funcional | Requisito de la rubrica: integracion front + back + persistencia |
| **Logica de negocio** (anonimato, no-duplicado, **ICP**, filtro por rol) | Requisito: no limitarse a CRUD basico |
| Inicio de sesion (hash bcrypt en servidor, **sin JWT**, ver `06-arquitectura.md`) | Sin identidad no hay feedback atribuible ni roles |
| Gestion de roles (Coder, Tutor, TL, Admin; **un usuario puede tener mas de un rol a la vez**) | Define que ve y hace cada usuario |
| Listar Team Leaders y Tutores evaluables | Punto de entrada de la accion principal |
| Evaluar Team Leader (formulario estructurado) | Nucleo de la hipotesis del producto |
| Evaluar Tutor (formulario estructurado) | Completa el alcance del feedback ascendente |
| Feedback anonimo opcional | Clave para obtener feedback honesto (confianza) |
| Registro/persistencia de evaluaciones (API) | Sin datos no hay validacion ni metricas |
| **Gestion del periodo de evaluacion (Admin)** | El Admin activa/cierra la ventana; sin periodo activo los Coders ven "No hay formularios por realizar" (disponibilidad controlada = logica de negocio) |
| **Edicion minima de preguntas (Admin)** | Editar texto y activar/desactivar preguntas, solo con periodo cerrado y con versionado (protege historial e ICP) |
| Historial de evaluaciones (Coder) | Trazabilidad minima para el evaluador |
| Dashboard de resultados (Admin) | Convierte datos en decision; razon de negocio |
| **ICP** e indicadores | Mide calidad del acompanamiento con un indice accionable |
| **Resumen de feedback con IA** (Google Gemini) para el Admin | Diferenciador; sintesis accionable y anonimizada |
| SPA responsive y navegable | Restriccion tecnica + usabilidad basica |
| Despliegue accesible (front + back) | Requisito: app funcional disponible para la sustentacion |
| **Configuracion global** (Admin) | Ajustar desde la UI los umbrales del ICP, la tolerancia de pesos y la temperatura de IA (`system_settings`) en vez de dejarlos hardcodeados |
| **Bitacora basica de acciones administrativas** (Admin) | Trazabilidad minima de acciones sensibles (abrir/cerrar periodo, editar preguntas, borrar categorias), con export a CSV |

**Seguimiento historico (admin)** se incluye como `Should`: aporta a la validacion pero puede recortarse si la capacidad aprieta.

## Fuera del MVP (versiones futuras)

| Funcionalidad | Cuando / por que se pospone |
|---------------|------------------------------|
| Areas / segmentacion multi-area | Simplifica el MVP; la segmentacion se agrega post-validacion |
| Bitacora TL->Tutor (evaluacion descendente) | Excede el feedback ascendente; se agrega como v2 |
| Analitica de talento (ranking de futuros TL) | Requiere volumen de datos y bitacora; post-validacion |
| ICP ponderado y agregado por categoria | El MVP ya pondera por pregunta (`weight_percent`), pero no agrupa el resultado por categoria; alcanza para validar la hipotesis del piloto |
| Mejoras por IA para el evaluado (TL/Tutor) | El MVP entrega IA solo al Admin; el evaluado ve resultados sin IA |
| Visualizacion de tendencias (graficos temporales) | CSV/tabla basica como `Could`; graficos avanzados son futuro |
| Reportes avanzados / exportacion PDF estilizada | CSV/impresion basica como `Could`; lo demas es futuro |
| ~~Editor completo de formularios~~ | Decision revisada: el MVP si incluye crear/desactivar plantillas y preguntas (`POST`/`DELETE /forms`, `POST`/`DELETE /questions`), con tipos `scale`\|`text`\|`yes_no`, para priorizar el trabajo de frontend en curso. Ver `docs/06-arquitectura.md` y `docs/07-base-de-datos.md`. |
| Notificaciones (email/in-app) y recordatorios | No esencial para validar la hipotesis |
| Gestion de usuarios/altas desde la UI (admin) | Se cargan via seed/BD en el MVP |
| Comparativas avanzadas, benchmarking entre cohortes | Requiere volumen de datos; post-validacion |
| Despliegue en contenedores (Docker) y multi-sede | Se aborda en un plan/iteracion aparte |
| Internacionalizacion (i18n) | El piloto es en espanol |
| Auditoria detallada (busqueda avanzada, alertas, purga automatica por retencion) | El MVP ya incluye una bitacora basica de acciones administrativas (`GET /activity-log` + export CSV en `admin_activity_log`); lo que queda fuera es la retencion automatica (el ajuste `log_retention_days` se guarda pero no purga nada) y cualquier busqueda/alerta mas alla del listado cronologico |
| Roles y permisos granulares (mas alla de los 4) | Los 4 roles cubren el piloto |
| App movil nativa / PWA offline | La SPA responsive es suficiente para validar |

## Criterio de exito del MVP

El MVP se considera validado si, durante el piloto, se alcanzan las **metricas de exito** definidas en [`01-vision-y-producto.md`](./01-vision-y-producto.md) (adopcion >=60%, completitud >=80%, y al menos un admin usando el dashboard semanalmente), confirmando que el feedback ascendente genera informacion accionable.

## Requisitos no funcionales (RNF)

Definidos con criterio MVP: suficientes para un piloto confiable, sin sobreingenieria.

| RNF | Que exige | Objetivo verificable |
|---|---|---|
| **Seguridad** | Contrasenas hasheadas (bcrypt); anonimato real y **estructural** (el vinculo evaluador↔contenido no se crea: `evaluation_submissions.evaluation_id = NULL`); **sin JWT** — el rol/ID de quien llama lo manda el propio front y el backend lo confia (filtro de datos, no verificacion criptografica, ver `06-arquitectura.md`); HTTPS en produccion; sanear entradas (evitar XSS). | 0 contrasenas en texto plano; 0 filas de `evaluation_submissions` anonimas con `evaluation_id` distinto de NULL |
| **Escalabilidad** | Frontend desacoplado via contrato REST; arquitectura modular; plantillas de formulario en BD. | — |
| **Rendimiento** | Bundle ligero (Vite, sin frameworks pesados); estados de carga; evitar peticiones redundantes. | FCP < 2s; bundle inicial liviano |
| **Usabilidad** | Responsive mobile-first (>=320px); feedback inmediato (carga/vacio/error/exito); validacion clara por campo. | Completar evaluacion en <=3 clics |
| **Mantenibilidad** | Capas separadas (router/services en front; `routes/ → services/ → repositories/` en back, sin capa `models/` — ver `06-arquitectura.md`); Conventional Commits; docs vivos. | Logica de negocio aislada en `services`, acceso a datos en `repositories` |
| **Accesibilidad** | HTML semantico; navegacion por teclado; contraste WCAG AA; `aria-*` donde falte semantica. | Navegable 100% por teclado; contraste AA |
