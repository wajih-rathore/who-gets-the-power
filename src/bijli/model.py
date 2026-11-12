"""Who Gets the Power?: instance, objective, QUBO and classical baselines (all numbers synthetic)."""
import itertools

import numpy as np
from qiskit_optimization import QuadraticProgram
from qiskit_optimization.converters import QuadraticProgramToQubo

BLOCKS = ["N1", "N2", "N3", "DC"]
NEIGH = BLOCKS[:3]
T = 3
HOURS = ["2–3 pm", "3–4 pm", "4–5 pm"]
N = len(BLOCKS) * T  # 12 qubits; qubit b*T+t <-> x[b,t]

INFO = {  # synthetic
    "N1": {"name": "Area 1", "kind": "homes", "loss_pct": 38, "damage_per_hour": 1.6},
    "N2": {"name": "Area 2", "kind": "homes", "loss_pct": 22, "damage_per_hour": 1.0},
    "N3": {"name": "Area 3", "kind": "market", "loss_pct": 12, "damage_per_hour": 3.0},
    "DC": {"name": "AI data center", "kind": "datacenter", "revenue_per_hour": [5.5, 7.0, 4.5]},
}
W = {"fairness": 2.0, "back_to_back": 3.0, "revenue": 1.0, "damage": 1.0, "penalty": 40.0}
K_NORMAL, K_DISASTER = [1, 2, 1], [1, 3, 1]
REV = INFO["DC"]["revenue_per_hour"]
D = {n: INFO[n]["damage_per_hour"] for n in NEIGH}
HOUR_DAMAGE = [1.0, 1.4, 1.2]  # synthetic: an outage hurts more at the 3-4 pm peak; also breaks ties between hours


def idx(b, t):
    return BLOCKS.index(b) * T + t


def name(b, t):
    return f"x_{b}_{t}"


def hour_cost(b, t, w=W):
    """Cost of cutting block b in hour t on its own (what greedy sees): fairness + damage, or lost revenue."""
    return w["revenue"] * REV[t] if b == "DC" else w["fairness"] + w["damage"] * D[b] * HOUR_DAMAGE[t]


def parts(x, w=W):
    """The four goals for plan x (0/1 list of 12): fairness, back-to-back, revenue lost, damage."""
    g = lambda b, t: x[idx(b, t)]
    fair = w["fairness"] * sum(sum(g(n, t) for t in range(T)) ** 2 for n in NEIGH)
    b2b = w["back_to_back"] * sum(g(n, t) * g(n, t + 1) for n in NEIGH for t in range(T - 1))
    rev = w["revenue"] * sum(REV[t] * g("DC", t) for t in range(T))
    dmg = w["damage"] * sum(D[n] * HOUR_DAMAGE[t] * g(n, t) for n in NEIGH for t in range(T))
    return fair, b2b, rev, dmg


def objective(x, w=W):
    return sum(parts(x, w))


def feasible(x, k):
    return all(sum(x[idx(b, t)] for b in BLOCKS) == k[t] for t in range(T))


def build_qp(k, w=W):
    """Minimise the four goals s.t. exactly k_t blocks are off in hour t (penalty added by to_qubo)."""
    qp = QuadraticProgram("bijli")
    for b in BLOCKS:
        for t in range(T):
            qp.binary_var(name(b, t))
    lin, quad = {}, {}
    for n in NEIGH:
        for t in range(T):
            lin[name(n, t)] = w["fairness"] + w["damage"] * D[n] * HOUR_DAMAGE[t]  # x^2 = x on the fairness diagonal
        for t1, t2 in itertools.combinations(range(T), 2):
            quad[(name(n, t1), name(n, t2))] = 2 * w["fairness"] + (w["back_to_back"] if t2 == t1 + 1 else 0)
    for t in range(T):
        lin[name("DC", t)] = w["revenue"] * REV[t]
    qp.minimize(linear=lin, quadratic=quad)
    for t in range(T):
        qp.linear_constraint({name(b, t): 1 for b in BLOCKS}, "==", k[t], f"hour_{t}")
    return qp


def to_qubo(qp, penalty=W["penalty"]):
    return QuadraticProgramToQubo(penalty=penalty).convert(qp)


def qubo_energies(qubo):
    """Energy of all 2^12 bitstrings; index i has variable q = (i >> q) & 1 (Qiskit little-endian)."""
    n = qubo.get_num_vars()
    X = (np.arange(2 ** n)[:, None] >> np.arange(n)) & 1
    Q = qubo.objective.quadratic.to_array(symmetric=False)
    return qubo.objective.constant + X @ qubo.objective.linear.to_array() + np.einsum("ij,jk,ik->i", X, Q, X)


def index_to_x(i, n=N):
    return [(i >> q) & 1 for q in range(n)]


def x_to_index(x):
    return sum(int(v) << q for q, v in enumerate(x))


def all_plans(k):
    """Every valid plan: choose k_t blocks per hour."""
    for combo in itertools.product(*[itertools.combinations(range(len(BLOCKS)), kt) for kt in k]):
        x = [0] * N
        for t, cut in enumerate(combo):
            for b in cut:
                x[b * T + t] = 1
        yield x


def exact(k, w=W):
    """Brute force over valid plans. Returns (best plan, best value, number of optimal plans)."""
    plans = list(all_plans(k))
    vals = [objective(x, w) for x in plans]
    best = min(vals)
    return plans[vals.index(best)], best, sum(abs(v - best) < 1e-9 for v in vals)


def _plan(cuts_per_hour):
    x = [0] * N
    for t, cut in enumerate(cuts_per_hour):
        for b in cut:
            x[BLOCKS.index(b) * T + t] = 1
    return x


def today(k):
    """Cut by losses: highest loss_pct neighborhoods first; DC only if k_t exceeds the neighborhoods."""
    order = sorted(NEIGH, key=lambda n: -INFO[n]["loss_pct"]) + ["DC"]
    return _plan([order[:kt] for kt in k])


def dc_first(k):
    """DC off every hour, then the highest-loss neighborhoods."""
    order = ["DC"] + sorted(NEIGH, key=lambda n: -INFO[n]["loss_pct"])
    return _plan([order[:kt] for kt in k])


def greedy(k, w=W):
    """Each hour independently takes the k_t cheapest blocks, ignoring the other hours."""
    return _plan([sorted(BLOCKS, key=lambda b: hour_cost(b, t, w))[:kt] for t, kt in enumerate(k)])


def metrics(x, k, best, w=W):
    off = {b: x[BLOCKS.index(b) * T:(BLOCKS.index(b) + 1) * T] for b in BLOCKS}
    obj = objective(x, w)
    kept = sum(REV[t] for t in range(T) if not off["DC"][t])
    return {"off": off, "valid": feasible(x, k), "objective": round(obj, 3), "approx_ratio": round(best / obj, 4),
            "is_optimal": abs(obj - best) < 1e-9, "max_dark_hours": max(sum(off[n]) for n in NEIGH),
            "back_to_back": sum(off[n][t] * off[n][t + 1] for n in NEIGH for t in range(T - 1)),
            "home_dark_hours": sum(sum(off[n]) for n in NEIGH), "dc_revenue_kept": round(kept, 3),
            "dc_revenue_kept_pct": round(100 * kept / sum(REV), 1),
            "economic_damage": round(sum(D[n] * HOUR_DAMAGE[t] * off[n][t] for n in NEIGH for t in range(T)), 3)}
