from decision_core import solve_allocation_lp, solve_allocation_greedy

def run_constructed_case():
    """
    Constructed two-source case from PRD Appendix C:
    Destination 1: 60 units, value 122
    Destination 2: 20 units, value 56
    Source 1 (Warehouse): 50 units (lane cost to D1 = 1, D2 = 1)
    Source 2 (Donor Outlet): 20 units (lane cost to D1 = 2, D2 unreachable)
    Greedy yields 7,250; LP yields 7,790 (diff = 540).
    """
    deficits = [
        {"id": "D1", "qty": 60, "value": 122},
        {"id": "D2", "qty": 20, "value": 56}
    ]
    sources = [
        {"id": "S1", "qty": 50, "type": "warehouse"},
        {"id": "S2", "qty": 20, "type": "outlet"}
    ]
    lane_reach = {
        ("S1", "D1"): 1.0,
        ("S1", "D2"): 1.0,
        ("S2", "D1"): 2.0
        # ("S2", "D2") is unreachable
    }

    lp_val, lp_alloc = solve_allocation_lp(deficits, sources, lane_reach)
    greedy_val, greedy_alloc = solve_allocation_greedy(deficits, sources, lane_reach)

    assert round(lp_val) == 7790, f"Expected LP value 7790, got {lp_val}"
    assert round(greedy_val) == 7250, f"Expected Greedy value 7250, got {greedy_val}"
    assert round(lp_val - greedy_val) == 540, f"Expected diff 540, got {lp_val - greedy_val}"

    return {
        "lp_value": round(lp_val),
        "greedy_value": round(greedy_val),
        "diff": round(lp_val - greedy_val),
        "lp_allocations": lp_alloc,
        "greedy_allocations": greedy_alloc
    }

if __name__ == "__main__":
    res = run_constructed_case()
    print("Constructed case assertion PASSED:", res)
