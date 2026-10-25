# DistriSense Backend — Frozen API Contract

Version: 1.0.0
Base URL: `http://localhost:8000/`

This is the frozen API contract the dashboard (`dashboard.html`) and test suite were built against.
Do not change endpoint paths, response field names, or status-code behaviour without updating this contract and the dashboard in the same change.

---

## 1. Core Pages & Dashboard

### `GET /` (aliases: `/dashboard`, `/dashboard.html`, `/map.html`, `/expiry-radar.html`, `/simulator.html`, `/audit.html`)
- **Description**: Serves the unified dashboard HTML (`dashboard.html`) with zero-cache headers (`no-cache, no-store, must-revalidate`).
- **Response**: `200 OK` (`text/html`)

---

## 2. Decision Queue & Recommendations

### `GET /recommendations`
- **Query Parameters**:
  - `status` (optional, string): Filter by recommendation status (`pending`, `approved`, `dismissed`).
  - `run_id` (optional, string): Filter by run ID.
- **Response**: `200 OK` (JSON array of recommendation objects)
- **Object Schema**:
  ```json
  [
    {
      "id": "rec_0142",
      "run_id": "RUN-20261025-0900",
      "type": "transfer",
      "sku_id": "SKU-012",
      "sku_name": "Instant Noodles 12-pack",
      "category": "Snacks",
      "from_node_id": "W-B",
      "from_node_name": "Warehouse B",
      "to_node_id": "SHOP-12",
      "to_node_name": "Shop 12",
      "quantity": 28,
      "source_before": 900,
      "source_after": 872,
      "prob_stockout": 0.50,
      "rupee_at_risk": 280.0,
      "cost": 140.0,
      "explanation": "Shop 12 covers 1.0 day < 3-day threshold; Warehouse B stays above its reorder point after giving (872 vs 180 + safety).",
      "status": "pending",
      "reason_codes": ["STOCKOUT_RISK"],
      "created_at": "2026-10-25T09:00:00Z"
    }
  ]
  ```
- **Extension**:
  - `days_to_expiry` (integer, optional/additive): Included on recommendation objects of type `"expiry"`, representing remaining days until shelf-life expiry of the source batch (computed identically to `/expiry-radar`).


### `POST /approve`
- **Description**: Action one or more recommendations (`approve`, `dismiss`, or `bulk-approve`).
- **Request Body**:
  ```json
  {
    "ids": ["rec_0142"],
    "action": "approve",
    "edits": {
      "quantity": 28
    }
  }
  ```
- **Rules & Status Codes**:
  - `200 OK`: Action applied successfully.
  - `409 Conflict`: Recommendation already actioned (idempotency guard).
  - `422 Unprocessable Entity`: Dynamic source rule violation (e.g. quantity strands source below reorder point floor).
  - `bulk-approve`: Excludes low-confidence positions (stock observation older than 7 days) and leaves them pending with a note.
- **Response Schema**:
  ```json
  {
    "status": "success",
    "results": [
      {
        "id": "rec_0142",
        "action": "approve",
        "dispatch_task_id": "DSP-8041-01",
        "status": "approved"
      }
    ]
  }
  ```

### `POST /dispatch-complete`
- **Description**: Marks warehouse physical dispatch complete, applying FEFO inventory deduction to the source and incrementing destination stock.
- **Request Body**:
  ```json
  {
    "dispatch_task_id": "DSP-8041-01",
    "batch_id": "BAT-9901",
    "quantity": 28
  }
  ```
- **Response**: `200 OK` `{ "status": "completed", "dispatch_task_id": "..." }`

---

## 3. Risks & Monitoring

### `GET /risks`
- **Query Parameters**:
  - `risk_level` (optional, string): Filter by `critical`, `high`, `medium`, `low`.
  - `category` (optional, string): Filter by SKU category.
- **Response**: `200 OK` (JSON array of risk flags with position, SKU, days of cover, probability of stockout, and rupees at risk).

### `GET /reorders`
- **Description**: Warehouse-level supplier purchase reorder triggers (when stock drops below safety reorder threshold).
- **Response**: `200 OK` (JSON array of reorder suggestions).

### `GET /expiry-radar`
- **Description**: Near-expiry batches inside the 30-day window across warehouses and outlets.
- **Response**: `200 OK` (JSON array of batch details, days to expiry, write-off risk value).

### `POST /expiry-radar/rescue`
- **Description**: Computes FEFO markdown or fast-moving outlet redistribution rescue routes for at-risk batches.
- **Request Body**:
  ```json
  {
    "batch_id": "BAT-0129",
    "max_outlets": 5,
    "max_distance_km": 25.0
  }
  ```
- **Response**: `200 OK` (Rescue plan with allocation candidates).

---

## 4. Pipeline Runs & Network Topology

### `GET /runs/{run_id}` (use `/runs/latest` for newest run)
- **Response**: `200 OK` (Run metadata, counts of recommendations, risk flags, execution duration).

### `POST /run-now`
- **Description**: Triggers daily pipeline run (forecast -> risk scoring -> transfer optimization).
- **Response**: `200 OK` `{ "status": "started", "run_id": "RUN-..." }`

### `GET /map`
- **Description**: Geographical node positions (warehouses and outlets), active inventory levels, and interconnecting routes with status.
- **Response**: `200 OK` `{ "nodes": [...], "routes": [...] }`

### `GET /audit`
- **Query Parameters**:
  - `actor` (optional, string): Filter by actor (`manager`, `system`).
  - `limit` (optional, integer): Max records.
- **Response**: `200 OK` (JSON array of immutable audit trail records).

---

## 5. Forecast & Simulation

### `GET /forecast`
- **Query Parameters**:
  - `sku_id` (required, string)
  - `outlet_id` (required, string)
- **Response**: `200 OK` (14-day daily forecast breakdown with trend and calendar modifiers).

### `GET /forecast/accuracy`
- **Response**: `200 OK` (WAPE, MAPE, and bias tracking metrics).

### `POST /simulate`
- **Description**: Replay territory under stress (festival spike x1.4, expiry wave, or flat week) comparing Doing Nothing vs Manual vs DistriSense.
- **Request Body**:
  ```json
  {
    "category_set": ["Snacks", "Dairy"],
    "multiplier": 1.4,
    "duration_days": 14,
    "start_offset": 0
  }
  ```
- **Response**: `200 OK` (Simulation metrics: stockouts averted, write-offs prevented, rupee protection).

### `POST /simulate/convert-to-plan`
- **Description**: Convert simulated optimal transfers into actionable pending recommendations in the live queue.
- **Request Body**:
  ```json
  {
    "scenario": "festival_spike",
    "transfers": [
      {
        "sku_id": "SKU-012",
        "from_node_id": "W-B",
        "to_node_id": "SHOP-12",
        "quantity": 15
      }
    ]
  }
  ```
- **Response**: `200 OK` `{ "status": "success", "recommendations_created": 1, ... }`

---

## 6. Golden Check Requirement (DO NOT BREAK)

On the seeded territory (`python seed.py --force`):
- `GET /recommendations?status=pending` contains `id: "rec_0142"`:
  - `sku_id`: `SKU-012` (`Instant Noodles 12-pack`)
  - `to_node_id`: `SHOP-12` (`Shop 12`)
  - `from_node_id`: `W-B` (`Warehouse B`)
  - `quantity`: `28`
  - `source_before`: `900`
  - `source_after`: `872`
  - `prob_stockout`: `0.50`
  - `rupee_at_risk`: `280`
- `POST /approve`:
  - 1st call -> HTTP 200, creates 1 dispatch task.
  - 2nd call -> HTTP 409 Conflict.
- Source stranding guard:
  - If transfer reduces source below its reorder point floor -> HTTP 422 Unprocessable Entity.
