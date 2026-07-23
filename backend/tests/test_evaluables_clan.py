"""Filtro por clan de GET /evaluables (y la regla que comparte con
POST /evaluations).

El caso que motiva estas pruebas: un Team Leader tiene `users.clan_id = NULL`
y su relacion con clanes vive en `team_leader_clans`. Un filtro que compare
`clan_id` contra `clan_id` deja fuera a TODOS los Team Leaders, y un Coder se
queda sin poder evaluar al suyo.
"""
from sqlalchemy import text

from app.config.database import conn
from app.constants.evaluation_rules import can_evaluate_by_clan


# --- Funcion pura: sin BD ---------------------------------------------------

def test_tutor_se_evalua_solo_si_comparte_clan():
    assert can_evaluate_by_clan(1, ["tutor"], 1, []) is True
    assert can_evaluate_by_clan(1, ["tutor"], 2, []) is False


def test_team_leader_se_resuelve_por_team_leader_clans_no_por_clan_id():
    """El TL llega con clan_id None; lo que decide es la lista de clanes a cargo."""
    assert can_evaluate_by_clan(1, ["team_leader"], None, [1, 2]) is True
    assert can_evaluate_by_clan(3, ["team_leader"], None, [1, 2]) is False


def test_team_leader_sin_clanes_asignados_no_es_evaluable():
    assert can_evaluate_by_clan(1, ["team_leader"], None, []) is False
    assert can_evaluate_by_clan(1, ["team_leader"], None, None) is False


# --- Endpoint: contra la BD de pruebas --------------------------------------

def _coder_con_clan():
    """Un coder del seed junto a su clan_id."""
    return conn.execute(text("""
        SELECT u.id, u.clan_id FROM users u
        JOIN user_roles ur ON ur.user_id = u.id
        JOIN roles r ON r.id = ur.role_id
        WHERE r.name = 'coder' AND u.clan_id IS NOT NULL
        LIMIT 1
    """)).mappings().first()


def test_evaluables_incluye_al_tl_a_cargo_del_clan_del_coder(client):
    """La regresion principal: el TL NO puede desaparecer del listado."""
    coder = _coder_con_clan()

    tl_esperado = conn.execute(text("""
        SELECT user_id FROM team_leader_clans WHERE clan_id = :clan LIMIT 1
    """), {"clan": coder["clan_id"]}).scalar()
    assert tl_esperado is not None, "El seed deberia tener un TL a cargo de ese clan"

    response = client.get(f"/evaluables?evaluator_id={coder['id']}")
    assert response.status_code == 200
    ids = [u["id"] for u in response.json()]
    assert tl_esperado in ids


def test_evaluables_excluye_tutores_de_otro_clan(client):
    coder = _coder_con_clan()

    response = client.get(f"/evaluables?evaluator_id={coder['id']}")
    assert response.status_code == 200

    for u in response.json():
        if "tutor" in u["roles"] and "team_leader" not in u["roles"]:
            assert u["clan_id"] == coder["clan_id"]


def test_evaluables_excluye_tl_que_no_lleva_el_clan_del_coder(client):
    coder = _coder_con_clan()
    clanes_del_coder = {coder["clan_id"]}

    response = client.get(f"/evaluables?evaluator_id={coder['id']}")
    devueltos = {u["id"] for u in response.json()}

    ajenos = conn.execute(text("""
        SELECT tlc.user_id FROM team_leader_clans tlc
        GROUP BY tlc.user_id
        HAVING SUM(tlc.clan_id = :clan) = 0
    """), {"clan": coder["clan_id"]}).scalars().all()

    for tl_id in ajenos:
        assert tl_id not in devueltos, f"El TL {tl_id} no lleva {clanes_del_coder} y no deberia aparecer"


def test_sin_evaluator_id_no_se_filtra_por_clan(client):
    """Comportamiento deliberado: sin evaluador no hay clan contra que comparar."""
    con_filtro = client.get(f"/evaluables?evaluator_id={_coder_con_clan()['id']}").json()
    sin_filtro = client.get("/evaluables").json()
    assert len(sin_filtro) >= len(con_filtro)
