// =====================================
// STATE
// =====================================
let activeGroup = "A";
let fromYear = 2010;
let toYear = 2014;
let chart = null;

let govData = [];
let debtData = [];
let priceData = [];
let labourData = [];
let econData = [];
let socialData = [];
let demoData = [];

// =====================================
// CONFIG
// =====================================
const GROUP_LABELS = {
  A: "Az állam helyzete",
  B: "Árak és jövedelmek",
  C: "Munkaerőpiac",
  D: "Gazdasági teljesítmény",
  E: "Társadalmi újraelosztás",
  F: "Demográfia és humán háttér"
};

// =====================================
// HELPERS
// =====================================
function destroyChart() {
  if (chart) {
    chart.destroy();
    chart = null;
  }
}

function filterByYear(data) {
  return data.filter(d => d.year >= fromYear && d.year <= toYear);
}

function fmt1(x) {
  return Number.isFinite(x) ? x.toFixed(1) : "NA";
}

function delta(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return +(b - a).toFixed(1);
}

function arrow(d) {
  if (d === null) return "→";
  if (d > 0) return "▲";
  if (d < 0) return "▼";
  return "→";
}

function yearMark(y) {
  if (y === 2024) return "*";
  if (y === 2025) return "†";
  if (y === 2026) return "‡";
  return "";
}

function setStatus(text) {
  const el = document.getElementById("statusLine");
  if (el) el.textContent = text;
}

function setActiveButton(selector, predicate) {
  document.querySelectorAll(selector).forEach(btn =>
    btn.classList.toggle("active", predicate(btn))
  );
}

function syncCycleActive() {
  setActiveButton(".cycle-btn", btn =>
    +btn.dataset.from === fromYear && +btn.dataset.to === toYear
  );
}

// =====================================
// YEAR SELECTS
// =====================================
function fillYearSelects() {
  const fromSel = document.getElementById("fromYear");
  const toSel = document.getElementById("toYear");
  if (!fromSel || !toSel) return;

  fromSel.innerHTML = "";
  toSel.innerHTML = "";

  for (let y = 2010; y <= 2026; y++) {
    fromSel.add(new Option(y, y));
    toSel.add(new Option(y, y));
  }

  fromSel.value = fromYear;
  toSel.value = toYear;

  fromSel.onchange = () => {
    fromYear = +fromSel.value;
    if (toYear < fromYear) {
      toYear = fromYear;
      toSel.value = toYear;
    }
    syncCycleActive();
    render();
  };

  toSel.onchange = () => {
    toYear = +toSel.value;
    if (toYear < fromYear) {
      fromYear = toYear;
      fromSel.value = fromYear;
    }
    syncCycleActive();
    render();
  };
}

// =====================================
// CSV PARSERS
// =====================================
function parseCSV(text) {
  return text.trim().split("\n").slice(1).map(r => r.split(","));
}

const parseGov = t => parseCSV(t).map(r => ({
  year: +r[0], rev: +r[1], exp: +r[2], bal: +r[3]
}));

const parseDebt = t => parseCSV(t).map(r => ({
  year: +r[0], val: +r[1]
}));

const parsePrices = t => parseCSV(t).map(r => ({
  year: +r[0], cpi: +r[1], hicp: +r[2], house: +r[3], wage: +r[4]
}));

const parseLabour = t => parseCSV(t).map(r => ({
  year: +r[0], emp: +r[1], unemp: +r[2], act: +r[3], longu: +r[4]
}));

const parseEcon = t => parseCSV(t).map(r => ({
  year: +r[0], growth: +r[1], gdp_pc: +r[2], invest: +r[3], prod: +r[4]
}));

const parseSocial = t => parseCSV(t).map(r => ({
  year: +r[0], social: +r[1], pension: +r[2], health: +r[3], family: +r[4]
}));

const parseDemo = t => parseCSV(t).map(r => ({
  year: +r[0],
  population: +r[1],
  tfr: +r[2],
  lifeexp: +r[3],
  oldage: +r[4]
}));

// =====================================
// TABLE
// =====================================
function renderMetricCell(label, start, end, rule) {
  const d = delta(start, end);
  const cls =
    d === null ? "neutral" :
    rule.goodWhen === "up"
      ? (d > 0 ? "good" : "bad")
      : (d < 0 ? "good" : "bad");

  return `
    <div class="metric-cell">
      ${label}<br>
      ${fmt1(start)} → ${fmt1(end)}<sup>${yearMark(toYear)}</sup><br>
      <span class="metric-delta ${cls}">
        ${arrow(d)} ${d === null ? "NA" : Math.abs(d).toFixed(1)}
      </span>
    </div>
  `;
}

function renderTable(title, cellsHtml) {
  document.getElementById("metricsTable").innerHTML = `
    <div class="table-group-title">${title}</div>
    <div class="metric-grid">${cellsHtml}</div>
    <div class="table-note">
      * előzetes (2024) · † becsült (2025) · ‡ becsült (2026)
    </div>
  `;
}

// =====================================
// CHART
// =====================================
function renderLineChart(labels, datasets, scales) {
  chart = new Chart(document.getElementById("financeChart"), {
    type: "line",
    data: { labels, datasets },
    options: {
      interaction: { mode: "index", intersect: false },
      scales
    }
  });
}

// =====================================
// MAIN RENDER
// =====================================
function render() {
  destroyChart();
  fillYearSelects();

  // ===== A =====
  if (activeGroup === "A") {
    const g = filterByYear(govData);
    const d = filterByYear(debtData);
    setStatus(`${GROUP_LABELS.A} | ${fromYear}–${toYear}`);

    renderLineChart(
      g.map(x => x.year),
      [
        { label: "Bevétel / GDP", data: g.map(x => x.rev), borderColor: "#2563eb" },
        { label: "Kiadás / GDP", data: g.map(x => x.exp), borderColor: "#dc2626" },
        { label: "Egyenleg / GDP", data: g.map(x => x.bal), borderColor: "#9ca3af" },
        { label: "Államadósság / GDP", data: d.map(x => x.val), borderColor: "#475569", borderDash: [6,4] }
      ],
      { y: { title: { display: true, text: "% / GDP" } } }
    );

    renderTable("🟦 Az állam helyzete", [
      renderMetricCell("Bevétel / GDP", g[0]?.rev, g.at(-1)?.rev, { goodWhen: "up" }),
      renderMetricCell("Kiadás / GDP", g[0]?.exp, g.at(-1)?.exp, { goodWhen: "down" }),
      renderMetricCell("Egyenleg / GDP", g[0]?.bal, g.at(-1)?.bal, { goodWhen: "up" }),
      renderMetricCell("Államadósság / GDP", d[0]?.val, d.at(-1)?.val, { goodWhen: "down" })
    ].join(""));
    return;
  }

  // ===== B =====
  if (activeGroup === "B") {
    const p = filterByYear(priceData);
    setStatus(`${GROUP_LABELS.B} | ${fromYear}–${toYear}`);

    renderLineChart(
      p.map(x => x.year),
      [
        { label: "Hazai infláció", data: p.map(x => x.cpi), borderColor: "#2563eb" },
        { label: "EU infláció", data: p.map(x => x.hicp), borderColor: "#16a34a" },
        { label: "Lakásárindex (reál)", data: p.map(x => x.house), borderColor: "#f59e0b" },
        { label: "Reálkereset-index", data: p.map(x => x.wage), borderColor: "#dc2626" }
      ],
      { y: { title: { display: true, text: "%" } } }
    );

    renderTable("🟧 Árak és jövedelmek", [
      renderMetricCell("Hazai infláció", p[0]?.cpi, p.at(-1)?.cpi, { goodWhen: "down" }),
      renderMetricCell("EU infláció", p[0]?.hicp, p.at(-1)?.hicp, { goodWhen: "down" }),
      renderMetricCell("Lakásárindex (reál)", p[0]?.house, p.at(-1)?.house, { goodWhen: "down" }),
      renderMetricCell("Reálkereset-index", p[0]?.wage, p.at(-1)?.wage, { goodWhen: "up" })
    ].join(""));
    return;
  }

  // ===== C =====
  if (activeGroup === "C") {
    const c = filterByYear(labourData);
    setStatus(`${GROUP_LABELS.C} | ${fromYear}–${toYear}`);

    renderLineChart(
      c.map(x => x.year),
      [
        { label: "Foglalkoztatási ráta", data: c.map(x => x.emp), borderColor: "#16a34a" },
        { label: "Munkanélküliségi ráta", data: c.map(x => x.unemp), borderColor: "#dc2626" },
        { label: "Aktivitási ráta", data: c.map(x => x.act), borderColor: "#2563eb" },
        { label: "Hosszú távú munkanélküliség", data: c.map(x => x.longu), borderColor: "#7c3aed" }
      ],
      { y: { title: { display: true, text: "%" } } }
    );

    renderTable("🟩 Munkaerőpiac", [
      renderMetricCell("Foglalkoztatási ráta", c[0]?.emp, c.at(-1)?.emp, { goodWhen: "up" }),
      renderMetricCell("Munkanélküliségi ráta", c[0]?.unemp, c.at(-1)?.unemp, { goodWhen: "down" }),
      renderMetricCell("Aktivitási ráta", c[0]?.act, c.at(-1)?.act, { goodWhen: "up" }),
      renderMetricCell("Hosszú távú munkanélküliség", c[0]?.longu, c.at(-1)?.longu, { goodWhen: "down" })
    ].join(""));
    return;
  }

  // ===== D =====
  if (activeGroup === "D") {
    const e = filterByYear(econData);
    setStatus(`${GROUP_LABELS.D} | ${fromYear}–${toYear}`);

    renderLineChart(
      e.map(x => x.year),
      [
        { label: "GDP növekedés", data: e.map(x => x.growth), borderColor: "#2563eb" },
        { label: "Egy főre jutó GDP (reál index)", data: e.map(x => x.gdp_pc), borderColor: "#16a34a" },
        { label: "Beruházási ráta", data: e.map(x => x.invest), borderColor: "#f59e0b" },
        { label: "Termelékenység (reál index)", data: e.map(x => x.prod), borderColor: "#dc2626" }
      ],
      { y: { title: { display: true, text: "%" } } }
    );

    renderTable("🟨 Gazdasági teljesítmény", [
      renderMetricCell("GDP növekedés", e[0]?.growth, e.at(-1)?.growth, { goodWhen: "up" }),
      renderMetricCell("Egy főre jutó GDP (reál index)", e[0]?.gdp_pc, e.at(-1)?.gdp_pc, { goodWhen: "up" }),
      renderMetricCell("Beruházási ráta", e[0]?.invest, e.at(-1)?.invest, { goodWhen: "up" }),
      renderMetricCell("Termelékenység (reál index)", e[0]?.prod, e.at(-1)?.prod, { goodWhen: "up" })
    ].join(""));
    return;
  }

  // ===== E =====
  if (activeGroup === "E") {
    const s = filterByYear(socialData);
    setStatus(`${GROUP_LABELS.E} | ${fromYear}–${toYear}`);

    renderLineChart(
      s.map(x => x.year),
      [
        { label: "Szociális kiadások / GDP", data: s.map(x => x.social), borderColor: "#2563eb" },
        { label: "Nyugdíjkiadások / GDP", data: s.map(x => x.pension), borderColor: "#16a34a" },
        { label: "Egészségügyi kiadások / GDP", data: s.map(x => x.health), borderColor: "#f59e0b" },
        { label: "Családtámogatások / GDP", data: s.map(x => x.family), borderColor: "#dc2626" }
      ],
      { y: { title: { display: true, text: "% / GDP" } } }
    );

    renderTable("🟪 Társadalmi újraelosztás", [
      renderMetricCell("Szociális kiadások / GDP", s[0]?.social, s.at(-1)?.social, { goodWhen: "down" }),
      renderMetricCell("Nyugdíjkiadások / GDP", s[0]?.pension, s.at(-1)?.pension, { goodWhen: "down" }),
      renderMetricCell("Egészségügyi kiadások / GDP", s[0]?.health, s.at(-1)?.health, { goodWhen: "down" }),
      renderMetricCell("Családtámogatások / GDP", s[0]?.family, s.at(-1)?.family, { goodWhen: "down" })
    ].join(""));
    return;
  }

  // ===== F =====
  if (activeGroup === "F") {
    const f = filterByYear(demoData);
    setStatus(`${GROUP_LABELS.F} | ${fromYear}–${toYear}`);

    renderLineChart(
      f.map(x => x.year),
      [
        { label: "Népesség (millió fő)", data: f.map(x => x.population), borderColor: "#2563eb" },
        { label: "Termékenységi ráta (TFR)", data: f.map(x => x.tfr), borderColor: "#16a34a" },
        { label: "Várható élettartam (év)", data: f.map(x => x.lifeexp), borderColor: "#f59e0b" },
        { label: "Időskori eltartottsági ráta (%)", data: f.map(x => x.oldage), borderColor: "#dc2626" }
      ],
      { y: { title: { display: true, text: "Vegyes mértékegység" } } }
    );

    renderTable("🟫 Demográfia és humán háttér", [
      renderMetricCell("Népesség (millió fő)", f[0]?.population, f.at(-1)?.population, { goodWhen: "down" }),
      renderMetricCell("Termékenységi ráta (TFR)", f[0]?.tfr, f.at(-1)?.tfr, { goodWhen: "up" }),
      renderMetricCell("Várható élettartam (év)", f[0]?.lifeexp, f.at(-1)?.lifeexp, { goodWhen: "up" }),
      renderMetricCell("Időskori eltartottsági ráta (%)", f[0]?.oldage, f.at(-1)?.oldage, { goodWhen: "down" })
    ].join(""));
    return;
  }
}

// =====================================
// INIT
// =====================================
Promise.all([
  fetch("data/main_gov_finance_2010_2026.csv").then(r => r.text()),
  fetch("data/gov_debt_2010_2026.csv").then(r => r.text()),
  fetch("data/prices_living_2010_2026.csv").then(r => r.text()),
  fetch("data/labour_market_2010_2026.csv").then(r => r.text()),
  fetch("data/economic_performance_2010_2026.csv").then(r => r.text()),
  fetch("data/social_redistribution_2010_2026.csv").then(r => r.text()),
  fetch("data/demography_human_background_2010_2026.csv").then(r => r.text())
]).then(([g, d, p, l, e, s, f]) => {
  govData = parseGov(g);
  debtData = parseDebt(d);
  priceData = parsePrices(p);
  labourData = parseLabour(l);
  econData = parseEcon(e);
  socialData = parseSocial(s);
  demoData = parseDemo(f);

  document.querySelectorAll("[data-group]").forEach(btn => {
    const k = btn.dataset.group;
    btn.textContent = GROUP_LABELS[k];
    btn.onclick = () => {
      activeGroup = k;
      setActiveButton("[data-group]", b => b.dataset.group === activeGroup);
      syncCycleActive();
      render();
    };
  });

  document.querySelectorAll(".cycle-btn").forEach(btn => {
    btn.onclick = () => {
      fromYear = +btn.dataset.from;
      toYear = +btn.dataset.to;
      syncCycleActive();
      render();
    };
  });

  setActiveButton("[data-group]", b => b.dataset.group === activeGroup);
  syncCycleActive();
  render();
}).catch(() => {
  setStatus("Hiba: nem sikerült betölteni valamelyik CSV fájlt.");
});
