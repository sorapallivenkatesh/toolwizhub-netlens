/* core/pii.js — PURE. Conservative detector for PII leaking in a request URL
   (query string / params). Deliberately strict to avoid false positives: emails
   and coordinates by value; everything else only when a param NAME signals it
   and the value is non-empty. No DOM, no chrome APIs. */

const VALUE_RE = [
  { type: "email", re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/ },
  { type: "location", re: /-?\d{1,2}\.\d{3,}\s*,\s*-?\d{1,3}\.\d{3,}/ },
];
const KEY_RE = [
  { type: "email", re: /e-?mail/i },
  { type: "phone", re: /phone|mobile|msisdn|(?:^|[_-])tel(?:ephone)?(?:$|[_-])/i },
  { type: "location", re: /(?:^|[_-])(?:lat|lng|lon|latitude|longitude)(?:$|[_-])|geo|coord/i },
  { type: "name", re: /(?:first|last|full|sur)_?name|fullname|(?:^|[_-])name(?:$|[_-])/i },
  { type: "address", re: /address|street|postal|pin-?code|(?:^|[_-])zip(?:$|[_-])/i },
  { type: "ssn", re: /ssn|social.?security/i },
  { type: "dob", re: /dob|birth-?date|date-?of-?birth/i },
];

/** @returns {string[]} PII types found in the URL's query (deduped). */
export function piiInUrl(url) {
  let u;
  try { u = new URL(url); } catch { return []; }
  const found = new Set();
  let query = "";
  try { query = decodeURIComponent(u.search); } catch { query = u.search; }
  for (const { type, re } of VALUE_RE) if (re.test(query)) found.add(type);
  for (const [k, v] of u.searchParams) {
    if (!v || !v.trim()) continue;
    for (const { type, re } of KEY_RE) { if (re.test(k)) { found.add(type); break; } }
  }
  return [...found];
}
