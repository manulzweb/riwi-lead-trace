# Plantillas de formulario — diseño

**Fecha:** 2026-07-21
**Historia:** ADMIN-03 (gestión de plantillas de formulario)
**Estado:** aprobado por el equipo, pendiente de plan de implementación

## Problema

El admin necesita crear formularios de evaluación a partir de plantillas reutilizables, y
poder crear y editar esas plantillas. El flujo existe a medias en el árbol de trabajo
(`forms.is_form`, botones "Duplicar" y "Usar Plantilla" en `evaluations.view.js`) pero tiene
dos defectos que lo vuelven inseguro, y le faltan la gestión propia de plantillas y las
plantillas de fábrica.

### Defecto 1 — las plantillas se le cuelan al Coder

`form_repository.get_forms_by_role_id` no filtra `is_active` ni `is_form`; solo ordena por
`id DESC`. `evaluation.service.js` toma `forms[0]`. Resultado: **crear una plantilla la
convierte en el formulario que responden los coders**, porque es la de `id` más alto. La
plantilla no es inerte.

### Defecto 2 — borrar un formulario siempre devuelve 500

`form_service.delete_form` llama `self.repo.delete_form(conn, form_id)`, método que no existe
en `FormRepository`. El `AttributeError` lo captura el `except Exception` genérico del route y
sale como 500.

## Decisiones tomadas

| Decisión | Elegido | Descartado |
|---|---|---|
| Alcance de la plantilla | Reutilizable: `target_role_id` NULL permitido | Atada a un rol (sin tocar esquema) |
| Ubicación en la UI | Pestañas dentro de `/admin/evaluations` | Route propia; chip de filtro |
| Pesos en plantillas | Deben sumar 100 igual que un formulario vivo | Plantilla como borrador desbalanceado |
| Eliminar | Condicional: borra si no se usó, archiva si tiene historial | Archivar siempre; archivar + purga manual |
| Nombre de la bandera | Renombrar `is_form` → `is_template` | Dejarlo como está |

`is_form = TRUE` significaba "es una plantilla" — el nombre decía lo contrario de lo que hace.
Se renombra porque esta feature toca todos esos call sites igual.

## Modelo de datos

`database/01_ddl.sql`, tabla `forms`:

```sql
target_role_id INT NULL,              -- era NOT NULL
is_template    BOOLEAN NOT NULL DEFAULT FALSE,   -- era is_form
archived_at    TIMESTAMP NULL,        -- nueva
CONSTRAINT chk_form_role_required
    CHECK (is_template = TRUE OR target_role_id IS NOT NULL)
```

El `CHECK` hace que el invariante no dependa del servicio: una plantilla puede no tener rol,
pero **un formulario vivo siempre debe tenerlo**. MySQL 8.0.16+ lo aplica de verdad.

`archived_at` es deliberadamente distinto de `is_active`. `is_active = FALSE` ya lo recibe todo
formulario superado cuando se activa uno nuevo; reusar esa columna escondería de la grilla cada
formulario reemplazado, que no es la intención.

**Sin ruta de migración.** El equipo retiró los scripts de migración a propósito. La única ruta
soportada es recrear: `01 → 02 → 03 (opcional) → 04`. En Railway eso borra los datos: `mysqldump`
antes.

## Backend

### `GET /forms` — dos parámetros, ambos seguros por defecto

El endpoint sirve a dos consumidores con necesidades opuestas: el Coder quiere *el formulario
vivo*, el Admin quiere *todo*.

| Parámetro | Valores | Default |
|---|---|---|
| `kind` | `form` \| `template` \| `all` | `form` |
| `archived` | `exclude` \| `include` | `exclude` |

| Consumidor | Llamada | Devuelve |
|---|---|---|
| Coder, evaluar | `?target_role=tutor` | solo `is_template=FALSE AND is_active=TRUE` |
| Grilla admin | `?kind=all` | todo menos archivados |
| Historial del Coder | `?kind=all&archived=include` | todo, para resolver títulos |

Quien olvide pasar los parámetros obtiene la respuesta más restrictiva, nunca una fuga. Esa es
la propiedad que cierra el defecto 1. `target_role` pasa a ser opcional, porque una plantilla
puede no tener rol.

### `delete_form` — condicional, con la FK como autoridad

```
delete_form(form_id):
  existing = get_form_by_id(form_id)            -> 404 si no existe
  if not existing.is_template: _assert_no_active_period()   # regla 6, sin cambios
  usage = count_evaluations_for_form(form_id)
  if usage == 0:
      try:  delete_questions_for_form() -> delete_form()    # desaparece de verdad
      except IntegrityError: archivar                       # la FK manda
  else:
      archivar (archived_at = NOW(), is_active = FALSE)
```

El servicio cuenta evaluaciones para decidir, pero **no confía en el conteo**: si el `DELETE`
igual viola una FK (por un `evaluation_details` que apunte a una pregunta versionada, o por una
carrera entre el `SELECT` y el `DELETE`), captura `IntegrityError` y archiva. Mismo criterio que
la regla 2 con `uq_submission_once`: la base de datos es la autoridad final. El peor caso es "se
archivó cuando esperabas que se borrara", nunca "se perdió historial".

La cadena de FKs ya garantiza esto por construcción:

```
evaluation_details.question_id -> questions   ON DELETE RESTRICT
questions.form_id              -> forms       ON DELETE RESTRICT
evaluations.form_id            -> forms       ON DELETE RESTRICT
```

Un formulario con evaluaciones es **físicamente imposible de borrar**. MySQL lo rechaza.

Requiere tres métodos nuevos en `FormRepository`: `count_evaluations_for_form`,
`delete_questions_for_form` y `delete_form` — este último es el que hoy se invoca y no existe
(defecto 2), así que se arregla como parte de esto.

**Cambia el contrato del route:** `DELETE /forms/{id}` pasa de `204 No Content` a `200` con
`{action: "deleted"|"archived", evaluations_count: N}`. Sin ese cuerpo la UI no puede distinguir
qué ocurrió y tendría que mostrar un mensaje genérico que no siempre sería cierto.

### Schemas

`FormCreate.target_role: Optional[str]` con un `model_validator`: obligatorio y dentro de
`EVALUABLE_ROLES` cuando `is_template = False`; libre cuando es plantilla.
`FormOut.target_role_id: Optional[int]`, más `is_template` y `archived_at`.

La validación de suma 100 en `_validate_creation_payload` se mantiene para plantillas y
formularios por igual.

### Sin endpoint de instanciación

Se evaluó `POST /forms/{id}/instantiate` y se descartó. `POST /forms` ya corre dentro de
`engine.begin()` y ya llama `deactivate_forms_for_role`, así que instanciar una plantilla desde
el builder **ya es atómico**. Un endpoint nuevo duplicaría esa lógica y le quitaría al admin la
oportunidad de ajustar preguntas antes de activar.

## Frontend

### `evaluations.view.js` — pestañas

Un solo `GET /forms?kind=all` al cargar; el resultado se parte en dos listas por `is_template` y
cada pestaña (`Formularios` | `Plantillas`) renderiza la suya. El botón "+ Nuevo" preselecciona
el checkbox según la pestaña activa, así que crear una plantilla no depende de que el admin
recuerde marcarlo. Las tarjetas de plantilla muestran `Cualquier rol` cuando `target_role_id` es
`NULL`. El checkbox `is-form-checkbox` pasa a `is-template-checkbox`; la insignia "Formulario
base" pasa a "Plantilla".

El mensaje tras eliminar usa el `action` de la respuesta: "Formulario eliminado" o "Archivado:
tiene N evaluaciones". No se muestra un genérico.

### "Usar Plantilla" con rol obligatorio

Al instanciar una plantilla sin rol, el selector de rol queda **vacío y obligatorio**. Validación
en cliente por UX; la autoridad es el `model_validator` de Pydantic (422) y detrás el `CHECK` de
MySQL.

### `forms.service.js`

`getForms()` hoy hace fan-out sobre `['team_leader','tutor']` en paralelo, lo que con plantillas
de rol `NULL` **nunca las encontraría**. Se reemplaza por una sola llamada `?kind=all`: una
petición en vez de dos y cierra el hueco. `createForm` manda `is_template` y `target_role`
opcional. `deleteForm` devuelve el cuerpo de la respuesta para que la vista elija el mensaje.

`my-evaluations.view.js` (línea ~170, `formsMap.get(evaluation.form_id)`) pasa a pedir
`?kind=all&archived=include`, para que el historial del Coder no pierda los títulos de
formularios archivados.

`evaluation.service.js` no se toca: el default seguro de `kind` ya lo protege.

## Seed (`database/02_dml.sql`)

Dos plantillas de fábrica con `target_role_id = NULL`, `is_template = TRUE`, para que el admin
tenga de dónde partir sin haber creado ninguna. Ambas nacen balanceadas, así que instanciarlas
produce un formulario válido sin reponderar.

| Plantilla | Composición |
|---|---|
| Acompañamiento y liderazgo | 5 escala × 20 pts = 100 (Comunicación efectiva, Alineación de expectativas, Cercanía individual, Disponibilidad e interacción, Fomento de la independencia) + 1 abierta |
| Claridad técnica y didáctica | 5 escala × 20 pts = 100 (Claridad y organización, Verificación de comprensión, Valor del aprendizaje, Desarrollo profesional, Comunicación efectiva) + 1 abierta |

## Pruebas (pytest, contra `.env.test`)

Cubren reglas de negocio, no CRUD:

- Plantilla **no** aparece en `GET /forms?target_role=X` — regresión del defecto 1
- `DELETE` de formulario sin uso → `action: "deleted"`, la fila desaparece de la BD
- `DELETE` de formulario con evaluaciones → `action: "archived"` **y las evaluaciones siguen
  consultables** — la garantía central de la feature
- Archivado ausente en `?kind=all`, presente en `?kind=all&archived=include`
- Formulario vivo sin `target_role` → 422; plantilla sin `target_role` → 201
- Instanciar una plantilla desactiva el formulario vivo anterior de ese rol
- Plantilla editable con periodo activo; formulario vivo **no** (regla 6)
- Pesos ≠ 100 rechazados, también en plantilla

Las pruebas corren contra la BD de `.env.test`. No relajar el guard de `conftest.py`.

## Documentación a actualizar

- `CLAUDE.md`: contrato REST de `/forms`, el rename `is_form` → `is_template`, semántica de
  borrado condicional
- `docs/06-arquitectura.md`
- `docs/07-base-de-datos.md`

## Riesgos

1. **Recrear la BD borra los datos.** Railway necesita `mysqldump` antes. No hay migración y no
   se debe escribir una por cuenta propia.
2. **`04_views.sql` debe re-ejecutarse en Railway** de todos modos — según `CLAUDE.md` ya estaba
   pendiente por el `>= 3` hardcodeado en `vw_period_metrics`.
3. **`evaluations.view.js` ya tiene 910 líneas** y esta feature le suma. No se refactoriza en
   este alcance, pero si las pestañas lo empujan mucho más, extraer el builder a un componente
   es el siguiente paso natural.
4. **Hay cambios sin commitear** en `evaluations.view.js` en el árbol de trabajo. Hay que
   integrarlos o descartarlos antes de empezar, no trabajar encima a ciegas.
