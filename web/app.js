"use strict";
const $ = (s) => document.querySelector(s);
const PLANS = [["today", "Today's rule"], ["dc_first", "DC-first"], ["greedy", "Greedy"], ["qaoa", "Quantum"], ["exact", "Exact"]];
const POS = { N1: [30, 70], N2: [30, 238], DC: [380, 70], N3: [380, 238] };
const BW = 150, BH = 96, CY = 211;
let data, scen = "normal", plan = "exact", hour = 1, sweepIdx = null;

async function load() {
  for (const [u, mock] of [["data/results.json", false], ["data/mock.json", true]]) {
    try { const r = await fetch(u, { cache: "no-store" }); if (r.ok) return [await r.json(), mock]; } catch (e) {}
  }
  throw new Error("no data");
}
const f1 = (n) => Number(n).toFixed(1);
const cur = () => (sweepIdx === null ? data.scenarios[scen].plans[plan] : data.sweep[sweepIdx].plan);

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
  const p = cur(), BI = data.block_info;
  $("#maphour").textContent = data.hours[hour];
  Object.keys(POS).forEach((b) => {
    const dark = p.off[b][hour] === 1, g = $("#b-" + b), i = BI[b];
    g.classList.toggle("lit", !dark); g.classList.toggle("dark", dark);
    $("#w-" + b).classList.toggle("off", dark);
    g.querySelector(".mlabel").textContent = i.name;
    g.querySelector(".st").textContent = dark ? "dark" : "powered";
  });
}

function renderTimeline() {
  const p = cur(), BI = data.block_info;
  const sub = (b) => { const i = BI[b]; return i.kind === "datacenter" ? "data center" : `${i.kind}, ${i.loss_pct}% losses`; };
  let h = `<tr><th class="rl"></th>${data.hours.map((t, i) => `<th><button data-h="${i}" aria-pressed="${i === hour}">${t}</button></th>`).join("")}</tr>`;
  data.blocks.forEach((b) => {
    h += `<tr><td class="rl">${BI[b].name}<small>${sub(b)}</small></td>` + p.off[b].map((o, i) =>
      `<td class="c ${o ? "off" : "on"}${i === hour ? " sel" : ""}">${o ? "dark" : "on"}</td>`).join("") + `</tr>`;
  });
  h += `<tr><td class="rl">${data.hospital.name}<small>never switched off</small></td>${data.hours.map((_, i) => `<td class="c hosp${i === hour ? " sel" : ""}">on</td>`).join("")}</tr>`;
  $("#tl").innerHTML = h;
  $("#tl").querySelectorAll("button").forEach((b) => (b.onclick = () => { hour = +b.dataset.h; render(); }));
}

function renderStats() {
  const p = cur();
  const pips = (n) => `<div class="pips">${[1, 2, 3].map((i) => `<i class="${i <= n ? "f" + (n >= 3 ? " hot" : "") : ""}"></i>`).join("")}</div>`;
  $("#fair").innerHTML = `<div><div class="big">${p.max_dark_hours}<span class="lbl"> of 3 h</span></div><div class="lbl">most dark hours, one area</div>${pips(p.max_dark_hours)}</div>
    <div><div class="big">${p.back_to_back}</div><div class="lbl">back-to-back dark hours</div></div>`;
  const tot = data.block_info.DC.revenue_per_hour.reduce((a, b) => a + b, 0);
  $("#rev").innerHTML = `<div><div class="big">${f1(p.dc_revenue_kept)}<span class="lbl"> of ${f1(tot)} PKR M</span></div></div>
    <div><div class="big" style="font-size:24px">${Math.round(p.dc_revenue_kept_pct)}%</div></div>
    <div class="bar" style="grid-column:1/3"><b style="width:${p.dc_revenue_kept_pct}%"></b></div>
    <div class="mini"><span>Economic damage <b>${f1(p.economic_damage)}</b></span><span>Approx. ratio vs exact <b>${p.approx_ratio.toFixed(2)}</b></span></div>`;
  document.querySelectorAll("#plan-toggle button").forEach((b) => b.setAttribute("aria-checked", sweepIdx === null && b.dataset.k === plan));
  const q = data.scenarios[scen].qaoa, pc = (x) => (x * 100 < 1 ? (x * 100).toFixed(2) : (x * 100).toFixed(1)) + "%";
  $("#qsub").textContent = `${q.qubits} qubits, ${q.reps} layers`;
  $("#qaoa").innerHTML = `<dt>Exact answer found</dt><dd class="${q.found_optimum ? "ok" : "no"}">${q.found_optimum ? "yes" : "no"}</dd>
    <dt>Chance of best plan</dt><dd>${pc(q.p_opt)} <span class="lbl">vs ${pc(q.p_opt_random)} random</span></dd>
    <dt>Samples that follow the rules</dt><dd>${pc(q.p_feasible)} <span class="lbl">vs ${pc(q.p_feasible_random)}</span></dd>`;
  const s = sweepIdx === null ? null : data.sweep[sweepIdx];
  $("#sweeplbl").textContent = s ? `${s.label}: exact plan, normal day (revenue weight ${s.revenue_weight})` : "Move the slider to see the exact plan at each trade-off.";
}

function render() { renderMap(); renderTimeline(); renderStats(); $("#scenario-desc").textContent = data.scenarios[scen].description; }

load().then(([d, mock]) => {
  data = d; $("#mock").hidden = !mock;
  $("#plan-toggle").innerHTML = PLANS.map(([k, n]) => `<button role="radio" data-k="${k}">${n}</button>`).join("");
  $("#plan-toggle").querySelectorAll("button").forEach((b) => (b.onclick = () => { plan = b.dataset.k; sweepIdx = null; render(); }));
  const sw = $("#sweep"); sw.max = d.sweep.length - 1; sw.value = 1;
  $("#ticks").innerHTML = `<span>${d.sweep[0].label}</span><span>${d.sweep[d.sweep.length - 1].label}</span>`;
  sw.oninput = () => { sweepIdx = +sw.value; render(); };
  $("#disaster").onclick = (e) => {
    scen = scen === "normal" ? "disaster" : "normal"; sweepIdx = null;
    e.currentTarget.setAttribute("aria-pressed", scen === "disaster");
    document.body.classList.remove("flash"); void document.body.offsetWidth; document.body.classList.add("flash");
    render();
  };
  buildMap(); render();
}).catch((e) => { document.querySelector("main").innerHTML = `<p>Could not load data/results.json: ${e.message}</p>`; });
