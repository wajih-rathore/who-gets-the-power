# Who Gets the Power?: 3-minute video script

Read aloud by the team. About 400 spoken words. Numbers are taken from `web/data/results.json` (normal scenario unless noted). Say "set aside", never "is running". Keep a neutral tone.

## 0:00 - 0:25 Hook
[SCREEN: Title card, then headline-style text of the two facts]

"In May 2025, Pakistan set aside 2,000 megawatts of electricity for Bitcoin mining and AI data centers. In August 2026, the regulator ordered K-Electric to stop cutting whole neighborhoods based on losses. So at 3 pm in June, when there is not enough power for everyone, who gets it: the AI data center, your neighborhood, or the hospital?"

## 0:25 - 0:50 Problem and who decides
[SCREEN: Three neighborhoods, a data center and a hospital on a simple map]

"Every hour, someone has to be switched off. The hospital never is. The rest is a choice between three neighborhoods and the data center. Today, areas with the highest losses are cut first. That is simple, but it can leave the same area dark for hours. We do not say who is right. We make the trade-offs visible, and we plan the whole afternoon at once."

## 0:50 - 1:30 How we turned it into 12 qubits
[SCREEN: Grid of 12 yes/no boxes, then a penalty bar]

"Each yes-or-no choice, like Area 2 is off at 4 pm, is one qubit. Four blocks, three hours: twelve qubits. The rule that exactly the right number of blocks go off each hour is a penalty. We checked by brute force that breaking the rule never pays. Four goals are scored: fair dark hours between neighborhoods, no back-to-back darkness, data-center revenue lost, and economic damage. Fairness and back-to-back are pair terms, which is what QAOA in Qiskit is built for."

## 1:30 - 2:30 Live demo
[SCREEN: Demo page, plan toggle on Today's rule]

"This is our page. Today's rule: the fairness meter shows one area dark for all three hours, with two back-to-back dark hours."

[SCREEN: Click Quantum, then Exact]

"Quantum plan: the fairness meter improves and the revenue counter shows 73.5 percent of the data center's revenue kept. Exact is the brute-force best. QAOA found the exact optimum."

[SCREEN: Drag the trade-off slider]

"This slider moves from protect homes to protect data-center revenue. Watch the plan change and the revenue counter move."

[SCREEN: Click Disaster button]

"Now a power plant trips in the second hour. One more block must go dark. We press Disaster and the page switches to the plan we solved in advance for that case. QAOA again found the exact optimum, with 41.2 percent of the data-center revenue kept."

[SCREEN: Results chart]

"Against exact, the quantum plan has an approximation ratio of 1.0, and 0.57 percent of its probability sits on the best plan, about 23 times random chance."

## 2:30 - 3:00 Honest limits and what's next
[SCREEN: Limitations list, then repo link]

"Now the honest part. The numbers are synthetic. At twelve decisions a laptop solves this instantly, so we claim no quantum speedup. Blocks are equal-size chunks, and the 2,000 megawatt plan was only partly implemented, so this is an illustration. We ran a simulator, not real hardware. We also tested Grover search on a nine-variable version: it was slow, needed sixteen qubits and gave an invalid answer, so it waits for future hardware. Next: real load data and more hours. Who Gets the Power: make the choice visible."
