/* core/etld.js — pragmatic eTLD+1 (registrable domain) extractor. No DOM, no I/O.
   Uses a compact set of multi-label public suffixes; falls back to the last two
   labels. Not a full Public Suffix List — good enough for grouping by site, and
   easy to extend. */

// multi-label suffixes where the registrable domain is the last THREE labels
const MULTI = new Set([
  "co.uk", "org.uk", "gov.uk", "ac.uk", "co.in", "net.in", "org.in", "gen.in",
  "firm.in", "co.jp", "ne.jp", "or.jp", "com.au", "net.au", "org.au", "gov.au",
  "com.br", "com.cn", "com.mx", "com.tr", "com.sg", "com.hk", "com.tw", "co.nz",
  "co.za", "co.kr", "com.ar", "com.co", "com.my", "com.ph", "com.sa", "com.ua",
  "com.eg", "com.ng", "co.id", "co.il", "co.th", "com.vn", "com.pk", "com.bd",
]);

export function etld1(hostname) {
  const host = String(hostname || "").toLowerCase().replace(/\.$/, "");
  if (!host || /^[\d.]+$/.test(host) || host.includes(":")) return host; // IP / IPv6 → as-is
  const parts = host.split(".");
  if (parts.length <= 2) return host;
  const lastTwo = parts.slice(-2).join(".");
  const lastThree = parts.slice(-3).join(".");
  return MULTI.has(lastTwo) ? lastThree : lastTwo;
}
