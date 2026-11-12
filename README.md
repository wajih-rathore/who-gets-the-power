# Who Gets the Power? (*Bijli Kis Ko?*)

A fair, transparent planner for a hot-afternoon power shortage. *Qiskit Fall Fest 2026 entry, domain: Energy & Smart Infrastructure.*

**Live demo:** https://who-gets-the-power.vercel.app (the static page in `web/`, showing the committed `results.json`)

When Karachi does not have enough electricity for everyone, someone has to be switched off each hour: a neighborhood, or the AI/crypto data center. Hospitals are never switched off. Our planner decides who goes dark each hour, keeps dark hours fair between neighborhoods, avoids leaving any area dark hours in a row, and treats the data center as the flexible load that pauses first while still weighing the revenue it brings. We write the decision as a 12-qubit optimization problem, solve it with QAOA in Qiskit, and check it against the exact best plan from brute force. A slider shows the trade-off (protect homes vs protect data-center revenue) and a disaster button switches to the plan solved for when a power plant trips.

## The hook

In May 2025, Pakistan set aside 2,000 MW of electricity for Bitcoin mining and AI data centers. In August 2026, the regulator NEPRA ordered K-Electric to stop cutting whole neighborhoods based on losses. So at 3 pm in June, when there isn't enough power for everyone, who gets it: the AI data center, your neighborhood, or the hospital?

We take no side on either decision. We make the trade-offs visible.

Sources:

- Dawn, 25 May 2025: Finance Ministry and Pakistan Crypto Council announce 2,000 MW for Bitcoin mining and AI data centers. https://dawn.com/news/1913238
- Status, October 2026: only partly implemented, with no discounted tariff or confirmed operation (cryptopakistan.com, 2 Oct 2026, secondary source, taken from search excerpts).
- The IMF raised concerns in May 2025 (Cointelegraph) and talks continued (Arab News, 8 Jul 2025).
- Tribune, 31 Aug 2026: NEPRA's Section 27C prohibitory order bars K-Electric from unannounced or excessive load-shedding and from cutting whole feeders on the basis of losses. https://tribune.com.pk/story/2627009
- Precedent for a flexible data center: Google agreed with US utilities to shift or limit ML workloads during grid stress (Google blog, 4 Aug 2025), reaching 1 GW of demand response by 19 Mar 2026.

## Formulation

- **Blocks:** N1 Lyari (homes), N2 Gulshan-e-Iqbal (homes), N3 Saddar (market) and DC, a hypothetical Korangi AI data centre. Each is one equal 10 MW chunk. Civil Hospital is always on and is not a variable. Power comes from Bin Qasim power station. Place names set the scene; all numbers in this demo are synthetic.
- **Hours:** 3 hours (2-3 pm, 3-4 pm, 4-5 pm peak).
- **Decision:** x[b,t] = 1 if block b is switched OFF in hour t. 4 blocks x 3 hours = **12 qubits**.
- **Rule as a penalty:** the shortfall is covered exactly, so the number of blocks off in hour t equals k_t. In the QUBO this is the penalty P * sum_t (sum_b x[b,t] - k_t)^2. Brute force confirms the lowest QUBO energy is a valid plan equal to the constrained optimum.
- **Four objective terms (minimize), each with a weight:**
  1. Fairness: squared dark hours per neighborhood (pair term).
  2. No back-to-back darkness for a neighborhood (pair term).
  3. Data-center revenue lost (revenue per hour differs by hour).
  4. Economic damage (higher for a commercial area than a residential one).
- **Scenarios:** normal (k = 1, 2, 1), disaster (a plant trips in hour 2, so k_2 rises by 1, then re-solve), and a trade-off sweep of a few weight settings for the slider.

All input numbers are synthetic: made up but plausible. All output numbers come from real solver runs.

## Baselines

- **Exact:** brute force over all valid plans (the reference).
- **Today's rule:** cut the highest-loss neighborhoods first (the practice NEPRA ordered stopped).
- **Data center first:** cut the data center every hour, then the next.
- **Greedy:** fill each hour independently with the cheapest blocks, ignoring other hours.
- **QAOA:** Qiskit, reps=2, COBYLA, StatevectorSampler, fixed seeds.

## Setup

Python 3.13, qiskit 2.6.2, qiskit-optimization 0.7.0 (pinned in `requirements.txt`).

```bash
python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
```

## Run

```bash
PYTHONPATH=src python -m bijli.run      # writes web/data/results.json and results/*.png, about 2-3 minutes
PYTHONPATH=src pytest -q                # tests
python report/build_report.py   # architecture diagram + .docx report
python -m http.server -d web 8000       # demo, then open http://localhost:8000
```

## Repo layout

```
src/bijli/model.py           instance, objective, QUBO, baselines, exact solver
src/bijli/quantum.py         QAOA run on the QUBO (Qiskit simulator)
src/bijli/run.py             runs everything, writes results.json and charts
tests/test_model.py          pytest suite
web/                         static demo page reading web/data/results.json (schema in web/data/schema.md)
results/                     generated charts and summary.md
report/make_diagram.py       architecture diagram
report/build_report.py       builds report/WhoGetsThePower_Report.docx
docs/                        spec, organizer rules
```

## Results

Numbers come from `web/data/results.json` (normal scenario). Synthetic inputs, real solver outputs.

| Plan (normal hot afternoon) | Approx. ratio | Max dark hours | Back-to-back | DC revenue kept |
|---|---|---|---|---|
| Today's rule (cut highest losses) | 0.517 | 3 | 2 | 100.0% |
| Data center always first | 0.807 | 1 | 0 | 0.0% |
| Greedy (hour by hour) | 0.538 | 3 | 2 | 100.0% |
| **Quantum (QAOA)** | **1.0** | **1** | **0** | **73.5%** |
| Exact (brute force) | 1.0 | 1 | 0 | 73.5% |

QAOA (12 qubits, reps=2, 1024 shots, 3 restarts): it found the exact optimum in both the normal and the disaster scenario (disaster: approx. ratio 1.0, DC revenue kept 41.2%). The final state puts 45.9% of its probability on plans that follow the rules (random guessing: 2.3%) and 0.57% on the single optimum (random: 0.024%, about 23× better). Those odds are low in absolute terms, so the plan comes from the best valid sample among the shots. In the trade-off sweep, QAOA found the optimum at 3 of 4 weight settings; it missed at "Protect homes".

Full table: `results/summary.md`.

## Limitations

- **No quantum speedup claimed.** At 12 decisions a laptop solves this instantly. Quantum is a natural fit for the pair-term structure, not faster today.
- **Synthetic data.** Loss percentages, revenues and damages are plausible made-up values, not real K-Electric or data-center figures.
- **Equal-size blocks.** Each block is one 10 MW chunk, a simplification.
- **Partly implemented plan.** The 2,000 MW set-aside was only partly implemented, so the scenario is illustrative, not a forecast.
- **Simulator only.** No real quantum hardware was used.
- **Grover tested and rejected.** Grover Adaptive Search on a 9-variable problem of this kind took 71 s, needed 16 qubits and gave an invalid answer. It is for future hardware. That test was run separately and its script is not in this repo.

## Credits

- Built with [Qiskit](https://github.com/Qiskit/qiskit) and [qiskit-optimization](https://github.com/qiskit-community/qiskit-optimization).
- Code written with AI assistance. No tutorial code was copied.
- Reuses patterns (QUBO penalty, QAOA runner, results.json plus static page) from the team's own earlier project, Lights First.
