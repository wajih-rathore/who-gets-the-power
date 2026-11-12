# Who Gets the Power? Results (synthetic data)

Run: `cd src && ../.venv/bin/python -m bijli.run` (equivalently `PYTHONPATH=src python -m bijli.run` from the repo root).

| Scenario | Plan | Objective | Approx. ratio | Max dark h | Back-to-back | DC revenue kept % | Damage |
|---|---|---|---|---|---|---|---|
| normal | Today's rule (cut highest losses) | 33.16 | 0.5169 | 3 | 2 | 100.0 | 7.16 |
| normal | Data center always first | 21.24 | 0.807 | 1 | 0 | 0.0 | 2.24 |
| normal | Greedy (hour by hour) | 31.84 | 0.5383 | 3 | 2 | 100.0 | 5.84 |
| normal | Quantum (QAOA) | 17.14 | 1.0 | 1 | 0 | 73.5 | 6.64 |
| normal | Exact (brute force) | 17.14 | 1.0 | 1 | 0 | 73.5 | 6.64 |
| disaster | Today's rule (cut highest losses) | 39.36 | 0.6057 | 3 | 2 | 100.0 | 11.36 |
| disaster | Data center always first | 24.64 | 0.9675 | 1 | 0 | 0.0 | 3.64 |
| disaster | Greedy (hour by hour) | 38.04 | 0.6267 | 3 | 2 | 100.0 | 10.04 |
| disaster | Quantum (QAOA) | 23.84 | 1.0 | 1 | 0 | 41.2 | 7.84 |
| disaster | Exact (brute force) | 23.84 | 1.0 | 1 | 0 | 41.2 | 7.84 |

QAOA:

- normal: {"qubits": 12, "reps": 2, "shots": 1024, "seconds": 28.0, "restarts": 3, "p_opt": 0.00566, "p_feasible": 0.4587, "p_opt_random": 0.000244, "p_feasible_random": 0.0234, "found_optimum": true}
- disaster: {"qubits": 12, "reps": 2, "shots": 1024, "seconds": 28.9, "restarts": 3, "p_opt": 0.00601, "p_feasible": 0.3473, "p_opt_random": 0.000244, "p_feasible_random": 0.0156, "found_optimum": true}

Sweep (exact plan per revenue weight):

- Protect homes (w_r=0.5): off={'N1': [0, 0, 0], 'N2': [0, 1, 0], 'N3': [0, 0, 0], 'DC': [1, 1, 1]}, DC revenue kept 0.0%, QAOA found optimum: False
- Lean homes (w_r=0.8): off={'N1': [0, 1, 0], 'N2': [0, 1, 0], 'N3': [0, 0, 0], 'DC': [1, 0, 1]}, DC revenue kept 41.2%, QAOA found optimum: True
- Balanced (w_r=1.0): off={'N1': [0, 1, 0], 'N2': [0, 1, 0], 'N3': [1, 0, 0], 'DC': [0, 0, 1]}, DC revenue kept 73.5%, QAOA found optimum: True
- Protect revenue (w_r=2.0): off={'N1': [0, 1, 0], 'N2': [1, 0, 1], 'N3': [0, 1, 0], 'DC': [0, 0, 0]}, DC revenue kept 100.0%, QAOA found optimum: True
