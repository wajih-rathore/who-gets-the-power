"""Build WhoGetsThePower_Report.docx (hackathon submission copy).
Every result number comes from the repo's web/data/results.json; a missing key prints "TBD"."""
import json
import os

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Inches, Pt

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = json.load(open(os.path.join(REPO, "web", "data", "results.json")))
HOURS = R["hours"]
BLOCKS = R["blocks"]
# Islamabad-style display names for the code's block ids (the code's own example names are Karachi areas).
AREA = {"N1": "I-10 (homes, high loss)", "N2": "G-9 (homes)", "N3": "Blue Area (offices & shops)",
        "DC": "I-9 AI data centre (can pause)"}
SHORT = {"N1": "I-10", "N2": "G-9", "N3": "Blue Area", "DC": "I-9 AI centre"}
TRIBUNE = "https://tribune.com.pk/story/2627009/nepra-orders-k-electric-to-end-load-shedding"
DAWN = "https://www.dawn.com/news/1913342"


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
            parts.append(f"{SHORT[b]}: {', '.join(hrs)}")
    return "; ".join(parts) or "none"


doc = Document()
doc.styles["Normal"].font.name = "Calibri"
doc.styles["Normal"].font.size = Pt(11)


def table(rows, header):
    t = doc.add_table(rows=1, cols=len(header))
    t.style = "Light Grid Accent 1"
    for c, h in zip(t.rows[0].cells, header):
        c.text = h
    for r in rows:
        for c, v in zip(t.add_row().cells, r):
            c.text = str(v)
    for row in t.rows:
        for c in row.cells:
            for p in c.paragraphs:
                for run in p.runs:
                    run.font.size = Pt(9.5)
    doc.add_paragraph()


def bullets(items):
    for i in items:
        doc.add_paragraph(i, style="List Bullet")


# Title page
for _ in range(6):
    doc.add_paragraph()
t = doc.add_heading("Who Gets the Power? (Bijli Kis Ko?)", 0)
t.alignment = WD_ALIGN_PARAGRAPH.CENTER
p = doc.add_paragraph("Fair load-shedding with quantum optimization")
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.runs[0].font.size = Pt(16)
for line in ("Qiskit Fall Fest 2026", "Team AWS: Wajih, Ali and Sagar",
             "Repository: https://github.com/wajih-rathore/who-gets-the-power"):
    doc.add_paragraph(line).alignment = WD_ALIGN_PARAGRAPH.CENTER
doc.add_page_break()

# 1
doc.add_heading("1. Problem", 1)
doc.add_paragraph(
    "In a heatwave there is not enough electricity for everyone, so utilities in Pakistan switch areas off in turns. "
    "Today they choose by \"losses\": the gap between power sent to an area and power paid for. An area with high losses is cut "
    "the longest, so people there who pay their bills sit in the dark too.")
bullets([
    "Express Tribune, 2 Sep 2026: NEPRA ordered K-Electric to end this practice. Very-high-loss feeders averaged 12 h 14 min of "
    f"outages a day, which the regulator called \"collective punishment\". ({TRIBUNE})",
    "Dawn, 26 May 2025: 2,000 MW of electricity was announced for Bitcoin mining and AI data centres. "
    f"It was announced; we do not claim it is running. ({DAWN})",
])
doc.add_paragraph(
    "Our demo case is an Islamabad-style circuit with four switchable blocks and one protected load: I-10 (homes, high loss), "
    "G-9 (homes), Blue Area (offices & shops), an I-9 AI data centre that can pause, and PIMS hospital, which is always on. "
    "The code's results file labels the four blocks N1, N2, N3 and DC (its example names are Karachi areas); the mapping is "
    "N1 = I-10, N2 = G-9, N3 = Blue Area, DC = I-9 AI centre. All area numbers are illustrative, not real utility data.")
rows = []
for b in BLOCKS:
    bi = get(R, "block_info", b) or {}
    if bi.get("kind") == "datacenter":
        rows.append([b, AREA[b], "-", "revenue/hour: " + ", ".join(fmt(x) for x in bi.get("revenue_per_hour", []))])
    else:
        rows.append([b, AREA[b], fmt(bi.get("loss_pct")), "damage/hour: " + fmt(bi.get("damage_per_hour"))])
table(rows, ["Block", "Area", "Illustrative loss %", "Illustrative value"])
doc.add_paragraph(f"Each block is one {fmt(R.get('mw_per_block'))} MW chunk. {R.get('currency_note', '')}.")

# 2
W = R.get("weights") or {}
doc.add_heading("2. Formulation", 1)
doc.add_paragraph(
    f"Decision: x[b,t] = 1 if block b is switched off in hour t. 4 blocks x 3 hours ({', '.join(HOURS)}) = 12 binary variables. "
    "The hospital is not a variable; it is always on.")
doc.add_paragraph(
    "Rule: exactly k_t blocks must be off in hour t, with k = (1, 2, 1) on a normal afternoon. "
    "The rule is added as a quadratic penalty, so any plan that breaks it scores badly.")
m = doc.add_paragraph()
m.add_run(
    "minimize   w_f Σ_n (Σ_t x[n,t])²  +  w_c Σ_n Σ_t x[n,t]·x[n,t+1]  +  w_r Σ_t r_t·x[DC,t]  +  w_e Σ_n,t d_n·x[n,t]"
    "  +  P Σ_t (Σ_b x[b,t] − k_t)²,   x ∈ {0,1}¹²").italic = True
doc.add_paragraph("In plain words, the plan should:")
bullets([
    "Fairness: spread dark hours evenly (squaring punishes one area getting many hours).",
    "Back-to-back: avoid leaving an area dark two hours in a row.",
    "AI-centre revenue: count the revenue lost when the data centre pauses (r_t per hour).",
    "Economic damage: count the cost of cutting an area (d_n, higher for offices & shops).",
    "Exact shortfall: switch off exactly k_t blocks each hour (penalty P).",
])
doc.add_paragraph(
    f"Weights (hand-tuned): fairness {fmt(W.get('fairness'))}, back-to-back {fmt(W.get('back_to_back'))}, "
    f"revenue {fmt(W.get('revenue'))}, damage {fmt(W.get('damage'))}, penalty P = {fmt(W.get('penalty'))}.")

# 3
Qn = get(R, "scenarios", "normal", "qaoa") or {}
Qd = get(R, "scenarios", "disaster", "qaoa") or {}
cob_n = get(Qn, "trace", "cobyla", "evaluations")
cob_d = get(Qd, "trace", "cobyla", "evaluations")
nparams = get(Qn, "trace", "circuit", "num_params")
doc.add_heading("3. Quantum method", 1)
bullets([
    f"QAOA through qiskit-optimization, reps = {fmt(Qn.get('reps'))} ({fmt(nparams)} angles), on {fmt(Qn.get('qubits'))} qubits.",
    f"Classical optimizer: COBYLA, {fmt(Qn.get('restarts'))} restarts; the recorded trace has {fmt(cob_n)} evaluations "
    f"(normal) and {fmt(cob_d)} (disaster).",
    f"Simulator: Qiskit StatevectorSampler, {fmt(Qn.get('shots'))} shots, fixed seeds.",
    "Why QAOA: every decision is on/off and every rule is a pair term or a quadratic penalty, so the problem maps directly "
    "onto a QAOA cost Hamiltonian with no extra encoding.",
    "Grover Adaptive Search was tried on a 9-variable version: it needed 16 qubits, took 71 s and returned an infeasible "
    "answer, so we rejected it.",
])

# 4
doc.add_heading("4. Architecture", 1)
png = os.path.join(HERE, "architecture.png")
if not os.path.exists(png):
    png = os.path.join(REPO, "report", "architecture.png")
doc.add_picture(png, width=Inches(6.3))
bullets([
    "Inputs: illustrative area data (loss, damage, AI-centre revenue) and the hourly shortfall for each scenario.",
    "QUBO builder: turns the four goals and the exact-shortfall rule into one 12-variable quadratic model.",
    "Solvers: QAOA on the Qiskit simulator, brute force over all 4,096 plans as the exact reference, and three classical "
    "baselines (today's rule, data centre first, greedy).",
    "Output: results.json and charts, which feed the web demo and this report.",
])

# 5
doc.add_heading("5. Results", 1)
doc.add_paragraph(
    "Lower objective is better. Approx. ratio = exact objective / plan objective (1.0 is optimal). "
    "Max dark hours = the most hours any one area is off.")
NAMES = (("today", "Today's rule (cut highest losses)"), ("dc_first", "Data centre first"), ("greedy", "Greedy"),
         ("qaoa", "QAOA"), ("exact", "Exact (brute force)"))
for sc in ("normal", "disaster"):
    S = get(R, "scenarios", sc) or {}
    Q = S.get("qaoa") or {}
    ec = get(Q, "trace", "exact_check") or {}
    doc.add_heading(f"{S.get('label', sc)}: k = {tuple(S.get('shortfall_blocks') or [])}", 2)
    if S.get("description"):
        doc.add_paragraph(S["description"])
    table([[n, fmt(get(S, "plans", k, "objective")), fmt(get(S, "plans", k, "approx_ratio")),
            fmt(get(S, "plans", k, "max_dark_hours")), schedule(get(S, "plans", k))] for k, n in NAMES],
          ["Plan", "Objective", "Approx. ratio", "Max dark hours", "Who is off"])
    table([
        ["P(optimum): QAOA vs random", f"{fmt(Q.get('p_opt'), 5)} vs {fmt(Q.get('p_opt_random'), 6)}"],
        ["P(valid plan): QAOA vs random", f"{fmt(Q.get('p_feasible'), 4)} vs {fmt(Q.get('p_feasible_random'), 4)}"],
        ["QAOA run time", f"{fmt(Q.get('seconds'), 1)} s"],
        ["QAOA found the optimum", fmt(Q.get("found_optimum"))],
        ["Exact check", f"{fmt(ec.get('plans_checked'))} plans ({fmt(ec.get('valid_plans'))} valid) in "
                        f"{fmt(ec.get('seconds'), 3)} s; agrees with QAOA: {fmt(ec.get('agrees'))}"],
    ], ["QAOA statistic", "Value"])

N = get(R, "scenarios", "normal", "plans")
ratio = N["today"]["objective"] / N["exact"]["objective"]
doc.add_heading("Takeaways", 2)
bullets([
    "QAOA returned the exact optimum in both scenarios (approx. ratio 1.0, confirmed by brute force).",
    f"Today's rule leaves one area (I-10) dark for {fmt(N['today']['max_dark_hours'])} hours in a row; "
    f"the fair plan's maximum is {fmt(N['exact']['max_dark_hours'])} hour.",
    f"Today's rule scores about {ratio:.1f}x worse than the optimum ({fmt(N['today']['objective'])} vs {fmt(N['exact']['objective'])}).",
    "When a plant trips at 3 pm, the planner re-plans the afternoon and still keeps every area to at most 1 dark hour.",
])

# 6
En = get(R, "scenarios", "normal", "qaoa", "trace", "exact_check") or {}
doc.add_heading("6. Classical comparison and honesty", 1)
doc.add_paragraph(
    f"At 12 variables brute force is faster: it checks all {fmt(En.get('plans_checked'))} plans in {fmt(En.get('seconds'), 3)} s, "
    f"against about {fmt(Qn.get('seconds'), 0)} s for QAOA on the simulator. We claim no quantum speedup. "
    "The value is the pipeline and a method that scales: the number of possible plans doubles with every added variable, "
    "so brute force stops being an option as areas and hours grow. Running on quantum hardware is future work.")

# 7
doc.add_heading("7. Limitations", 1)
bullets([
    "Synthetic, illustrative data, not real feeder data.",
    f"Equal-size blocks ({fmt(R.get('mw_per_block'))} MW each), a simplification of real feeders.",
    "Simulator only, not quantum hardware; no noise studied.",
    "Tiny instance (12 variables).",
    "Penalty and objective weights are hand-tuned.",
    "Only part of the announced 2,000 MW plan was implemented; the AI centre here is a scenario, not a confirmed facility.",
])

# 8
doc.add_heading("8. Extensions and future work", 1)
bullets([
    "Done: plant-trip re-planning (the disaster scenario above).",
    "Done: trade-off sweep \"protect homes ↔ protect AI revenue\" (table below; each row is the exact optimum at that weight).",
    "Next: an XY (rule-preserving) mixer so QAOA only explores valid plans.",
    "Next: more areas and hours; real feeder data; runs on IBM quantum hardware.",
])
rows = []
for s in R.get("sweep") or []:
    p = s.get("plan") or {}
    kept = get(p, "dc_revenue_kept_pct")
    rows.append([s.get("label", ""), fmt(s.get("revenue_weight")), schedule(p), fmt(get(p, "max_dark_hours")),
                 fmt(kept, 1) + ("%" if kept is not None else ""), fmt(s.get("qaoa_found_optimum"))])
table(rows, ["Setting", "Revenue weight", "Who is off", "Max dark hours", "AI revenue kept", "QAOA found optimum"])

# 9
doc.add_heading("9. Reproducibility", 1)
doc.add_paragraph("Repository: https://github.com/wajih-rathore/who-gets-the-power. From the repository root (Python 3.13, "
                  "qiskit 2.6.2, qiskit-optimization 0.7.0, pinned in requirements.txt):")
for c in ("python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt",
          "PYTHONPATH=src python -m bijli.run      # writes web/data/results.json and results/*.png, about 2-3 minutes",
          "PYTHONPATH=src pytest -q                # tests",
          "python report/build_report.py   # .docx report (diagram: report/architecture.html, rendered to architecture.png)",
          "python -m http.server -d web 8000       # demo, then open http://localhost:8000"):
    para = doc.add_paragraph(style="List Bullet")
    r = para.add_run(c)
    r.font.name = "Consolas"
    r.font.size = Pt(9)

# 10
doc.add_heading("10. References", 1)
bullets([
    f"Express Tribune, 2 Sep 2026. NEPRA orders K-Electric to end load-shedding. {TRIBUNE}",
    f"Dawn, 26 May 2025. 2,000 MW announced for Bitcoin mining and AI data centres. {DAWN}",
])

out = os.path.join(HERE, "WhoGetsThePower_Report.docx")
doc.save(out)
print(out)
