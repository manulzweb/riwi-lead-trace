"""Fuente UNICA de verdad para los nombres de rol.

Deben coincidir exactamente con la columna `roles.name` de `database/01_ddl.sql`
(sembrados en `02_dml.sql`): 'coder', 'team_leader', 'tutor', 'admin'.

Antes estaban duplicados en TRES sitios:
  - `evaluation_constants.py`  -> ROLE_TUTOR / ROLE_TEAM_LEADER
  - `user_constants.py`        -> los mismos dos, mas ROLE_ADMIN / ROLE_CODER
  - `form_constants.py`        -> EVALUABLE_ROLES reescribiendo los literales

Tres fuentes para el mismo concepto: renombrar un rol en la BD obligaba a
recordar los tres, y olvidar uno rompia en silencio (un `in` que nunca da
verdadero no lanza error, solo filtra de mas).
"""

ROLE_CODER = "coder"
ROLE_TEAM_LEADER = "team_leader"
ROLE_TUTOR = "tutor"
ROLE_ADMIN = "admin"

# Los unicos roles que un Coder puede evaluar.
#
# Se DERIVA de las constantes, no se reescriben los literales: asi no puede
# desincronizarse. El orden se conserva igual que antes porque aparece
# textualmente en un mensaje de error de la API
# ("target_role debe ser uno de ('team_leader', 'tutor')").
EVALUABLE_ROLES = (ROLE_TEAM_LEADER, ROLE_TUTOR)
