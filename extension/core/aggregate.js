/* core/aggregate.js — PURE. Turn an array of classified request records into the
   summary the popup/report render. No DOM, no chrome APIs.
   record: { url, domain, party, company, category, type, status, bytes, error,
             tracking, secure, mixed, cookies, pii: string[] } */

function bump(obj, key, bytes) {
  const e = obj[key] || (obj[key] = { requests: 0, bytes: 0 });
  e.requests++; e.bytes += bytes;
}

/** A→F privacy grade. `penalty` lets PII leaks / insecure requests worsen it. */
export function privacyGrade(trackers, thirdParties, penalty = 0) {
  const score = trackers * 2 + thirdParties + penalty;
  if (score === 0) return "A";
  if (score <= 4) return "B";
  if (score <= 10) return "C";
  if (score <= 20) return "D";
  return "F";
}

export function summarize(records) {
  const totals = { requests: records.length, bytes: 0, trackers: 0, thirdParties: 0, errors: 0,
    insecure: 0, mixed: 0, cookies: 0, fingerprinters: 0, piiLeaks: 0 };
  const byType = {}, byCategory = {}, byParty = { first: { requests: 0, bytes: 0 }, third: { requests: 0, bytes: 0 } };
  const domainMap = new Map();
  const tpDomains = new Set();
  const piiMap = new Map(); // domain → { domain, party, types:Set }

  for (const r of records) {
    const bytes = r.bytes || 0;
    totals.bytes += bytes;
    if (r.error) totals.errors++;
    if (r.tracking) totals.trackers++;
    if (r.secure === false) totals.insecure++;
    if (r.mixed) totals.mixed++;
    if (r.cookies) totals.cookies += r.cookies;
    if (r.category === "fingerprinting" && r.party === "third") totals.fingerprinters++;
    if (r.pii && r.pii.length) {
      totals.piiLeaks++;
      let s = piiMap.get(r.domain);
      if (!s) piiMap.set(r.domain, s = { domain: r.domain, party: r.party, types: new Set() });
      r.pii.forEach((t) => s.types.add(t));
    }

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
  totals.grade = privacyGrade(totals.trackers, totals.thirdParties, totals.piiLeaks * 3 + totals.insecure);
  const domains = [...domainMap.values()].sort((a, b) => b.requests - a.requests || b.bytes - a.bytes);
  const pii = [...piiMap.values()].map((x) => ({ domain: x.domain, party: x.party, types: [...x.types] }));
  return { totals, byType, byCategory, byParty, domains, pii };
}
