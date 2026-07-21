---
name: desarrollando-el-frontend
description: Úsalo al crear, modificar o "mejorar" cualquier archivo de frontend/src en Riwi LeadTrace — vistas, componentes, services, router o estilos. Cubre el contrato render/setup, los helpers ya existentes que no debes reinventar, los estados obligatorios de carga/vacío/error, y la disciplina de alcance para peticiones vagas del tipo "mejora esta vista".
---

# Desarrollando el frontend (SPA Vanilla)

La SPA es **HTML5 + CSS3 + JS Vanilla (ES Modules)** con Tailwind v4 y Vite. **Prohibido React,
Angular, Vue** o cualquier framework de UI (cuenta también SurveyJS y similares para formularios).

**Principio central:** casi todo lo que vas a necesitar **ya existe** en `components/` o `utils/`.
El fallo más caro de este repo no es escribir mal código nuevo — es **rehacer a mano un helper que
ya estaba**, o **imitar un defecto** porque el archivo de al lado lo tiene.

## Antes de escribir: consulta el inventario

Verificado contra el código. Si tu tarea toca algo de esta tabla, **importa el helper, no lo
reescribas**.

| Necesitas | Usa | De |
|---|---|---|
| Escapar datos de API antes de `innerHTML` | `escapeHtml(str)` | `utils/validators.js` |
| Reglas de validación de campo | `getEmailRules`, `getPasswordRules`, `getNameRules`, `getTitleRules`, `getDescriptionRules` | `utils/validators.js` |
| Validar fechas | ⚠️ **`getDateRules` tiene un bug abierto** — ver defectos conocidos. Compara strings `YYYY-MM-DD` directamente | — |
| Mostrar/limpiar error inline de un input | `showFieldError(input, msg, errorEl)` / `clearFieldError(input, errorEl)` | `utils/formUtils.js` |
| Validar mientras se escribe | `createDebouncedValidator(input, errorEl, rules, delay)` | `utils/formUtils.js` |
| Validar al hacer submit | `validateSync(input, errorEl, rules)` | `utils/formUtils.js` |
| Botón en estado "Guardando..." + disabled | `setButtonLoadingState(btn, isLoading, loadingText, originalText)` — al salir de carga restaura el markup que el botón tenía (conserva el `<svg>` del icono). `originalText` es solo el **fallback** para cuando se resetea un botón que nunca pasó por carga | `utils/formUtils.js` |
| Notificación efímera | `showToast(title, icon, text)` — `icon`: `success`\|`error`\|`warning`\|`info` | `components/alerts.js` |
| Confirmar una acción destructiva **cuando el equipo ya pidió esa confirmación** | `await showConfirm(title, html, icon)` → `boolean` | `components/alerts.js` |
| Error bloqueante (modal, no toast) | `showError(title, text)` | `components/alerts.js` |
| Select estilizado | `dropdownComponent(id, options, selected, placeholder)` + `setupDropdown(id, onChange)` | `components/dropdown.js` |
| Estado vacío de una lista | `emptyStateComponent(title, message, actionLabel?, actionHref?)` — **argumentos posicionales, no un objeto**. El botón solo se pinta si pasas `actionLabel` **y** `actionHref` (falta uno → sin botón). No existe `actionId`. Llamarlo con un objeto no lanza error: renderiza `[object Object]` como título | `components/emptyState.js` |
| Badge de rol | `badgeComponent(role)` | `components/badge.js` |
| Badge de estado | `statusBadgeComponent({ status, variant })` — `variant`: `text`\|`dot` | `components/statusBadge.js` |
| Barra superior | `navBarComponent()` — el router ya llama `setupNavBar()` por ti | `components/navbar.js` |

**Subutilizados, a propósito de aviso:** `showError` y `getTitleRules` no los usa **ninguna** vista
todavía. Que estén sin usar no significa que estén mal — significa que las vistas siguientes los
ignoraron y rehicieron el trabajo a mano. `emptyStateComponent` sí está adoptado ya en la mayoría de
las vistas con listas, y el toolkit de `formUtils` lo usan `views/auth/login.js` y
`views/admin/settings.view.js`. Si tu vista tiene formulario, **`login.js` es el modelo a copiar**,
no `periods.view.js`.

## El contrato render/setup

Toda vista exporta **exactamente dos funciones**, y `router/routes.js` las conecta:

```js
// views/admin/periods.view.js
export const renderAdminPeriods = () => `...template string...`;  // → route.renderView
export const setupAdminPeriods = () => { /* listeners + carga de datos */ };  // → route.initSetup
```

Cómo lo ejecuta `router/router.js`:

1. `app.innerHTML = await route.renderView()` — **destruye el DOM anterior**.
2. `setupNavBar()`.
3. `route.initSetup()`.

Consecuencias que **debes** respetar:

- `render*` devuelve un string y **no toca el DOM ni llama a la API**. Nada de `document.getElementById`
  dentro de `render*`.
- `setup*` corre **después** de que el HTML está en el DOM. Ahí van `addEventListener` y el `await` de datos.
- **Los listeners sobre `document` o `window` se acumulan.** `innerHTML` limpia los listeners de los
  nodos que reemplaza, pero no los de `document`. Si registras uno global (ej. `keydown` para cerrar
  un modal con Escape), **quítalo** cuando el modal se cierre. Sin eso, cada navegación añade otro.
- Registrar `renderX`/`setupX` en `routes.js` con `requireAuth` y `allowedRoles` **no es seguridad**
  — sin JWT el backend confía en lo que manda el front. Es conveniencia de UX. No lo describas como
  control de acceso.

## Capa de services: la única que habla con la API

Las vistas **nunca** llaman `fetch`. Los services **nunca** tocan el DOM.

```js
// services/periods.service.js — el patrón completo, no hay más
import { request, jsonOptions } from './api.service.js'

const get    = async ()           => await request('/periods')
const create = async (data)       => await request('/periods', jsonOptions('POST', data))
const update = async (id, data)   => await request(`/periods/${id}`, jsonOptions('PUT', data))

export const periodService = { get, create, update }
```

Un archivo por recurso, funciones sueltas, un objeto exportado al final. La sesión vive en
`authService` (`getSession`/`setSession`/`clearSession` sobre `localStorage`), **no hay store pub/sub**.

### Distinguir errores del backend

`request()` lanza un `ApiError` con `status` y `detail` ya extraídos. **Úsalos** — no inspecciones
el texto del mensaje:

```js
try {
  await periodService.create(data);
} catch (err) {
  if (err.status === 409) {
    showToast("Ya hay un ciclo activo", "warning", err.detail);
  } else {
    showToast("Error al crear el ciclo", "error", err.detail);
  }
}
```

`err.detail` trae el mensaje del `HTTPException` de FastAPI, y en los 422 junta los `msg` de
Pydantic. Puede venir vacío si la respuesta no traía JSON, así que **no lo uses como único texto**
de un mensaje al usuario: acompáñalo siempre de una frase propia.

> El patrón viejo `err.message.includes("404")` ya **no queda en ninguna parte** del front: la
> migración a `err.status` / `err.detail` está completa. No lo reintroduzcas.

### Dónde poner constantes y helpers de markup

Las clases Tailwind repetidas y los trozos de markup por estado van como **constantes y funciones a
nivel de módulo dentro del propio archivo de vista**, encima de `renderX`:

```js
const INPUT_CLASSES = "w-full rounded-xl border ...";
const renderError = () => `...`;
export const renderAdminPeriods = () => `...`;
```

Súbelo a `components/` solo cuando **una segunda vista** lo necesite. No crees un componente
compartido para un solo uso.

## Los tres estados son obligatorios

Toda vista que carga datos maneja **carga, vacío y error**. Saltarse el de error es el descuido más
frecuente: deja los skeletons pulsando para siempre cuando la red falla.

```js
const load = async () => {
  try {
    const items = await someService.get();
    if (!Array.isArray(items) || items.length === 0) { box.innerHTML = renderEmpty(); return; }
    box.innerHTML = items.map(itemMarkup).join("");
  } catch (err) {
    // El estado de error va EN EL CONTENEDOR y ofrece reintentar.
    // Un toast solo no basta: dura 3s y deja la pantalla rota.
    box.innerHTML = renderError();
    document.getElementById("btn-retry")?.addEventListener("click", load);
  }
};
```

El skeleton inicial va en el string de `render*` (Tailwind `animate-pulse`), para que se vea antes de
que `setup*` resuelva el `await`.

## Seguridad al interpolar

Todo dato que venga del backend o del usuario y entre en un template pasa por `escapeHtml`.

```js
`<h3>${escapeHtml(p.name)}</h3>`   // ✅
`<h3>${p.name}</h3>`               // ❌
```

Aplica también a **SweetAlert2**: `showConfirm(title, html)` renderiza `html` como HTML. Un nombre
de periodo sin escapar ahí se ejecuta igual.

Hoy **todas** las vistas que meten datos de API en un `innerHTML` pasan por `escapeHtml`, y los
componentes compartidos que reciben datos (`dropdown.js`, `emptyState.js`, `navbar.js`, `sidebar.js`)
también escapan por dentro. Las pocas vistas que no importan `escapeHtml` es porque no lo necesitan:
o no interpolan datos de API (`login.js`, `notFound.js`), o los escriben con `textContent`
(`evaluate.view.js`), o son un re-export de una línea (`tutor/my-results.view.js`). **Mantén la
racha:** el helper que rompa esto será el próximo agujero.

Ojo con `escapeHtml` en un `href`: no basta. `javascript:alert(1)` no tiene ningún carácter que
escapar y se ejecuta igual al hacer clic — hay que validar el **esquema** (ver `toSafeHref` en
`components/emptyState.js` como referencia).

## Estilos: tokens, no colores sueltos

Los colores viven como custom properties en `styles/global.css` y cambian solos en dark mode
(`html.dark`). Úsalos vía Tailwind arbitrary values:

```html
<div class="bg-[var(--bg-panel)] text-[var(--text-main)] border-[var(--border-main)]">
<button class="bg-[var(--brand-bg)] text-[var(--brand-text)] hover:bg-[var(--brand-hover)]">
```

Tokens disponibles: `--bg-base`, `--bg-panel`, `--bg-sidebar`, `--text-main`, `--text-muted`,
`--border-main`, `--brand-bg`, `--brand-hover`, `--brand-text`, `--danger-bg`, `--danger-hover`,
`--danger-text`, `--danger-border`. Tipografías: `font-body` (Open Sans), `font-heading` (Rubik).

Un `bg-white` o `text-slate-900` a pelo **se rompe en dark mode**. Si necesitas un color que no
existe como token, añádelo a `global.css` en `:root` **y** en `html.dark` — no lo hardcodees.

## Requisitos de la rúbrica que se evalúan en el front

- **Responsive mobile-first.** Escribe la base para móvil y sube con `sm:`/`md:`/`lg:`. Un
  `grid-cols-2` sin prefijo queda apretado en 360px — usa `grid-cols-1 sm:grid-cols-2`.
- **Validación en cliente.** Es UX, no autoridad: el servidor valida con Pydantic igual. Nunca
  presentes la validación de cliente como la que protege la regla de negocio.
- **Accesibilidad básica.** `<label for>` ligado a `id`; modales con `role="dialog"`, `aria-modal`,
  Escape y foco al primer campo; SVG decorativos con `aria-hidden="true"`; contenedores que se
  llenan por fetch con `aria-live`.
- **Lógica de negocio visible.** La SPA refleja reglas reales (ICP, periodo activo único, anonimato,
  no-duplicado). Si tu cambio hace que una regla quede invisible o parezca CRUD plano, dilo.
- **Autoría sustentable.** Cada integrante debe poder explicar su código en la sustentación. Esto
  restringe el *tamaño* de lo que entregas — ver la sección siguiente.

## Disciplina de alcance en peticiones vagas

Esta es la parte respaldada por pruebas: ante un "mejora esta vista", un agente sin guía convirtió
un archivo de **205 líneas en 584 de una sola pasada** y añadió comportamiento de producto que nadie
pidió (un checkbox nuevo, un banner, un botón renombrado).

Cuando la petición sea vaga ("mejora", "arregla", "pon bonito esto"):

1. **Lee la vista y lista lo que encontraste**, clasificado: *bug* / *inconsistencia* / *accesibilidad*
   / *decisión de producto*.
2. **Presenta la lista y deja que el equipo elija** antes de escribir. "Mejorar" no es autorización
   para reescribir.
   **Si no hay nadie a quien preguntar** (corrida no interactiva, subagente): no te bloquees ni
   entregues solo una lista. Aplica la clase segura — bugs, inconsistencias, accesibilidad, DRY —,
   **difiere la clase de producto** y reporta ambas por separado en tu resumen final.
3. **Los bugs y las inconsistencias los puedes arreglar.** Las **decisiones de producto no**: añadir
   un campo, cambiar un default, renombrar una acción visible, agregar un borrado **o introducir un
   diálogo de confirmación donde no había** son del equipo. Propónlas, no las implementes — aunque
   el helper para hacerlo exista y esté sin usar. Que `showConfirm` esté disponible no autoriza a
   cambiar un flujo de un clic a dos.
4. **Entrega en incrementos que alguien pueda sustentar.** Varios cambios pequeños y explicados
   valen más que un rewrite correcto que nadie del equipo puede defender.
5. **Un defecto en una capa compartida se reporta, no se parchea localmente.** Si `api.service.js`
   te estorba, no metas un workaround en tu vista: dilo.

## Defectos conocidos del repo — no los imites

Verificados hoy. Si tu tarea los toca, arréglalos de raíz o repórtalos; **no los propagues**.

| Defecto | Dónde | Qué hacer |
|---|---|---|
| **`getDateRules` rechaza la fecha de hoy.** Hace `new Date("2026-07-19")` (medianoche **UTC**) y lo compara contra medianoche **local**; en Colombia (UTC-5) hoy queda "antes de hoy" | `utils/validators.js` | **No lo uses todavía.** Compara los strings `YYYY-MM-DD` con `<`/`>=` — son lexicográficamente ordenables y no necesitan `Date`. Arreglarlo es cambio de capa compartida. |
| `hasDangerousChars` usa `/[<>&|\/]/`, que no detecta `alert("xss")`; su test lo espera y **falla** | `utils/validators.js` + `validators.test.js` | Test rojo preexistente. No es tu regresión; no lo "arregles" cambiando la aserción sin el equipo. La defensa real es `escapeHtml` al interpolar. |
| `views/tutor/my-results.view.js` es un re-export de 1 línea de la vista de team-leader, sin importadores (`routes.js` apunta directo a `team-leader/`) | `router/routes.js` | Alias inofensivo, **no** es código stale. No lo borres por tu cuenta. |
| `views/auth/login.js` rompe la convención `*.view.js` | — | No renombres por tu cuenta (rompe imports); sí nombra los archivos **nuevos** como `*.view.js`. |
| `CLAUDE.md` describe `store/` y `config/` en el front, que **no existen** | — | El código real manda. No inventes esas capas. |

## Errores comunes

| Error | Por qué falla |
|---|---|
| Llamar `fetch` desde una vista | Rompe la capa de services; duplica la URL base y el manejo de errores |
| Tocar el DOM dentro de `render*` | El HTML aún no está montado; `getElementById` devuelve `null` |
| `e.target.dataset.id` en un botón con icono | El click cae en el `<svg>` y `dataset` sale `undefined`. Usa `e.target.closest("[data-id]")` |
| Un listener por fila tras un `.map()` | N listeners que hay que recrear en cada render. Delega uno en el contenedor |
| Listener global sin quitar | El router re-ejecuta `setup*` en cada navegación y se acumulan |
| Sin guard de doble submit | Doble clic = dos POST = dos registros. Usa `setButtonLoadingState` |
| Interpolar fechas `YYYY-MM-DD` con `new Date(...)` | Se parsea como UTC y en Colombia (UTC-5) muestra el día anterior |
| Colores Tailwind literales | Se rompen en dark mode; usa los tokens |

## Checklist antes de dar por terminada una vista

- [ ] Exporta `renderX` (string puro) y `setupX` (efectos), y está en `routes.js` con sus `allowedRoles`
- [ ] Cero `fetch` fuera de `services/`
- [ ] Revisé el inventario de helpers antes de escribir uno nuevo
- [ ] Todo dato interpolado pasa por `escapeHtml` (incluido el `html` de SweetAlert)
- [ ] Maneja carga, vacío **y error con reintento**
- [ ] Colores solo con tokens; se ve bien en claro y oscuro
- [ ] Mobile-first verificado a ~360px
- [ ] Labels ligadas; modal con `role`/`aria-modal`/Escape/foco
- [ ] Sin listeners globales huérfanos; sin doble submit
- [ ] El tamaño del cambio es sustentable por un integrante
