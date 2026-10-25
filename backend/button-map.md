# DistriSense Dashboard — Button Map (for the backend builder)

**Read this with `dashboard.html` open.** The dashboard is FROZEN: ids, classes and `data-action` attributes in it are the wiring contract. Your job is to make the backend serve it and make every control below do what this file says — using the endpoints in `app-scaffold/contract/api-contract.md`. Do not rebuild or redesign the page.

## Page data (on load)

| Region (selector) | Data source | Notes |
| :--- | :--- | :--- |
| `#run-status` | `GET /runs/{latest}` | "Last run {time} · Run {run_id}" |
| Summary spans `#stat-flagged` `#stat-lanes` `#stat-recs` `#stat-rupee` (one quiet line under the headline) | `GET /risks` + `GET /recommendations?status=pending` | flagged = watchlist size; lanes = distinct `from_node_id` count; ₹ = Σ `rupee_at_risk` of pending |
| `#lanes` | `GET /recommendations?status=pending` | Group by `from_node_id` (one `.lane` per source), rows sorted by `rupee_at_risk` desc. The render code in dashboard.html already does this from a JS array shaped exactly like the API response — replace `SAMPLE_DATA` with the fetch result, change nothing else |

## Controls

| Control (selector / data-action) | User intent | Backend behaviour | On success | On error |
| :--- | :--- | :--- | :--- | :--- |
| `#btn-run-now` | Re-run forecast → risk → recommendations now | `POST /run-now` → starts a scheduled run, returns `{run_id}`; when done, frontend reloads recommendations | `#run-status` updates; queue re-renders | `500` → keep showing the previous run's queue with its timestamp (never blank the page) |
| `[data-action="approve"]` (per row, `data-rec-id`) + `.qty-input[data-qty-for]` | Approve this move, at the quantity shown in the qty box (the manager may type a different quantity first — approving submits what's shown) | `POST /approve {ids:[id], action:"approve", edits:{quantity: <qty box value>}}` → re-check the source rule at that quantity, then create a dispatch task + audit entry; marks recommendation `approved` (record `edited` if the quantity differs from the recommendation) | Row shows "Approved — dispatch created", controls disable | `409` → already actioned: show "Already actioned", refresh the row. `422` → quantity strands the source: show the reason, keep row pending |
| `[data-action="dismiss"]` | Reject this recommendation | `POST /approve {ids:[id], action:"dismiss"}` → status `dismissed` + audit entry | Row fades, controls disable | `409` → refresh the row |
| `[data-action="bulk-approve"]` (lane header, `data-source-id`) | Approve every pending row in this lane | `POST /approve {ids:[...all pending in lane], action:"bulk-approve"}` → one dispatch task per row, one audit entry per row. **Low-confidence positions (unobserved > 7 days) are excluded from bulk actions** — return them still-pending | Approved rows turn green; excluded rows stay pending with a note | Partial failure: rows that failed stay pending; never half-apply silently — report per-id results |
| Nav links (Map / Expiry Radar / Simulator / Audit) | Other screens | Separate pages, built later against `GET /map`, `GET /expiry-radar`, `POST /simulate`, `GET /audit`. Not part of this handoff | — | — |

## Hard rules behind the buttons

1. **No stock action without an explicit approve/edit/bulk-approve call.** There is no auto-approve path anywhere.
2. **Idempotency:** approving the same `run_id` + recommendation twice must return `409`, never create a second dispatch task.
3. **Source rule re-checked at approval time** (not only when the recommendation was generated): source projected stock after giving — counting inbound — must stay ≥ its reorder point, else `422` with the reason in the body.
4. **Every action writes an audit entry** (actor, action, entity, before/after, timestamp), including dismissals and failed bulk items.
5. Dispatch completion (warehouse actually sends the stock) is a separate step: `POST /dispatch-complete {dispatch_task_id, batch_id, quantity}` decrements the source batch FEFO and increments destination stock.

## The golden check (run this before calling the dashboard "integrated")

On the seeded territory, `GET /recommendations?status=pending` must contain, exactly:
`rec` for **SKU-012 → SHOP-12, quantity 28, from W-B, source_before 900, source_after 872, prob_stockout 0.50** — and the served dashboard must render it as a row in the Warehouse B lane. Approving it creates exactly one dispatch task; approving again returns 409.
