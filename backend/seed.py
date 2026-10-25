import os
import random
import datetime
import numpy as np
from database import engine, SessionLocal, Base
from models import (
    SKU, Node, StockBatch, SalesDaily, StockObservation,
    EventCalendar, Forecast, RiskFlag, Recommendation,
    DispatchTask, AuditLog, Run, SimulationRun, SimulationResult
)

# Deterministic seed
SEED = 42
random.seed(SEED)
np.random.seed(SEED)

TODAY = datetime.date(2026, 10, 25)

CATEGORIES = {
    "Snacks": ("SKU-001", 20),
    "Beverages": ("SKU-021", 20),
    "Dairy": ("SKU-041", 20),
    "Personal Care": ("SKU-061", 20),
    "Home Care": ("SKU-081", 20),
    "Staples": ("SKU-101", 20),
}

SKU_NAMES = {
    "SKU-012": ("Instant Noodles 12-pack", "Snacks", 20.0, 30.0, 180, 3),
    "SKU-058": ("Tata Tea Gold 500g", "Beverages", 180.0, 240.0, 365, 3),
    "SKU-066": ("Curd Cup 400g", "Dairy", 25.0, 35.0, 15, 2),
    "SKU-034": ("Parle-G Gold 800g", "Snacks", 40.0, 50.0, 180, 2),
    "SKU-103": ("Surf Excel 1kg", "Home Care", 110.0, 140.0, 720, 4),
    "SKU-089": ("Colgate MaxFresh 150g", "Personal Care", 75.0, 95.0, 720, 3),
    "SKU-045": ("Flavoured Milk 500ml", "Dairy", 30.0, 42.0, 30, 2),
    "SKU-050": ("Fresh Paneer 200g", "Dairy", 60.0, 80.0, 20, 2),
}

WAREHOUSES = [
    {"id": "W-A", "name": "Warehouse A", "lat": 16.7050, "lng": 74.2433},
    {"id": "W-B", "name": "Warehouse B", "lat": 16.7120, "lng": 74.2520},
    {"id": "W-C", "name": "Warehouse C", "lat": 16.6950, "lng": 74.2300},
]

CATEGORY_NAME_BANK = {
    "Snacks": [
        "Haldiram's Bhujia Sev 400g",
        "Lay's India's Magic Masala 50g",
        "Kurkure Masala Munch 90g",
        "Bingo Mad Angles Achari Masti 66g",
        "Good Day Butter Cookies 250g",
        "Sunfeast Dark Fantasy Choco Fills 300g",
        "Britannia Marie Gold 300g",
        "Haldiram's Soan Papdi 500g",
        "Oreo Original Vanilla 120g",
        "Britannia Bourbon 150g",
        "Bikaji Bikaneri Bhujia 1kg",
        "Instant Noodles 12-pack",
        "Maggi 2-Minute Masala Noodles 280g",
        "Balaji Wafers Simply Salted 100g",
        "Haldiram's Aloo Bhujia 200g",
        "Monaco Classic Salted 200g",
        "Krackjack Sweet & Salty 200g",
        "Britannia Treat Croissant 45g",
        "Lotte Choco Pie 168g",
        "Doritos Sweet Chilli 82g",
    ],
    "Beverages": [
        "Bru Instant Coffee 100g",
        "Nescafe Classic 50g",
        "Taj Mahal Tea 500g",
        "Red Label Tea 1kg",
        "Society Tea Masala 250g",
        "Wagh Bakri Premium Leaf Tea 500g",
        "Frooti Mango Drink 1.2L",
        "Maaza Mango Drink 600ml",
        "Real Fruit Juice Mixed Fruit 1L",
        "Tropicana 100% Orange Juice 1L",
        "Rooh Afza Sharbat 750ml",
        "Tang Instant Drink Orange 500g",
        "Rasna Instant Drink Orange 500g",
        "Horlicks Classic Malt 500g",
        "Cadbury Bournvita 1kg",
        "Complan Royale Chocolate 500g",
        "Boost Health Drink 500g",
        "Minute Maid Pulpy Orange 1L",
        "Amul Kool Cafe Milk 200ml",
        "Paper Boat Aamras 180ml",
    ],
    "Dairy": [
        "Amul Taaza Homogenised Milk 1L",
        "Amul Butter Pasteurised 500g",
        "Mother Dairy Cow Milk 500ml",
        "Gowardhan Ghee Pouch 1L",
        "Flavoured Milk 500ml",
        "Amul Masti Dahi 400g",
        "Britannia Cheese Slices 200g",
        "Amul Cheese Block 200g",
        "Amul Mithai Mate 400g",
        "Fresh Paneer 200g",
        "Mother Dairy Classic Dahi 400g",
        "Nestle Everyday Dairy Whitener 400g",
        "Amul Fresh Cream 250ml",
        "Milky Mist Paneer 200g",
        "Gowardhan Paneer Classic 200g",
        "Curd Cup 400g",
        "Amul Lassi Tetrapack 200ml",
        "Mother Dairy Mishti Doi 85g",
        "Amul Malai Paneer 500g",
        "Nestle A+ Nourish Toned Milk 1L",
    ],
    "Personal Care": [
        "Dettol Original Soap 125g",
        "Lifebuoy Total Soap 125g",
        "Dove Cream Beauty Bathing Bar 100g",
        "Pears Pure & Gentle Soap 125g",
        "Clinic Plus Strong & Long Shampoo 340ml",
        "Head & Shoulders Anti-Dandruff 340ml",
        "Sunsilk Black Shine Shampoo 350ml",
        "Pantene Pro-V Hair Fall Control 340ml",
        "Colgate MaxFresh 150g",
        "Close Up Everfresh Red Hot 150g",
        "Sensodyne Fresh Mint Toothpaste 75g",
        "Dabur Red Toothpaste 200g",
        "Patanjali Dant Kanti 200g",
        "Nivea Soft Light Moisturiser 200ml",
        "Pond's Light Moisturiser 150ml",
        "Vaseline Deep Moisture Body Lotion 400ml",
        "Parachute 100% Pure Coconut Oil 500ml",
        "Bajaj Almond Drops Hair Oil 300ml",
        "Gillette Mach3 Razor Cartridges 4s",
        "Dettol Handwash Liquid Refill 675ml",
    ],
    "Home Care": [
        "Ariel Matic Front Load Detergent 1kg",
        "Tide Plus Extra Power Detergent 1kg",
        "Surf Excel 1kg",
        "Rin Advanced Detergent Bar 250g",
        "Vim Dishwash Bar 300g",
        "Vim Dishwash Gel Lemon 750ml",
        "Pril Dishwash Liquid Lime 750ml",
        "Lizol Disinfectant Floor Cleaner Citrus 1L",
        "Harpic Power Plus Toilet Cleaner 1L",
        "Colin Glass Cleaner Pump 500ml",
        "Domex Fresh Guard Lime 1L",
        "Comfort After Wash Fabric Conditioner 860ml",
        "Dettol Antiseptic Liquid 550ml",
        "Good Knight Gold Flash Liquid Vaporizer 45ml",
        "All Out Ultra Mosquito Repellent Refill 45ml",
        "Hit Flying Insect Killer Black 400ml",
        "Odonil Room Air Freshener Jasmine 50g",
        "Godrej aer Pocket Bathroom Fragrance 10g",
        "Exo Dishshine Touch & Shine Round 500g",
        "Wheel 2in1 Detergent Powder 1kg",
    ],
    "Staples": [
        "Aashirvaad Superior Sharbati Atta 5kg",
        "Fortune Sunlite Refined Sunflower Oil 1L",
        "Fortune Premium Kachi Ghani Mustard Oil 1L",
        "Tata Salt Vacuum Evaporated 1kg",
        "Tata Sampann Toor Dal 1kg",
        "Tata Sampann Chana Dal 1kg",
        "India Gate Basmati Rice Feast Rozzana 5kg",
        "Daawat Rozana Super Basmati Rice 5kg",
        "Madhur Pure & Hygienic Sugar 1kg",
        "Fortune Rozana Basmati Rice 1kg",
        "Everest Turmeric Powder 200g",
        "Everest Coriander Powder 200g",
        "Everest Red Chilli Powder 200g",
        "MDH Garam Masala 100g",
        "MDH Chunky Chat Masala 100g",
        "Catch Red Chilli Powder 200g",
        "Fortune Soya Badi Chunks 200g",
        "Tata Sampann Moong Dal 1kg",
        "Saffola Gold Pro Healthy Lifestyle Oil 1L",
        "Aashirvaad Select 100% Sharbati Atta 1kg",
    ],
}

def generate_skus():
    skus = []
    idx = 1
    for cat, (start_sku, count) in CATEGORIES.items():
        for i in range(count):
            sku_id = f"SKU-{idx:03d}"
            if sku_id in SKU_NAMES:
                name, category, cost, mrp, shelf_life, lead_time = SKU_NAMES[sku_id]
            else:
                name = CATEGORY_NAME_BANK[cat][i]
                category = cat
                cost = round(random.uniform(15.0, 250.0), 2)
                mrp = round(cost * random.uniform(1.2, 1.45), 2)
                shelf_life = 15 if cat == "Dairy" else (180 if cat in ["Snacks", "Beverages"] else 365)
                lead_time = random.choice([2, 3, 4, 5])
            skus.append({
                "id": sku_id,
                "name": name,
                "category": category,
                "unit_cost": cost,
                "mrp": mrp,
                "shelf_life_days": shelf_life,
                "supplier_lead_time_days": lead_time
            })
            idx += 1
    return skus


def generate_nodes():
    nodes = []
    for w in WAREHOUSES:
        nodes.append({
            "id": w["id"],
            "name": w["name"],
            "type": "warehouse",
            "lat": w["lat"],
            "lng": w["lng"]
        })

    # 50 outlets around Kolhapur (center ~ 16.70, 74.24)
    for i in range(1, 51):
        node_id = f"SHOP-{i:02d}"
        lat = 16.70 + random.uniform(-0.06, 0.06)
        lng = 74.24 + random.uniform(-0.06, 0.06)
        nodes.append({
            "id": node_id,
            "name": f"Shop {i}",
            "type": "outlet",
            "lat": round(lat, 4),
            "lng": round(lng, 4)
        })
    return nodes

def generate_event_calendar():
    return [
        {
            "name": "Diwali Festival Week",
            "category": "Snacks",
            "demand_multiplier": 1.4,
            "start_date": TODAY + datetime.timedelta(days=5),
            "end_date": TODAY + datetime.timedelta(days=19),
        },
        {
            "name": "Past Ganesh Festival",
            "category": "Snacks",
            "demand_multiplier": 1.35,
            "start_date": TODAY - datetime.timedelta(days=60),
            "end_date": TODAY - datetime.timedelta(days=46),
        }
    ]

def seed_database(force=False):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    if not force:
        existing_skus = db.query(SKU).count()
        if existing_skus >= 120:
            print(f"Database already seeded with {existing_skus} SKUs. Use force=True to reseed.")
            db.close()
            return

    # Clear tables
    for tbl in [
        DispatchTask, Recommendation, RiskFlag, Forecast, StockObservation,
        SalesDaily, StockBatch, EventCalendar, SKU, Node, AuditLog,
        Run, SimulationResult, SimulationRun
    ]:
        db.query(tbl).delete()
    db.commit()

    print("Seeding SKUs, Nodes, Events...")
    sku_data = generate_skus()
    node_data = generate_nodes()
    events_data = generate_event_calendar()

    db.bulk_insert_mappings(SKU, sku_data)
    db.bulk_insert_mappings(Node, node_data)
    db.bulk_insert_mappings(EventCalendar, events_data)
    db.commit()

    # Generate 180 days of daily sales
    print("Generating 180 days of secondary sales for 50 outlets x 120 SKUs...")
    start_date = TODAY - datetime.timedelta(days=180)

    # Precompute per-outlet scale factor and SKU baselines
    outlet_scales = {f"SHOP-{i:02d}": random.uniform(0.7, 1.4) for i in range(1, 51)}
    # Specifically ensure SHOP-12 has scale 1.0 for SKU-012
    outlet_scales["SHOP-12"] = 1.0

    sku_base_demand = {}
    for s in sku_data:
        if s["id"] == "SKU-012":
            sku_base_demand[s["id"]] = 14.0  # Steady 14 units/day
        elif s["id"] == "SKU-058":
            sku_base_demand[s["id"]] = 12.0
        elif s["id"] == "SKU-066":
            sku_base_demand[s["id"]] = 9.0
        elif s["id"] == "SKU-034":
            sku_base_demand[s["id"]] = 6.0
        elif s["id"] == "SKU-103":
            sku_base_demand[s["id"]] = 11.0
        elif s["id"] == "SKU-089":
            sku_base_demand[s["id"]] = 4.0
        else:
            sku_base_demand[s["id"]] = round(random.uniform(2.0, 15.0), 1)

    sales_rows = []
    # Day-of-week multipliers: Mon..Sun
    dow_multipliers = [0.9, 0.95, 1.0, 1.0, 1.1, 1.25, 1.15]

    for d in range(180):
        current_date = start_date + datetime.timedelta(days=d)
        dow = current_date.weekday()
        dow_mult = dow_multipliers[dow]

        # Past festival spike between day 120 and 134
        fest_mult = 1.35 if (120 <= d <= 134) else 1.0

        for outlet_id, o_scale in outlet_scales.items():
            for sku in sku_data:
                s_id = sku["id"]
                base = sku_base_demand[s_id]

                if outlet_id == "SHOP-12" and s_id == "SKU-012":
                    # Steady 14/day with tiny noise, CV < 0.15
                    # e.g., strictly 14 on most days
                    units = 14 if d % 5 != 0 else (13 if d % 2 == 0 else 15)
                else:
                    expected = base * o_scale * dow_mult * fest_mult
                    # Poisson / Normal noise
                    units = max(0, int(np.random.poisson(expected)))

                sales_rows.append({
                    "sku_id": s_id,
                    "node_id": outlet_id,
                    "date": current_date,
                    "units_sold": units
                })

        if len(sales_rows) >= 50000:
            db.bulk_insert_mappings(SalesDaily, sales_rows)
            db.commit()
            sales_rows = []

    if sales_rows:
        db.bulk_insert_mappings(SalesDaily, sales_rows)
        db.commit()

    print("Seeding Stock Batches and Observations...")
    batch_rows = []
    obs_rows = []
    batch_counter = 1

    # 1. GOLDEN FIXTURE:
    # SHOP-12 holds exactly 14 units of SKU-012
    batch_rows.append({
        "id": f"BATCH-{batch_counter:05d}",
        "sku_id": "SKU-012",
        "node_id": "SHOP-12",
        "quantity": 14,
        "expiry_date": TODAY + datetime.timedelta(days=120),
        "received_date": TODAY - datetime.timedelta(days=10)
    })
    batch_counter += 1

    # Warehouse B (W-B) holds 900 units of SKU-012
    batch_rows.append({
        "id": f"BATCH-{batch_counter:05d}",
        "sku_id": "SKU-012",
        "node_id": "W-B",
        "quantity": 900,
        "expiry_date": TODAY + datetime.timedelta(days=120),
        "received_date": TODAY - datetime.timedelta(days=15)
    })
    batch_counter += 1

    # 2. Imminent Stockouts with Surplus elsewhere (at least 5 total, including SHOP-12)
    # Stockout 2: SKU-058 at SHOP-07 (stock 10, forecast 12/d -> cover 0.8d)
    # Surplus at W-B: 450 units
    batch_rows.append({
        "id": f"BATCH-{batch_counter:05d}",
        "sku_id": "SKU-058",
        "node_id": "SHOP-07",
        "quantity": 10,
        "expiry_date": TODAY + datetime.timedelta(days=180),
        "received_date": TODAY - datetime.timedelta(days=5)
    })
    batch_counter += 1
    batch_rows.append({
        "id": f"BATCH-{batch_counter:05d}",
        "sku_id": "SKU-058",
        "node_id": "W-B",
        "quantity": 450,
        "expiry_date": TODAY + datetime.timedelta(days=180),
        "received_date": TODAY - datetime.timedelta(days=10)
    })
    batch_counter += 1

    # Stockout 3: SKU-034 at SHOP-31 (stock 4, forecast 6/d -> cover 0.67d)
    # Surplus at W-A: 320 units
    batch_rows.append({
        "id": f"BATCH-{batch_counter:05d}",
        "sku_id": "SKU-034",
        "node_id": "SHOP-31",
        "quantity": 4,
        "expiry_date": TODAY + datetime.timedelta(days=90),
        "received_date": TODAY - datetime.timedelta(days=3)
    })
    batch_counter += 1
    batch_rows.append({
        "id": f"BATCH-{batch_counter:05d}",
        "sku_id": "SKU-034",
        "node_id": "W-A",
        "quantity": 320,
        "expiry_date": TODAY + datetime.timedelta(days=90),
        "received_date": TODAY - datetime.timedelta(days=12)
    })
    batch_counter += 1

    # Stockout 4: SKU-103 at SHOP-41 (stock 15, forecast 11/d -> cover 1.36d)
    # Surplus at W-C: 240 units
    batch_rows.append({
        "id": f"BATCH-{batch_counter:05d}",
        "sku_id": "SKU-103",
        "node_id": "SHOP-41",
        "quantity": 15,
        "expiry_date": TODAY + datetime.timedelta(days=360),
        "received_date": TODAY - datetime.timedelta(days=4)
    })
    batch_counter += 1
    batch_rows.append({
        "id": f"BATCH-{batch_counter:05d}",
        "sku_id": "SKU-103",
        "node_id": "W-C",
        "quantity": 240,
        "expiry_date": TODAY + datetime.timedelta(days=360),
        "received_date": TODAY - datetime.timedelta(days=8)
    })
    batch_counter += 1

    # Stockout 5: SKU-089 at SHOP-19 (stock 4, forecast 4/d -> cover 1.0d)
    # Donor Outlet SHOP-03 has surplus: 25 units (cover > 5 days)
    batch_rows.append({
        "id": f"BATCH-{batch_counter:05d}",
        "sku_id": "SKU-089",
        "node_id": "SHOP-19",
        "quantity": 4,
        "expiry_date": TODAY + datetime.timedelta(days=300),
        "received_date": TODAY - datetime.timedelta(days=2)
    })
    batch_counter += 1
    batch_rows.append({
        "id": f"BATCH-{batch_counter:05d}",
        "sku_id": "SKU-089",
        "node_id": "SHOP-03",
        "quantity": 25,
        "expiry_date": TODAY + datetime.timedelta(days=300),
        "received_date": TODAY - datetime.timedelta(days=6)
    })
    batch_counter += 1

    # 3. Expiry-Risk Batches (at least 3 inside expiry window: today + cover > expiry_date - 7d):
    # Expiry 1: SKU-066 (Curd Cup 400g) at W-A: 188 units, expires in 9 days
    batch_rows.append({
        "id": "BATCH-066-W-A",
        "sku_id": "SKU-066",
        "node_id": "W-A",
        "quantity": 188,
        "expiry_date": TODAY + datetime.timedelta(days=9),
        "received_date": TODAY - datetime.timedelta(days=6)
    })
    batch_counter += 1
    # SHOP-05 can absorb 60 units of Curd Cup (sells 9/d)
    batch_rows.append({
        "id": f"BATCH-{batch_counter:05d}",
        "sku_id": "SKU-066",
        "node_id": "SHOP-05",
        "quantity": 10,
        "expiry_date": TODAY + datetime.timedelta(days=12),
        "received_date": TODAY - datetime.timedelta(days=3)
    })
    batch_counter += 1

    # Expiry 2: SKU-045 (Flavoured Milk 500ml) at W-A: 300 units, expires in 21 days (Journey 3)
    batch_rows.append({
        "id": "BATCH-B-118",
        "sku_id": "SKU-045",
        "node_id": "W-A",
        "quantity": 300,
        "expiry_date": TODAY + datetime.timedelta(days=21),
        "received_date": TODAY - datetime.timedelta(days=9)
    })
    batch_counter += 1

    # Expiry 3: SKU-050 (Fresh Paneer 200g) at W-C: 150 units, expires in 10 days
    batch_rows.append({
        "id": f"BATCH-{batch_counter:05d}",
        "sku_id": "SKU-050",
        "node_id": "W-C",
        "quantity": 150,
        "expiry_date": TODAY + datetime.timedelta(days=10),
        "received_date": TODAY - datetime.timedelta(days=10)
    })
    batch_counter += 1

    # Seed regular healthy stock for remaining positions so all 6,000 positions have stock
    # To keep positions healthy (cover between 4 and 10 days)
    seeded_positions = {(b["node_id"], b["sku_id"]) for b in batch_rows}

    # Seed warehouses with healthy stock
    for w in WAREHOUSES:
        w_id = w["id"]
        for s in sku_data:
            s_id = s["id"]
            if (w_id, s_id) not in seeded_positions:
                # Warehouse holds 5-15 days of aggregate territory demand
                agg_demand = sku_base_demand[s_id] * 50
                w_stock = int(agg_demand * random.uniform(0.1, 0.25)) + 150
                batch_rows.append({
                    "id": f"BATCH-{batch_counter:05d}",
                    "sku_id": s_id,
                    "node_id": w_id,
                    "quantity": w_stock,
                    "expiry_date": TODAY + datetime.timedelta(days=s["shelf_life_days"]),
                    "received_date": TODAY - datetime.timedelta(days=random.randint(1, 20))
                })
                batch_counter += 1
                seeded_positions.add((w_id, s_id))

    # Seed remaining 50 outlets
    for i in range(1, 51):
        o_id = f"SHOP-{i:02d}"
        for s in sku_data:
            s_id = s["id"]
            if (o_id, s_id) not in seeded_positions:
                daily_d = sku_base_demand[s_id] * outlet_scales[o_id]
                # Normal healthy outlet stock = 4 to 8 days
                cover_days = random.uniform(4.0, 8.0)
                stock_qty = max(5, int(daily_d * cover_days))
                batch_rows.append({
                    "id": f"BATCH-{batch_counter:05d}",
                    "sku_id": s_id,
                    "node_id": o_id,
                    "quantity": stock_qty,
                    "expiry_date": TODAY + datetime.timedelta(days=s["shelf_life_days"]),
                    "received_date": TODAY - datetime.timedelta(days=random.randint(1, 10))
                })
                batch_counter += 1
                seeded_positions.add((o_id, s_id))

    db.bulk_insert_mappings(StockBatch, batch_rows)
    db.commit()

    # Create stock observations
    # For most outlets, observed yesterday (high confidence).
    # For SHOP-49 and SHOP-50, observed 9 days ago (> 7 days -> low confidence)
    for b in batch_rows:
        node_id = b["node_id"]
        if node_id.startswith("SHOP-"):
            obs_date = TODAY - datetime.timedelta(days=9) if node_id in ["SHOP-49", "SHOP-50"] else TODAY - datetime.timedelta(days=1)
            obs_rows.append({
                "sku_id": b["sku_id"],
                "node_id": node_id,
                "observed_date": obs_date,
                "counted_units": b["quantity"],
                "source": "visit"
            })

    db.bulk_insert_mappings(StockObservation, obs_rows)
    db.commit()
    db.close()
    print("Database seeding completed successfully.")

if __name__ == "__main__":
    import sys
    force_flag = "--force" in sys.argv
    seed_database(force=force_flag)
