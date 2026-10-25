import math
import pytest
from formulas import (
    compute_wma,
    filter_censored_days,
    compute_shrunk_dow,
    cap_trend_factor,
    calculate_forecast,
    compute_wape,
    days_of_cover,
    is_stockout_flagged,
    is_transfer_triggered,
    prob_stockout,
    is_expiry_risk,
    rupee_at_risk,
    safety_stock,
    compute_transfer_deficit,
    warehouse_reorder_point,
    warehouse_order_up_to,
    source_surplus,
    expiry_redistribution,
)
from allocation import run_constructed_case

# 1. WMA recency weighting
def test_wma_recency_weighted():
    # 3 days: sales = [10, 10, 20], weights = [1, 2, 3] -> (10*1 + 10*2 + 20*3) / 6 = 90 / 6 = 15.0
    val = compute_wma([10.0, 10.0, 20.0], [1.0, 2.0, 3.0])
    assert val == pytest.approx(15.0)

# 2. WMA edge cases
def test_wma_empty_and_zero():
    assert compute_wma([]) == 0.0
    assert compute_wma([0.0, 0.0]) == 0.0

# 3. Censored demand filter
def test_censored_days_filter():
    sales = [10.0, 0.0, 15.0, 0.0]
    opening_stocks = [20, 0, 15, 0]
    # Days 2 and 4 had 0 stock, so censored
    filtered = filter_censored_days(sales, opening_stocks)
    assert filtered == [10.0, 15.0]

# 4. Day-of-week shrinkage
def test_shrunk_dow_factor():
    outlet_dow = 1.2
    cat_dow = 0.9
    shrunk = compute_shrunk_dow(outlet_dow, cat_dow)
    assert shrunk == pytest.approx(0.7 * 1.2 + 0.3 * 0.9)  # 1.11

# 5. Trend factor cap upper bound
def test_trend_factor_cap_upper():
    assert cap_trend_factor(1.45) == 1.25

# 6. Trend factor cap lower bound
def test_trend_factor_cap_lower():
    assert cap_trend_factor(0.65) == 0.8

# 7. Trend factor within bounds
def test_trend_factor_normal():
    assert cap_trend_factor(1.10) == 1.10

# 8. Forecast composition
def test_calculate_forecast_composition():
    # base 10, dow 1.1, event 1.4, trend 1.0 -> 10 * 1.1 * 1.4 * 1.0 = 15.4
    fc = calculate_forecast(10.0, 1.1, 1.4, 1.0)
    assert fc == pytest.approx(15.4)

# 9. WAPE calculation
def test_wape_calculation():
    actuals = [10.0, 20.0, 30.0]
    forecasts = [12.0, 18.0, 35.0]
    # errors: 2 + 2 + 5 = 9. sum(actuals) = 60. WAPE = 9 / 60 = 0.15 (15%)
    wape = compute_wape(actuals, forecasts)
    assert wape == pytest.approx(0.15)

# 10. Days of cover calculation
def test_days_of_cover_normal():
    assert days_of_cover(14.0, 14.0) == pytest.approx(1.0)
    assert days_of_cover(42.0, 14.0) == pytest.approx(3.0)

# 11. Days of cover zero demand
def test_days_of_cover_zero_demand():
    assert days_of_cover(10.0, 0.0) == 999.0
    assert days_of_cover(0.0, 0.0) == 0.0

# 12. Stockout flag threshold (outlet)
def test_stockout_flag_outlet():
    # lead time 1 day -> flag threshold is 1 + 2 = 3 days
    assert is_stockout_flagged(1.0, 1) is True
    assert is_stockout_flagged(2.9, 1) is True

# 13. Stockout flag unflagged
def test_stockout_flag_unflagged():
    assert is_stockout_flagged(3.0, 1) is False
    assert is_stockout_flagged(4.5, 1) is False

# 14. Transfer trigger deadband
def test_transfer_trigger_deadband():
    # Flag threshold is 3.0, but trigger threshold is 2.5
    assert is_transfer_triggered(2.6) is False
    assert is_transfer_triggered(2.4) is True
    assert is_transfer_triggered(1.0) is True

# 15. Probabilistic stockout at mean lead time demand
def test_prob_stockout_exact_mean():
    # stock 14, mean 14, lead time 1 -> P = 0.50 exactly
    prob = prob_stockout(stock=14.0, mean_daily=14.0, std_daily=2.0, lead_time=1)
    assert prob == pytest.approx(0.50, abs=1e-3)

# 16. Probabilistic stockout high stock
def test_prob_stockout_high_stock():
    prob = prob_stockout(stock=50.0, mean_daily=14.0, std_daily=2.0, lead_time=1)
    assert prob < 0.01

# 17. Probabilistic stockout low stock
def test_prob_stockout_low_stock():
    prob = prob_stockout(stock=2.0, mean_daily=14.0, std_daily=2.0, lead_time=1)
    assert prob > 0.99

# 18. Rupee at risk calculation
def test_rupee_at_risk_calculation():
    # margin = 10, forecast = 14, cover = 1.0, lead = 1 -> short = 3 - 1 = 2 days -> 10 * 14 * 2 = 280
    rar = rupee_at_risk(margin=10.0, forecast_daily=14.0, cover=1.0, lead_time=1)
    assert rar == 280.0

# 19. Safety stock formula
def test_safety_stock_formula():
    ss = safety_stock(std_daily=2.0, lead_time=1, service_factor=1.65)
    assert ss == pytest.approx(3.30)

# 20. Transfer deficit low CV (Shop 12 fixture)
def test_transfer_deficit_low_cv():
    # Steady 14/day, CV = 0.05 <= 0.15, lead time 1, stock 14, target 3 days = 42 units -> deficit = 28
    defic = compute_transfer_deficit(stock=14, forecast_daily=14.0, lead_time=1, std_daily=0.7)
    assert defic == 28

# 21. Transfer deficit high CV (adds safety stock)
def test_transfer_deficit_high_cv():
    # Volatile demand CV = 3.0 / 10.0 = 0.30 > 0.15, lead 1, stock 10
    # target = 10 * 3 + 1.65 * 3 * 1 = 30 + 4.95 = 34.95 -> ceil(34.95 - 10) = 25
    defic = compute_transfer_deficit(stock=10, forecast_daily=10.0, lead_time=1, std_daily=3.0)
    assert defic == 25

# 22. Warehouse reorder point
def test_warehouse_reorder_point():
    # Daily 60, lead 3, std 4 -> ROP = 3 * 60 + 1.65 * 4 * sqrt(3) ≈ 180 + 11.43 ≈ 191.43
    rop = warehouse_reorder_point(daily_demand=60.0, lead_time=3, std_daily=4.0)
    assert rop == pytest.approx(191.43, abs=0.1)

# 23. Warehouse order-up-to (normal vs event)
def test_warehouse_order_up_to_normal_and_event():
    assert warehouse_order_up_to(60.0, is_event=False) == 300.0  # 5 days
    assert warehouse_order_up_to(60.0, is_event=True) == 600.0   # 10 days

# 24. Source surplus floor rule
def test_source_surplus_warehouse_floor():
    # Warehouse stock 900, demand 60, lead 3, std 0 -> ROP = 180. Surplus = 900 - 180 = 720
    surplus = source_surplus(source_type="warehouse", stock=900, daily_demand=60.0, lead_time=3, std_daily=0.0)
    assert surplus == 720.0

# 25. Journey 3 Expiry redistribution
def test_journey_3_expiry_redistribution():
    # PRD §7.7 example:
    # 300 units, 21 days expiry, warehouse demand 8/day, outlet demands [19], outlet stock [60]
    res = expiry_redistribution(
        warehouse_stock=300,
        days_to_expiry=21,
        warehouse_daily_demand=8.0,
        outlet_demands=[19.0],
        outlet_stocks=[60]
    )
    assert res["sellable_window_days"] == 14
    assert res["units_to_move"] == 188
    assert res["total_absorb"] == 206
    assert res["allocated_move"] == 188
    assert res["residual_needing_markdown"] == 0

# 26. LP beats greedy constructed case (7,790 vs 7,250, delta = 540)
def test_lp_beats_greedy_constructed_case():
    res = run_constructed_case()
    assert res["lp_value"] == 7790
    assert res["greedy_value"] == 7250
    assert res["diff"] == 540
