# Who Gets the Power?: 3-minute video script

Read aloud by the team. About 420 spoken words. Numbers are taken from `web/data/results.json` (normal scenario unless noted). Say "set aside", never "is running". Keep a neutral tone.

## 0:00 - 0:25 Hook
[SCREEN: Title card, then headline-style text of the two facts]

"In May 2025, Pakistan set aside 2,000 megawatts of electricity for Bitcoin mining and AI data centers. In August 2026, the regulator ordered K-Electric to stop cutting whole neighborhoods based on losses. So at 3 pm in June, when there is not enough power for everyone, who gets it: the AI data center, your neighborhood, or the hospital?"

## 0:25 - 0:50 Problem and who decides
[SCREEN: Three neighborhoods, a data center and a hospital on a simple map]

"Every hour, someone has to be switched off. The hospital never is. The rest is a choice between three neighborhoods and the data center. Today, areas with the highest losses are cut first. We do not say who is right. We make the trade-offs visible."

## 0:50 - 1:30 How we turned it into 12 qubits
[SCREEN: Grid of 12 yes/no boxes, then a penalty bar]

"Each yes-or-no choice, like Area 2 is off at 4 pm, is one qubit. Four blocks, three hours: twelve qubits. The rule that exactly the right number of blocks go off each hour is a penalty. We checked by brute force that breaking the rule never pays. Four goals are scored: fair dark hours between neighborhoods, no back-to-back darkness, data-center revenue lost, and economic damage. These pair terms are what QAOA is built for."

## 1:30 - 2:30 Demo: press Run
[SCREEN: Demo page, tour dismissed. Scenario: Normal. Point at the shortfall per hour in the left panel.]

"This is our app. On the left: the scenario and how many blocks must go dark each hour. We press Run quantum solver. This replays a real Qiskit run on a simulator."

[SCREEN: Press ▶ Run quantum solver. Let stages 1 to 3 play.]

"First, the twelve decisions become twelve qubits. Then the QAOA circuit with two layers. The optimizer tunes its gamma and beta dials and the energy drops."

[SCREEN: Stages 4 to 6: histogram, plan, exact check.]

"We measure. The best valid plan among the samples decodes into the city: areas take turns going dark, the hospital stays on, and the data center pauses for one hour. The exact solver agrees: it is the best plan."

[SCREEN: Click Today's rule, then Quantum]

"Compare with today's rule: one area dark for all three hours, two of them back to back. Quantum: no area dark for more than an hour, and 73.5 percent of data-center revenue kept."

[SCREEN: Switch scenario to Plant trips, press Run again]

"A plant trips in the second hour, so one more block must go dark. Run again: QAOA again finds the exact best plan, keeping 41.2 percent of the revenue. The slider shows the menu, from protect homes to protect revenue."

## 2:30 - 3:00 Honest limits and what's next
[SCREEN: Limitations list, then repo link]

"Now the honest part. The numbers are synthetic. At twelve decisions a laptop solves this instantly, so we claim no quantum speedup. Blocks are equal-size chunks, and the 2,000 megawatt plan was only partly implemented, so this is an illustration. We ran a simulator, not real hardware. We also tested Grover search: slow, sixteen qubits, an invalid answer. Next: real load data and more hours. Who Gets the Power: make the choice visible."
