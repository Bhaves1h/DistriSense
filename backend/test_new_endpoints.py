import io
import pytest
from fastapi.testclient import TestClient
from database import SessionLocal
from models import Recommendation, DispatchTask, AuditLog, Run
from seed import seed_database
from pipeline import run_pipeline
from main import app

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    seed_database(force=True)
    db = SessionLocal()
    try:
        run_pipeline(db, run_id="2026-10-25-0900")
    finally:
        db.close()

def test_convert_to_plan():
    # 1. Call POST /simulate/convert-to-plan
    res = client.post("/simulate/convert-to-plan", json={
        "scenario": "festival_spike",
        "transfers": [
            {
                "sku_id": "SKU-012",
                "from_node_id": "W-B",
                "to_node_id": "SHOP-12",
                "quantity": 15
            }
        ]
    })
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["recommendations_created"] >= 1
    new_rec = data["recommendations"][0]
    assert new_rec["status"] == "pending"
    assert "SIMULATION_CONVERT_PLAN" in new_rec["reason_codes"]

    # 2. Verify it now appears in GET /recommendations?status=pending
    rec_res = client.get("/recommendations?status=pending")
    assert rec_res.status_code == 200
    all_recs = rec_res.json()
    assert any(r["id"] == new_rec["id"] for r in all_recs)

    # 3. Verify audit log entry
    audit_res = client.get("/audit?actor=manager")
    assert audit_res.status_code == 200
    assert any(a["action"] == "convert-to-plan" for a in audit_res.json())

def test_multipart_csv_import_with_rejections():
    # Construct test CSVs in memory with both valid and invalid rows
    sku_csv = (
        "id,name,category,unit_cost,mrp,shelf_life_days,supplier_lead_time_days\n"
        "SKU-991,Valid Custom SKU,Snacks,25.0,35.0,180,3\n"
        "SKU-992,Invalid Cost SKU,Snacks,-5.0,35.0,180,3\n"  # Invalid negative cost
    )
    batches_csv = (
        "id,sku_id,node_id,quantity,expiry_date,received_date\n"
        "BATCH-TEST-01,SKU-991,W-A,50,2027-01-01,2026-10-25\n"
        "BATCH-TEST-02,SKU-UNKNOWN,W-A,50,2027-01-01,2026-10-25\n"  # Unknown SKU
        "BATCH-TEST-03,SKU-991,W-A,-10,2027-01-01,2026-10-25\n"  # Negative quantity
    )

    files = [
        ("skus", ("skus.csv", io.BytesIO(sku_csv.encode("utf-8")), "text/csv")),
        ("batches", ("batches.csv", io.BytesIO(batches_csv.encode("utf-8")), "text/csv"))
    ]

    res = client.post("/import", files=files)
    assert res.status_code == 200
    result = res.json()
    assert result["status"] == "accepted"
    assert result["rows_accepted"] == 2  # SKU-991 and BATCH-TEST-01
    assert result["rows_rejected"] == 3  # SKU-992, BATCH-TEST-02, BATCH-TEST-03
    assert len(result["rejection_reasons"]) == 3
    assert any("Unknown SKU ID" in r["reason"] for r in result["rejection_reasons"])
    assert any("Negative quantity" in r["reason"] for r in result["rejection_reasons"])

def test_early_warning_alerts():
    res = client.get("/alerts/early-warning?lookahead_days=5")
    assert res.status_code == 200
    data = res.json()
    assert data["lookahead_days"] == 5
    assert "alerts" in data
    assert len(data["alerts"]) >= 1

    diwali = next((a for a in data["alerts"] if "Diwali" in a["event_name"]), None)
    assert diwali is not None
    assert diwali["category"] == "Snacks"
    assert diwali["demand_multiplier"] == 1.4
    assert diwali["days_until_start"] <= 5
    assert diwali["affected_skus_count"] >= 1
    assert "Pre-build" in diwali["action_required"]

def test_dispatch_task_whatsapp_text():
    # Ensure a dispatch task exists by approving rec_0142
    approve_res = client.post("/approve", json={"ids": ["rec_0142"], "action": "approve"})
    # Could be 200 or 409 if already approved in earlier test
    db = SessionLocal()
    task = db.query(DispatchTask).filter_by(recommendation_id="rec_0142").first()
    task_id = task.id if task else "task_rec_0142"
    db.close()

    res = client.get(f"/dispatch-tasks/{task_id}/whatsapp-text")
    assert res.status_code == 200
    payload = res.json()
    assert payload["task_id"] == task_id
    assert "DISTRISENSE DISPATCH ORDER" in payload["whatsapp_text"]
    assert "Warehouse B" in payload["whatsapp_text"] or "W-B" in payload["whatsapp_text"]
    assert "Shop 12" in payload["whatsapp_text"] or "SHOP-12" in payload["whatsapp_text"]
    assert "Instant Noodles 12-pack" in payload["whatsapp_text"] or "SKU-012" in payload["whatsapp_text"]
    assert payload["share_url"].startswith("https://api.whatsapp.com/send?text=")

    # 404 check
    res_404 = client.get("/dispatch-tasks/nonexistent_task_999/whatsapp-text")
    assert res_404.status_code == 404

def test_forecast_accuracy():
    res = client.get("/forecast/accuracy")
    assert res.status_code == 200
    acc = res.json()
    assert "overall_wape" in acc
    assert acc["overall_wape"] <= 0.25  # PRD §9.2 KPI Target
    assert acc["meets_target"] is True
    assert "by_category" in acc
    assert "Snacks" in acc["by_category"]

def test_outlet_summary():
    res = client.get("/outlets/SHOP-12/summary")
    assert res.status_code == 200
    summary = res.json()
    assert summary["outlet_id"] == "SHOP-12"
    assert summary["outlet_name"] == "Shop 12"
    assert summary["stock_health"]["total_skus_tracked"] >= 120
    assert summary["stock_health"]["total_units_on_shelf"] > 0
    assert summary["observation_confidence"] in ["high", "low"]
    assert "incoming_transfers" in summary
    assert "critical_positions" in summary

    # Verify critical positions has SKU-012
    sku12_pos = next((p for p in summary["critical_positions"] if p["sku_id"] == "SKU-012"), None)
    assert sku12_pos is not None
    assert sku12_pos["days_of_cover"] <= 3.0

    # 404 check
    res_404 = client.get("/outlets/NONEXISTENT_SHOP/summary")
    assert res_404.status_code == 404
