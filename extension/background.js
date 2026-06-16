/* background.js — MV3 service worker. Passively captures every request per tab
   via webRequest, classifies it (party / type / vendor), merges sizes from the
   content script's Resource Timing, badges the tab, and answers the popup.
   State is held in memory and written through to chrome.storage.session so it
   survives the worker being torn down. */

import { classify } from "./core/classify.js";
import { etld1 } from "./core/etld.js";

const tabs = new Map(); // tabId → { pageDomain, byId: Map<requestId,rec>, byUrl: Map<url,rec> }

const TYPE = {
  main_frame: "document", sub_frame: "document", xmlhttprequest: "xhr/fetch",
  stylesheet: "css", script: "script", image: "image", font: "font",
  media: "media", websocket: "websocket", ping: "beacon", other: "other",
};

function fresh() { return { pageDomain: "", byId: new Map(), byUrl: new Map() }; }
function tab(id) { let t = tabs.get(id); if (!t) tabs.set(id, t = fresh()); return t; }

const saveTimers = new Map();
function persist(tabId) {
  clearTimeout(saveTimers.get(tabId));
  saveTimers.set(tabId, setTimeout(() => {
    const t = tabs.get(tabId);
    if (!t) return;
    chrome.storage.session.set({ ["tab:" + tabId]: { pageDomain: t.pageDomain, records: [...t.byId.values()] } }).catch(() => {});
  }, 400));
}

function setBadge(tabId) {
  const t = tabs.get(tabId);
  const n = t ? [...t.byId.values()].filter((r) => r.tracking).length : 0;
  chrome.action.setBadgeText({ tabId, text: n ? String(n) : "" }).catch(() => {});
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeBackgroundColor({ color: "#e879f9" }).catch(() => {});
});

chrome.webRequest.onBeforeRequest.addListener((d) => {
  if (d.tabId < 0) return;
  const t = tab(d.tabId);
  if (d.type === "main_frame") {                       // top-level navigation → reset
    tabs.set(d.tabId, Object.assign(fresh(), { pageDomain: etld1(safeHost(d.url)) }));
  }
  const tt = tab(d.tabId);
  const c = classify(d.url, tt.pageDomain);
  const rec = {
    url: d.url, domain: c.domain, party: c.party, company: c.company,
    category: c.category, tracking: c.tracking, type: TYPE[d.type] || d.type,
    method: d.method, status: null, bytes: 0, error: null, started: d.timeStamp,
  };
  tt.byId.set(d.requestId, rec);
  tt.byUrl.set(d.url, rec);
  persist(d.tabId);
}, { urls: ["<all_urls>"] });

chrome.webRequest.onHeadersReceived.addListener((d) => {
  const rec = tab(d.tabId).byId.get(d.requestId);
  if (!rec) return;
  const cl = d.responseHeaders?.find((h) => h.name.toLowerCase() === "content-length");
  if (cl && !rec.bytes) rec.bytes = +cl.value || 0;     // RT (content script) can override later
}, { urls: ["<all_urls>"] }, ["responseHeaders"]);

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
    if (t) { sendResponse({ pageDomain: t.pageDomain, records: [...t.byId.values()] }); return true; }
    chrome.storage.session.get("tab:" + id).then((s) => sendResponse(s["tab:" + id] || { pageDomain: "", records: [] }));
    return true; // async
  }
});

function safeHost(url) { try { return new URL(url).hostname; } catch { return ""; } }
