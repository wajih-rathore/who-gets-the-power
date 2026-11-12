import numpy as np
import pytest

from bijli.model import (BLOCKS, K_DISASTER, K_NORMAL, W, all_plans, build_qp, dc_first, exact, feasible, greedy,
                         index_to_x, metrics, objective, qubo_energies, to_qubo, today, x_to_index)

KS = [K_NORMAL, K_DISASTER]


@pytest.mark.parametrize("k", KS)
def test_qubo_matches_objective_on_valid_plans(k):
    E = qubo_energies(to_qubo(build_qp(k)))
    for x in all_plans(k):  # penalty is zero on valid plans
        assert E[x_to_index(x)] == pytest.approx(objective(x))


@pytest.mark.parametrize("k", KS)
def test_penalty_makes_lowest_energy_the_constrained_optimum(k):
    E = qubo_energies(to_qubo(build_qp(k), W["penalty"]))
    x_best, best, n_opt = exact(k)
    assert n_opt == 1  # unique optimum
    assert feasible(x_best, k) and index_to_x(int(np.argmin(E))) == x_best and E.min() == pytest.approx(best)


def test_small_penalty_breaks_the_rule():
    x = index_to_x(int(np.argmin(qubo_energies(to_qubo(build_qp(K_NORMAL), 1.0)))))
    assert not feasible(x, K_NORMAL)


@pytest.mark.parametrize("k", KS)
def test_baselines_valid_and_worse_than_exact(k):
    x_best, best, _ = exact(k)
    for f in (today, dc_first, greedy):
        assert feasible(f(k), k)
    ex, td, gr, dc = (metrics(x, k, best) for x in (x_best, today(k), greedy(k), dc_first(k)))
    assert td["approx_ratio"] < 1 and gr["approx_ratio"] < 1
    assert td["max_dark_hours"] > ex["max_dark_hours"] and gr["back_to_back"] >= 1
    assert dc["dc_revenue_kept_pct"] < ex["dc_revenue_kept_pct"]


def test_metrics_on_hand_checked_plan():
    # N1 off hours 0,1; N2 off hour 1; DC off hour 2. k = [1, 2, 1]
    x = [0] * 12
    for b, t in [("N1", 0), ("N1", 1), ("N2", 1), ("DC", 2)]:
        x[BLOCKS.index(b) * 3 + t] = 1
    m = metrics(x, K_NORMAL, best=10.0)
    assert m["valid"] and m["max_dark_hours"] == 2 and m["back_to_back"] == 1 and m["home_dark_hours"] == 3
    assert m["dc_revenue_kept"] == pytest.approx(12.5) and m["dc_revenue_kept_pct"] == pytest.approx(73.5)
    assert m["economic_damage"] == pytest.approx(1.6 * 1.0 + 1.6 * 1.4 + 1.0 * 1.4)
    # fairness 2*(4+1)=10, back-to-back 3, revenue lost 4.5, damage 5.24
    assert m["objective"] == pytest.approx(10 + 3 + 4.5 + 5.24)
