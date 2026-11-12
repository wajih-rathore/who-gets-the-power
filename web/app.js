"use strict";
const $ = (s) => document.querySelector(s);
const PLANS = [["today", "Today's rule"], ["dc_first", "DC-first"], ["greedy", "Greedy"], ["qaoa", "Quantum"], ["exact", "Exact"]];
const STEPS = ["Not enough power", "Today's rule", "The quantum plan", "Your call"];
const POS = { N1: [30, 70], N2: [30, 238], DC: [380, 70], N3: [380, 238] };
const BW = 150, BH = 96, CY = 211;
let data, step = 0, scen = "normal", dplan = "qaoa", hour = 0, sweepIdx = null, userHour = false, timer = null;

async function load() {
  for (const [u, mock] of [["data/results.json", false], ["data/mock.json", true]]) {
    try { const r = await fetch(u, { cache: "no-store" }); if (r.ok) return [await r.json(), mock]; } catch (e) {}
  }
  throw new Error("no data");
}
const f1 = (n) => Number(n).toFixed(1);
const sum = (a) => a.reduce((x, y) => x + y, 0);
const normal = () => data.scenarios.normal;

// the plan the map shows for the current step
function stepPlan() {
  if (step === 1) return normal().plans.today;
  if (step === 2) return normal().plans.qaoa;
  if (step === 3) return sweepIdx === null ? data.scenarios[scen].plans.qaoa : data.sweep[sweepIdx].plan;
  return null; // step 0: no plan yet, everyone is "at risk"
}

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
      return `<rect class="bld" x="${x + 12 + c * 45}" y="${base - h - (i > 2 ? 0 : 0)}" width="36" height="${h}" rx="2"/>` + [0, 1, 2].map((k) => `<rect class="win" x="${x + 17 + c * 45 + (k % 2) * 14}" y="${base - h + 5 + Math.floor(k / 2) * 9}" width="7" height="5"/>`).join("");
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

function renderMap() {
  const p = stepPlan(), BI = data.block_info;
  Object.keys(POS).forEach((b) => {
    const dark = p ? p.off[b][hour] === 1 : false, g = $("#b-" + b), i = BI[b];
    g.classList.toggle("lit", !dark); g.classList.toggle("dark", dark);
    $("#w-" + b).classList.toggle("off", dark);
    g.querySelector(".mlabel").textContent = i.name;
    g.querySelector(".st").textContent = !p ? "at risk" : dark ? "dark" : "powered";
  });
}

function renderHours() {
  const k = normal().shortfall_blocks;
  $("#hours").innerHTML = data.hours.map((t, i) => `<button data-h="${i}" aria-pressed="${i === hour}">${t}${step === 0 ? `<small>short ${k[i]}</small>` : ""}</button>`).join("");
  $("#hours").querySelectorAll("button").forEach((b) => (b.onclick = () => { hour = +b.dataset.h; userHour = true; stopTimer(); render(); }));
}

function renderStory() {
  const BI = data.block_info, mw = data.mw_per_block, H = data.hours.length, k = normal().shortfall_blocks;
  const homes = data.blocks.filter((b) => BI[b].kind !== "datacenter");
  let head, bigs, note = "";
  if (step === 0) {
    head = `At ${data.hours[k.indexOf(Math.max(...k))]}, Karachi is short of power. Who goes dark?`;
    bigs = `<div><div class="big bad">${k[hour] * mw}<span class="u">MW short</span></div><span class="lbl">${data.hours[hour]}: ${k[hour]} of ${data.blocks.length} blocks must be switched off</span></div>`;
  } else if (step === 1) {
    const p = normal().plans.today, w = homes.find((b) => sum(p.off[b]) === p.max_dark_hours);
    head = "Today's rule cuts the same area again and again. That is not fair.";
    bigs = `<div><div class="big bad">${p.max_dark_hours}<span class="u">of ${H} h dark</span></div><span class="lbl">${BI[w].name} is cut every time: it has the highest losses (${BI[w].loss_pct}%)</span></div>`;
  } else if (step === 2) {
    const p = normal().plans.qaoa;
    head = "The quantum plan rotates the cuts. The hospital stays on and the AI data center flexes.";
    bigs = `<div><div class="big good">${p.max_dark_hours}</div><span class="lbl">most dark hours<br>for any area</span></div>
      <div><div class="big good">${p.back_to_back}</div><span class="lbl">back-to-back<br>dark hours</span></div>`;
    note = p.is_optimal ? `<span class="ok">matches the exact best answer ✓</span>` : `Approx. ratio vs exact best answer: ${p.approx_ratio.toFixed(2)} (1.00 = best)`;
  } else {
    const p = stepPlan(), tot = sum(BI.DC.revenue_per_hour);
    head = "Your call: protect homes or protect data-center revenue?";
    bigs = `<div><div class="big dc">${f1(p.dc_revenue_kept)}<span class="u">of ${f1(tot)} PKR M</span></div><span class="lbl">data-center revenue kept &middot; worst-hit area dark ${p.max_dark_hours} of ${H} h</span></div>`;
    $("#ctlnote").textContent = scen === "disaster" ? "Plan solved in advance for this case, not re-solved live. " + data.scenarios.disaster.description
      : sweepIdx === null ? "Move the slider, or trip a plant." : `${data.sweep[sweepIdx].label}: exact plan, normal day`;
  }
  $("#head").textContent = head; $("#bigs").innerHTML = bigs; $("#note").innerHTML = note;
  $("#ctl").hidden = step !== 3;
}

function renderBar() {
  $("#steps").innerHTML = STEPS.map((n, i) => `<li><button data-s="${i}" ${i === step ? 'aria-current="step"' : ""}><i>${i + 1}</i>${n}</button></li>`).join("");
  $("#steps").querySelectorAll("button").forEach((b) => (b.onclick = () => go(+b.dataset.s)));
  $("#count").textContent = `${step + 1} / ${STEPS.length}`;
  $("#back").disabled = step === 0; $("#next").disabled = step === STEPS.length - 1;
}

// Under the hood drawer: full grid and every metric for the chosen plan and scenario
function renderHood() {
  const S = data.scenarios[scen], p = S.plans[dplan], BI = data.block_info;
  const sub = (b) => { const i = BI[b]; return i.kind === "datacenter" ? "data center" : `${i.kind}, ${i.loss_pct}% losses`; };
  let h = `<tr><th class="rl"></th>${data.hours.map((t) => `<th>${t}</th>`).join("")}</tr>`;
  data.blocks.forEach((b) => {
    h += `<tr><td class="rl">${BI[b].name}<small>${sub(b)}</small></td>` + p.off[b].map((o) => `<td class="c ${o ? "off" : "on"}">${o ? "dark" : "on"}</td>`).join("") + `</tr>`;
  });
  h += `<tr><td class="rl">${data.hospital.name}<small>never switched off</small></td>${data.hours.map(() => `<td class="c hosp">on</td>`).join("")}</tr>`;
  $("#tl").innerHTML = h;
  const pips = (n) => `<div class="pips">${[1, 2, 3].map((i) => `<i class="${i <= n ? "f" + (n >= 3 ? " hot" : "") : ""}"></i>`).join("")}</div>`;
  $("#fair").innerHTML = `<div><div class="big">${p.max_dark_hours}<span class="lbl"> of ${data.hours.length} h</span></div><div class="lbl">most dark hours, one area</div>${pips(p.max_dark_hours)}</div>
    <div><div class="big">${p.back_to_back}</div><div class="lbl">back-to-back dark hours</div></div>`;
  const tot = sum(BI.DC.revenue_per_hour);
  $("#rev").innerHTML = `<div><div class="big">${f1(p.dc_revenue_kept)}<span class="lbl"> of ${f1(tot)} PKR M</span></div></div>
    <div><div class="big" style="font-size:24px">${Math.round(p.dc_revenue_kept_pct)}%</div></div>
    <div class="bar2" style="grid-column:1/3"><b style="width:${p.dc_revenue_kept_pct}%"></b></div>
    <div class="mini"><span>Economic damage <b>${f1(p.economic_damage)}</b></span><span>Approx. ratio vs exact <b>${p.approx_ratio.toFixed(2)}</b></span></div>`;
  $("#plan-toggle").querySelectorAll("button").forEach((b) => b.setAttribute("aria-checked", b.dataset.k === dplan));
  $("#scen-toggle").querySelectorAll("button").forEach((b) => b.setAttribute("aria-checked", b.dataset.k === scen));
  $("#scenario-desc").textContent = S.description;
  const q = S.qaoa, pc = (x) => (x * 100 < 1 ? (x * 100).toFixed(2) : (x * 100).toFixed(1)) + "%";
  $("#qsub").textContent = `${q.qubits} qubits, ${q.reps} layers`;
  $("#qaoa").innerHTML = `<dt>Exact answer found</dt><dd class="${q.found_optimum ? "ok" : "no"}">${q.found_optimum ? "yes" : "no"}</dd>
    <dt>Chance of best plan</dt><dd>${pc(q.p_opt)} <span class="lbl">vs ${pc(q.p_opt_random)} random</span></dd>
    <dt>Samples that follow the rules</dt><dd>${pc(q.p_feasible)} <span class="lbl">vs ${pc(q.p_feasible_random)}</span></dd>`;
}

function render() { renderMap(); renderHours(); renderStory(); renderBar(); if (!$("#hood").hidden) renderHood(); }

function stopTimer() { clearInterval(timer); timer = null; }
function startTimer() {
  stopTimer();
  if (userHour || matchMedia("(prefers-reduced-motion:reduce)").matches) return;
  timer = setInterval(() => { hour = (hour + 1) % data.hours.length; render(); }, 2600);
}
function go(n) {
  step = Math.max(0, Math.min(STEPS.length - 1, n));
  history.replaceState(null, "", `#step=${step + 1}`);
  render(); startTimer();
}
function peakHour() { const k = normal().shortfall_blocks; return k.indexOf(Math.max(...k)); }
function fromHash() { const m = location.hash.match(/step=(\d)/); return m ? +m[1] - 1 : 0; }
function setHood(open) {
  $("#hood").hidden = !open; $("#hood-open").setAttribute("aria-expanded", open);
  if (open) { renderHood(); $("#hood-close").focus(); } else $("#hood-open").focus();
}

load().then(([d, mock]) => {
  data = d; $("#mock").hidden = !mock; hour = peakHour();
  $("#plan-toggle").innerHTML = PLANS.map(([k, n]) => `<button role="radio" data-k="${k}">${n}</button>`).join("");
  $("#plan-toggle").querySelectorAll("button").forEach((b) => (b.onclick = () => { dplan = b.dataset.k; renderHood(); }));
  $("#scen-toggle").innerHTML = Object.keys(d.scenarios).map((k) => `<button role="radio" data-k="${k}">${d.scenarios[k].label}</button>`).join("");
  $("#scen-toggle").querySelectorAll("button").forEach((b) => (b.onclick = () => { scen = b.dataset.k; sweepIdx = null; $("#disaster").setAttribute("aria-pressed", scen === "disaster"); render(); }));
  const sw = $("#sweep"); sw.max = d.sweep.length - 1; sw.value = Math.floor((d.sweep.length - 1) / 2);
  $("#ticks").innerHTML = `<span>${d.sweep[0].label}</span><span>${d.sweep[d.sweep.length - 1].label}</span>`;
  sw.oninput = () => { sweepIdx = +sw.value; scen = "normal"; $("#disaster").setAttribute("aria-pressed", false); render(); };
  $("#disaster").onclick = (e) => {
    scen = scen === "normal" ? "disaster" : "normal"; sweepIdx = null;
    e.currentTarget.setAttribute("aria-pressed", scen === "disaster");
    document.body.classList.remove("flash"); void document.body.offsetWidth; document.body.classList.add("flash");
    render();
  };
  $("#next").onclick = () => go(step + 1); $("#back").onclick = () => go(step - 1);
  $("#hood-open").onclick = () => setHood(true); $("#hood-close").onclick = () => setHood(false);
  const hide = () => { $("#hint").hidden = true; };
  document.addEventListener("click", hide); document.addEventListener("keydown", hide);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { if (!$("#hood").hidden) setHood(false); return; }
    if (!$("#hood").hidden || e.target.type === "range" || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === "ArrowRight") go(step + 1); else if (e.key === "ArrowLeft") go(step - 1);
  });
  addEventListener("hashchange", () => go(fromHash()));
  buildMap(); go(fromHash());
}).catch((e) => { document.querySelector("main").innerHTML = `<p>Could not load data/results.json: ${e.message}</p>`; });
