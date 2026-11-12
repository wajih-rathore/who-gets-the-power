"use strict";
const $ = (s) => document.querySelector(s);
const PLANS = [["today", "Today's rule"], ["dc_first", "DC-first"], ["greedy", "Greedy"], ["qaoa", "Quantum"]];
const POS = { N1: [30, 70], N2: [30, 238], DC: [380, 70], N3: [380, 238] };
const BW = 150, BH = 96, CY = 211;
// stage start times in seconds: 1 qubits, 2 circuit, 3 energy, 4 histogram, 5 decode, 6 check, end
const T = [0, 1.4, 2.8, 6.2, 8.4, 9.8, 10.6];
const T_MID = T[3] + 0.85 * (T[4] - T[3]);
let data, dataMock = false, scen = "normal", view = null, sweepIdx = null, hour = 0;
let runT = -1, running = false, raf = 0, settled = false;

async function load() {
  for (const [u, mock] of [["data/results.json", false], ["data/mock.json", true]]) {
    try { const r = await fetch(u, { cache: "no-store" }); if (r.ok) return [await r.json(), mock]; } catch (e) {}
  }
  throw new Error("no data");
}
const f1 = (n) => Number(n).toFixed(1);
const sum = (a) => a.reduce((x, y) => x + y, 0);
const clamp = (x) => Math.max(0, Math.min(1, x));
const S = () => data.scenarios[scen];
const hasReal = () => !!S().qaoa.trace;

// Used ONLY when scenarios.<name>.qaoa.trace is missing; the page then shows the "mock data" badge.
function mockTrace(sc) {
  const H = data.hours.length, qm = [];
  data.blocks.forEach((b) => data.hours.forEach((_, h) => qm.push({ q: qm.length, block: b, hour: h })));
  const off = sc.plans.qaoa.off, bs = qm.map((m) => off[m.block][m.hour]).join("");
  const N = 60, e0 = sc.plans.qaoa.objective + 30, e1 = sc.plans.qaoa.objective;
  const iterations = Array.from({ length: N }, (_, i) => ({
    i: i + 1, energy: e1 + (e0 - e1) * Math.exp(-i / 14) + 4 * Math.sin(i * 1.7) * Math.exp(-i / 25),
    gamma: [0.1 + 0.3 * (1 - Math.exp(-i / 18)) + 0.02 * Math.sin(i), 0.2 + 0.5 * (1 - Math.exp(-i / 22))],
    beta: [0.3 + 0.2 * (1 - Math.exp(-i / 20)) + 0.02 * Math.cos(i), 0.4 - 0.2 * (1 - Math.exp(-i / 16))],
  }));
  const flip = (s, ...ix) => s.split("").map((c, k) => (ix.includes(k) ? (c === "1" ? "0" : "1") : c)).join("");
  const top = Array.from({ length: 12 }, (_, r) => {
    const win = r === 2, b = win ? bs : flip(bs, r % 12, (r * 5 + 3) % 12);
    return { rank: r + 1, bitstring: b, count: 31 - r * 2 - (r > 5 ? 3 : 0), valid: win || r % 3 === 0, is_optimum: win, objective: win || r % 3 === 0 ? sc.plans.qaoa.objective + r : null };
  });
  const last = iterations[N - 1];
  return {
    qubit_map: qm, circuit: { image: null, reps: sc.qaoa.reps, depth: 57, two_qubit_gates: 96 },
    cobyla: { iterations, final_gamma: last.gamma, final_beta: last.beta, evaluations: N },
    histogram: { shots: sc.qaoa.shots, top }, decoded: { bitstring: bs, off },
    exact_check: { plans_checked: 4096, valid_plans: 96, agrees: sc.plans.qaoa.is_optimal }, seconds: sc.qaoa.seconds,
  };
}
const trace = () => S().qaoa.trace || (S()._mock = S()._mock || mockTrace(S()));

// ---------- city view ----------
function buildMap() {
  const wires = Object.entries(POS).map(([b, [x, y]]) => {
    const ex = x < 280 ? x + BW : x, ey = y + BH / 2;
    return `<path class="wire" id="w-${b}" d="M280,${CY} L${ex},${ey}"/>`;
  }).join("") + `<path class="wire" id="w-H" d="M280,${CY} L280,268"/>`;
  const blocks = Object.entries(POS).map(([b, [x, y]]) => {
    const dc = b === "DC", n = dc ? 8 : 6;
    const bl = Array.from({ length: n }, (_, i) => {
      if (dc) return `<rect class="bld" x="${x + 12 + i * 16.5}" y="${y + 10}" width="11" height="46" rx="2"/>` + [0, 1, 2, 3].map((k) => `<rect class="win" x="${x + 14.5 + i * 16.5}" y="${y + 14 + k * 10}" width="6" height="5"/>`).join("");
      const c = i % 3, h = 22 + ((i * 7) % 3) * 8, base = y + 56;
      return `<rect class="bld" x="${x + 12 + c * 45}" y="${base - h}" width="36" height="${h}" rx="2"/>` + [0, 1, 2].map((k) => `<rect class="win" x="${x + 17 + c * 45 + (k % 2) * 14}" y="${base - h + 5 + Math.floor(k / 2) * 9}" width="7" height="5"/>`).join("");
    }).join("");
    return `<g class="blk ${dc ? "dc " : ""}lit" id="b-${b}"><rect class="glow" x="${x - 6}" y="${y - 6}" width="${BW + 12}" height="${BH + 12}" rx="14"/>
      <rect class="box" x="${x}" y="${y}" width="${BW}" height="${BH}" rx="10"/>${bl}
      <text class="mlabel" x="${x + 12}" y="${y + 76}"></text><text class="msub st" x="${x + 12}" y="${y + 90}"></text></g>`;
  }).join("");
  const hx = 205, hy = 268;
  $("#map").innerHTML = `<path class="sea" d="M0,382 Q70,366 140,378 T280,376 T420,380 T560,370 V420 H0Z"/>
    <text class="msub sealbl" x="548" y="406" text-anchor="end">Arabian Sea</text>
    <path class="road" d="M0,${CY} H560 M280,0 V378"/>${wires}${blocks}
    <circle cx="280" cy="${CY}" r="15" class="hub"/>
    <path class="bolt" d="M283,${CY - 10} L275,${CY + 2} H281 L277,${CY + 10} L286,${CY - 3} H280Z"/>
    <g class="blk hq lit"><rect class="glow" x="${hx - 4}" y="${hy - 4}" width="158" height="54" rx="12"/><rect class="box" x="${hx}" y="${hy}" width="150" height="46" rx="10"/>
      <path d="M${hx + 24},${hy + 12} h8 v8 h8 v8 h-8 v8 h-8 v-8 h-8 v-8 h8z" fill="var(--hosp)"/>
      <text class="mlabel" x="${hx + 52}" y="${hy + 21}">Hospital</text><text class="msub" x="${hx + 52}" y="${hy + 36}">always on</text></g>`;
}

// the plan the city shows: null means "no plan yet", everyone at risk
function curPlan() {
  if (runT >= 0 && runT < T[4]) return null;
  if (view === "sweep") return data.sweep[sweepIdx].plan;
  return view ? S().plans[view] : null;
}
function planName() {
  if (runT >= 0 && runT < T[4]) return "Solver at work: the city shows the shortfall until the plan is decoded.";
  if (view === "sweep") return `Exact plan for this trade-off: ${data.sweep[sweepIdx].label} (normal day).`;
  if (view === "qaoa") return "Quantum plan: the best valid plan among the samples.";
  return view ? S().plans[view].label : "Press Run quantum solver, or pick a plan to compare.";
}

function renderMap() {
  const p = curPlan(), BI = data.block_info;
  Object.keys(POS).forEach((b) => {
    const dark = p ? p.off[b][hour] === 1 : false, g = $("#b-" + b);
    g.classList.toggle("lit", !dark); g.classList.toggle("dark", dark);
    $("#w-" + b).classList.toggle("off", dark);
    g.querySelector(".mlabel").textContent = BI[b].name;
    g.querySelector(".st").textContent = !p ? "at risk" : dark ? "dark" : "powered";
  });
  $("#caption").textContent = planName();
  $("#compare").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.k === view));
}
function renderHours() {
  const k = S().shortfall_blocks, mw = data.mw_per_block;
  $("#hours").innerHTML = data.hours.map((t, i) => `<button data-h="${i}" aria-pressed="${i === hour}">${t}<small>short ${k[i] * mw} MW</small></button>`).join("");
  $("#hours").querySelectorAll("button").forEach((b) => (b.onclick = () => { if (running) return; hour = +b.dataset.h; renderMap(); renderHours(); }));
}
function renderReads() {
  const p = curPlan(), tot = sum(data.block_info.DC.revenue_per_hour), H = data.hours.length;
  const c = (v, u, l) => `<div class="rd"><b>${v}</b><span>${u}</span><em>${l}</em></div>`;
  $("#reads").innerHTML = p
    ? c(p.max_dark_hours, `of ${H} h`, "most dark hours for one area") + c(p.back_to_back, "", "back-to-back dark hours") + c(f1(p.dc_revenue_kept), `of ${f1(tot)} PKR M`, "data center revenue kept")
    : c("–", "", "most dark hours for one area") + c("–", "", "back-to-back dark hours") + c("–", `of ${f1(tot)} PKR M`, "data center revenue kept");
}

// ---------- left panel ----------
function renderLeft() {
  const k = S().shortfall_blocks, mw = data.mw_per_block, n = data.blocks.length;
  $("#short").innerHTML = data.hours.map((t, i) => `<li><span>${t}</span><span class="dots">${Array.from({ length: n }, (_, j) => `<i class="${j < k[i] ? "f" : ""}"></i>`).join("")}</span><b>${k[i] * mw} MW</b></li>`).join("");
  $("#scen").querySelectorAll("button").forEach((b) => b.setAttribute("aria-checked", b.dataset.k === scen));
  $("#scen-desc").textContent = S().description;
  $("#sweep-note").textContent = sweepIdx === null ? "Move the slider to see the exact best plan for each trade-off." : `${data.sweep[sweepIdx].label}: exact plan, normal day.`;
  $("#mock").hidden = !(dataMock || !hasReal());
  $("#run").textContent = running ? "Running…" : runT >= T[6] ? "↻ Run again" : "▶ Run quantum solver";
  $("#run").disabled = running;
}

// ---------- quantum engine ----------
const bsOf = (tr) => tr.decoded.bitstring;
const bi = (tr, q) => tr.qubit_map[q];
function buildQ() {
  const tr = trace(), H = data.hours.length;
  $("#qgrid").innerHTML = tr.qubit_map.map((m) => `<div class="qb ${m.block === "DC" ? "dcq" : ""}" id="q${m.q}"><b>q${m.q}</b><span>${m.block} × h${m.hour + 1}</span></div>`).join("");
  $("#qleg").textContent = `block × hour (h1–h${H} = ${data.hours[0].split("–")[0]}–${data.hours[H - 1].split("–")[1]})`;
  $("#qlabel").textContent = `Replay of a real Qiskit run · StatevectorSampler simulator · ${data.scenarios[scen].qaoa.qubits || tr.qubit_map.length} qubits · ${f1(tr.seconds)} s`;
  const c = tr.circuit, img = $("#cimg");
  $("#cstat").innerHTML = `<div><b>p = ${c.reps}</b><span>layers</span></div><div><b>${c.depth}</b><span>depth</span></div><div><b>${c.two_qubit_gates}</b><span>two-qubit gates</span></div>`;
  $("#cnone").hidden = !!c.image; img.hidden = !c.image;
  if (c.image) { img.src = c.image; $("#cwrap").href = c.image; img.onerror = () => { img.hidden = true; $("#cnone").hidden = false; }; } else $("#cwrap").removeAttribute("href");
  const hd = $("#dec");
  hd.style.gridTemplateColumns = `auto repeat(${H},1fr)`;
  hd.innerHTML = data.blocks.map((b) => `<span class="rl">${b}</span>` + data.hours.map((_, h) => `<span class="dc" data-b="${b}" data-h="${h}"></span>`).join("")).join("");
}

function renderRun(t) {
  const tr = trace(), its = tr.cobyla.iterations, N = its.length;
  const P = (s) => clamp((t - T[s]) / (T[s + 1] - T[s]));
  document.querySelectorAll(".stg").forEach((el) => {
    const s = +el.dataset.s; el.classList.toggle("on", t >= T[s]); el.classList.toggle("now", t >= T[s] && t < T[s + 1]);
  });
  // 1 qubits
  const bits = bsOf(tr), p0 = P(0);
  tr.qubit_map.forEach((m, i) => {
    const el = $("#q" + m.q); if (!el) return;
    el.classList.toggle("lit", t >= 0 && p0 * tr.qubit_map.length > i);
    el.classList.toggle("bit1", t >= T[4] && bits[m.q] === "1");
    el.classList.toggle("bit0", t >= T[4] && bits[m.q] === "0");
  });
  // 2 circuit wipe
  $("#cimg").style.clipPath = `inset(0 ${(1 - P(1)) * 100}% 0 0)`;
  $("#cwrap").style.setProperty("--w", `${P(1) * 100}%`);
  // 3 energy chart and dials
  const n = Math.round(P(2) * N), es = its.map((x) => x.energy), lo = Math.min(...es), hi = Math.max(...es), W = 280, Hh = 78;
  const X = (i) => 4 + (i / Math.max(1, N - 1)) * (W - 8), Y = (e) => 6 + (1 - (e - lo) / (hi - lo || 1)) * (Hh - 14);
  const pts = its.slice(0, n).map((x, i) => `${X(i).toFixed(1)},${Y(x.energy).toFixed(1)}`);
  $("#chart").innerHTML = `<path class="ax" d="M4,${Hh - 4} H${W - 4} M4,4 V${Hh - 4}"/>` +
    (n ? `<path class="ln" d="M${pts.join(" L")}"/><circle class="dot" cx="${X(n - 1)}" cy="${Y(es[n - 1])}" r="3.5"/>` : "");
  const cur = n ? its[n - 1] : null;
  $("#estat").title = tr.cobyla.energy_note || "";
  $("#estat").textContent = cur ? `iteration ${cur.i} of ${tr.cobyla.evaluations || N} · energy ${f1(cur.energy)}` : "lower is better";
  const dial = (nm, v) => { const a = v == null ? -90 : (((v % Math.PI) + Math.PI) % Math.PI) / Math.PI * 180 - 90;
    return `<div class="dial"><svg viewBox="0 0 40 24"><path d="M5,22 A15,15 0 0 1 35,22" class="arc"/><line x1="20" y1="22" x2="20" y2="9" class="nd" style="transform-origin:20px 22px;transform:rotate(${a}deg)"/></svg><b>${v == null ? "–" : v.toFixed(2)}</b><span>${nm}</span></div>`; };
  $("#dials").innerHTML = [0, 1].map((k) => dial(`γ${k + 1}`, cur && cur.gamma[k])).join("") + [0, 1].map((k) => dial(`β${k + 1}`, cur && cur.beta[k])).join("");
  // 4 histogram
  const hs = tr.histogram.top, p3 = P(3), mx = Math.max(...hs.map((x) => x.count)), bw = 440 / hs.length;
  const wi = hs.findIndex((x) => x.bitstring === bits);
  $("#hist").innerHTML = `<path class="ax" d="M0,56 H440"/>` + hs.map((x, i) => {
    const h = 44 * (x.count / mx) * clamp(p3 * 1.6 - i * 0.04), win = i === wi && p3 > 0.8;
    return `<rect class="hb ${x.valid ? "ok" : ""} ${win ? "win" : ""}" x="${i * bw + 5}" y="${56 - h}" width="${bw - 10}" height="${h}" rx="2"/>` +
      (p3 > 0.5 ? `<text class="hc" x="${i * bw + bw / 2}" y="${52 - h}" text-anchor="middle">${x.count}</text>` : "") +
      `<text class="hr${win ? " win" : ""}" x="${i * bw + bw / 2}" y="67" text-anchor="middle">#${x.rank || i + 1}</text>`;
  }).join("");
  $("#hstat").textContent = `${tr.histogram.shots} shots · ${hs.length} most frequent shown · teal = follows the rules`;
  const wr = wi >= 0 ? hs[wi].rank || wi + 1 : null;
  $("#hnote").innerHTML = p3 > 0.8 ? `Winner <code>${bits}</code> ${wr === 1 ? "is also the most frequent sample" : wr ? `is only the #${wr} most frequent sample` : "is outside the top list"}. We keep the best valid plan among the samples, not simply the most common bitstring.` : "&nbsp;";
  // 5 decode
  const p4 = P(4), H = data.hours.length;
  document.querySelectorAll("#dec .dc").forEach((el) => {
    const h = +el.dataset.h, shown = t >= T[4] && p4 * H > h - 0.001 + 0.01, o = tr.decoded.off[el.dataset.b][h];
    el.className = "dc" + (shown ? (o ? " off" : " on") : "");
  });
  // 6 check
  const ec = tr.exact_check;
  $("#exact").innerHTML = t >= T[5] ? `<b class="${ec.agrees ? "yes" : "no"}">${ec.agrees ? "✓ Exact solver agrees" : "Exact solver found a better plan"}</b><span>${ec.plans_checked} plans checked${ec.valid_plans ? `, ${ec.valid_plans} valid` : ""}</span>` : `<span class="idle">waiting for the plan</span>`;
}

// ---------- run control ----------
function apply(t) {
  runT = t;
  const H = data.hours.length;
  if (t >= T[4] && view !== "qaoa" && !settled) { view = "qaoa"; sweepIdx = null; }
  if (t >= T[4] && t < T[5]) hour = Math.min(H - 1, Math.floor(clamp((t - T[4]) / (T[5] - T[4])) * H));
  else if (t >= T[5] && !settled) { hour = peakHour(); settled = true; }
  renderRun(t); renderMap(); renderHours(); renderReads(); renderLeft();
}
function reset() {
  cancelAnimationFrame(raf); running = false; settled = false; view = null; sweepIdx = null;
  $("#sweep").value = 1; hour = peakHour();
  document.body.classList.remove("running");
  buildQ(); apply(-1);
}
function run() {
  if (running) return;
  reset(); running = true; document.body.classList.add("running");
  const t0 = performance.now();
  const tick = (now) => {
    const t = (now - t0) / 1000;
    if (t >= T[6]) { running = false; document.body.classList.remove("running"); apply(T[6]); return; }
    apply(t); raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
}
function peakHour() { const k = S().shortfall_blocks; return k.indexOf(Math.max(...k)); }

// ---------- guided tour ----------
const TOUR = [
  { sel: "#scen", side: "right", t: "1. Pick a scenario", p: "A normal hot afternoon, or a power plant trips." },
  { sel: "#run", side: "right", t: "2. Press Run quantum solver", p: "Replays a real quantum optimisation, stage by stage." },
  { sel: "#quantum", side: "left", t: "3. Watch the qubits, circuit and measurements", p: "Twelve decisions, the circuit, the energy falling, then the plan appears." },
  { sel: "#compare", side: "below", t: "4. Compare with Today's rule", p: "Switch plans to see who goes dark, and how much revenue the data center keeps." },
];
let tourI = -1;
function showTour(i) {
  tourI = i; const tour = $("#tour");
  if (i < 0 || i >= TOUR.length) { tour.hidden = true; tourI = -1; return; }
  const s = TOUR[i], r = document.querySelector(s.sel).getBoundingClientRect(), tip = $("#tip");
  tour.hidden = false;
  Object.assign($("#spot").style, { left: r.left - 6 + "px", top: r.top - 6 + "px", width: r.width + 12 + "px", height: r.height + 12 + "px" });
  $("#tip-t").textContent = s.t; $("#tip-p").textContent = s.p; $("#tip-n").textContent = `${i + 1} / ${TOUR.length}`;
  $("#tip-next").textContent = i === TOUR.length - 1 ? "Got it" : "Next";
  const w = 280, h = tip.offsetHeight; let x, y;
  if (s.side === "right") { x = r.right + 18; y = r.top; } else if (s.side === "left") { x = r.left - w - 18; y = r.top + 40; } else { x = r.left; y = r.bottom + 18; }
  tip.style.left = Math.max(8, Math.min(innerWidth - w - 8, x)) + "px"; tip.style.top = Math.max(8, Math.min(innerHeight - h - 8, y)) + "px";
  $("#tip-next").focus();
}

// ---------- wiring ----------
function setScen(k) {
  if (running) return;
  scen = k; reset();
}
load().then(([d, mock]) => {
  data = d; dataMock = mock;
  $("#scen").innerHTML = Object.keys(d.scenarios).map((k) => `<button role="radio" data-k="${k}">${k === "normal" ? "Normal" : k === "disaster" ? "Plant trips" : d.scenarios[k].label}</button>`).join("");
  $("#scen").querySelectorAll("button").forEach((b) => (b.onclick = () => setScen(b.dataset.k)));
  $("#compare").innerHTML = `<span>Compare</span>` + PLANS.map(([k, n]) => `<button data-k="${k}" aria-pressed="false">${n}</button>`).join("");
  $("#compare").querySelectorAll("button").forEach((b) => (b.onclick = () => { if (running) return; view = b.dataset.k; sweepIdx = null; apply(runT); }));
  const sw = $("#sweep"); sw.max = d.sweep.length - 1;
  sw.oninput = () => {
    if (running) return;
    if (scen !== "normal") { scen = "normal"; reset(); }
    sweepIdx = +sw.value; view = "sweep"; apply(runT);
  };
  $("#run").onclick = run;
  $("#tour-open").onclick = () => showTour(0);
  $("#tip-next").onclick = () => showTour(tourI + 1);
  $("#tip-skip").onclick = () => showTour(-1);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && tourI >= 0) showTour(-1); });
  addEventListener("resize", () => tourI >= 0 && showTour(tourI));
  buildMap(); reset();
  const h = location.hash;
  if (/run=mid/.test(h)) apply(T_MID); else if (/run=end/.test(h)) { settled = false; apply(T[6]); }
  if (!/notour/.test(h)) showTour(0);
}).catch((e) => { document.querySelector("main").innerHTML = `<p>Could not load data/results.json: ${e.message}</p>`; });
