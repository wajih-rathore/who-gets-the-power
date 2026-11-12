"use strict";
const $ = (s) => document.querySelector(s);
const NS = "http://www.w3.org/2000/svg";
let D, N, STEP = 0, timer = null, timer2 = null;
const HOUR_MS = 1600;

// positions on the 800x540 map
const POS = { plant: [400, 215], N1: [140, 95], N2: [140, 300], N3: [400, 355], DC: [660, 95], HOSP: [660, 300] };

const sc = (k) => D.scenarios[k];
const mw = (k, h) => sc(k).shortfall_blocks[h] * D.mw_per_block;
const fmt = (x, n = 0) => Number(x).toLocaleString("en-US", { maximumFractionDigits: n });
const qm = () => N.qaoa.trace.qubit_map;
const nPlans = () => 2 ** qm().length;
const times = () => Math.round(N.qaoa.p_opt / N.qaoa.p_opt_random);

/* ---------- map ---------- */
function blockSvg(id) {
  const [x, y] = POS[id], info = D.block_info[id], dc = info.kind === "datacenter";
  let art = "";
  if (dc) {
    art = `<rect class="body dcbody" x="-58" y="-34" width="116" height="68" rx="6"/>` +
      [0, 1, 2].map((i) => `<rect class="win rack" x="${-46 + i * 32}" y="-24" width="24" height="48" rx="3"/>` +
        [0, 1, 2, 3].map((j) => `<rect class="led" x="${-42 + i * 32}" y="${-18 + j * 11}" width="16" height="3" rx="1.5"/>`).join("")).join("");
  } else if (info.kind === "market") {
    art = `<rect class="body" x="-58" y="-24" width="116" height="58" rx="4"/><path class="roof" d="M-62,-24 L-50,-38 H50 L62,-24 Z"/>` +
      [0, 1, 2, 3].map((i) => `<rect class="win" x="${-46 + i * 25}" y="-8" width="16" height="22" rx="2"/>`).join("");
  } else {
    art = [[-52, 30], [-18, 50], [18, 36]].map(([bx, h]) => `<rect class="body" x="${bx}" y="${34 - h}" width="34" height="${h}" rx="2"/>` +
      Array.from({ length: Math.floor((h - 6) / 13) }, (_, r) => `<rect class="win" x="${bx + 6}" y="${34 - h + 6 + r * 13}" width="9" height="7" rx="1"/><rect class="win" x="${bx + 19}" y="${34 - h + 6 + r * 13}" width="9" height="7" rx="1"/>`).join("")).join("");
  }
  const kind = { homes: "homes", market: "market", datacenter: "" }[info.kind];
  return `<g class="blk lit${dc ? " dc" : ""}" id="b-${id}" transform="translate(${x},${y})"><ellipse class="glow" cx="0" cy="0" rx="82" ry="58"/>${art}
    <text class="lbl" y="52" text-anchor="middle">${info.name}${kind ? `<tspan class="kind"> · ${kind}</tspan>` : ""}</text>${dc ? `<text class="hyp" y="67" text-anchor="middle">hypothetical</text>` : ""}</g>`;
}
function buildMap() {
  const svg = $("#map");
  const lines = ["N1", "N2", "N3", "DC", "HOSP"].map((id) => `<path class="line flow" id="l-${id}" d="M${POS.plant} L${POS[id]}"/>`).join("");
  svg.innerHTML = `
  <rect width="800" height="540" fill="var(--sea)"/>
  <path class="land" d="M0,0 H800 V452 C740,436 700,432 640,446 C580,462 520,462 450,448 C380,432 330,434 270,450 C200,468 120,466 60,444 C30,434 14,438 0,446 Z"/>
  <g class="districts">
    <path d="M10,12 L250,6 L270,170 L120,196 L10,160 Z"/><path d="M270,170 L250,6 L540,10 L560,150 L400,180 Z"/>
    <path d="M560,150 L540,10 L790,12 L790,190 L690,200 Z"/><path d="M10,160 L120,196 L270,170 L290,300 L180,430 L10,420 Z"/>
    <path d="M400,180 L560,150 L690,200 L790,190 L790,420 L560,440 L450,300 Z"/>
  </g>
  <path class="coastline" d="M0,446 C14,438 30,434 60,444 C120,466 200,468 270,450 C330,434 380,432 450,448 C520,462 580,462 640,446 C700,432 740,436 800,452"/>
  <path class="wave" d="M60,490 q15,-10 30,0 t30,0 t30,0 M560,505 q15,-10 30,0 t30,0 t30,0 M690,480 q15,-10 30,0 t30,0"/>
  <text class="sea" x="24" y="500">Arabian Sea</text><text class="city" x="24" y="28">KARACHI</text>
  <g>${lines}</g>
  <g class="plant" transform="translate(${POS.plant})"><rect class="body" x="-44" y="-18" width="88" height="48" rx="4"/><rect class="body" x="-34" y="-46" width="16" height="30"/><rect class="body" x="-8" y="-58" width="16" height="42"/><rect class="body" x="18" y="-46" width="16" height="30"/>
    <path class="bolt" d="M4,-6 L-10,14 H-1 L-5,28 L10,6 H1 Z"/><text class="lbl" y="52" text-anchor="middle">Bin Qasim power station</text></g>
  ${["N1", "N2", "N3", "DC"].map(blockSvg).join("")}
  <g class="blk hosp lit" id="b-HOSP" transform="translate(${POS.HOSP})"><ellipse class="glow" cx="0" cy="0" rx="82" ry="58"/><rect class="body" x="-52" y="-34" width="104" height="68" rx="6"/><rect class="cross" x="-6" y="-24" width="12" height="36" rx="2"/><rect class="cross" x="-18" y="-12" width="36" height="12" rx="2"/><text class="lbl" y="52" text-anchor="middle">${D.hospital.name}</text></g>`;
}

/* ---------- view: which scenario/plan/hour is on screen ---------- */
function show({ scn = "normal", plan = null, h = 0, gauge = false, clock = false, red = true }) {
  const P = plan ? sc(scn).plans[plan] : null;
  D.blocks.forEach((b) => {
    const off = !!(P && P.off[b][h]);
    $(`#b-${b}`).classList.toggle("off", off); $(`#b-${b}`).classList.toggle("lit", !off);
    $(`#l-${b}`).classList.toggle("off", off); $(`#l-${b}`).classList.toggle("flow", !off);
  });
  const c = $("#clock"); c.classList.toggle("hide", !clock); c.textContent = D.hours[h];
  const g = $("#gauge");
  const total = D.blocks.length, plug = (on) => `<svg class="plug${on ? " on" : ""}" viewBox="0 0 20 26"><rect x="4" y="0" width="3" height="8"/><rect x="13" y="0" width="3" height="8"/><rect x="1" y="7" width="18" height="13" rx="3"/><rect x="8" y="19" width="4" height="7"/></svg>`;
  g.className = "gauge" + (gauge ? "" : " hide");
  g.innerHTML = D.hours.map((hr, i) => { const n = total - (red ? sc(scn).shortfall_blocks[i] : 0);
    return `<div class="ph${i === h ? " cur" : ""}${n < total ? " low" : ""}"><em>${hr}</em><div class="plugs">${Array.from({ length: total }, (_, k) => plug(k < n)).join("")}</div><span>power for ${n} of ${total} places</span></div>`; }).join("");
}
function clearTimers() { clearInterval(timer); clearTimeout(timer2); }
function playHours(opts, onTick) {
  let h = 0; const tick = () => { show({ ...opts, h }); onTick && onTick(h); if (++h >= D.hours.length) clearInterval(timer); };
  tick(); timer = setInterval(tick, HOUR_MS);
}
const big = (v, l, cls = "") => `<div class="stat ${cls}"><b>${v}</b><span>${l}</span></div>`;

/* ---------- stages ---------- */
const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const word = (n) => WORDS[n] ?? String(n);
const startHour = (i) => D.hours[i].split("–")[0];
const grid = (cls = "") => `<div class="swgrid ${cls}">${D.blocks.map((b) => `<div><em>${D.block_info[b].name}</em>${D.hours.map((_, h) => `<span class="sw" style="--d:${((h * 0.23 + (b.charCodeAt(1) % 5) * 0.11) % 0.6).toFixed(2)}s"><i></i></span>`).join("")}</div>`).join("")}</div>`;
const stat = (v, l) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`;
const dcOn = (p) => p.off.DC.filter((x) => !x).length;
const STAGES = [
  { name: "The shortfall",
    html: () => { const T = D.blocks.length, n = (i) => T - N.shortfall_blocks[i], hs = (i) => startHour(i);
      return `<p>It's a hot afternoon in Karachi, and everyone switches on their fans at once. The power station can't keep up: there's only enough electricity for ${n(0)} of our ${T} places at ${hs(0)} o'clock, and just ${n(1)} of them at ${hs(1)}. Someone has to wait in the dark.</p>`; },
    run: () => { show({ gauge: true, clock: true, red: false }); timer2 = setTimeout(() => playHours({ gauge: true, clock: true }), 900); } },
  { name: "Today's rule",
    html: () => { const t = N.plans.today, w = D.blocks.find((b) => D.block_info[b].kind !== "datacenter" && t.off[b].every(Boolean)) || D.blocks.find((b) => t.off[b].filter(Boolean).length === t.max_dark_hours);
      return `<p>Today the rule is simple: switch off the same neighbourhood first, every time. So ${D.block_info[w].name}'s lights go out at ${startHour(0)}… and at ${startHour(1)}… and at ${startHour(2)}. Three hot hours in a row, while the others mostly stay lit. That doesn't feel fair.</p>`; },
    run: () => playHours({ plan: "today", clock: true, gauge: true }) },
  { name: "Switches → qubits",
    html: () => { const q = qm().length; return `<p>Let's think of it as switches. One switch for each place, for each hour: ${D.blocks.length} places × ${D.hours.length} hours = ${q} switches. Flip them every possible way and you get ${fmt(nPlans())} different plans. A quantum computer gives each switch its own qubit.</p>${grid()}`; },
    run: () => show({}) },
  { name: "Quantum search",
    html: () => { const q = N.qaoa, it = q.trace.cobyla.iterations.map((r) => r.energy), mx = Math.max(...it), mn = Math.min(...it);
      const pts = it.map((e, i) => `${(i / (it.length - 1) * 200).toFixed(1)},${(36 - (e - mn) / (mx - mn) * 34).toFixed(1)}`).join(" ");
      return `<p>Instead of checking plans one at a time, the quantum computer plays with all ${qm().length} switches together. Round after round, ${q.trace.cobyla.evaluations} rounds in all, it learns which plans are fair and makes them come up more often, like a game of hot and cold. By the end, it finds the best plan ${times()} times more often than guessing.</p>
      ${grid("flick")}<div class="bars"><div><em>Guessing</em><i style="--w:${(q.p_opt_random / q.p_opt * 100).toFixed(2)}%"></i><u></u></div><div><em>Quantum</em><i class="q" style="--w:100%"></i><u>${times()}×</u></div></div>
      <svg class="spark" viewBox="0 0 200 38" aria-label="Energy over the tuning rounds"><polyline points="${pts}"/></svg>`; },
    run: () => { show({}); requestAnimationFrame(() => requestAnimationFrame(() => $("#story").classList.add("grow"))); } },
  { name: "Double-check",
    html: () => { const e = N.qaoa.trace.exact_check;
      return `<p>Then an ordinary computer checks the slow way, trying all ${fmt(e.plans_checked)} plans one by one. ${e.agrees ? "Same answer. ✓" : "A different answer."}</p>
      <div class="badge ${e.agrees ? "" : "bad"}"><svg viewBox="0 0 24 24" width="44" height="44"><circle cx="12" cy="12" r="11" fill="currentColor"/><path d="M6.5 12.5l3.8 3.8 7.2-8" fill="none" stroke="#fff" stroke-width="2.6"/></svg><span>${fmt(e.plans_checked)} checked<br>${e.agrees ? "same answer" : "different answer"}</span></div>`; },
    run: () => show({}) },
  { name: "The fair plan",
    html: () => { const t = N.plans.today, q = N.plans.qaoa, dcH = q.off.DC.indexOf(1);
      return `<p>Now everyone takes a short, fair turn. No neighbourhood is dark for more than ${q.max_dark_hours === 1 ? "an hour" : q.max_dark_hours + " hours"}, nobody goes dark twice in a row, the hospital always stays on, and the big AI computer centre takes a break at ${startHour(dcH)} to help out.</p>
      <div class="stats">${stat(t.max_dark_hours + " hours → " + q.max_dark_hours + " hour", "longest wait in the dark")}${stat(t.back_to_back + " → " + q.back_to_back, "cut twice in a row")}${stat(times() + "×", "found the best plan more often than guessing")}${stat(dcOn(q) + " of " + D.hours.length + " hours", "AI centre keeps working")}</div>
      <button class="btn primary" id="trip"><svg viewBox="0 0 12 16" width="11" height="14"><path d="M7,0 L0,9 H5 L4,16 L12,6 H7 Z" fill="currentColor"/></svg> What if a power station breaks down?</button><p class="note" id="tripnote"></p>`; },
    run: () => { playHours({ plan: "qaoa", clock: true, gauge: true });
      $("#trip").onclick = () => { clearTimers(); $("#tripnote").textContent = "Plan solved in advance for this case."; playHours({ scn: "disaster", plan: "qaoa", gauge: true, clock: true }); }; } },
];

function go(n) {
  STEP = Math.max(0, Math.min(STAGES.length - 1, n)); clearTimers();
  history.replaceState(null, "", "#step=" + (STEP + 1));
  const st = $("#story"); st.classList.remove("grow", "in"); st.innerHTML = STAGES[STEP].html(); void st.offsetWidth; st.classList.add("in");
  $("#count").textContent = `${STEP + 1} / ${STAGES.length}`;
  $("#pipe").querySelectorAll(".stage").forEach((e, i) => { e.classList.toggle("on", i === STEP); e.classList.toggle("done", i < STEP); });
  $("#back").disabled = STEP === 0; $("#next").disabled = STEP === STAGES.length - 1;
  STAGES[STEP].run();
}

/* ---------- drawer ---------- */
function buildDrawer() {
  const t = N.qaoa.trace, c = t.circuit, w = t.decoded.bitstring, top = t.histogram.top;
  const win = top.find((r) => r.bitstring === w);
  const rows = ["today", "dc_first", "greedy", "qaoa", "exact"].map((k) => { const p = N.plans[k];
    return `<tr><td>${p.label}</td><td>${p.max_dark_hours}</td><td>${p.back_to_back}</td><td>${fmt(p.dc_revenue_kept_pct)}%</td><td>${p.approx_ratio.toFixed(2)}</td></tr>`; }).join("");
  $("#dbody").innerHTML = `
  <h3>The question, in plain words</h3>
  <p>Pick which blocks to switch off each hour so the shortfall is covered, the burden is shared, and the data center loses little. ${qm().length} yes/no switches (1 = off).</p>
  <p class="formula">minimise fairness · Σ(dark hours)² + back-to-back + data-center revenue lost + damage + penalty · Σ<sub>t</sub>(Σ<sub>b</sub> x − k<sub>t</sub>)²</p>
  <p class="small">Weights: fairness ${D.weights.fairness}, back-to-back ${D.weights.back_to_back}, revenue ${D.weights.revenue}, damage ${D.weights.damage}, penalty ${D.weights.penalty}. ${qm().length} binary variables.</p>
  <h3>Numbers behind the story</h3>
  <p>Shortfall per hour: ${D.hours.map((h, i) => `${h} ${mw("normal", i)} MW`).join(", ")}. Chance of picking the best plan: ${fmt(N.qaoa.p_opt * 100, 2)}% (quantum) vs ${fmt(N.qaoa.p_opt_random * 100, 3)}% (random). Data-centre revenue kept: ${fmt(N.plans.qaoa.dc_revenue_kept_pct)}%.</p>
  <h3>Quantum circuit (QAOA)</h3>
  <p>p = ${c.reps}, depth ${c.depth}, ${c.two_qubit_gates} two-qubit gates.</p>
  <img class="thumb" src="${c.image}" alt="QAOA circuit drawing">
  <h3>What the machine measured (${t.histogram.shots} shots, top 5)</h3>
  <table><tr><th>Bitstring</th><th>Count</th><th>Valid</th></tr>${top.slice(0, 5).map((r) => `<tr><td class="mono">${r.bitstring}</td><td>${r.count}</td><td>${r.valid ? "yes" : "no"}</td></tr>`).join("")}</table>
  <p class="small">Winning plan ${w}: ${win ? `rank #${win.rank} most frequent sample` : "not in the top list"}.</p>
  <h3>Baselines, normal day</h3>
  <table><tr><th>Plan</th><th>Max dark h</th><th>Back-to-back</th><th>DC revenue kept</th><th>Approx ratio</th></tr>${rows}</table>
  <h3>Considered and rejected</h3>
  <p>Grover search was considered and rejected: 71 s, 16 qubits, invalid answer on a 9-variable test.</p>
  <h3>Limitations</h3>
  <p>Synthetic data. Simulator only. No speedup claimed. Numbers come from a recorded real Qiskit run on a simulator (see README).</p>`;
}
function drawer(open) {
  const d = $("#drawer"); d.classList.toggle("open", open); d.setAttribute("aria-hidden", !open);
  $("#open-drawer").setAttribute("aria-expanded", open); (open ? $("#close-drawer") : $("#open-drawer")).focus();
}

/* ---------- boot ---------- */
(async () => {
  D = await (await fetch("data/results.json", { cache: "no-store" })).json(); N = sc("normal");
  buildMap(); buildDrawer();
  $("#pipe").innerHTML = STAGES.map((g, i) => `<button class="stage" data-i="${i}"><span class="n">${i + 1}</span><b>${g.name}</b></button>`).join("<span class=\"arr\">→</span>");
  $("#pipe").onclick = (e) => { const b = e.target.closest(".stage"); if (b) go(+b.dataset.i); };
  $("#back").onclick = () => go(STEP - 1); $("#next").onclick = () => go(STEP + 1);
  $("#open-drawer").onclick = () => drawer(true); $("#close-drawer").onclick = () => drawer(false);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") drawer(false);
    else if (e.key === "ArrowRight") go(STEP + 1); else if (e.key === "ArrowLeft") go(STEP - 1);
  });
  const m = /step=(\d+)/.exec(location.hash); go(m ? +m[1] - 1 : 0);
})();
