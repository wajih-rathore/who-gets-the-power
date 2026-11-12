# Who Gets the Power?: 3-minute video script

Read aloud by the team. About 315 spoken words (about 2:25 at 130 words a minute, leaving room for demo pauses). Numbers are taken from `web/data/results.json` (normal scenario unless noted). Say "set aside", never "is running". Keep a neutral tone.

## 0:00 - 0:20 Hook
[SCREEN: Title card, then headline-style text of the two facts]

"In May 2025, Pakistan set aside 2,000 megawatts of electricity for Bitcoin mining and AI data centers. In August 2026, the regulator ordered K-Electric to stop cutting whole neighborhoods based on losses. So at 3 pm in June, when there is not enough power for everyone, who gets it: the AI data center, your neighborhood, or the hospital?"

## 0:20 - 0:35 Problem
[SCREEN: Three neighborhoods, a data center and a hospital on a simple map]

"Every hour, someone is switched off: one of three neighborhoods or the data center. Never the hospital. We do not say who is right. We make the trade-offs visible."

## 0:35 - 1:05 How we turned it into 12 qubits
[SCREEN: Grid of 12 yes/no boxes, then a penalty bar]

"Each yes-or-no choice, like Area 2 is off at 4 pm, is one qubit. Four blocks, three hours: twelve qubits. Cutting exactly the right number each hour is a penalty, checked by brute force. We score fairness, back-to-back darkness, data-center revenue and economic damage. These pair terms are what QAOA is built for."

## 1:05 - 2:30 Demo: press Run
[SCREEN: Demo page, tour dismissed. Scenario: Normal. Point at the shortfall per hour in the left panel.]

"On the left: the scenario and the shortfall each hour. We press Run. This replays a real Qiskit run on a simulator."

[SCREEN: Press ▶ Run quantum solver. Let stages 1 to 3 play.]

"Twelve decisions become twelve qubits. The QAOA circuit has two layers. The optimizer tunes its dials and the energy drops."

[SCREEN: Stages 4 to 6: histogram, plan, exact check.]

"We measure. The best valid sample decodes into the city: areas take turns, the hospital stays on, the data center pauses for an hour. The exact solver agrees."

[SCREEN: Click Today's rule, then Quantum]

"Today's rule leaves one area dark all three hours. Quantum: no area dark more than an hour, and 73.5 percent of data-center revenue kept."

[SCREEN: Switch scenario to Plant trips, press Run again]

"A plant trips: one more block must go dark. Run again: QAOA again finds the exact best plan. The slider trades homes against revenue."

## 2:30 - 3:00 Honest limits and what's next
[SCREEN: Limitations list, then repo link]

"Honestly: the data is synthetic, and at twelve decisions a laptop solves this instantly, so we claim no quantum speedup. We ran a simulator, not hardware, and the 2,000 megawatt plan was only partly implemented. Grover search failed our test. Next: real load data and more hours. Who Gets the Power: make the choice visible."
