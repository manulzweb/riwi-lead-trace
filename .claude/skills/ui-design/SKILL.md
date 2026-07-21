---
name: ui-design
description: Sistema de diseño de la SPA de Riwi LeadTrace (frontend/). Úsalo siempre que vayas a crear o modificar una vista/componente del frontend — variables CSS y paleta a reutilizar, patrones existentes de loading/empty/error state, y reglas de responsive/accesibilidad del MVP. No decide arquitectura visual nueva: documenta y hace cumplir lo que el equipo ya construyó en frontend/src/styles/global.css.
---

# UI Design (sistema de diseño de la SPA)

Este skill documenta el sistema de diseño **que ya existe** en `frontend/src/styles/global.css` y
en las vistas de `frontend/src/views/`, para que toda vista nueva o modificada se vea consistente
con el resto de la app. No inventa un sistema nuevo: si necesitas un patrón que no está aquí,
créalo siguiendo el modo **guía generativa** (`.claude/skills/guia-generativa/SKILL.md`) —
propónlo al equipo, no lo decidas solo.

## Stack real

Tailwind v4 (`@import "tailwindcss"` en `global.css`) + **variables CSS** para temas claro/oscuro
(`:root` / `html.dark`), mapeadas a `@theme` para poder usarlas como utilidades Tailwind. Google
Fonts: `Open Sans` (cuerpo, `--font-body`) y `Rubik` (encabezados, `--font-heading`, aplicada
automáticamente a `h1`–`h6` y `.font-heading`).

## Paleta y variables (usar siempre estas, nunca hex sueltos)

Definidas en `frontend/src/styles/global.css`. Se aplican como clases arbitrarias de Tailwind:
`bg-[var(--bg-panel)]`, `text-[var(--text-main)]`, `border-[var(--border-main)]`, etc.

| Variable | Uso |
|---|---|
| `--bg-base` | Fondo de página |
| `--bg-panel` | Fondo de tarjetas/paneles (`bg-panel`) |
| `--bg-sidebar` | Fondo del sidebar |
| `--text-main` | Texto principal |
| `--text-muted` | Texto secundario/metadata |
| `--border-main` | Bordes por defecto |
| `--brand-bg` / `--brand-hover` / `--brand-text` | Color de marca (botones primarios, acentos) |
| `--danger-bg` / `--danger-hover` / `--danger-text` / `--danger-border` | Estados de error/peligro |

No hardcodees `#fff`, `gray-200`, etc. en vistas nuevas — usa la variable equivalente para que el
modo oscuro (`html.dark`) funcione automáticamente. Los únicos colores "crudos" aceptables son los
semánticos de estado que no tienen variable propia (ej. verde/ámbar/rojo de badges de ICP en
`dashboard.view.js` y `evaluations.view.js` vía `bg-emerald-50 dark:bg-emerald-950/20`, etc.) —
sigue ese mismo patrón (`clase-clara dark:clase-oscura`) si necesitas un color semántico nuevo.

## Patrones de estado (replícalos igual en toda vista)

Toda vista que haga fetch de datos debe cubrir **loading, empty y error** — ver
`frontend/src/views/admin/periods.view.js` y `metrics.view.js` como referencia canónica.

**Loading (skeleton):** un placeholder con la forma real del contenido, puesto directamente en el
HTML estático de la vista (no inyectado por JS), reemplazado cuando llega la data:
```html
<div class="h-24 animate-pulse rounded-3xl bg-[var(--bg-panel)]"></div>
```
Repite el número de skeletons que aproxime el contenido real (2-3 tarjetas, no una barra genérica).

**Empty state:** ícono + título + descripción corta, centrado:
```html
<section class="rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-panel)] p-12 text-center shadow-sm">
  <div class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[var(--bg-base)] text-[var(--brand-bg)] mb-4">
    <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">...</svg>
  </div>
  <h3 class="text-xl font-bold text-[var(--text-main)]">No hay X</h3>
  <p class="mt-2 text-[var(--text-muted)] max-w-md mx-auto">Explica qué hacer para que aparezca contenido.</p>
</section>
```

**Error state:** `showToast(...)` (de `components/alerts`) **siempre**, más un reemplazo del
contenedor que quedó en skeleton — nunca dejes un `animate-pulse` girando para siempre si el fetch
falló. Usa `--danger-text` para el mensaje inline y, si la acción es reintentable, un botón que
vuelva a llamar la función de carga:
```js
} catch (err) {
  showToast("Error", "error", "No se pudo cargar X.");
  console.error(err);
  container.innerHTML = `<div class="text-center py-8 text-[var(--danger-text)] text-sm">
    No se pudo cargar X. Recarga la página para reintentar.
  </div>`;
}
```

## Responsive y accesibilidad (mínimos del MVP, `docs/09-mvp-alcance.md`)

- **Mobile-first**: clases base sin prefijo para móvil, `sm:`/`md:`/`lg:` para escalar arriba
  (patrón ya usado en todas las vistas admin, ej. `grid gap-4 md:grid-cols-2 lg:grid-cols-3`).
- Controles interactivos con `focus:ring-4 focus:ring-[var(--border-main)]` o equivalente — no
  quites el outline de foco sin reemplazarlo.
- Botones/acciones con texto o `aria-label`, no solo ícono suelto.
- No repliques el formulario "todo junto"; el flujo de evaluación del Coder es **una pregunta a la
  vez** (regla de negocio del MVP, no de este skill) — no la conviertas en un form largo.

## ⚠️ Contradicción a resolver con el equipo (no la corrijas sin confirmación)

`CLAUDE.md` dice que la convención CSS es **BEM + custom properties**. El código real usa
**Tailwind utilitario + variables CSS**, sin ninguna clase BEM (`.block__element--modifier`) en
ninguna vista. Son sistemas incompatibles y hoy `CLAUDE.md` no describe lo que el proyecto hace de
verdad. Antes de tocar `CLAUDE.md`/`docs/08-diseno-tecnico.md` para reflejar Tailwind como
convención real, el equipo debe confirmarlo explícitamente — no es una decisión que la IA deba
tomar unilateralmente (regla de `guia-generativa`).

## Al construir/editar una vista

1. Mira una vista admin existente similar (`periods.view.js` para CRUD simple,
   `evaluations.view.js` para algo con builder/estado complejo) y sigue su mismo patrón de
   estructura, no inventes uno nuevo.
2. Cubre loading + empty + error como arriba.
3. Usa las variables de la tabla de paleta, nunca hex directo.
4. Verifica mobile (~375px) y desktop en el navegador antes de dar la vista por terminada.
