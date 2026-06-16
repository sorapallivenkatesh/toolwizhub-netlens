/* popup.js — ask the worker for the active tab's records, summarize, render. */
import { summarize } from "../core/aggregate.js";

const CAT_LABELS = {
  analytics: "Analytics", ads: "Ads", social: "Social", tagmanager: "Tag manager",
  cdn: "CDN", fonts: "Fonts", monitoring: "Monitoring", payment: "Payment",
  support: "Support/chat", video: "Video", consent: "Consent", abtest: "A/B testing",
  "other-3p": "Other 3rd-party", "first-party": "First-party",
};
const app = document.getElementById("app");
const siteEl = document.getElementById("site");
let active = { tabId: null, pageDomain: "", records: [], summary: null };

const fmtBytes = (n) => {
  if (!n) return "0";
  if (n < 1024) return n + " B";
  if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
  return (n / 1048576).toFixed(2) + " MB";
};
function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

async function load() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  try { siteEl.textContent = new URL(tab.url).hostname; } catch { siteEl.textContent = "—"; }
  const res = await chrome.runtime.sendMessage({ type: "netlens:get", tabId: tab.id }).catch(() => null);
  const records = res?.records || [];
  active = { tabId: tab.id, pageDomain: res?.pageDomain || "", records, summary: records.length ? summarize(records) : null };
  render();
}

function render() {
  if (!active.summary) return; // keep the empty state
  app.replaceChildren();
  const s = active.summary, t = s.totals;

  // hero: grade + stats
  const hero = el("div", "hero");
  hero.append(el("div", `grade grade--${t.grade}`, t.grade));
  const stats = el("div", "stats");
  const stat = (label, val, cls) => { const d = el("div", "stat" + (cls ? " " + cls : "")); d.append(el("b", null, val), el("span", null, label)); return d; };
  stats.append(
    stat("requests", String(t.requests)),
    stat("transferred", fmtBytes(t.bytes)),
    stat("3rd-party domains", String(t.thirdParties)),
    stat("trackers", String(t.trackers), "stat--track"),
  );
  hero.append(stats);
  app.append(hero);

  // by category
  const cats = Object.entries(s.byCategory).sort((a, b) => b[1].requests - a[1].requests);
  if (cats.length) {
    const sec = el("div", "section");
    sec.append(el("div", "section__title", "By category"));
    const max = Math.max(...cats.map(([, v]) => v.requests));
    for (const [key, v] of cats.slice(0, 9)) {
      const bar = el("div", "bar");
      bar.append(el("div", "bar__label", CAT_LABELS[key] || key));
      const track = el("div", "bar__track");
      const fill = el("div", "bar__fill"); fill.style.width = Math.max(4, (v.requests / max) * 100) + "%";
      track.append(fill);
      bar.append(track, el("div", "bar__val", `${v.requests} · ${fmtBytes(v.bytes)}`));
      sec.append(bar);
    }
    app.append(sec);
  }

  // domains (third-party first)
  const sec = el("div", "section");
  sec.append(el("div", "section__title", `Domains (${s.domains.length})`));
  for (const d of s.domains.slice(0, 16)) {
    const row = el("div", "dom" + (d.party === "third" ? " dom--third" : ""));
    row.append(el("span", "dom__dot"));
    const name = el("div", "dom__name");
    name.append(el("div", "dom__d", d.domain));
    if (d.company || d.category) name.append(el("div", "dom__c", [d.company, CAT_LABELS[d.category]].filter(Boolean).join(" · ")));
    row.append(name);
    if (d.category) row.append(el("span", "chip", d.category));
    row.append(el("span", "dom__n", `${d.requests}× · ${fmtBytes(d.bytes)}`));
    sec.append(row);
  }
  app.append(sec);
}

document.getElementById("refresh").addEventListener("click", async () => {
  if (active.tabId != null) { await chrome.tabs.reload(active.tabId); window.close(); }
});
document.getElementById("export").addEventListener("click", () => {
  if (!active.summary) return;
  const payload = { tool: "NetLens", page: active.pageDomain, capturedAt: new Date().toISOString(), summary: active.summary, records: active.records };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url; a.download = `netlens-${active.pageDomain || "report"}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

document.getElementById("report").addEventListener("click", () => {
  if (active.tabId == null) return;
  chrome.runtime.sendMessage({ type: "netlens:open", tabId: active.tabId });
  window.close();
});

load();
