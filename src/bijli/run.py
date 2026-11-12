"""One command: PYTHONPATH=src python -m bijli.run (or cd src && ../.venv/bin/python -m bijli.run)
-> web/data/results.json, results/*.png, results/summary.md"""
import json
from pathlib import Path

import matplotlib
import numpy as np

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

from .model import (BLOCKS, HOURS, INFO, K_DISASTER, K_NORMAL, N, W, build_qp, dc_first, exact,  # noqa: E402
                    feasible, greedy, index_to_x, metrics, objective, qubo_energies, to_qubo, today, x_to_index)
from .quantum import run_qaoa  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
SHOTS, SEEDS, REPS = 1024, (1, 2, 3), 2
LABELS = {"today": "Today's rule (cut highest losses)", "dc_first": "Data center always first",
          "greedy": "Greedy (hour by hour)", "qaoa": "Quantum (QAOA)", "exact": "Exact (brute force)"}
SWEEP = [("Protect homes", 0.5), ("Lean homes", 0.8), ("Balanced", 1.0), ("Protect revenue", 2.0)]


def check_penalty(k, w):
    """The lowest QUBO energy over all 4096 strings must be the unique constrained optimum."""
    qp = build_qp(k, w)
    E = qubo_energies(to_qubo(qp, w["penalty"]))
    x_best, best, n_opt = exact(k, w)
    assert n_opt == 1 and index_to_x(int(np.argmin(E))) == x_best, f"penalty too small or optimum not unique: {k} {w}"
    return qp, E, x_best, best


def qaoa_plan(qp, E, k, w, seeds):
    """Best restart by expected energy (no peeking at the optimum); plan = best valid sample among the shots."""
    runs = [run_qaoa(qp, reps=REPS, seed=s, penalty=w["penalty"]) for s in seeds]
    q = min(runs, key=lambda r: float(r["probs"] @ E))
    shots = np.random.default_rng(0).choice(2 ** N, size=SHOTS, p=q["probs"] / q["probs"].sum())
    good = [index_to_x(int(i)) for i in shots if feasible(index_to_x(int(i)), k)]
    return (min(good, key=lambda x: objective(x, w)) if good else None), q, runs


def solve(k, w=W):
    qp, E, x_best, best = check_penalty(k, w)
    x_q, q, runs = qaoa_plan(qp, E, k, w, SEEDS)
    feas = np.array([feasible(index_to_x(i), k) for i in range(2 ** N)])
    xs = {"today": today(k), "dc_first": dc_first(k), "greedy": greedy(k, w), "qaoa": x_q, "exact": x_best}
    plans = {key: {"label": LABELS[key], **metrics(x, k, best, w)} for key, x in xs.items() if x is not None}
    stats = {"qubits": q["qubits"], "reps": REPS, "shots": SHOTS, "seconds": round(sum(r["seconds"] for r in runs), 1),
             "restarts": len(SEEDS), "p_opt": round(float(q["probs"][x_to_index(x_best)]), 5),
             "p_feasible": round(float(q["probs"][feas].sum()), 4), "p_opt_random": round(1 / 2 ** N, 6),
             "p_feasible_random": round(float(feas.mean()), 4), "found_optimum": x_q == x_best}
    return {"shortfall_blocks": k, "plans": plans, "qaoa": stats}


def sweep_point(label, rw):
    w = {**W, "revenue": rw}
    qp, E, x_best, best = check_penalty(K_NORMAL, w)
    x_q, _, _ = qaoa_plan(qp, E, K_NORMAL, w, SEEDS[:1])  # one restart per slider point keeps total runtime low
    return {"label": label, "revenue_weight": rw, "plan": {"label": LABELS["exact"], **metrics(x_best, K_NORMAL, best, w)},
            "qaoa_found_optimum": x_q == x_best}


def charts(res):
    d = ROOT / "results"
    d.mkdir(exist_ok=True)
    keys = ["today", "dc_first", "greedy", "qaoa", "exact"]
    names = ["Today's rule", "DC first", "Greedy", "QAOA", "Exact"]
    colors = ["#9a3412", "#a16207", "#c2410c", "#2563eb", "#475569"]
    fig, axes = plt.subplots(1, 3, figsize=(12, 3.8))
    for ax, (field, title) in zip(axes, [("max_dark_hours", "Most dark hours for one area"),
                                         ("back_to_back", "Back-to-back dark hours"),
                                         ("dc_revenue_kept_pct", "Data-center revenue kept (%)")]):
        plans = res["scenarios"]["normal"]["plans"]
        ax.bar(names, [plans[k][field] for k in keys], color=colors)
        ax.set_title(title + " (normal)", fontsize=9)
        ax.tick_params(axis="x", labelrotation=30, labelsize=8)
    fig.tight_layout()
    fig.savefig(d / "plans_comparison.png", dpi=150)
    fig, ax = plt.subplots(figsize=(6.5, 4))
    for i, sc in enumerate(["normal", "disaster"]):
        q = res["scenarios"][sc]["qaoa"]
        ax.bar(np.arange(2) + (i - 0.5) * 0.35, [q["p_opt"], q["p_feasible"]], 0.33, label=f"QAOA, {sc}")
        ax.scatter(np.arange(2) + (i - 0.5) * 0.35, [q["p_opt_random"], q["p_feasible_random"]], color="black",
                   marker="_", s=500, zorder=3, label="random 12-bit guess" if i == 0 else None)
    ax.set_yscale("log")
    ax.set_xticks(range(2), ["P(exact optimum)", "P(obeys the rule)"])
    ax.set_ylabel("probability (log scale)")
    ax.set_title("QAOA output vs a random guess (12 qubits, reps=2)", fontsize=10)
    ax.legend(fontsize=8)
    fig.tight_layout()
    fig.savefig(d / "qaoa_probabilities.png", dpi=150)
    rows = ["# Who Gets the Power? Results (synthetic data)", "",
            "Run: `cd src && ../.venv/bin/python -m bijli.run` (equivalently `PYTHONPATH=src python -m bijli.run` from the repo root).", "",
            "| Scenario | Plan | Objective | Approx. ratio | Max dark h | Back-to-back | DC revenue kept % | Damage |",
            "|---|---|---|---|---|---|---|---|"]
    for sc in ["normal", "disaster"]:
        for k in keys:
            p = res["scenarios"][sc]["plans"].get(k)
            if p:
                rows.append(f"| {sc} | {p['label']} | {p['objective']} | {p['approx_ratio']} | {p['max_dark_hours']} | "
                            f"{p['back_to_back']} | {p['dc_revenue_kept_pct']} | {p['economic_damage']} |")
    rows += ["", "QAOA:", ""]
    for sc in ["normal", "disaster"]:
        rows.append(f"- {sc}: " + json.dumps(res["scenarios"][sc]["qaoa"]))
    rows += ["", "Sweep (exact plan per revenue weight):", ""]
    for s in res["sweep"]:
        p = s["plan"]
        rows.append(f"- {s['label']} (w_r={s['revenue_weight']}): off={p['off']}, DC revenue kept {p['dc_revenue_kept_pct']}%, "
                    f"QAOA found optimum: {s['qaoa_found_optimum']}")
    (d / "summary.md").write_text("\n".join(rows) + "\n")


def main():
    res = {"synthetic": True, "mw_per_block": 10,
           "currency_note": "revenue and damage in synthetic 'PKR million per hour'", "hours": HOURS, "blocks": BLOCKS,
           "block_info": INFO, "hospital": {"name": "Hospital", "always_on": True}, "weights": W, "scenarios": {}}
    for key, k, label, desc in [
        ("normal", K_NORMAL, "Normal hot afternoon", "Power is short by one block at 2 pm, two at 3 pm and one at 4 pm."),
        ("disaster", K_DISASTER, "Disaster: a power plant trips",
         "A plant trips at 3 pm, so three blocks must go dark that hour instead of two.")]:
        res["scenarios"][key] = {"label": label, "description": desc, **solve(k)}
        print(key, json.dumps(res["scenarios"][key]["qaoa"]))
    res["sweep"] = [sweep_point(lbl, rw) for lbl, rw in SWEEP]
    out = ROOT / "web" / "data" / "results.json"
    out.write_text(json.dumps(res, indent=1))
    charts(res)
    print("wrote", out, "and results/")


if __name__ == "__main__":
    main()
