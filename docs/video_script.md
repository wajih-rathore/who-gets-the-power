# Who Gets the Power?: 3-minute video script

Read aloud by the team over the six stages of the demo, about 280 spoken words (about 2:10, leaving room for the map animations). The narration is the team's own wording; keep it word for word. Numbers come from `web/data/results.json` (normal scenario). This story, its places and its numbers are made up for the demo (the loss percentages are synthetic). The quantum run took 27 seconds on a simulator; say so if asked. Open the page at stage 1: https://who-gets-the-power.vercel.app/#step=1

## ① The shortfall
[SCREEN: Stage 1. Power flows from the power station; the plugs per hour grey out.]

"It's a hot afternoon in Karachi, and everyone switches on their fans at once. The power station can't keep up: there's only enough electricity for 3 of our 4 places at 2 o'clock, and just 2 of them at 3. Someone has to wait in the dark."

## ② Today's rule
[SCREEN: Stage 2. Lyari's line cuts at 2, 3 and 4.]

"Today, K-Electric ranks areas by how much electricity is lost there: stolen, or never paid for. The highest-loss areas are cut first and longest. With Lyari losing the most, Lyari goes dark at 2, at 3 and at 4: three hours straight, even for the families who do pay."

## ③ Switches → qubits
[SCREEN: Stage 3. The 12-switch grid.]

"Each place can be on or off in each hour. Four places over three hours gives 12 on/off switches, and 4,096 ways to set them. On a quantum computer, each switch is a qubit."

## ④ Quantum search
[SCREEN: Stage 4. The "23× better than guessing" bar and the small curve.]

"We use QAOA, a quantum algorithm built for choose-the-best-combination problems like this one. A regular optimizer tunes the quantum circuit over 42 rounds so fair schedules come up more often. By the end, the best schedule shows up about 23 times more often than by guessing."

## ⑤ Quantum vs classical
[SCREEN: Stage 5. The comparison table: today's rule, quick rule, classical, quantum.]

"A classical computer can solve this small case the sure way: try all 4,096 plans. It takes 0.035 seconds and agrees with the quantum answer. Quick rules of thumb do worse. But every extra switch doubles the plans: a city with 100 areas over a full day has more possible plans than there are atoms in the universe. That's the scale quantum computers are being built for."

## ⑥ The fair plan
[SCREEN: Stage 6. The plan plays across the hours; then press "What if a power station breaks down?"]

"Now everyone takes a short, fair turn. No neighbourhood is dark for more than an hour, nobody goes dark twice in a row, the hospital always stays on, and the big AI computer centre takes a break at 4 to help out."
