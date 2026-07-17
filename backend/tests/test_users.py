"""GET /users?role= debe filtrar por rol; sin el parametro, se comporta como antes (todos)."""


def test_get_users_sin_filtro_devuelve_todos_los_roles(client):
    response = client.get("/users")
    assert response.status_code == 200
    roles_presentes = {r for u in response.json() for r in u["roles"]}
    # Datos semilla de database/schema.sql: coder, team_leader, tutor, admin.
    assert {"coder", "team_leader", "tutor", "admin"}.issubset(roles_presentes)


def test_get_users_filtra_por_rol(client):
    response = client.get("/users?role=team_leader")
    assert response.status_code == 200
    body = response.json()
    assert len(body) >= 1
    assert all("team_leader" in u["roles"] for u in body)


def test_get_users_filtro_sin_resultados_devuelve_lista_vacia(client):
    response = client.get("/users?role=rol-que-no-existe")
    assert response.status_code == 200
    assert response.json() == []
