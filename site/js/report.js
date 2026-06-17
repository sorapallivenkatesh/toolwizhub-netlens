/* report.js — in-depth NetLens report. Data arrives one of three ways:
   1. the extension injects window.__NETLENS__ (full: records + security) and fires "netlens:data"
   2. a shareable #r= URL hash (summary only)
   3. a dropped/chosen exported netlens-*.json (full)
   Record-dependent sections (explorer, waterfall, page-weight, HAR) gracefully hide
   when only the summary is available. No network. */

const CAT_LABELS = {
  analytics: "Analytics", ads: "Ads", social: "Social", tagmanager: "Tag manager",
  cdn: "CDN", fonts: "Fonts", monitoring: "Monitoring", payment: "Payment",
  support: "Support/chat", video: "Video", consent: "Consent", abtest: "A/B testing",
  fingerprinting: "Fingerprinting", "other-3p": "Other 3rd-party", "first-party": "First-party",
};
const report = document.getElementById("report");

const pad = (s) => s + "=".repeat((4 - (s.length % 4)) % 4);
const b64d = (s) => decodeURIComponent(escape(atob(pad(String(s).replace(/-/g, "+").replace(/_/g, "/")))));
function decode(str) { try { return JSON.parse(b64d(str)); } catch { return null; } }
const fmtBytes = (n) => !n ? "0" : n < 1024 ? n + " B" : n < 1048576 ? (n / 1024).toFixed(1) + " KB" : (n / 1048576).toFixed(2) + " MB";
function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
function card(title, ...kids) { const c = el("section", "card"); c.append(el("div", "card__head", title)); const b = el("div", "card__body"); b.append(...kids); c.append(b); return c; }
const sevType = (r) => r.tracking ? "track" : r.party === "third" ? "third" : "first";
const fmtMs = (ms) => ms < 1000 ? Math.round(ms) + " ms" : (ms / 1000).toFixed(2) + " s";

// must match core/aggregate.js privacyGrade(): score = trackers*2 + thirdParties + piiLeaks*3 + insecure
const GRADE_SCALE = [
  { g: "A", label: "Clean", range: "0" },
  { g: "B", label: "Light", range: "1–4" },
  { g: "C", label: "Moderate", range: "5–10" },
  { g: "D", label: "Heavy", range: "11–20" },
  { g: "F", label: "Very heavy", range: "21+" },
];

function gradeCard(t) {
  const score = t.trackers * 2 + t.thirdParties + (t.piiLeaks || 0) * 3 + (t.insecure || 0);
  const body = el("div", "gradewhy");
  body.append(el("div", "gscore", `Privacy score ${score} → grade ${t.grade}`));

  const comps = el("div", "gcomp");
  const part = (n, label, mult) => { if (!n) return; const c = el("span", "gpart"); c.append(el("b", null, String(n * (mult || 1))), el("span", null, `${n} ${label}${mult ? ` ×${mult}` : ""}`)); comps.append(c); };
  part(t.trackers, "trackers", 2);
  part(t.thirdParties, "3rd-party domains", 1);
  part(t.piiLeaks, "PII leaks", 3);
  part(t.insecure, "insecure requests", 1);
  if (!comps.children.length) { const c = el("span", "gpart gpart--ok"); c.append(el("b", null, "✓"), el("span", null, "nothing flagged")); comps.append(c); }
  body.append(comps);

  body.append(el("div", "gscale__title", "Grade scale — lower score is cleaner"));
  const scale = el("div", "gscale");
  for (const sc of GRADE_SCALE) {
    const cell = el("div", `gcell gcell--${sc.g}` + (sc.g === t.grade ? " is-active" : ""));
    cell.append(el("b", null, sc.g), el("span", "gcell__r", sc.range), el("span", "gcell__l", sc.label));
    scale.append(cell);
  }
  body.append(scale);
  return card("Why this grade", body);
}

function barList(obj) {
  const wrap = document.createDocumentFragment();
  const items = Object.entries(obj).sort((a, b) => b[1].requests - a[1].requests);
  const max = Math.max(1, ...items.map(([, v]) => v.requests));
  for (const [key, v] of items) {
    const bar = el("div", "bar");
    bar.append(el("div", "bar__label", CAT_LABELS[key] || key));
    const track = el("div", "bar__track"); const fill = el("div", "bar__fill");
    fill.style.width = Math.max(3, (v.requests / max) * 100) + "%"; track.append(fill);
    bar.append(track, el("div", "bar__val", `${v.requests} · ${fmtBytes(v.bytes)}`));
    wrap.append(bar);
  }
  return wrap;
}

function render(data) {
  const s = data.summary; if (!s) return;
  const t = s.totals;
  const records = Array.isArray(data.records) ? data.records : null;
  report.replaceChildren();

  /* head */
  const head = el("div", "report__head");
  head.append(el("div", `rgrade rgrade--${t.grade}`, t.grade));
  const meta = el("div", "report__meta");
  meta.append(el("div", "report__site", data.page || "—"));
  meta.append(el("div", "report__when", `${t.requests} requests · ${fmtBytes(t.bytes)} · ${data.capturedAt ? new Date(data.capturedAt).toLocaleString() : "captured locally"}`));
  head.append(meta);
  const actions = el("div", "report__actions");
  const aJson = el("button", "btn btn--ghost", "Export JSON"); aJson.addEventListener("click", () => downloadJSON(data)); actions.append(aJson);
  if (records) { const aHar = el("button", "btn btn--ghost", "Export HAR"); aHar.addEventListener("click", () => downloadHAR(data)); actions.append(aHar); }
  const aLink = el("button", "btn btn--ghost", "Copy link"); aLink.addEventListener("click", () => { navigator.clipboard?.writeText(location.href); aLink.textContent = "Copied ✓"; setTimeout(() => aLink.textContent = "Copy link", 1400); }); actions.append(aLink);
  head.append(actions);
  report.append(head);

  /* stats */
  const stats = el("div", "rstats");
  const stat = (label, val, cls) => { const d = el("div", "rstat" + (cls ? " " + cls : "")); d.append(el("b", null, val), el("span", null, label)); return d; };
  stats.append(
    stat("requests", String(t.requests)),
    stat("transferred", fmtBytes(t.bytes)),
    stat("3rd-party domains", String(t.thirdParties)),
    stat("trackers", String(t.trackers), t.trackers ? "rstat--track" : ""),
    stat("fingerprinters", String(t.fingerprinters || 0), (t.fingerprinters || 0) ? "rstat--track" : ""),
    stat("PII leaks", String(t.piiLeaks || 0), (t.piiLeaks || 0) ? "rstat--track" : ""),
    stat("insecure", String(t.insecure || 0), (t.insecure || 0) ? "rstat--warn" : ""),
    stat("cookies set", String(t.cookies || 0)),
  );
  report.append(stats);

  /* why this grade + A–F scale */
  report.append(gradeCard(t));

  /* PII leaks */
  if (s.pii && s.pii.length) {
    const body = document.createDocumentFragment();
    for (const p of s.pii) {
      const row = el("div", "leak" + (p.party === "third" ? " leak--third" : ""));
      row.append(el("span", "dom__d", p.domain));
      const tags = el("span", "leak__tags"); p.types.forEach((ty) => tags.append(el("span", "tag tag--pii", ty)));
      row.append(tags, el("span", `tag tag--${p.party}`, p.party));
      body.append(row);
    }
    report.append(card(`⚠ PII seen in requests (${s.pii.length})`, body));
  }

  /* security headers */
  if (data.security && Object.keys(data.security).length) {
    const sec = data.security; const body = el("div", "secgrid");
    const chip = (label, ok, val) => { const c = el("div", "secchip " + (ok ? "is-ok" : "is-bad")); c.append(el("b", null, label), el("span", null, val || (ok ? "present" : "missing"))); return c; };
    body.append(chip("HSTS", !!sec.hsts), chip("CSP", !!sec.csp), chip("X-Frame-Options", !!sec.xfo, sec.xfo || "missing"), chip("Referrer-Policy", !!sec.referrer, sec.referrer || "missing"));
    report.append(card("Document security headers", body));
  }

  /* charts */
  const grid = el("div", "rgrid");
  grid.append(card("By category", barList(s.byCategory)), card("By resource type", barList(s.byType)));
  report.append(grid);

  /* company map + heaviest resources */
  const grid2 = el("div", "rgrid");
  grid2.append(companyCard(s.domains));
  if (records) grid2.append(weightCard(records));
  report.append(grid2);

  if (records) report.append(waterfallCard(records));
  report.append(records ? explorerCard(records) : domainCard(s.domains));
}

function companyCard(domains) {
  const map = new Map();
  for (const d of domains) {
    const key = d.company || (d.party === "first" ? "First-party" : d.domain);
    let c = map.get(key); if (!c) map.set(key, c = { company: key, requests: 0, bytes: 0, domains: 0 });
    c.requests += d.requests; c.bytes += d.bytes; c.domains++;
  }
  const list = [...map.values()].sort((a, b) => b.requests - a.requests);
  const body = document.createDocumentFragment();
  for (const c of list.slice(0, 20)) {
    const row = el("div", "dom");
    const name = el("div", "dom__name"); name.append(el("div", "dom__d", c.company), el("div", "dom__c", `${c.domains} domain${c.domains > 1 ? "s" : ""}`));
    row.append(name, el("span", "num", `${c.requests}× · ${fmtBytes(c.bytes)}`));
    body.append(row);
  }
  return card(`Who it talks to (${list.length} parties)`, body);
}

function weightCard(records) {
  const top = [...records].sort((a, b) => (b.bytes || 0) - (a.bytes || 0)).slice(0, 12);
  const max = Math.max(1, ...top.map((r) => r.bytes || 0));
  const body = document.createDocumentFragment();
  for (const r of top) {
    const bar = el("div", "bar");
    bar.append(el("div", "bar__label", r.domain));
    const track = el("div", "bar__track"); const fill = el("div", "bar__fill"); fill.style.width = Math.max(3, ((r.bytes || 0) / max) * 100) + "%"; track.append(fill);
    bar.append(track, el("div", "bar__val", fmtBytes(r.bytes || 0)));
    body.append(bar);
  }
  return card("Heaviest resources", body);
}

function waterfallCard(records) {
  const withT = records.filter((r) => r.started).sort((a, b) => a.started - b.started);
  const rows = withT.slice(0, 80);
  const min = rows.length ? rows[0].started : 0;
  const span = Math.max(1, ...rows.map((r) => (r.started - min) + (r.duration || 0)));

  const c = el("section", "card");
  const head = el("div", "card__head card__head--row");
  head.append(el("span", null, "Timeline"), el("span", "wf__total", `${fmtMs(span)} span`));
  c.append(head);
  const body = el("div", "card__body");

  /* time axis */
  const axis = el("div", "wf wf--axis");
  axis.append(el("span", "wf__label", ""));
  const ax = el("div", "wf__axis");
  for (let i = 0; i <= 4; i++) { const tick = el("span", "wf__tick", fmtMs((span * i) / 4)); tick.style.left = i * 25 + "%"; ax.append(tick); }
  axis.append(ax, el("span", "wf__dur", ""));
  body.append(axis);

  /* rows */
  for (const r of rows) {
    const row = el("div", "wf");
    const label = el("span", "wf__label", r.domain); label.title = r.url;
    const track = el("div", "wf__track");
    const bar = el("span", `wf__bar wf__bar--${sevType(r)}`);
    bar.style.left = ((r.started - min) / span) * 100 + "%";
    bar.style.width = Math.max(0.5, ((r.duration || 0) / span) * 100) + "%";
    bar.title = `${r.type} · ${Math.round(r.duration || 0)}ms · ${fmtBytes(r.bytes || 0)}`;
    track.append(bar);
    row.append(label, track, el("span", "wf__dur", r.duration ? Math.round(r.duration) + "ms" : "—"));
    body.append(row);
  }
  if (withT.length > rows.length) body.append(el("div", "muted-note", `+${withT.length - rows.length} more (showing first 80 by start time)`));

  /* legend */
  const legend = el("div", "wf__legend");
  for (const [k, l] of [["first", "First-party"], ["third", "Third-party"], ["track", "Tracker"]]) {
    const item = el("span", "wf__leg"); item.append(el("span", `dot dot--${k}`), el("span", null, l)); legend.append(item);
  }
  body.append(legend);
  c.append(body);
  return c;
}

function explorerCard(records) {
  const c = el("section", "card");
  const head = el("div", "card__head card__head--row");
  head.append(el("span", null, `Requests (${records.length})`));
  const filters = el("div", "filters");
  const search = el("input", "filters__search"); search.type = "search"; search.placeholder = "Filter by domain / URL…";
  const party = selectEl(["all party", "first", "third"]);
  const type = selectEl(["all types", ...[...new Set(records.map((r) => r.type))].sort()]);
  filters.append(search, party, type); head.append(filters); c.append(head);

  const body = el("div", "card__body card__body--table");
  const table = el("table", "domtable");
  const thead = el("tr"); ["", "Domain", "Type", "Status", "Bytes", "URL"].forEach((h) => thead.append(el("th", null, h)));
  table.append(thead);
  const tbody = el("tbody"); table.append(tbody); body.append(table); c.append(body);

  function draw() {
    const q = search.value.trim().toLowerCase(), pf = party.value, tf = type.value;
    tbody.replaceChildren();
    let shown = 0;
    for (const r of records) {
      if (pf !== "all party" && r.party !== pf) continue;
      if (tf !== "all types" && r.type !== tf) continue;
      if (q && !(r.domain + " " + r.url).toLowerCase().includes(q)) continue;
      if (shown++ >= 500) break;
      const tr = el("tr");
      const dot = el("td"); dot.append(el("span", `dot dot--${sevType(r)}`)); tr.append(dot);
      const dc = el("td"); dc.append(el("span", "dom__d", r.domain)); if (r.company) dc.append(el("span", "dom__c", " · " + r.company)); tr.append(dc);
      tr.append(el("td", null, r.type), el("td", "num", r.error ? "err" : String(r.status || "—")), el("td", "num", fmtBytes(r.bytes || 0)));
      const u = el("td", "url"); u.append(el("span", null, r.url)); tr.append(u);
      tbody.append(tr);
    }
    if (!shown) { const tr = el("tr"); tr.append(el("td", "muted-note", "No requests match.")); tbody.append(tr); }
  }
  [search, party, type].forEach((e) => e.addEventListener("input", draw));
  draw();
  return c;
}
function selectEl(opts) { const s = el("select", "filters__sel"); opts.forEach((o) => s.append(Object.assign(document.createElement("option"), { value: o, textContent: o }))); return s; }

function domainCard(domains) {
  const c = el("section", "card");
  c.append(el("div", "card__head", `Domains (${domains.length})`));
  const body = el("div", "card__body card__body--table");
  const table = el("table", "domtable");
  const thead = el("tr"); ["Domain", "Party", "Vendor", "Category", "Requests", "Bytes"].forEach((h) => thead.append(el("th", null, h)));
  table.append(thead);
  for (const d of domains) {
    const tr = el("tr");
    const dc = el("td"); dc.append(el("span", "dom__d", d.domain)); tr.append(dc);
    const pc = el("td"); pc.append(el("span", `tag tag--${d.party}`, d.party)); tr.append(pc);
    tr.append(el("td", null, d.company || "—"), el("td", null, d.category ? (CAT_LABELS[d.category] || d.category) : "—"), el("td", "num", String(d.requests)), el("td", "num", fmtBytes(d.bytes)));
    table.append(tr);
  }
  body.append(table); c.append(body);
  return c;
}

function downloadJSON(data) { dl(`netlens-${data.page || "report"}.json`, JSON.stringify(data, null, 2), "application/json"); }
function downloadHAR(data) {
  const entries = (data.records || []).map((r) => ({
    startedDateTime: data.capturedAt || new Date().toISOString(), time: r.duration || 0,
    request: { method: r.method || "GET", url: r.url, httpVersion: "HTTP/1.1", headers: [], queryString: [], cookies: [], headersSize: -1, bodySize: -1 },
    response: { status: r.status || 0, statusText: r.error ? "error" : "", httpVersion: "HTTP/1.1", headers: [], cookies: [], content: { size: r.bytes || 0, mimeType: "" }, redirectURL: "", headersSize: -1, bodySize: r.bytes || 0 },
    cache: {}, timings: { send: 0, wait: r.duration || 0, receive: 0 }, _resourceType: r.type, _party: r.party, _category: r.category,
  }));
  dl(`netlens-${data.page || "report"}.har`, JSON.stringify({ log: { version: "1.2", creator: { name: "NetLens", version: "0.1.0" }, entries } }, null, 2), "application/json");
}
function dl(name, text, mime) { const url = URL.createObjectURL(new Blob([text], { type: mime })); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }

/* ── load ── */
function tryRender(d) { if (d && d.summary) { render(d); return true; } return false; }
if (!tryRender(window.__NETLENS__)) {
  const m = location.hash.match(/^#r=(.+)$/);
  if (!tryRender(m ? decode(m[1]) : null)) {
    const drop = document.getElementById("drop"), file = document.getElementById("file");
    const readFile = (f) => { if (!f) return; const r = new FileReader(); r.onload = () => { try { tryRender(JSON.parse(String(r.result))); } catch {} }; r.readAsText(f); };
    file?.addEventListener("change", (e) => readFile(e.target.files[0]));
    ["dragenter", "dragover"].forEach((ev) => drop?.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("is-drag"); }));
    ["dragleave", "drop"].forEach((ev) => drop?.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("is-drag"); }));
    drop?.addEventListener("drop", (e) => readFile(e.dataTransfer?.files?.[0]));
  }
}
// the extension injects after load → re-render with the full record set
window.addEventListener("netlens:data", (e) => tryRender(e.detail));
