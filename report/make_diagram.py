"""Draw report/architecture.png. Run: .venv/bin/python report/make_diagram.py"""
import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "architecture.png")
fig, ax = plt.subplots(figsize=(10, 6.4))
ax.set_xlim(0, 100); ax.set_ylim(0, 64); ax.axis("off")

def box(x, y, w, h, title, sub, fc):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.4,rounding_size=1.2", fc=fc, ec="#333", lw=1.3))
    ax.text(x + w / 2, y + h * 0.66, title, ha="center", va="center", fontsize=10.5, fontweight="bold")
    ax.text(x + w / 2, y + h * 0.30, sub, ha="center", va="center", fontsize=8.2, color="#222")

def arrow(p, q):
    ax.annotate("", xy=q, xytext=p, arrowprops=dict(arrowstyle="-|>", lw=1.6, color="#222"))

C_IN, C_Q, C_C, C_OUT = "#dbe9f6", "#e6dcf5", "#fbe9c8", "#d9f0d9"
W, H = 26, 12
# row 1: data -> QUBO -> QAOA
box(3, 48, W, H, "Synthetic Karachi data", "3 areas + AI data center\nhospital always on", C_IN)
box(37, 48, W, H, "QUBO builder", "12 binary variables\npenalty validated by brute force", C_Q)
box(71, 48, W, H, "QAOA (12 qubits)", "StatevectorSampler\nreps = 2, fixed seeds", C_Q)
arrow((3 + W + .4, 54), (37 - .4, 54)); arrow((37 + W + .4, 54), (71 - .4, 54))
# optimizer loop
box(71, 28, W, H, "COBYLA optimizer", "classical; tunes the\ncircuit angles", C_C)
arrow((80, 47.4), (80, 40.6)); arrow((88, 40.6), (88, 47.4))
ax.text(79.2, 44, "angles", ha="right", va="center", fontsize=8, style="italic")
ax.text(89, 44, "energy", ha="left", va="center", fontsize=8, style="italic")
# row 2: decoder + exact/baselines
box(37, 28, W, H, "Decoder + checks", "bitstring -> who goes dark\nrule check, objective", C_C)
arrow((72, 47.4), (62, 40.6))
ax.text(66, 45.2, "final samples", ha="center", fontsize=8, style="italic")
box(3, 28, W, H, "Exact + baselines", "brute force (reference), today's\nrule, DC-first, greedy", C_C)
arrow((37 - .4, 34), (3 + W + .4, 34))
arrow((16, 47.4), (16, 40.6))
ax.text(17, 44, "same instance", ha="left", fontsize=8, style="italic")
# row 3: outputs
box(3, 8, W, H, "results.json + charts", "every number in the report\nand the demo comes from here", C_OUT)
box(37, 8, W, H, "Demo page + report", "trade-off slider, disaster\nbutton, this document", C_OUT)
arrow((16, 27.4), (16, 20.6))
arrow((3 + W + .4, 14), (37 - .4, 14))
ax.text(50, 2.5, "Legend:  blue = input   purple = quantum   orange = classical   green = output", ha="center", fontsize=8.5)
ax.text(50, 62, "Who Gets the Power? architecture", ha="center", fontsize=13, fontweight="bold")
fig.savefig(OUT, dpi=200, bbox_inches="tight", facecolor="white")
print(OUT)
