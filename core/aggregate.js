/* core/aggregate.js — PURE. Turn an array of classified request records into the
   summary the popup renders. No DOM, no chrome APIs. */

function bump(obj, key, bytes) {
  const e = obj[key] || (obj[key] = { requests: 0, bytes: 0 });
  e.requests++; e.bytes += bytes;
}

export function summarize(records) {
  const totals = { requests: records.length, bytes: 0, trackers: 0, thirdParties: 0, errors: 0 };
  const byType = {}, byCategory = {}, byParty = { first: { requests: 0, bytes: 0 }, third: { requests: 0, bytes: 0 } };
  const domainMap = new Map();
  const tpDomains = new Set();

  for (const r of records) {
    const bytes = r.bytes || 0;
    totals.bytes += bytes;
    if (r.error) totals.errors++;
    if (r.tracking) totals.trackers++;

    bump(byType, r.type || "other", bytes);
    bump(byCategory, r.category || (r.party === "third" ? "other-3p" : "first-party"), bytes);

    const p = byParty[r.party] || (byParty[r.party] = { requests: 0, bytes: 0 });
    p.requests++; p.bytes += bytes;
    if (r.party === "third") tpDomains.add(r.domain);

    let d = domainMap.get(r.domain);
    if (!d) domainMap.set(r.domain, d = { domain: r.domain, party: r.party, company: r.company, category: r.category, requests: 0, bytes: 0 });
    d.requests++; d.bytes += bytes;
  }

  totals.thirdParties = tpDomains.size;
  const domains = [...domainMap.values()].sort((a, b) => b.requests - a.requests || b.bytes - a.bytes);
  return { totals, byType, byCategory, byParty, domains };
}
