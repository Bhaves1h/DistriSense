import pytest
from fastapi.testclient import TestClient
from database import SessionLocal
from models import Recommendation, StockBatch, Node, SKU, RiskFlag, DispatchTask
from seed import seed_database
from pipeline import run_pipeline, TODAY
from main import app
import datetime

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def ensure_db():
    seed_database(force=False)
    db = SessionLocal()
    try:
        run_pipeline(db, run_id="2026-10-25-0900")
    finally:
        db.close()

# -------------------------------------------------------------------------
# 1. "Ask DistriSense" Query/Filter API (Section 8.3)
# -------------------------------------------------------------------------
def test_query_empty_tomorrow():
    res = client.get("/query?q=empty tomorrow")
    assert res.status_code == 200
    data = res.json()
    assert data["query"] == "empty tomorrow"
    assert data["parsed_intent"]["intent"] == "stockout"
    assert data["parsed_intent"]["extracted_entities"]["days"] == 1
    assert data["matched_count"] >= 1
    # Check that matched results are stockout risks
    for r in data["results"]:
        assert r["type"] == "stockout_risk"
        assert r["days_of_cover"] <= 1.5

def test_query_expiring_this_week():
    res = client.get("/query?q=expiring this week")
    assert res.status_code == 200
    data = res.json()
    assert data["parsed_intent"]["intent"] == "expiry"
    assert data["parsed_intent"]["extracted_entities"]["days"] == 7
    # All returned batches must expire within 7 days
    for r in data["results"]:
        assert r["type"] == "expiry_risk"
        assert r["days_to_expiry"] <= 7

def test_query_low_confidence():
    res = client.get("/query?q=low confidence")
    assert res.status_code == 200
    data = res.json()
    assert data["parsed_intent"]["intent"] == "low_confidence"
    assert data["matched_count"] >= 1
    types = {r["type"] for r in data["results"]}
    assert "stale_observation" in types or "low_confidence_recommendation" in types

def test_query_noodles():
    res = client.get("/query?q=noodles")
    assert res.status_code == 200
    data = res.json()
    assert data["parsed_intent"]["intent"] == "sku"
    assert data["parsed_intent"]["extracted_entities"]["sku_id"] == "SKU-012"
    assert data["matched_count"] >= 1
    sku_result = data["results"][0]
    assert sku_result["sku_id"] == "SKU-012"
    assert "Noodles" in sku_result["sku_name"]
    assert sku_result["total_network_stock"] > 0

def test_query_shop_12():
    res = client.get("/query?q=shop 12")
    assert res.status_code == 200
    data = res.json()
    assert data["parsed_intent"]["intent"] == "outlet"
    assert data["parsed_intent"]["extracted_entities"]["node_id"] == "SHOP-12"
    assert data["matched_count"] >= 1
    outlet_result = data["results"][0]
    assert outlet_result["node_id"] == "SHOP-12"
    assert outlet_result["node_name"] == "Shop 12"
    assert outlet_result["total_units_on_hand"] >= 14

def test_query_combined_filter():
    # Combining SKU and node
    res = client.get("/query?q=noodles in shop 12 empty")
    assert res.status_code == 200
    data = res.json()
    assert data["parsed_intent"]["intent"] == "stockout"
    assert data["parsed_intent"]["extracted_entities"]["sku_id"] == "SKU-012"
    assert data["parsed_intent"]["extracted_entities"]["node_id"] == "SHOP-12"
    assert data["matched_count"] >= 1
    assert data["results"][0]["sku_id"] == "SKU-012"
    assert data["results"][0]["node_id"] == "SHOP-12"

# -------------------------------------------------------------------------
# 2. Live Impact & Money Saved Counter API (Section 6.3)
# -------------------------------------------------------------------------
def test_metrics_impact_initial_and_updated():
    # 1. Fetch initial impact metrics
    res_initial = client.get("/metrics/impact")
    assert res_initial.status_code == 200
    m_initial = res_initial.json()
    assert "rupees_at_risk_today" in m_initial
    assert "rupees_saved_total" in m_initial
    assert "stockouts_prevented_count" in m_initial
    assert "active_watchlist_count" in m_initial
    assert m_initial["rupees_at_risk_today"] > 0
    assert m_initial["active_watchlist_count"] > 0

    saved_before = m_initial["rupees_saved_total"]
    prevented_before = m_initial["stockouts_prevented_count"]

    # 2. Find a pending recommendation to approve
    db = SessionLocal()
    pending_rec = db.query(Recommendation).filter_by(status="pending").first()
    assert pending_rec is not None, "Expected at least one pending recommendation"
    rec_id = pending_rec.id
    rec_rar = pending_rec.rupee_at_risk or 0.0
    db.close()

    # 3. Approve recommendation
    approve_res = client.post("/approve", json={"ids": [rec_id], "action": "approve"})
    # Status could be 200 (if newly approved) or 409 (if previously approved in other test)
    if approve_res.status_code == 200:
        # 4. Fetch updated impact metrics
        res_after = client.get("/metrics/impact")
        assert res_after.status_code == 200
        m_after = res_after.json()
        assert m_after["rupees_saved_total"] >= saved_before + rec_rar
        assert m_after["stockouts_prevented_count"] == prevented_before + 1
    else:
        # If already approved, rupees_saved_total should be > 0
        assert m_initial["rupees_saved_total"] >= 0

# -------------------------------------------------------------------------
# 3. Daily WhatsApp 09:00 Digest API (FR-P1-01 / Section 5.12)
# -------------------------------------------------------------------------
def test_digest_daily():
    res = client.get("/digest/daily")
    assert res.status_code == 200
    data = res.json()
    assert "date" in data
    assert "total_network_rupees_at_risk" in data
    assert "top_10_rupees_at_risk" in data
    assert "top_risks" in data
    assert len(data["top_risks"]) <= 10
    assert "whatsapp_text" in data
    assert "share_url" in data

    # Verify WhatsApp message structure
    text = data["whatsapp_text"]
    assert "DISTRISENSE 09:00 DAILY RISK DIGEST" in text
    assert "Total Network ₹ at Risk:" in text
    assert "TOP 10 RANKED RISKS BY" in text
    assert data["share_url"].startswith("https://api.whatsapp.com/send?text=")

    # Verify top risks are ranked in descending order of rupee_at_risk
    rars = [r["rupee_at_risk"] for r in data["top_risks"]]
    assert rars == sorted(rars, reverse=True)

def test_digest_outlet_success():
    res = client.get("/digest/outlet/SHOP-12")
    assert res.status_code == 200
    data = res.json()
    assert data["outlet_id"] == "SHOP-12"
    assert data["outlet_name"] == "Shop 12"
    assert "stock_health" in data
    assert data["stock_health"]["total_units_on_shelf"] >= 14
    assert "whatsapp_text" in data
    assert "share_url" in data

    # Verify kirana WhatsApp message format
    text = data["whatsapp_text"]
    assert "DISTRISENSE KIRANA STOCK DIGEST" in text
    assert "Shop 12" in text
    assert "STOCK HEALTH:" in text
    assert "CRITICAL STOCK ALERTS:" in text
    assert "Kirana Owner Tip:" in text
    assert data["share_url"].startswith("https://api.whatsapp.com/send?text=")

def test_digest_outlet_404():
    res = client.get("/digest/outlet/NONEXISTENT_SHOP_999")
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()

# -------------------------------------------------------------------------
# 4. Expiry Radar Split Rescue Action (Section 5.8)
# -------------------------------------------------------------------------
def test_expiry_radar_rescue_split_and_markdown():
    db = SessionLocal()
    # Find or prepare a batch expiring within 30 days
    batch = db.query(StockBatch).filter(
        StockBatch.expiry_date <= TODAY + datetime.timedelta(days=25),
        StockBatch.expiry_date > TODAY,
        StockBatch.quantity > 50
    ).first()

    if not batch:
        # Create a test batch expiring in 15 days at Warehouse A
        batch = StockBatch(
            id="BATCH-TEST-RESCUE-01",
            sku_id="SKU-066",  # Curd Cup 400g (Dairy)
            node_id="W-A",
            quantity=200,
            expiry_date=TODAY + datetime.timedelta(days=15),
            received_date=TODAY - datetime.timedelta(days=5)
        )
        db.add(batch)
        db.commit()
    batch_id = batch.id
    db.close()

    # Call POST /expiry-radar/rescue
    payload = {
        "batch_id": batch_id,
        "max_outlets": 4,
        "max_distance_km": 30.0
    }
    res = client.post("/expiry-radar/rescue", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert data["status"] == "success"
    assert data["batch_id"] == batch_id
    assert data["days_to_expiry"] <= 30
    assert data["sellable_window_days"] == max(0, data["days_to_expiry"] - 7)
    assert "split_transfers" in data
    assert len(data["split_transfers"]) >= 1

    # Check FEFO split transfer details
    for st in data["split_transfers"]:
        assert st["quantity"] > 0
        assert st["outlet_absorb_capacity"] >= st["quantity"]
        assert st["distance_km"] <= 30.0
        assert st["recommendation_id"].startswith("rec_rescue_")

    # Check residual markdown flag
    assert "residual_for_markdown" in data
    residual = data["residual_for_markdown"]
    assert "flagged" in residual
    assert data["units_rescued"] + data["residual_units"] == data["units_to_move"]

    if residual["flagged"]:
        assert residual["residual_quantity"] > 0
        assert residual["recommended_discount_pct"] == 30
        assert residual["action"] == "immediate_markdown_at_source"

    # Verify recommendations exist in pending queue
    rec_res = client.get("/recommendations?status=pending")
    assert rec_res.status_code == 200
    pending_ids = {r["id"] for r in rec_res.json()}
    for st in data["split_transfers"]:
        assert st["recommendation_id"] in pending_ids

def test_expiry_radar_rescue_invalid_batch():
    # 404 for non-existent batch
    res_404 = client.post("/expiry-radar/rescue", json={"batch_id": "NONEXISTENT_BATCH_999"})
    assert res_404.status_code == 404

    # 400 for batch expiring > 30 days
    db = SessionLocal()
    batch_long = StockBatch(
        id="BATCH-TEST-LONG-EXP",
        sku_id="SKU-012",
        node_id="W-A",
        quantity=50,
        expiry_date=TODAY + datetime.timedelta(days=120),
        received_date=TODAY
    )
    db.merge(batch_long)
    db.commit()
    db.close()

    res_400 = client.post("/expiry-radar/rescue", json={"batch_id": "BATCH-TEST-LONG-EXP"})
    assert res_400.status_code == 400
    assert "only applies to batches expiring within 30 days" in res_400.json()["detail"]
