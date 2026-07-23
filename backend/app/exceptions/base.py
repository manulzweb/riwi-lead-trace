"""Raiz comun de las excepciones de dominio.

Preparacion para los Exception Handlers globales (pasos 1 y 2 del plan en
`docs/superpowers/specs/2026-07-22-exception-handlers-plan.md`).

HOY NO CAMBIA NADA: los routes siguen traduciendo excepcion -> HTTP con sus
`try/except`, y `http_status` es un dato que todavia nadie lee. Lo que habilita
es registrar UN solo handler sobre `ApplicationException` y que cada clase
lleve su propio codigo, en vez de repetir el mapeo en 49 sitios.

## Por que el codigo va en la CLASE y no en el handler

Hay cinco nombres de excepcion duplicados entre modulos, y uno de ellos mapea
a codigos distintos segun de donde venga:

    InvalidRoleException (form_exceptions)        -> 422
    InvalidRoleException (evaluation_exceptions)  -> 403

Son clases DISTINTAS que comparten nombre. Un handler que decidiera "por
nombre" tendria que elegir uno de los dos y cambiaria el otro en silencio. Con
`http_status` como atributo de clase el problema desaparece sin renombrar nada:
cada una declara el suyo y ambas conservan su comportamiento actual.

## Por que las clases BASE se quedan en 500

`FormException`, `UserException`, etc. no se lanzan nunca directamente: son
agrupadores. Si alguna llegara a un handler seria porque existe una subclase
nueva que nadie mapeo -- y 500 es la respuesta honesta para eso, no un 400
inventado que ocultaria el olvido.
"""


class ApplicationException(Exception):
    """Toda excepcion de dominio del proyecto hereda de aqui.

    `http_status` es el codigo con el que el route la traduce hoy a mano. Las
    subclases concretas lo sobreescriben; ver el test
    `tests/test_exception_status.py`, que compara este atributo contra el
    mapeo REAL extraido de `routes/` y falla si divergen.
    """

    http_status: int = 500
