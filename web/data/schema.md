# `web/data/results.json` contract

Written by `python -m bijli.run` (from `src/`). Every input number is **synthetic**: made up but plausible. Every output number comes from a real solver run.
Block ids: `N1`, `N2`, `N3` (neighborhoods), `DC` (AI data center). Each block is one equal 10 MW chunk. The hospital is always on and is not a decision variable.
Hours are indexed 0, 1, 2 in every array (hour 1, 2, 3 in the spec).

```jsonc
{
  "synthetic": true,
  "mw_per_block": 10,
  "currency_note": "revenue and damage in synthetic 'PKR million per hour'",
  "hours": ["2–3 pm", "3–4 pm", "4–5 pm"],
  "blocks": ["N1", "N2", "N3", "DC"],
  "block_info": {
    "N1": {"name": "Area 1", "kind": "homes",  "loss_pct": 38, "damage_per_hour": 1.0},
    "N2": {"name": "Area 2", "kind": "homes",  "loss_pct": 22, "damage_per_hour": 1.2},
    "N3": {"name": "Area 3", "kind": "market", "loss_pct": 12, "damage_per_hour": 3.0},
    "DC": {"name": "AI data center", "kind": "datacenter", "revenue_per_hour": [3.0, 5.0, 4.0]}
  },
  "hospital": {"name": "Hospital", "always_on": true},
  "weights": {"fairness": 2.0, "back_to_back": 3.0, "revenue": 1.0, "damage": 1.0, "penalty": 40.0},
  "scenarios": {
    "normal":   { /* SCENARIO, shortfall [1, 2, 1] */ },
    "disaster": { /* SCENARIO, a plant trips in hour 2: shortfall [1, 3, 1] */ }
  },
  "sweep": [                               // 3–5 points, ordered "protect homes" -> "protect revenue" (slider order)
    {"label": "Protect homes", "revenue_weight": 0.5,
     "plan": { /* PLAN: the exact optimum for the normal scenario at this weight */ },
     "qaoa_found_optimum": true}           // true/false, or null if QAOA was not run for this point
  ]
}
```

SCENARIO:

```jsonc
{
  "label": "Normal hot afternoon",
  "description": "one plain sentence",
  "shortfall_blocks": [1, 2, 1],           // k_t: how many blocks must be switched off in each hour
  "plans": {                               // keys exactly: "today", "dc_first", "greedy", "qaoa", "exact"
    "today": PLAN, "dc_first": PLAN, "greedy": PLAN, "qaoa": PLAN, "exact": PLAN
  },
  "qaoa": {
    "qubits": 12, "reps": 2, "shots": 1024, "seconds": 9.1, "restarts": 3,
    "p_opt": 0.01,                         // probability the final state gives the exact optimum
    "p_feasible": 0.2,                     // fraction of probability on plans that follow the rule (exact shortfall each hour)
    "p_opt_random": 0.000244,              // same for a uniformly random 12-bit string
    "p_feasible_random": 0.0527,           // (#valid plans)/4096
    "found_optimum": true                  // best valid sample among the shots equals the exact optimum
  }
}
```

PLAN:

```jsonc
{
  "label": "Today's rule (cut highest losses)",   // labels: "Today's rule (cut highest losses)", "Data center always first", "Greedy (hour by hour)", "Quantum (QAOA)", "Exact (brute force)"
  "off": {"N1": [1, 1, 0], "N2": [0, 0, 1], "N3": [0, 0, 0], "DC": [0, 1, 0]},  // 1 = switched OFF in that hour
  "valid": true,                           // exactly k_t blocks off in every hour
  "objective": 31.0,                       // lower is better (no penalty term)
  "approx_ratio": 0.81,                    // exact objective / this objective; 1.0 = optimal
  "is_optimal": false,
  "max_dark_hours": 2,                     // most dark hours for any one neighborhood
  "back_to_back": 1,                       // count of (neighborhood, hour) where it is dark this hour AND the next
  "home_dark_hours": 3,                    // total neighborhood-hours dark
  "dc_revenue_kept": 9.0,                  // sum of revenue_per_hour over hours the DC is on
  "dc_revenue_kept_pct": 75.0,
  "economic_damage": 3.2                   // sum of damage_per_hour over dark neighborhood-hours
}
```

The numbers above are placeholders showing the shape; the real values live in `results.json`.

## QAOA trace (added 17:25 UTC): `scenarios.<name>.qaoa.trace`

A record of the real QAOA run (the best restart), so the page can replay it. Fixed seeds; real numbers only.

```jsonc
"trace": {
  "qubit_map": [{"q": 0, "block": "N1", "hour": 0}, /* ... 12 entries, q0..q11 */],
  "bit_order": "bitstring[i] is qubit q_i (q0 is the leftmost character)",   // NOT Qiskit's little-endian order
  "circuit": {"image": "assets/circuit_normal.svg", "reps": 2, "depth": 57, "two_qubit_gates": 96,
              "num_params": 4, "note": "how depth and gates were counted (e.g. after transpile to cx/rz/rx/h)"},
  "cobyla": {
    "iterations": [{"i": 1, "energy": 41.2, "gamma": [0.1, 0.2], "beta": [0.3, 0.4]} /* ... every evaluation */],
    "final_gamma": [0.41, 0.77], "final_beta": [0.52, 0.18], "evaluations": 87
  },
  "histogram": {
    "shots": 1024,
    "top": [{"bitstring": "010001100001", "count": 9, "valid": true, "is_optimum": true, "objective": 17.14} /* ~12 most frequent; objective null if invalid */]
  },
  "decoded": {"bitstring": "010001100001", "off": {"N1": [0,1,0], "N2": [0,1,0], "N3": [1,0,0], "DC": [0,0,1]}},  // = plans.qaoa
  "exact_check": {"plans_checked": 4096, "valid_plans": 96, "seconds": 0.02, "agrees": true},
  "seconds": 28.0          // wall-clock time of the whole QAOA run (same as qaoa.seconds)
}
```

The circuit image path is relative to `web/`.
