import math
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from scipy.optimize import linprog

# --- Forecasting ---

def compute_wma(sales: List[float], weights: Optional[List[float]] = None) -> float:
    """Recency-weighted 28-day moving average. Excludes non-positive if censored."""
    valid_sales = [s for s in sales if s is not None and not math.isnan(s)]
    if not valid_sales:
        return 0.0
    n = len(valid_sales)
    if weights is None or len(weights) != n:
        weights = [float(i + 1) for i in range(n)]
    total_w = sum(weights)
    if total_w == 0:
        return 0.0
    return sum(w * s for w, s in zip(weights, valid_sales)) / total_w

def filter_censored_days(sales: List[float], opening_stocks: List[int]) -> List[float]:
    """Censored demand: stockout days (opening stock == 0) excluded from training base."""
    return [s for s, stock in zip(sales, opening_stocks) if stock > 0]

def compute_shrunk_dow(outlet_dow: float, category_dow: float) -> float:
    """Day-of-week factor shrunk toward category factor: 0.7 * outlet + 0.3 * category."""
    return 0.7 * outlet_dow + 0.3 * category_dow

def cap_trend_factor(trend: float) -> float:
    """Trend factor strictly capped at [0.8, 1.25]."""
    return max(0.8, min(1.25, trend))

def calculate_forecast(base_wma: float, dow_factor: float, event_factor: float, trend_factor: float) -> float:
    """Forecast = WMA(28d) * day-of-week * event * trend."""
    c_trend = cap_trend_factor(trend_factor)
    return max(0.0, base_wma * dow_factor * event_factor * c_trend)

def compute_wape(actuals: List[float], forecasts: List[float]) -> float:
    """Weighted Absolute Percentage Error = sum(|actual - forecast|) / sum(actual)."""
    sum_actual = sum(actuals)
    if sum_actual == 0:
        return 0.0
    sum_err = sum(abs(a - f) for a, f in zip(actuals, forecasts))
    return sum_err / sum_actual

# --- Risk Scoring ---

def days_of_cover(stock: float, forecast_daily: float) -> float:
    """days_of_cover = stock / forecast_daily_demand."""
    if forecast_daily <= 0:
        return 999.0 if stock > 0 else 0.0
    return stock / forecast_daily

def is_stockout_flagged(cover: float, lead_time: int) -> bool:
    """Flag at cover < lead_time + 2."""
    return cover < (lead_time + 2)

def is_transfer_triggered(cover: float) -> bool:
    """Transfer trigger at cover < 2.5 days (0.5-day deadband)."""
    return cover < 2.5

def prob_stockout(stock: float, mean_daily: float, std_daily: float, lead_time: int) -> float:
    """
    Probabilistic risk under normal approx: P(D_lead > stock)
    mean = mean_daily * lead_time, sd = std_daily * sqrt(lead_time).
    Computed via erfc: 0.5 * erfc((stock - mean) / (sd * sqrt(2))).
    When stock == mean, erfc(0) = 1.0 -> 0.50 exactly.
    """
    mean_lt = mean_daily * lead_time
    sd_lt = std_daily * math.sqrt(lead_time)
    if sd_lt <= 1e-9:
        if stock < mean_lt:
            return 1.0
        elif stock == mean_lt:
            return 0.50
        else:
            return 0.0
    z = (stock - mean_lt) / (sd_lt * math.sqrt(2.0))
    prob = 0.5 * math.erfc(z)
    return round(float(np.clip(prob, 0.0, 1.0)), 4)

def is_expiry_risk(days_to_expiry: int, cover: float) -> bool:
    """Expiry risk if today + days_of_cover > expiry_date - 7d (cover > days_to_expiry - 7)."""
    return cover > (days_to_expiry - 7)

def rupee_at_risk(margin: float, forecast_daily: float, cover: float, lead_time: int) -> float:
    """Rupee at risk = margin * forecast_daily * max(0, (lead_time + 2) - cover)."""
    days_short = max(0.0, (lead_time + 2) - cover)
    return round(margin * forecast_daily * days_short, 2)

# --- Inventory & Transfer Formulas ---

def safety_stock(std_daily: float, lead_time: int, service_factor: float = 1.65) -> float:
    """Safety stock = 1.65 * sigma * sqrt(lead_time) (≈95% service level)."""
    return service_factor * std_daily * math.sqrt(lead_time)

def compute_transfer_deficit(
    stock: float,
    forecast_daily: float,
    lead_time: int,
    std_daily: float,
    inbound: float = 0.0
) -> int:
    """
    deficit = ceil(forecast * (lead_time + 2) - stock) - inbound.
    If CV = std / mean > 0.15, adds safety stock 1.65 * sigma * sqrt(lead).
    """
    cv = (std_daily / forecast_daily) if forecast_daily > 0 else 0.0
    ss = safety_stock(std_daily, lead_time) if cv > 0.15 else 0.0
    target = forecast_daily * (lead_time + 2) + ss
    deficit = math.ceil(target - stock - inbound)
    return max(0, deficit)

def warehouse_reorder_point(daily_demand: float, lead_time: int, std_daily: float) -> float:
    """Warehouse reorder point = lead_time * daily_demand + safety_stock."""
    ss = safety_stock(std_daily, lead_time)
    return lead_time * daily_demand + ss

def warehouse_order_up_to(daily_demand: float, is_event: bool = False) -> float:
    """Warehouse pool order-up-to = 5 days normal, 10 days in event weeks (>1.2 multiplier)."""
    days = 10.0 if is_event else 5.0
    return daily_demand * days

def source_surplus(
    source_type: str,
    stock: float,
    daily_demand: float,
    lead_time: int,
    std_daily: float,
    inbound: float = 0.0
) -> float:
    """
    Source floor rule:
    - Warehouse floor = its own reorder point (lead * demand + safety). Surplus = stock + inbound - ROP.
    - Outlet donor floor = 5 days of cover. Surplus = max(0, stock - 5 * daily_demand).
    """
    if source_type == "warehouse":
        rop = warehouse_reorder_point(daily_demand, lead_time, std_daily)
        return max(0.0, stock + inbound - rop)
    else:  # outlet
        return max(0.0, stock + inbound - (5.0 * daily_demand))

# --- Expiry Journey 3 Formulas ---

def expiry_redistribution(
    warehouse_stock: int,
    days_to_expiry: int,
    warehouse_daily_demand: float,
    outlet_demands: List[float],
    outlet_stocks: List[int]
) -> Dict[str, Any]:
    """
    Journey 3 Expiry redistribution:
    sellable_window = days_to_expiry - 7
    warehouse_own_sell = warehouse_daily_demand * sellable_window
    units_to_move = stock - warehouse_own_sell
    outlet absorb_capacity = outlet_daily_demand * sellable_window - outlet_stock
    residual_needing_markdown = move - sum(absorb_capacities)
    """
    sellable_window = max(0, days_to_expiry - 7)
    own_sell = warehouse_daily_demand * sellable_window
    units_to_move = max(0, int(round(warehouse_stock - own_sell)))

    absorb_capacities = []
    for d, s in zip(outlet_demands, outlet_stocks):
        cap = max(0, int(round(d * sellable_window - s)))
        absorb_capacities.append(cap)

    total_absorb = sum(absorb_capacities)
    residual_markdown = max(0, units_to_move - total_absorb)
    allocated_move = min(units_to_move, total_absorb)

    return {
        "sellable_window_days": sellable_window,
        "units_to_move": units_to_move,
        "outlet_absorb_capacities": absorb_capacities,
        "total_absorb": total_absorb,
        "allocated_move": allocated_move,
        "residual_needing_markdown": residual_markdown
    }

# --- Allocation: SciPy linprog (HiGHS) vs Greedy ---

def solve_allocation_lp(
    deficits: List[Dict[str, Any]],  # [{"id": "D1", "qty": 60, "value": 122}]
    sources: List[Dict[str, Any]],    # [{"id": "S1", "qty": 50, "type": "warehouse"}]
    lane_reach: Optional[Dict[Tuple[str, str], float]] = None  # (src_id, dst_id) -> cost
) -> Tuple[float, List[Dict[str, Any]]]:
    """
    Solves min-cost flow LP using SciPy linprog (HiGHS)
    Maximises sum((value_j - cost_ij) * x_ij).
    Lane costs: warehouse->outlet = 1, outlet->outlet = 2.
    """
    num_s = len(sources)
    num_d = len(deficits)
    if num_s == 0 or num_d == 0:
        return 0.0, []

    # Variables x[i, j]: from source i to deficit j
    num_vars = num_s * num_d
    c = []  # objective: minimize -1 * (value_j - cost_ij)

    for i, s in enumerate(sources):
        for j, d in enumerate(deficits):
            src_id = s["id"]
            dst_id = d["id"]
            default_cost = 1.0 if s.get("type") == "warehouse" else 2.0
            if lane_reach is not None and (src_id, dst_id) not in lane_reach:
                # unreachable lane
                cost = 1e6
            else:
                cost = lane_reach[(src_id, dst_id)] if lane_reach is not None else default_cost
            net_val = d["value"] - cost
            c.append(-net_val)

    # Constraints:
    # 1. Source supply: sum_j x_ij <= supply_i
    A_ub = []
    b_ub = []
    for i, s in enumerate(sources):
        row = [0.0] * num_vars
        for j in range(num_d):
            row[i * num_d + j] = 1.0
        A_ub.append(row)
        b_ub.append(float(s["qty"]))

    # 2. Deficit cap: sum_i x_ij <= deficit_j
    for j, d in enumerate(deficits):
        row = [0.0] * num_vars
        for i in range(num_s):
            row[i * num_d + j] = 1.0
        A_ub.append(row)
        b_ub.append(float(d["qty"]))

    bounds = [(0, None) for _ in range(num_vars)]

    res = linprog(c, A_ub=A_ub, b_ub=b_ub, bounds=bounds, method="highs")
    if not res.success:
        return 0.0, []

    total_value = -res.fun
    allocations = []
    for i, s in enumerate(sources):
        for j, d in enumerate(deficits):
            qty = round(res.x[i * num_d + j])
            if qty > 0 and (lane_reach is None or (s["id"], d["id"]) in lane_reach):
                allocations.append({
                    "from_node_id": s["id"],
                    "to_node_id": d["id"],
                    "quantity": int(qty)
                })

    return total_value, allocations

def solve_allocation_greedy(
    deficits: List[Dict[str, Any]],
    sources: List[Dict[str, Any]],
    lane_reach: Optional[Dict[Tuple[str, str], float]] = None
) -> Tuple[float, List[Dict[str, Any]]]:
    """
    Greedy allocation: sorts deficits by value descending.
    For each deficit, takes from the cheapest available reachable source.
    """
    sorted_deficits = sorted(deficits, key=lambda x: x["value"], reverse=True)
    rem_supply = {s["id"]: float(s["qty"]) for s in sources}
    source_map = {s["id"]: s for s in sources}

    total_value = 0.0
    allocations = []

    for d in sorted_deficits:
        needed = float(d["qty"])
        # Find reachable sources with remaining supply, sorted by cost ascending
        candidate_sources = []
        for s in sources:
            s_id = s["id"]
            if rem_supply[s_id] <= 0:
                continue
            if lane_reach is not None and (s_id, d["id"]) not in lane_reach:
                continue
            cost = lane_reach[(s_id, d["id"])] if lane_reach is not None else (1.0 if s.get("type") == "warehouse" else 2.0)
            candidate_sources.append((cost, s_id))

        candidate_sources.sort(key=lambda x: x[0])

        for cost, s_id in candidate_sources:
            if needed <= 0:
                break
            take = min(needed, rem_supply[s_id])
            if take > 0:
                rem_supply[s_id] -= take
                needed -= take
                net_val = (d["value"] - cost) * take
                total_value += net_val
                allocations.append({
                    "from_node_id": s_id,
                    "to_node_id": d["id"],
                    "quantity": int(take)
                })

    return total_value, allocations
