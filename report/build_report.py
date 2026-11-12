"""Build report/WhoGetsThePower_Report.docx. Rerun after results land:
   .venv/bin/python report/build_report.py
Every result number comes from web/data/results.json; a missing key prints "TBD"."""
import glob
import json
import os

from docx import Document
from docx.shared import Inches

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
RESULTS = os.environ.get("RESULTS_JSON") or os.path.join(ROOT, "web", "data", "results.json")
R = json.load(open(RESULTS)) if os.path.exists(RESULTS) else {}
HOURS = R.get("hours") or ["hour 1", "hour 2", "hour 3"]
BLOCKS = R.get("blocks") or ["N1", "N2", "N3", "DC"]


def get(d, *keys):
    for k in keys:
        if not isinstance(d, dict) or k not in d:
            return None
        d = d[k]
    return d


def fmt(v, nd=2, pct=False):
    if v is None:
        return "TBD"
    if isinstance(v, bool):
        return "yes" if v else "no"
    if isinstance(v, (int, float)):
        if pct:
            return f"{v * 100:.2f}%"
        return f"{v:.{nd}f}".rstrip("0").rstrip(".") if isinstance(v, float) else str(v)
    return str(v)


def schedule(plan):
    off = get(plan, "off")
    if not off:
        return "TBD"
    parts = []
    for b in BLOCKS:
        hrs = [HOURS[i] for i, v in enumerate(off.get(b, [])) if v and i < len(HOURS)]
        if hrs:
            parts.append(f"{b}: {', '.join(hrs)}")
    return "; ".join(parts) or "none"


doc = Document()
doc.add_heading("Who Gets the Power? (Bijli Kis Ko?)", 0)
doc.add_paragraph(
    "A quantum (QAOA) planner that decides which Karachi neighborhood, or the AI data center, goes dark each hour "
    "when there is not enough electricity for everyone, keeping the hospital on.")
doc.add_paragraph("Qiskit Fall Fest 2026 hackathon. Domain: Energy and Smart Infrastructure. All input data is synthetic.")
doc.add_paragraph("Team: [TEAM NAME]   Members: [NAME 1], [NAME 2], [NAME 3]   Repository: https://github.com/wajih-rathore/who-gets-the-power")
doc.add_paragraph("Live demo: https://who-gets-the-power.vercel.app")


def table(rows, header):
    t = doc.add_table(rows=1, cols=len(header))
    t.style = "Light Grid Accent 1"
    for c, h in zip(t.rows[0].cells, header):
        c.text = h
    for r in rows:
        cells = t.add_row().cells
        for c, v in zip(cells, r):
            c.text = str(v)
    doc.add_paragraph()


def bullets(items):
    for i in items:
        doc.add_paragraph(i, style="List Bullet")


def picture(name, cap, width=6.0):
    p = os.path.join(ROOT, "results", name)
    if os.path.exists(p):
        doc.add_picture(p, width=Inches(width))
        doc.add_paragraph(cap)


# 1
doc.add_heading("1. Problem and users", 1)
doc.add_paragraph(
    "On a hot afternoon, Karachi does not have enough electricity for everyone. Every hour, someone has to be switched off: "
    "a neighborhood, or the city's AI/crypto data center. Hospitals are never switched off. Our system decides who goes dark each hour. "
    "It keeps dark hours fair between neighborhoods, avoids leaving any area dark for hours in a row, and treats the data center "
    "as the flexible load that pauses first, while still weighing the revenue it brings.")
doc.add_paragraph("Who it serves:")
bullets([
    "Grid operator and regulator: a transparent, auditable load-shedding plan, with the trade-off between homes and data-center revenue made explicit instead of implicit.",
    "Residents: fewer long or repeated outages in the same area, and a visible reason for each cut.",
])
doc.add_heading("Why now (as reported in the news)", 2)
bullets([
    "Dawn, 25 May 2025: the Finance Ministry and the Pakistan Crypto Council announced that 2,000 MW of electricity would be set aside for "
    "Bitcoin mining and AI data centers (https://dawn.com/news/1913238).",
    "Status, October 2026: reports say the plan is only partly implemented, with no discounted tariff or confirmed operation "
    "(cryptopakistan.com, 2 Oct 2026; a secondary source). We therefore say the power was set aside, not that anything is running.",
    "The IMF raised concerns in May 2025 (Cointelegraph), and talks continued (Arab News, 8 Jul 2025).",
    "Tribune, 31 Aug 2026: NEPRA's Section 27C prohibitory order bars K-Electric from unannounced or excessive load-shedding and from "
    "cutting whole feeders on the basis of losses (https://tribune.com.pk/story/2627009).",
    "Precedent: Google agreed with US utilities to shift or limit machine-learning workloads during grid stress (Google blog, 4 Aug 2025), "
    "reaching 1 GW of demand response by 19 Mar 2026. Data centers can be the flexible load.",
])
doc.add_paragraph(
    "These facts are cited as news reports, not independently verified by us. We take no side on the 2,000 MW plan or on K-Electric; "
    "we make the trade-offs visible. The question the planner answers: at 3 pm in June, when there is not enough power for everyone, "
    "who gets it: the AI data center, your neighborhood, or the hospital?")

# 2
doc.add_heading("2. Formulation", 1)
doc.add_paragraph(
    f"Blocks: three neighborhoods (N1, N2, N3) and the AI data center (DC). Each block is the same size, one "
    f"{fmt(get(R, 'mw_per_block'))} MW chunk. The hospital is always on and is not a variable. "
    f"Hours: {', '.join(HOURS)}. Decision variable: x[b,t] = 1 if block b is switched OFF in hour t. "
    f"4 blocks x 3 hours = 12 binary variables, so 12 qubits.")
doc.add_paragraph(
    "Rule: the plan must cover the shortfall exactly, sum over b of x[b,t] = k_t blocks off in hour t, where k_t is the shortfall in that hour. "
    "In the QUBO the rule becomes the penalty P * sum over t of (sum over b of x[b,t] - k_t)^2.")
doc.add_paragraph("Objective (minimize), four terms:")
bullets([
    "Fairness (squared dark hours, a pair term): w_f * sum over neighborhoods n of (sum over t of x[n,t])^2.",
    "No back-to-back darkness (a pair term): w_c * sum over n, t of x[n,t] * x[n,t+1].",
    "Data-center revenue lost: w_r * sum over t of r_t * x[DC,t], where r_t is the data center's revenue in hour t.",
    "Economic damage: w_e * sum over n, t of d_n * x[n,t], where d_n is higher for a market area than for homes.",
])
doc.add_paragraph("In one line:  minimize  w_f*F(x) + w_c*C(x) + w_r*Rev(x) + w_e*Dmg(x) + P*sum_t(sum_b x[b,t] - k_t)^2,  over x in {0,1}^12.")
W = get(R, "weights") or {}
doc.add_paragraph(
    f"Weights used (synthetic): fairness {fmt(W.get('fairness'))}, back-to-back {fmt(W.get('back_to_back'))}, "
    f"revenue {fmt(W.get('revenue'))}, damage {fmt(W.get('damage'))}, penalty P = {fmt(W.get('penalty'))}. "
    "The penalty was validated by brute force over all 4096 bitstrings: the lowest QUBO energy must be a valid plan equal to the constrained optimum.")
doc.add_paragraph(f"The instance (synthetic, made-up but plausible numbers; not real K-Electric or data-center data). {get(R, 'currency_note') or ''}")
rows = []
for b in BLOCKS:
    bi = get(R, "block_info", b) or {}
    if bi.get("kind") == "datacenter":
        rows.append([b, bi.get("name", ""), bi.get("kind", ""), "-", "revenue/hour: " + ", ".join(fmt(x) for x in bi.get("revenue_per_hour", []))])
    else:
        rows.append([b, bi.get("name", ""), bi.get("kind", ""), fmt(bi.get("loss_pct")), "damage/hour: " + fmt(bi.get("damage_per_hour"))])
table(rows, ["Block", "Name", "Kind", "Synthetic loss %", "Synthetic value"])

# 3
doc.add_heading("3. Why QAOA", 1)
bullets([
    "Natural fit: fairness and back-to-back darkness are pair (quadratic) terms and the rule is a quadratic penalty, so the problem is already a QUBO. "
    "That maps directly onto the cost layer of QAOA, with no extra encoding.",
    "Shallow circuit: reps = 2 on 12 qubits, tuned by a classical COBYLA loop. This suits today's small devices and runs easily on a simulator "
    "(Qiskit StatevectorSampler, fixed seeds).",
    "Grover Adaptive Search considered and rejected: tested on a 9-variable version of this kind of problem, it took 71 s, needed 16 qubits and gave an "
    "invalid answer. It is for future hardware.",
])

# 4
doc.add_heading("4. Architecture", 1)
doc.add_paragraph(
    "Synthetic Karachi data goes into the QUBO builder (12 binary variables, penalty validated by brute force). QAOA runs on Qiskit's StatevectorSampler "
    "(reps = 2, COBYLA). The same instance is solved exactly by brute force and by three baselines (today's rule, data center first, greedy). "
    "Everything is written to results.json and charts, which feed the demo page and this report.")
png = os.path.join(HERE, "architecture.png")
if os.path.exists(png):
    doc.add_picture(png, width=Inches(6.3))
else:
    doc.add_paragraph("[architecture.png missing: run report/make_diagram.py]")

# 5
doc.add_heading("5. Results", 1)
doc.add_paragraph(
    "All numbers below are read from web/data/results.json and come from real solver runs on synthetic inputs. Lower objective is better. "
    "Approximation ratio = exact objective divided by the plan's objective (1.0 is optimal). Max dark hours is the most any one neighborhood is off. "
    "Back-to-back counts (neighborhood, hour) pairs dark this hour and the next. DC revenue kept is the share of data-center revenue still earned.")
if not R:
    doc.add_paragraph("results.json not found: all result values show TBD.")
NAMES = (("today", "Today's rule"), ("dc_first", "Data center first"), ("greedy", "Greedy"), ("qaoa", "QAOA"), ("exact", "Exact"))
for sc in ("normal", "disaster"):
    S = get(R, "scenarios", sc) or {}
    doc.add_heading(get(S, "label") or sc.capitalize() + " scenario", 2)
    if get(S, "description"):
        doc.add_paragraph(get(S, "description"))
    doc.add_paragraph(f"Blocks that must be off per hour (k_t): {fmt(get(S, 'shortfall_blocks'))}")
    rows = []
    for k, name in NAMES:
        P = get(S, "plans", k)
        rows.append([name, fmt(get(P, "valid")), fmt(get(P, "objective")), fmt(get(P, "approx_ratio")),
                     fmt(get(P, "max_dark_hours")), fmt(get(P, "back_to_back")),
                     fmt(get(P, "dc_revenue_kept_pct"), 1) + ("%" if get(P, "dc_revenue_kept_pct") is not None else ""),
                     fmt(get(P, "economic_damage"))])
    table(rows, ["Plan", "Valid", "Objective", "Approx. ratio", "Max dark hours", "Back-to-back",
                 "DC revenue kept", "Economic damage"])
    table([[n, schedule(get(S, "plans", k))] for k, n in NAMES], ["Plan", "Who is switched off (hour by hour)"])
    Q = get(S, "qaoa") or {}
    table([
        ["Qubits / reps / shots", f"{fmt(get(Q, 'qubits'))} / {fmt(get(Q, 'reps'))} / {fmt(get(Q, 'shots'))}"],
        ["P(optimum), QAOA", fmt(get(Q, "p_opt"), 4)],
        ["P(optimum), random 12-bit string", fmt(get(Q, "p_opt_random"), 6)],
        ["P(valid plan), QAOA", fmt(get(Q, "p_feasible"), 4)],
        ["P(valid plan), random 12-bit string", fmt(get(Q, "p_feasible_random"), 4)],
        ["Best valid sample equals exact optimum", fmt(get(Q, "found_optimum"))],
        ["Run time (s) / optimizer restarts", f"{fmt(get(Q, 'seconds'), 1)} / {fmt(get(Q, 'restarts'))}"],
    ], ["QAOA statistic (" + (get(S, "label") or sc) + ")", "Value"])

doc.add_heading("Trade-off sweep (normal scenario)", 2)
doc.add_paragraph(
    "The slider on the demo page sweeps the weight on data-center revenue from 'protect homes' to 'protect revenue'. Each row is the exact optimum at that weight.")
rows = []
for s in get(R, "sweep") or []:
    p = s.get("plan") or {}
    rows.append([s.get("label", ""), fmt(s.get("revenue_weight")), schedule(p), fmt(get(p, "max_dark_hours")),
                 fmt(get(p, "back_to_back")),
                 fmt(get(p, "dc_revenue_kept_pct"), 1) + ("%" if get(p, "dc_revenue_kept_pct") is not None else ""),
                 fmt(get(p, "economic_damage")), fmt(s.get("qaoa_found_optimum")) if s.get("qaoa_found_optimum") is not None else "not run"])
table(rows, ["Setting", "Revenue weight", "Who is switched off", "Max dark hours", "Back-to-back", "DC revenue kept",
             "Economic damage", "QAOA found optimum"])

for fn in sorted(glob.glob(os.path.join(ROOT, "results", "*.png"))):
    picture(os.path.basename(fn), "Figure: " + os.path.basename(fn)[:-4].replace("_", " ") + " (generated from the solver runs).")

# 6
doc.add_heading("6. Honest limitations", 1)
bullets([
    "At 12 decisions a laptop solves this instantly by brute force. Quantum is a natural fit here, not faster today. We claim no quantum speedup.",
    "All input data is synthetic: plausible, not real K-Electric, NEPRA or data-center data. The instance was tuned so that the baselines visibly do worse than exact.",
    "Blocks are equal-size 10 MW chunks, a simplification of real feeders and loads.",
    "The 2,000 MW plan was only partly implemented, according to news reports; the data center in our model is a scenario, not a confirmed facility.",
    "QAOA's final plan is the best valid sample among the shots, scored classically; see the P(optimum) and P(valid plan) rows above for how often the circuit itself lands on the answer.",
    "Grover Adaptive Search was tested on a 9-variable version of this kind of problem: it took 71 s, needed 16 qubits and gave an invalid answer. That test is not part of this repository.",
    "Simulator only: no run on real quantum hardware, so no noise effects were studied.",
])

# 7
doc.add_heading("7. Future work", 1)
bullets([
    "Real feeder-level load, loss and data-center data from operators, and unequal block sizes.",
    "More hours and blocks, with better circuits or warm starts as the problem grows.",
    "Runs on real quantum hardware once the instance outgrows brute force.",
    "Grover Adaptive Search on future hardware.",
])

# 8
doc.add_heading("8. Reproducibility", 1)
doc.add_paragraph("From the repository root (tested with Python 3.13):")
for c in ("python -m venv .venv && .venv/bin/pip install -r requirements.txt",
          "cd src && ../.venv/bin/python -m bijli.run        # writes web/data/results.json and results/*.png",
          ".venv/bin/python report/make_diagram.py          # architecture.png",
          ".venv/bin/python report/build_report.py          # this document"):
    doc.add_paragraph(c, style="List Bullet")
doc.add_paragraph("Fixed seeds are used for QAOA; versions are pinned in requirements.txt (qiskit 2.6.2, qiskit-optimization 0.7.0).")

# 9
doc.add_heading("9. Credits", 1)
doc.add_paragraph(
    "Built with Qiskit, qiskit-optimization, matplotlib and python-docx. Code was written with AI assistance (Claude Code). "
    "Google's published work on shifting flexible ML load is the idea precedent.")

out = os.path.join(HERE, "WhoGetsThePower_Report.docx")
doc.save(out)
print(out)
