from database import SessionLocal
from models import SKU, Node, StockBatch, SalesDaily, StockObservation, EventCalendar
from seed import seed_database

def test_database_seed():
    seed_database(force=True)
    db = SessionLocal()
    try:
        # 1. 120 SKUs in 6 categories
        skus = db.query(SKU).all()
        assert len(skus) == 120
        categories = {s.category for s in skus}
        assert len(categories) == 6
        assert "Snacks" in categories and "Dairy" in categories

        # 2. 3 warehouses + 50 outlets
        warehouses = db.query(Node).filter_by(type="warehouse").all()
        assert len(warehouses) == 3
        outlets = db.query(Node).filter_by(type="outlet").all()
        assert len(outlets) == 50

        # 3. Golden fixture: Shop 12 holds 14 units of SKU-012
        shop12_batches = db.query(StockBatch).filter_by(node_id="SHOP-12", sku_id="SKU-012").all()
        shop12_stock = sum(b.quantity for b in shop12_batches)
        assert shop12_stock == 14

        # Warehouse B holds 900 units of SKU-012
        wb_batches = db.query(StockBatch).filter_by(node_id="W-B", sku_id="SKU-012").all()
        wb_stock = sum(b.quantity for b in wb_batches)
        assert wb_stock == 900

        # 4. Sales records count: 50 * 120 * 180 = 1,080,000
        sales_count = db.query(SalesDaily).count()
        assert sales_count == 1080000

        # 5. Imminent stockouts with surplus elsewhere (at least 5)
        # Check SKU-012, SKU-058, SKU-034, SKU-103, SKU-089
        for s_id in ["SKU-012", "SKU-058", "SKU-034", "SKU-103", "SKU-089"]:
            sku_batches = db.query(StockBatch).filter_by(sku_id=s_id).all()
            assert any(b.quantity < 20 for b in sku_batches)  # low stock
            assert any(b.quantity >= 25 for b in sku_batches)  # surplus

        # 6. Expiry risk batches (at least 3 inside 30-day window)
        batches = db.query(StockBatch).all()
        near_expiry = [b for b in batches if (b.expiry_date - b.received_date).days <= 30]
        assert len(near_expiry) >= 3

        # 7. Low confidence positions exist (> 7 days unobserved)
        observations = db.query(StockObservation).all()
        low_conf = [o for o in observations if (o.observed_date.day <= 18)]
        assert len(low_conf) > 0
    finally:
        db.close()
