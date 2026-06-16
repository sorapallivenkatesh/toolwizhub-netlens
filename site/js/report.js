/* report.js — in-depth NetLens report. Reads the payload the extension passed in
   the URL hash (#r=<url-safe-base64 JSON>), or a dropped exported JSON, and
   renders the full breakdown. No network. */

const CAT_LABELS = {
  analytics: "Analytics", ads: "Ads", social: "Social", tagmanager: "Tag manager",
  cdn: "CDN", fonts: "Fonts", monitoring: "Monitoring", payment: "Payment",
  support: "Support/chat", video: "Video", consent: "Consent", abtest: "A/B testing",
  "other-3p": "Other 3rd-party", "first-party": "First-party",
};
const report = document.getElementById("report");

const pad = (s) => s + "=".repeat((4 - (s.length % 4)) % 4);
const b64d = (s) => decodeURIComponent(escape(atob(pad(String(s).replace(/-/g, "+").replace(/_/g, "/")))));
function decode(str) { try { return JSON.parse(b64d(str)); } catch { return null; } }

const fmtBytes = (n) => !n ? "0" : n < 1024 ? n + " B" : n < 1048576 ? (n / 1024).toFixed(1) + " KB" : (n / 1048576).toFixed(2) + " MB";
function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

function bars(title, obj) {
  const card = el("section", "card");
  card.append(el("div", "card__head", title));
  const body = el("div", "card__body");
  const items = Object.entries(obj).sort((a, b) => b[1].requests - a[1].requests);
  const max = Math.max(1, ...items.map(([, v]) => v.requests));
  for (const [key, v] of items) {
    const bar = el("div", "bar");
    bar.append(el("div", "bar__label", CAT_LABELS[key] || key));
    const track = el("div", "bar__track"); const fill = el("div", "bar__fill");
    fill.style.width = Math.max(3, (v.requests / max) * 100) + "%"; track.append(fill);
    bar.append(track, el("div", "bar__val", `${v.requests} · ${fmtBytes(v.bytes)}`));
    body.append(bar);
  }
  card.append(body);
  return card;
}

function render(payload) {
  const s = payload.summary;
  if (!s) return;
  const t = s.totals;
  report.replaceChildren();

  // head
  const head = el("div", "report__head");
  head.append(el("div", `rgrade rgrade--${t.grade}`, t.grade));
  const meta = el("div", "report__meta");
  meta.append(el("div", "report__site", payload.page || "—"));
  meta.append(el("div", "report__when", `${t.requests} requests · ${fmtBytes(t.bytes)} · ${payload.capturedAt ? new Date(payload.capturedAt).toLocaleString() : "captured locally"}`));
  head.append(meta);
  const actions = el("div", "report__actions");
  const exp = el("button", "btn btn--ghost", "Export JSON"); exp.addEventListener("click", () => download(payload));
  const cpy = el("button", "btn btn--ghost", "Copy link"); cpy.addEventListener("click", () => { navigator.clipboard?.writeText(location.href); cpy.textContent = "Copied ✓"; setTimeout(() => cpy.textContent = "Copy link", 1400); });
  actions.append(exp, cpy);
  head.append(actions);
  report.append(head);

  // stats
  const stats = el("div", "rstats");
  const stat = (label, val, cls) => { const d = el("div", "rstat" + (cls ? " " + cls : "")); d.append(el("b", null, val), el("span", null, label)); return d; };
  stats.append(
    stat("requests", String(t.requests)),
    stat("transferred", fmtBytes(t.bytes)),
    stat("3rd-party domains", String(t.thirdParties)),
    stat("trackers", String(t.trackers), "rstat--track"),
    stat("errors", String(t.errors || 0)),
  );
  report.append(stats);

  // category + type charts
  const grid = el("div", "rgrid");
  grid.append(bars("By category", s.byCategory), bars("By resource type", s.byType));
  report.append(grid);

  // domains table
  const card = el("section", "card");
  card.append(el("div", "card__head", `Domains (${s.domains.length})`));
  const body = el("div", "card__body");
  const table = el("table", "domtable");
  const thead = el("tr");
  ["Domain", "Party", "Vendor", "Category", "Requests", "Bytes"].forEach((h) => thead.append(el("th", null, h)));
  table.append(thead);
  for (const d of s.domains) {
    const tr = el("tr");
    const dc = el("td"); dc.append(el("span", "dom__d", d.domain)); tr.append(dc);
    const pc = el("td"); pc.append(el("span", `tag tag--${d.party}`, d.party)); tr.append(pc);
    tr.append(el("td", null, d.company || "—"));
    tr.append(el("td", null, d.category ? (CAT_LABELS[d.category] || d.category) : "—"));
    tr.append(el("td", "num", String(d.requests)));
    tr.append(el("td", "num", fmtBytes(d.bytes)));
    table.append(tr);
  }
  body.append(table); card.append(body);
  report.append(card);
}

function download(payload) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
  const a = document.createElement("a"); a.href = url; a.download = `netlens-${payload.page || "report"}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ── load: URL hash first, else wait for a dropped/chosen file ── */
const m = location.hash.match(/^#r=(.+)$/);
const fromHash = m ? decode(m[1]) : null;
if (fromHash && fromHash.summary) render(fromHash);
else {
  const drop = document.getElementById("drop");
  const file = document.getElementById("file");
  const readFile = (f) => { if (!f) return; const r = new FileReader(); r.onload = () => { try { const p = JSON.parse(String(r.result)); if (p.summary) render(p); } catch {} }; r.readAsText(f); };
  file?.addEventListener("change", (e) => readFile(e.target.files[0]));
  ["dragenter", "dragover"].forEach((ev) => drop?.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("is-drag"); }));
  ["dragleave", "drop"].forEach((ev) => drop?.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("is-drag"); }));
  drop?.addEventListener("drop", (e) => readFile(e.dataTransfer?.files?.[0]));
}
