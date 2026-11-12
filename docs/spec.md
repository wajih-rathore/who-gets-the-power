# Who Gets the Power? (*Bijli Kis Ko?*)
*Domain: Energy & Smart Infrastructure*

## The idea (plain words)
On a hot afternoon, Karachi doesn't have enough electricity for everyone. Every hour, someone has to be switched off: a neighborhood, or the city's AI/crypto data center. Hospitals are never switched off. Our system decides who goes dark each hour. It keeps dark hours fair between neighborhoods, avoids leaving any area dark hours in a row, and treats the data center as the flexible load that pauses first, while still weighing the revenue it brings. A slider shows the trade-off menu (protect homes ↔ protect data-center revenue), and a disaster button (a power plant trips) re-plans instantly.

## Hook (facts checked against news reports; wording rules below)
> "In May 2025, Pakistan set aside 2,000 MW of electricity for Bitcoin mining and AI data centers. In August 2026, the regulator NEPRA ordered K-Electric to stop cutting whole neighborhoods based on losses. So at 3 pm in June, when there isn't enough power for everyone, who gets it: the AI data center, your neighborhood, or the hospital?"

**Sources (from search excerpts; cite as such):**
- Dawn, 25 May 2025: the Finance Ministry and Pakistan Crypto Council announce 2,000 MW for Bitcoin mining and AI data centers. https://dawn.com/news/1913238
- Status, October 2026: only partly implemented, with no discounted tariff or confirmed operation (cryptopakistan.com, 2 Oct 2026, secondary). **Say "set aside", never "is running".**
- IMF raised concerns in May 2025 (Cointelegraph), and talks continued (Arab News, 8 Jul 2025).
- Tribune, 31 Aug 2026: NEPRA's Section 27C prohibitory order bars K-Electric from unannounced or excessive load-shedding and from cutting whole feeders on the basis of losses. https://tribune.com.pk/story/2627009
- Precedent: Google agreed with US utilities to shift or limit ML workloads during grid stress (Google blog, 4 Aug 2025), reaching 1 GW of demand response by 19 Mar 2026. This proves data centers can be the flexible load.
- **Tone:** neutral, not political. We don't call the deal bad; we make the trade-offs transparent.

## Formulation
**Blocks** b ∈ {N1, N2, N3 (neighborhoods), DC (AI data center)}. Each block is the same size (one 10 MW "chunk"). The hospital H is always on and is not a variable.
**Hours** t ∈ {1, 2, 3}, for example 2–3 pm, 3–4 pm and 4–5 pm (peak).
**Decision:** x[b,t] = 1 if block b is switched OFF in hour t. That's 4 × 3 = **12 qubits**.

**Rule:** cover the shortfall exactly: Σ_b x[b,t] = k_t blocks off in hour t (for example k = (1, 2, 1)). In the QUBO this becomes the penalty P · Σ_t (Σ_b x[b,t] − k_t)². Validate P by brute force: the lowest QUBO energy must be a valid plan equal to the constrained optimum.

**Objective (minimize), with weights giving the trade-off:**
1. **Fairness** (squared dark hours, a pair term): w_f · Σ_n (Σ_t x[n,t])² over neighborhoods n
2. **No back-to-back darkness** (a pair term): w_c · Σ_n Σ_t x[n,t]·x[n,t+1]
3. **Data-center revenue lost:** w_r · Σ_t r_t · x[DC,t], where revenue per hour r_t may differ by hour
4. **Economic damage:** w_e · Σ_n Σ_t d_n · x[n,t], where d_n is higher for a commercial area than a residential one

**Synthetic, plausible numbers. Tune them so the instance is non-trivial:** greedy and "today's rule" must visibly do worse than exact, and the optimum should be unique. Document every number as synthetic.

## Baselines
- **Exact:** brute force over all valid plans. This is the reference.
- **"Today's rule":** cut by losses. Give each neighborhood a synthetic loss %, and always cut the highest-loss areas first. This is the practice NEPRA ordered stopped. It shows the unfairness.
- **"Data center always first":** cut the DC every hour, then the next. It shows the revenue cost.
- **Greedy:** fill each hour independently with the cheapest blocks, ignoring the other hours. It shows back-to-back darkness.
- **QAOA** (Qiskit): reps=2, COBYLA, StatevectorSampler, fixed seeds.

## Scenarios
- **Normal:** k = (1, 2, 1).
- **Disaster:** a power plant trips in hour 2, so k_2 rises by 1. Re-solve.
- **Trade-off sweep:** 3–5 weight settings from "protect homes" to "protect revenue", for the slider.

## Metrics
Max dark hours for any neighborhood, number of back-to-back dark hours, DC revenue kept, economic damage, objective vs exact (approximation ratio), P(optimum) and the % of samples that follow the rules for QAOA.

## Honest limitations (for the report)
At 12 decisions a laptop solves this instantly; quantum is a natural fit, not faster today. The data is synthetic. Blocks are equal-size chunks, a simplification. The 2,000 MW plan was only partly implemented. Grover Adaptive Search was tested on a 9-variable version of this kind of problem: it took 71 s, needed 16 qubits and gave an invalid answer, so it's for future hardware.
