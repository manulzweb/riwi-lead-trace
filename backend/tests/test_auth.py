"""Login: credenciales invalidas deben dar 401, nunca un 500."""


def test_login_con_password_incorrecta_da_401(client):
    # admin@riwi.io es el correo real sembrado en database/02_dml.sql -- con
    # un dominio inexistente (.edu) esto probaba sin querer el caso de
    # "correo no registrado" (404), no el de contraseña incorrecta (401).
    response = client.post("/auth/login", json={
        "email": "admin@riwi.io",
        "password": "esto-no-es-la-clave"
    })
    assert response.status_code == 401


def test_login_con_email_inexistente_da_404(client):
    # auth_service.login distingue a proposito "correo no registrado" (404)
    # de "contrasena incorrecta" (401) -- ver app/services/auth_service.py.
    response = client.post("/auth/login", json={
        "email": "no-existe@riwi.io",
        "password": "cualquiera"
    })
    assert response.status_code == 404
