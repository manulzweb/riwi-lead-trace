# Plan de migración a Exception Handlers globales

**Fecha:** 2026-07-22
**Estado:** auditoría completa, implementación NO iniciada (deliberado)

Documento preparatorio. No se cambió ningún comportamiento: es el análisis previo
para poder migrar a handlers globales sin romper el contrato HTTP.

## Estado actual

40 clases de excepción en 8 módulos, cada una con una clase base propia
(`FormException`, `UserException`, …) que hereda directamente de `Exception`.
No existe una raíz común.

Los routes traducen a HTTP a mano: **34 bloques `try/except`**, uno por endpoint.

## Conflictos encontrados

### 1. Cinco nombres duplicados entre módulos

| Nombre | Definido en |
|---|---|
| `CategoryNotFoundException` | `category_`, `form_`, `question_` |
| `ActivePeriodExistsException` | `form_`, `question_` |
| `FormNotFoundException` | `form_`, `question_` |
| `InvalidRoleException` | `evaluation_`, `form_` |
| `PeriodNotFoundException` | `evaluation_`, `period_` |

Son **clases distintas** con el mismo nombre. Hoy funciona porque cada route
importa solo las de su módulo. El riesgo es un archivo que importe dos: la
segunda tapa a la primera en silencio y el `except` deja de atrapar lo que se
cree.

### 2. Un mismo nombre con DOS códigos HTTP

```
InvalidRoleException (evaluation_exceptions) -> 403
InvalidRoleException (form_exceptions)       -> 422
```

**Este es el conflicto que bloquea una migración ingenua.** Un handler global
registrado "por nombre" tendría que elegir uno de los dos y cambiaría el código
de estado del otro sin que ningún test lo note — los tests actuales no cubren
esas dos rutas de error.

El resto de excepciones sí mapean 1-a-1 (verificado con AST sobre los 34
handlers).

## Jerarquía propuesta

```
ApplicationException                    (nueva raíz)
├── http_status: int                    (cada subclase declara el suyo)
├── AuthException          401 / 404
├── UserException          404 / 409
├── CategoryException      404 / 409
├── PeriodException        404 / 409
├── FormException          404 / 409 / 422
├── QuestionException      400 / 404 / 409 / 422
├── EvaluationException    403 / 404 / 409
└── AIException            400 / 503
```

La clave: **el código HTTP como atributo de clase**, no como un `if` en el route.

```python
class ApplicationException(Exception):
    http_status = 500

class FormNotFoundException(FormException):
    http_status = 404
```

Un único handler resuelve los 34 casos:

```python
@app.exception_handler(ApplicationException)
async def handle_application_exception(request, exc):
    return JSONResponse(status_code=exc.http_status, content={"detail": str(exc)})
```

Esto resuelve el conflicto de `InvalidRoleException` **sin renombrar nada**: cada
clase lleva su propio `http_status`, así que la de `evaluation_` declara 403 y la
de `form_` declara 422. Siguen siendo clases distintas y cada una conserva su
código.

## Plan de migración

Cinco pasos, cada uno verificable y reversible por separado.

**Paso 1 — Crear `ApplicationException` y hacer que las 8 bases hereden de ella.**
Behavior-neutral: siguen siendo `Exception`, los `except` actuales siguen
funcionando. Sin este paso no hay nada sobre lo que registrar el handler.

**Paso 2 — Añadir `http_status` a las 40 clases**, copiando el código que hoy
asigna el route. Todavía no lo lee nadie; es solo dato.
*Verificación:* un test que recorra las 40 clases y compare `http_status` contra
el mapeo actual extraído de los routes. Si alguno no coincide, el paso 2 está
mal antes de que se note en producción.

**Paso 3 — Cubrir con tests los 34 caminos de error.** Hoy la suite no los
ejercita. **Este paso es el que hace segura la migración**: sin él, el paso 4 se
hace a ciegas. Es el más caro y el que no conviene saltarse.

**Paso 4 — Registrar el handler global y vaciar los routes**, módulo por módulo,
no todos a la vez. Un commit por módulo permite revertir uno sin tocar el resto.

**Paso 5 — Retirar los `except Exception` genéricos.** Es el único paso que
**cambia el contrato**: el `detail` de los 500 pasa de textos como
`"Error interno al consultar formularios"` a un mensaje único con `error_id`.
A cambio, el cliente recibe por fin un id correlacionable con el log. Decisión
de producto, no técnica.

## Ganancia esperada

| | Antes | Después |
|---|---|---|
| `try/except` en routes | 34 | 0 |
| Líneas en `routes/` | ~1000 | ~600 estimadas |
| Fuentes del mapeo HTTP | 34 dispersas | 1 por clase |

## Riesgos

1. **`InvalidRoleException` con dos códigos** — resuelto por `http_status` por
   clase, pero exige no "unificar" las dos clases duplicadas.
2. **Los 5 nombres duplicados** siguen siendo una trampa de importación. Se puede
   vivir con ellos; renombrarlos es un cambio de nombres públicos, fuera del
   alcance acordado.
3. **Sin el paso 3, la migración es a ciegas.** Los tests actuales pasarían
   igual con códigos de estado equivocados.
