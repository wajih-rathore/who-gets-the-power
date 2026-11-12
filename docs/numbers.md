# Synthetic numbers (all made up but plausible; see `src/bijli/model.py`)

- Blocks: 3 neighborhoods + the data center (DC), each one equal 10 MW chunk. Hours 2–3, 3–4, 4–5 pm.
- Loss % (used only by "today's rule"): N1 38, N2 22, N3 12.
- Damage per dark hour d_n: N1 1.6 (homes), N2 1.0 (homes), N3 3.0 (market). Schema placeholders were 1.0 / 1.2 / 3.0; changed so greedy (cheapest block per hour) picks a different area than today's rule (highest loss).
- DC revenue per hour: [5.5, 7.0, 4.5] (placeholder was [3.0, 5.0, 4.0]); raised so DC is worth protecting at default weights, and uneven so the optimum is unique.
- Weights: fairness 2, back-to-back 3, revenue 1, damage 1, penalty P = 40 (as in schema). P is checked by brute force for both scenarios and every sweep point (run.py asserts the lowest of 4096 QUBO energies equals the unique constrained optimum).
- **Change from the spec:** damage is multiplied by an hour factor [1.0, 1.4, 1.2] (outages hurt more at the 3–4 pm peak). Without it the optimum is not unique, because with a flat damage per area any assignment of areas to hours costs the same. `economic_damage` in results.json includes this factor.
- Shortfall k: normal [1, 2, 1], disaster [1, 3, 1].
- Sweep: revenue weight 0.5 / 0.8 / 1.0 / 2.0 = Protect homes / Lean homes / Balanced / Protect revenue. The exact optimum is unique at each. At 1.0 it equals the normal scenario plan. Sweep QAOA uses 1 restart (3 for the two main scenarios).
- Baselines: "today" cuts highest-loss areas first (N1, then N2, then N3), DC only if more blocks than areas are needed. "dc_first" cuts DC every hour, then highest loss. "greedy" takes the k_t cheapest blocks per hour (cost = fairness + damage for areas, revenue for DC), ignoring other hours.
- QAOA: reps 2, COBYLA (maxiter 300), StatevectorSampler, seeds 1/2/3 (best restart by expected energy), 1024 shots; the QAOA plan is the best valid sample among the shots.
