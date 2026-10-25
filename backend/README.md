# DistriSense Backend (FastAPI + SQLite / PostgreSQL)

This is the backend implementation for **DistriSense** (Distribution Intelligence & Inventory Optimization Engine).

## Quickstart

### 1. Requirements & Dependencies
- Python 3.10+
- Installed packages: `fastapi`, `uvicorn`, `sqlalchemy`, `scipy`, `numpy`, `pytest`, `httpx`

### 2. Run Database Seeding
```bash
python seed.py --force
```
This deterministically seeds:
- 3 warehouses (`W-A`, `W-B`, `W-C`) + 50 retail outlets (`SHOP-01` to `SHOP-50`)
- 120 SKUs across 6 FMCG categories
- 180 days of daily secondary sales history (1,080,000 sales rows)
- Stock batches with the exact **Golden Fixture**:
  - `SHOP-12` holds exactly **14 units** of `SKU-012` (Instant Noodles 12-pack)
  - `W-B` holds exactly **900 units** of `SKU-012`
  - 5 imminent stockouts and 3 near-expiry batches inside the 30-day window

### 3. Run the Backend Server
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
Open [http://localhost:8000/](http://localhost:8000/) to access the served frozen `dashboard.html`.

### 4. Run All Unit & Integration Tests
```bash
pytest
```
- `pytest test_formulas.py`: 26 formula and optimization unit tests, including the SciPy HiGHS LP-beats-greedy assertion (7,790 vs 7,250, difference 540).
- `pytest test_golden_check.py`: Verifies the Golden Check recommendation (`SKU-012 -> SHOP-12, qty 28, W-B 900->872, prob 0.50`), 409 idempotency on duplicate approval, 422 source-stranding guard, bulk-approve low-confidence exclusion, and FEFO dispatch completion.
- `pytest test_step1_stubs.py`: Verifies all REST endpoint contracts.
- `pytest test_step2_seed.py`: Verifies deterministic dataset integrity.

---

## The Golden Check Spec & Outcome

- **Recommendation Generated**:
  - `id`: `rec_0142`
  - `type`: `transfer`
  - `sku_id`: `SKU-012` (`Instant Noodles 12-pack`)
  - `to_node_id`: `SHOP-12` (`Shop 12`)
  - `from_node_id`: `W-B` (`Warehouse B`)
  - `quantity`: `28`
  - `source_before`: `900`
  - `source_after`: `872`
  - `prob_stockout`: `0.50`
  - `explanation`: `"Shop 12 covers 1.0 day < 3-day threshold; Warehouse B stays above its reorder point after giving (872 vs 180 + safety)."`
- **Approval & Idempotency**:
  - First `POST /approve`: creates 1 dispatch task and logs audit entry.
  - Second `POST /approve`: returns HTTP `409 Conflict` and logs duplicate attempt audit entry.
- **Source Rule Guard**:
  - Re-checked dynamically at approval time. If transfer strands source below reorder point floor, returns HTTP `422 Unprocessable Entity`.
- **Bulk Approval Guard**:
  - Positions with stock observations > 7 days old are excluded from bulk action and remain pending with a notification note.
- **Dispatch Complete**:
  - `POST /dispatch-complete` decrements the source batch FEFO, increments destination stock, and logs audit record.

---

## API Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Serves `dashboard.html` as text/html |
| `GET` | `/recommendations` | List recommendations, supports `?status=pending` |
| `GET` | `/risks` | List risk flags (stockout & expiry) |
| `GET` | `/runs/{id}` | Run metadata and summary counts (`/runs/latest` supported) |
| `POST` | `/run-now` | Triggers immediate decision pipeline run |
| `POST` | `/approve` | Approve, dismiss, edit, or bulk-approve recommendations |
| `POST` | `/dispatch-complete` | Completes warehouse dispatch, moves stock FEFO |
| `GET` | `/reorders` | Warehouse replenishment recommendations from supplier |
| `GET` | `/expiry-radar` | Batches within expiry window with sell-through & redistribution |
| `GET` | `/map` | Territory nodes with coordinates and transfer trails |
| `GET` | `/audit` | Append-only audit trail ordered newest first |
| `GET` | `/forecast` | 14-day forecast breakdown for given SKU and node |
| `POST` | `/simulate` | 3-arm counterfactual simulator (14-day projection in < 0.2s) |
| `POST` | `/simulate/convert-to-plan` | Converts simulated winning transfers into pending recommendations |
| `POST` | `/import` | Multi-part CSV upload (skus, nodes, batches, sales, observations) with row rejection report |
| `GET` | `/alerts/early-warning` | 5-day event calendar lookahead with festival surge warnings |
| `GET` | `/dispatch-tasks/{id}/whatsapp-text` | Pre-formatted WhatsApp dispatch message with FEFO batch & direct share link |
| `GET` | `/forecast/accuracy` | Backtest WAPE accuracy calculations (verifies WAPE <= 25% KPI) |
| `GET` | `/outlets/{outlet_id}/summary` | Single-outlet view of stock health, observation confidence, and incoming transfers |
| `GET` | `/query?q={text}` | "Ask DistriSense" rule-based natural language query & dynamic database filter |
| `GET` | `/metrics/impact` | Live Impact & Money Saved Counter tracking rupees at risk, saved total, & stockouts prevented |
| `GET` | `/digest/daily` | Formatted WhatsApp 09:00 daily digest with top 10 ranked risks & 1-click share URL |
| `GET` | `/digest/outlet/{id}` | Personalized Kirana owner WhatsApp stock digest with stock health & incoming deliveries |
| `POST` | `/expiry-radar/rescue` | FEFO split-rescue action distributing near-expiry stock across absorbing outlets with markdown residual |
