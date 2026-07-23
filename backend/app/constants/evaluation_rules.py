"""Regla de clan: quien puede evaluar a quien.

Vive aparte y como funcion PURA (no toca la BD) por dos razones:

1. La usan DOS caminos distintos y no deben divergir:
   - `evaluation_service._validate_permissions` -> la AUTORIDAD, rechaza el
     POST /evaluations con 403 si la regla no se cumple.
   - `user_service.get_evaluables` -> conveniencia de UI, para no ofrecer a
     alguien que despues seria rechazado.
   Si la condicion se copiara en ambos, cambiar uno y olvidar el otro dejaria
   al front mostrando opciones que el backend rechaza (o al reves).

2. Al no depender de una conexion, se prueba sin levantar MySQL.

Se expresa en POSITIVO ("puede evaluar") a proposito: un predicado negativo
obliga a leer dobles negaciones en cada `if` y fue justo donde se colo un bug
-- la version anterior devolvia "si puede" en la rama de Team Leader y "no
puede" en la de tutor, con el mismo nombre para ambas.
"""
from app.constants.role_constants import ROLE_TEAM_LEADER


def can_evaluate_by_clan(evaluator_clan, evaluatee_roles, evaluatee_clan, tl_clans) -> bool:
    """True si el evaluador puede evaluar a esa persona, segun el clan.

    Los dos roles evaluables NO se resuelven igual, y esa es la trampa:

    - Team Leader: su relacion con clanes es N:M y vive en `team_leader_clans`
      (un TL puede llevar varios). Su `users.clan_id` es NULL, asi que
      compararlo contra el del evaluador SIEMPRE da falso y lo dejaria fuera.
    - Tutor: relacion 1:1 via `users.clan_id`, comparacion directa.

    `tl_clans` es la lista de clanes a cargo del TL; se ignora para tutores.
    """
    if ROLE_TEAM_LEADER in evaluatee_roles:
        return evaluator_clan in (tl_clans or [])
    return evaluator_clan == evaluatee_clan
