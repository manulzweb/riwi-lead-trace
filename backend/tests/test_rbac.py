"""RBAC: sin token no se entra, y las rutas de solo-admin rechazan a un coder."""


def test_ruta_protegida_sin_token_da_403(client):
    response = client.get("/users")
    assert response.status_code == 403


def test_crear_periodo_siendo_coder_da_403(client, coder_headers):
    response = client.post("/periods", json={
        "name": "no-deberia-crearse",
        "starts_at": "2030-01-01",
        "ends_at": "2030-02-01"
    }, headers=coder_headers)
    assert response.status_code == 403


def test_metrics_summary_siendo_coder_da_403(client, coder_headers):
    response = client.get("/metrics/summary?period_id=1", headers=coder_headers)
    assert response.status_code == 403


def test_metrics_summary_siendo_admin_da_200(client, admin_headers):
    response = client.get("/metrics/summary?period_id=1", headers=admin_headers)
    assert response.status_code == 200
