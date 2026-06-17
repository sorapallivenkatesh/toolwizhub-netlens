/* background.js — MV3 service worker. Passively captures every request per tab
   via webRequest, classifies it (party / type / vendor), merges sizes from the
   content script's Resource Timing, badges the tab, and answers the popup.
   State is held in memory and written through to chrome.storage.session so it
   survives the worker being torn down. */

import { classify } from "./core/classify.js";
import { etld1 } from "./core/etld.js";
import { piiInUrl } from "./core/pii.js";
import { summarize, applyAllowlist } from "./core/aggregate.js";

// in-depth report site: localhost when unpacked (dev), the live site once published
const isDev = !("update_url" in chrome.runtime.getManifest());
const REPORT_SITE = isDev ? "http://localhost:8090" : "https://netlens.toolwizhub.com";
const b64e = (s) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const tabs = new Map(); // tabId → { pageDomain, byId: Map<requestId,rec>, byUrl: Map<url,rec> }

const TYPE = {
  main_frame: "document", sub_frame: "document", xmlhttprequest: "xhr/fetch",
  stylesheet: "css", script: "script", image: "image", font: "font",
  media: "media", websocket: "websocket", ping: "beacon", other: "other",
};

function fresh() { return { pageDomain: "", pageSecure: false, security: {}, byId: new Map(), byUrl: new Map() }; }
function tab(id) { let t = tabs.get(id); if (!t) tabs.set(id, t = fresh()); return t; }

const saveTimers = new Map();
function persist(tabId) {
  clearTimeout(saveTimers.get(tabId));
  saveTimers.set(tabId, setTimeout(() => {
    const t = tabs.get(tabId);
    if (!t) return;
    chrome.storage.session.set({ ["tab:" + tabId]: { pageDomain: t.pageDomain, security: t.security, records: [...t.byId.values()] } }).catch(() => {});
  }, 400));
}

function setBadge(tabId) {
  const t = tabs.get(tabId);
  const n = t ? [...t.byId.values()].filter((r) => r.tracking).length : 0;
  chrome.action.setBadgeText({ tabId, text: n ? String(n) : "" }).catch(() => {});
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeBackgroundColor({ color: "#e879f9" }).catch(() => {});
  chrome.contextMenus.create({ id: "netlens-report", title: "Analyze this page with NetLens", contexts: ["page", "action"] }, () => void chrome.runtime.lastError);
});
chrome.contextMenus?.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "netlens-report" && tab) openReport(tab.id);
});

chrome.webRequest.onBeforeRequest.addListener((d) => {
  if (d.tabId < 0) return;
  const t = tab(d.tabId);
  if (d.type === "main_frame") {                       // top-level navigation → reset
    tabs.set(d.tabId, Object.assign(fresh(), { pageDomain: etld1(safeHost(d.url)), pageSecure: /^https:/i.test(d.url) }));
  }
  const tt = tab(d.tabId);
  const c = classify(d.url, tt.pageDomain);
  const insecure = /^(http|ws):\/\//i.test(d.url);
  const rec = {
    url: d.url, domain: c.domain, party: c.party, company: c.company,
    category: c.category, tracking: c.tracking, type: TYPE[d.type] || d.type,
    method: d.method, status: null, bytes: 0, error: null, started: d.timeStamp,
    secure: !insecure, mixed: tt.pageSecure && insecure, cookies: 0, pii: piiInUrl(d.url),
  };
  tt.byId.set(d.requestId, rec);
  tt.byUrl.set(d.url, rec);
  persist(d.tabId);
}, { urls: ["<all_urls>"] });

chrome.webRequest.onHeadersReceived.addListener((d) => {
  const t = tab(d.tabId);
  const rec = t.byId.get(d.requestId);
  const hdr = d.responseHeaders || [];
  const get = (n) => hdr.find((h) => h.name.toLowerCase() === n)?.value;
  if (rec) {
    const cl = get("content-length");
    if (cl && !rec.bytes) rec.bytes = +cl || 0;          // RT (content script) can override later
    const cookies = hdr.filter((h) => h.name.toLowerCase() === "set-cookie").length;
    if (cookies) rec.cookies += cookies;
  }
  if (d.type === "main_frame") {                          // capture the document's security headers
    t.security = {
      hsts: !!get("strict-transport-security"),
      csp: !!get("content-security-policy"),
      xfo: get("x-frame-options") || null,
      referrer: get("referrer-policy") || null,
    };
  }
}, { urls: ["<all_urls>"] }, ["responseHeaders", "extraHeaders"]);

chrome.webRequest.onCompleted.addListener((d) => {
  const rec = tab(d.tabId).byId.get(d.requestId);
  if (rec) { rec.status = d.statusCode; setBadge(d.tabId); persist(d.tabId); }
}, { urls: ["<all_urls>"] });

chrome.webRequest.onErrorOccurred.addListener((d) => {
  const rec = tab(d.tabId).byId.get(d.requestId);
  if (rec) { rec.error = d.error; persist(d.tabId); }
}, { urls: ["<all_urls>"] });

chrome.tabs.onRemoved.addListener((tabId) => {
  tabs.delete(tabId);
  chrome.storage.session.remove("tab:" + tabId).catch(() => {});
});

// content script delivers accurate transfer sizes / timing from Resource Timing
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "netlens:rt" && sender.tab) {
    const t = tab(sender.tab.id);
    for (const e of msg.entries || []) {
      const rec = t.byUrl.get(e.name);
      if (rec) { if (e.transferSize > 0) rec.bytes = e.transferSize; rec.duration = Math.round(e.duration); }
    }
    persist(sender.tab.id);
    return; // no response
  }
  if (msg?.type === "netlens:get") {
    const id = msg.tabId;
    const t = tabs.get(id);
    if (t) { sendResponse({ pageDomain: t.pageDomain, security: t.security, records: [...t.byId.values()] }); return true; }
    chrome.storage.session.get("tab:" + id).then((s) => sendResponse(s["tab:" + id] || { pageDomain: "", security: {}, records: [] }));
    return true; // async
  }
  if (msg?.type === "netlens:open") { openReport(msg.tabId); return; }
});

// open the in-depth report (shareable #r= summary in the URL) and inject the FULL
// records into the page once it loads, so the explorer/waterfall have everything.
const pendingInject = new Map(); // reportTabId → full payload
async function openReport(tabId) {
  const t = tabs.get(tabId);
  let records = t ? [...t.byId.values()] : [];
  const stored = await chrome.storage.local.get("netlens:allowlist").catch(() => ({}));
  records = applyAllowlist(records, stored["netlens:allowlist"] || []);
  const page = t ? t.pageDomain : "";
  const security = t ? t.security : {};
  const summary = summarize(records);
  const capturedAt = new Date().toISOString();
  const hash = b64e(JSON.stringify({ page, capturedAt, summary }));
  const created = await chrome.tabs.create({ url: `${REPORT_SITE}/report.html#r=${hash}` });
  pendingInject.set(created.id, { page, capturedAt, summary, security, records });
}
chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status !== "complete" || !pendingInject.has(tabId)) return;
  const data = pendingInject.get(tabId);
  pendingInject.delete(tabId);
  chrome.scripting.executeScript({
    target: { tabId }, world: "MAIN", args: [data],
    func: (d) => { window.__NETLENS__ = d; window.dispatchEvent(new CustomEvent("netlens:data", { detail: d })); },
  }).catch(() => {});
});

function safeHost(url) { try { return new URL(url).hostname; } catch { return ""; } }
