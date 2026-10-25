from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_dashboard_served():
    response = client.get("/")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert "DistriSense" in response.text
    assert "btn-run-now" in response.text

def test_recommendations_endpoint():
    response = client.get("/recommendations")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    # Check golden fixture exists
    golden = next((r for r in data if r["id"] == "rec_0142"), None)
    assert golden is not None
    assert golden["sku_id"] == "SKU-012"
    assert golden["to_node_id"] == "SHOP-12"
    assert golden["from_node_id"] == "W-B"
    assert golden["quantity"] == 28
    assert golden["prob_stockout"] == 0.50

def test_risks_endpoint():
    response = client.get("/risks")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

def test_runs_and_run_now():
    res1 = client.get("/runs/latest")
    assert res1.status_code == 200
    assert "counts" in res1.json()

    res2 = client.post("/run-now")
    assert res2.status_code == 200
    assert "run_id" in res2.json()

def test_reorders_and_map():
    res_reorders = client.get("/reorders")
    assert res_reorders.status_code == 200
    res_map = client.get("/map")
    assert res_map.status_code == 200
    assert "nodes" in res_map.json()

def test_auth_google_garbage_token():
    res = client.post("/auth/google", json={"credential": "garbage_token_12345"})
    assert res.status_code == 401
    assert "detail" in res.json()

