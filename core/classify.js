/* core/classify.js — PURE request classifier. No DOM, no chrome APIs.
   Given a request URL + the page's registrable domain, returns party
   (first/third), the registrable domain, and vendor/category if known. */

import { etld1 } from "./etld.js";
import { TRACKERS, TRACKING_CATEGORIES } from "../data/trackers.js";

/** @returns {{domain,party,company,category,tracking}} */
export function classify(url, pageDomain) {
  let host = "";
  try { host = new URL(url).hostname; } catch { /* data:, blob:, etc. */ }
  const domain = etld1(host);
  const party = domain && pageDomain && domain === pageDomain ? "first" : "third";
  const vendor = TRACKERS[domain] || null;
  const category = vendor ? vendor.category : null;
  return {
    domain: domain || "(local)",
    party,
    company: vendor ? vendor.company : null,
    category,
    tracking: party === "third" && !!category && TRACKING_CATEGORIES.has(category),
  };
}

export { TRACKING_CATEGORIES };
