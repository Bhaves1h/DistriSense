import pytest
from fastapi.testclient import TestClient
from database import SessionLocal
from models import Recommendation, DispatchTask, AuditLog, StockBatch
from pipeline import run_pipeline
from seed import seed_database
from main import app

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def prepare_db():
    seed_database(force=True)
    db = SessionLocal()
    try:
        run_pipeline(db, run_id="2026-10-25-0900")
    finally:
        db.close()

def test_golden_check_recommendation_and_dashboard():
    # 1. Verify GET / serves dashboard.html
    dash_res = client.get("/")
    assert dash_res.status_code == 200
    assert "DistriSense" in dash_res.text
    assert "btn-run-now" in dash_res.text

    # 2. Verify GET /recommendations?status=pending contains Golden Recommendation
    res = client.get("/recommendations?status=pending")
    assert res.status_code == 200
    recs = res.json()
    assert len(recs) > 0

    golden_rec = next((r for r in recs if r["id"] == "rec_0142"), None)
    assert golden_rec is not None, "Golden recommendation rec_0142 not found!"
    assert golden_rec["sku_id"] == "SKU-012"
    assert golden_rec["to_node_id"] == "SHOP-12"
    assert golden_rec["from_node_id"] == "W-B"
    assert golden_rec["quantity"] == 28
    assert golden_rec["source_before"] == 900
    assert golden_rec["source_after"] == 872
    assert golden_rec["prob_stockout"] == 0.50
    assert "Shop 12" in golden_rec["explanation"]
    assert "Warehouse B" in golden_rec["explanation"]
    assert "872" in golden_rec["explanation"]

def test_golden_check_approval_idempotency_and_dispatch():
    # 1. First approval: creates exactly one dispatch task
    payload = {"ids": ["rec_0142"], "action": "approve"}
    res1 = client.post("/approve", json=payload)
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["status"] == "success"
    assert len(data1["results"]) == 1
    task_id = data1["results"][0]["dispatch_task_id"]
    assert task_id is not None

    db = SessionLocal()
    try:
        # Assert dispatch task created
        tasks = db.query(DispatchTask).filter_by(recommendation_id="rec_0142").all()
        assert len(tasks) == 1
        assert tasks[0].quantity == 28

        # Assert audit log entry created for first approval
        audit_1 = db.query(AuditLog).filter_by(entity="recommendation:rec_0142", action="approve").first()
        assert audit_1 is not None
    finally:
        db.close()

    # 2. Second approval attempt: MUST return 409 Conflict
    res2 = client.post("/approve", json=payload)
    assert res2.status_code == 409

    db = SessionLocal()
    try:
        # Exactly one dispatch task still exists (never duplicated)
        tasks = db.query(DispatchTask).filter_by(recommendation_id="rec_0142").all()
        assert len(tasks) == 1

        # Audit entry exists for the duplicate attempt as well
        audit_409 = db.query(AuditLog).filter(
            AuditLog.entity == "recommendation:rec_0142",
            AuditLog.action.like("%409%")
        ).first()
        assert audit_409 is not None
    finally:
        db.close()

def test_source_rule_recheck_422():
    # Approving with an excessive quantity that strands source below reorder point returns 422
    payload = {
        "ids": ["rec_0146"],
        "action": "approve",
        "edits": {"quantity": 999999}
    }
    res = client.post("/approve", json=payload)
    assert res.status_code == 422
    assert "strands source" in res.json()["detail"].lower()

    # Audit entry must exist for the rejection
    db = SessionLocal()
    try:
        audit_422 = db.query(AuditLog).filter(
            AuditLog.entity == "recommendation:rec_0146",
            AuditLog.action.like("%422%")
        ).first()
        assert audit_422 is not None
    finally:
        db.close()

def test_bulk_approve_excludes_low_confidence():
    # Set one pending recommendation to low confidence
    db = SessionLocal()
    pending_recs = db.query(Recommendation).filter_by(status="pending").all()
    if pending_recs:
        target_rec = pending_recs[0]
        target_rec.confidence = "low"
        db.commit()
        rec_id = target_rec.id

        # Bulk approve
        res = client.post("/approve", json={"ids": [rec_id], "action": "bulk-approve"})
        assert res.status_code == 200
        results = res.json()["results"]
        # Low confidence recommendation must remain pending
        assert results[0]["status"] == "pending"
        assert "Excluded" in results[0]["note"]
    db.close()

def test_dispatch_complete_fefo():
    # Complete dispatch for task_rec_0142
    res = client.post("/dispatch-complete", json={
        "dispatch_task_id": "task_rec_0142",
        "batch_id": "BATCH-00002",
        "quantity": 28
    })
    assert res.status_code == 200
    assert res.json()["status"] == "completed"

    db = SessionLocal()
    try:
        # Task marked completed
        task = db.query(DispatchTask).filter_by(id="task_rec_0142").first()
        assert task.status == "completed"

        # Audit entry exists for dispatch completion
        audit = db.query(AuditLog).filter_by(entity="dispatch_task:task_rec_0142", action="dispatch-complete").first()
        assert audit is not None
    finally:
        db.close()

def test_auxiliary_real_endpoints():
    # GET /runs/latest
    res_run = client.get("/runs/latest")
    assert res_run.status_code == 200
    assert res_run.json()["status"] == "succeeded"

    # GET /risks
    res_risks = client.get("/risks")
    assert res_risks.status_code == 200
    assert isinstance(res_risks.json(), list)

    # GET /reorders
    res_reorders = client.get("/reorders")
    assert res_reorders.status_code == 200
    assert isinstance(res_reorders.json(), list)

    # GET /expiry-radar
    res_radar = client.get("/expiry-radar?days=30")
    assert res_radar.status_code == 200
    assert isinstance(res_radar.json(), list)

    # GET /map
    res_map = client.get("/map")
    assert res_map.status_code == 200
    assert "nodes" in res_map.json()
    assert "edges" in res_map.json()

    # GET /audit
    res_audit = client.get("/audit")
    assert res_audit.status_code == 200
    assert len(res_audit.json()) >= 4

    # GET /forecast
    res_fc = client.get("/forecast?sku_id=SKU-012&node_id=SHOP-12")
    assert res_fc.status_code == 200
    assert len(res_fc.json()["daily_forecast"]) == 14

    # POST /simulate
    res_sim = client.post("/simulate", json={"multiplier": 1.4, "duration_days": 14})
    assert res_sim.status_code == 200
    sim_data = res_sim.json()
    assert "donothing" in sim_data
    assert "baseline" in sim_data
    assert "distrisense" in sim_data
    assert "scenarios" in sim_data
    assert len(sim_data["scenarios"]) == 4
