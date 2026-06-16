/* Offline tests for the pure core. Run: npm test */
import assert from "node:assert";
import { etld1 } from "../core/etld.js";
import { classify } from "../core/classify.js";
import { summarize, privacyGrade } from "../core/aggregate.js";

let pass = 0;
const ok = (c, m) => { assert.ok(c, m); pass++; };

/* ── eTLD+1 ──────────────────────────────────────── */
ok(etld1("www.example.com") === "example.com", "strips www");
ok(etld1("a.b.example.com") === "example.com", "deep subdomain → registrable");
ok(etld1("example.com") === "example.com", "bare domain unchanged");
ok(etld1("app.foo.co.uk") === "foo.co.uk", "multi-label suffix co.uk");
ok(etld1("shop.example.co.in") === "example.co.in", "multi-label suffix co.in");
ok(etld1("localhost") === "localhost", "localhost as-is");
ok(etld1("203.0.113.5") === "203.0.113.5", "IPv4 as-is");

/* ── classify ────────────────────────────────────── */
const ga = classify("https://www.google-analytics.com/collect?v=2", "example.com");
ok(ga.party === "third" && ga.category === "analytics" && ga.tracking, "GA → third-party analytics tracker");
ok(ga.company === "Google", "GA company resolved");

const own = classify("https://cdn.example.com/app.js", "example.com");
ok(own.party === "first" && !own.tracking, "same registrable domain → first-party, not a tracker");

const cdn = classify("https://cdn.jsdelivr.net/x.js", "example.com");
ok(cdn.category === "cdn" && !cdn.tracking, "CDN classified but not a tracker");

const unknown = classify("https://random-3p.example.org/x", "example.com");
ok(unknown.party === "third" && unknown.category === null, "unknown third-party → no category");

const bad = classify("data:text/plain,hi", "example.com");
ok(bad.domain === "(local)", "non-http URL → (local), no throw");

/* ── aggregate ───────────────────────────────────── */
const records = [
  { url: "https://example.com/", domain: "example.com", party: "first", company: null, category: null, type: "document", bytes: 1000, tracking: false },
  { url: "https://example.com/a.js", domain: "example.com", party: "first", company: null, category: null, type: "script", bytes: 500, tracking: false },
  { url: "https://www.google-analytics.com/c", domain: "google-analytics.com", party: "third", company: "Google", category: "analytics", type: "xhr/fetch", bytes: 200, tracking: true },
  { url: "https://doubleclick.net/x", domain: "doubleclick.net", party: "third", company: "Google", category: "ads", type: "script", bytes: 300, tracking: true },
  { url: "https://err.example.net/x", domain: "example.net", party: "third", company: null, category: null, type: "image", bytes: 0, error: "net::ERR", tracking: false },
];
const s = summarize(records);
ok(s.totals.requests === 5, "counts all requests");
ok(s.totals.bytes === 2000, "sums bytes");
ok(s.totals.trackers === 2, "counts trackers (GA + ads)");
ok(s.totals.thirdParties === 3, "counts distinct third-party domains");
ok(s.totals.errors === 1, "counts errored requests");
ok(s.byParty.first.requests === 2 && s.byParty.third.requests === 3, "party split");
ok(s.byCategory.analytics.requests === 1 && s.byCategory.ads.requests === 1, "category buckets");
ok(s.domains[0].requests >= s.domains[s.domains.length - 1].requests, "domains sorted by request count");

ok(privacyGrade(0, 0) === "A", "no trackers → A");
ok(privacyGrade(2, 3) === "C", "some trackers → C");
ok(privacyGrade(20, 20) === "F", "many trackers → F");

console.log(`✓ all ${pass} NetLens core assertions passed`);
