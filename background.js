/* background.js — MV3 service worker. Passively captures every request per tab
   via webRequest and classifies it (party / type / vendor). */

import { classify } from "./core/classify.js";
import { etld1 } from "./core/etld.js";

const tabs = new Map(); // tabId → { pageDomain, byId: Map<requestId,rec> }

const TYPE = {
  main_frame: "document", sub_frame: "document", xmlhttprequest: "xhr/fetch",
  stylesheet: "css", script: "script", image: "image", font: "font",
  media: "media", websocket: "websocket", ping: "beacon", other: "other",
};

function fresh() { return { pageDomain: "", byId: new Map() }; }
function tab(id) { let t = tabs.get(id); if (!t) tabs.set(id, t = fresh()); return t; }
function safeHost(url) { try { return new URL(url).hostname; } catch { return ""; } }

chrome.webRequest.onBeforeRequest.addListener((d) => {
  if (d.tabId < 0) return;
  if (d.type === "main_frame") tabs.set(d.tabId, Object.assign(fresh(), { pageDomain: etld1(safeHost(d.url)) }));
  const t = tab(d.tabId);
  const c = classify(d.url, t.pageDomain);
  t.byId.set(d.requestId, {
    url: d.url, domain: c.domain, party: c.party, company: c.company,
    category: c.category, tracking: c.tracking, type: TYPE[d.type] || d.type,
    method: d.method, status: null, bytes: 0, error: null,
  });
}, { urls: ["<all_urls>"] });

chrome.webRequest.onCompleted.addListener((d) => {
  const r = tab(d.tabId).byId.get(d.requestId); if (r) r.status = d.statusCode;
}, { urls: ["<all_urls>"] });

chrome.webRequest.onErrorOccurred.addListener((d) => {
  const r = tab(d.tabId).byId.get(d.requestId); if (r) r.error = d.error;
}, { urls: ["<all_urls>"] });

chrome.tabs.onRemoved.addListener((id) => tabs.delete(id));
