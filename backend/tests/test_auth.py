"""Login: credenciales invalidas deben dar 401, nunca un 500."""


def test_login_con_password_incorrecta_da_401(client):
    response = client.post("/auth/login", json={
        "email": "admin@riwi.edu",
        "password": "esto-no-es-la-clave"
    })
    assert response.status_code == 401


def test_login_con_email_inexistente_da_401(client):
    response = client.post("/auth/login", json={
        "email": "no-existe@riwi.edu",
        "password": "cualquiera"
    })
    assert response.status_code == 401
