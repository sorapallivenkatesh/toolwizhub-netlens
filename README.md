# 🔭 NetLens

A privacy-first **browser extension** (Chrome/Edge) that passively categorizes every network
request a website makes — trackers, ads, APIs, CDNs, fonts — and gives each site an **A–F privacy
grade**. Runs **100% locally**; nothing is uploaded. A ToolWizHub tool.

**Monorepo, two parts:**

```
extension/   the MV3 browser extension      → load unpacked / zip for the Web Store
site/        landing page + in-depth report → netlens.toolwizhub.com (Cloudflare Pages)
```

## Privacy grade — how it's scored

Lower score = cleaner. The grade is computed in `extension/core/aggregate.js` (`privacyGrade`):

```
score = trackers×2  +  third-party domains  +  PII leaks×3  +  insecure requests
```

| Grade | Score | Meaning |
|------:|:------|:--------|
| **A** | 0      | Clean |
| **B** | 1–4    | Light |
| **C** | 5–10   | Moderate |
| **D** | 11–20  | Heavy |
| **F** | 21+    | Very heavy |

- **trackers** — third-party requests whose vendor category is analytics / ads / social / a-b
  testing / fingerprinting (weighted ×2 — the biggest signal).
- **third-party domains** — distinct registrable domains that aren't the page's own (+1 each).
- **PII leaks** — requests with personal data in the URL (weighted ×3 — the most serious).
- **insecure** — plain-`http`/`ws` requests (+1 each).

Allowlisted (muted) domains stop counting as trackers, which lifts the grade. The report page's
**"Why this grade"** card shows this exact breakdown + the A–F scale with your grade highlighted.

## What it detects

Detection is **value-first** (keys/domains are arbitrary):

- **Vendor categories** (from a bundled known-domain dataset): analytics, ads, social, tag managers,
  CDNs, fonts, monitoring, payment, support/chat, video, consent, A/B testing, **fingerprinting**.
- **First-party vs third-party** by registrable domain (eTLD+1).
- **PII-in-URL** — emails & coordinates by value; phone / name / address / SSN / DOB by param name
  (conservative — no false positives on plain IDs or timestamps).
- **Insecure & mixed content** — `http`/`ws` requests, and http resources on an https page.
- **Cookies set** per domain (from `Set-Cookie`), and the document's **security headers**
  (HSTS / CSP / X-Frame-Options / Referrer-Policy).

## The report page (`site/report.html`)

Opened via the popup's **"Open full report ↗"**. Shows:

- The privacy grade + **"Why this grade"** breakdown + A–F scale.
- Stats: requests, transferred, third-party domains, trackers, fingerprinters, PII leaks, insecure,
  cookies.
- **PII-in-requests** callout, **security-headers** panel.
- **By category** and **by resource type** charts.
- **"Who it talks to"** company map + **heaviest resources**.
- A **timeline waterfall** (time axis, gridlines, durations) and a **filterable request explorer**.
- **Export JSON / HAR**, and a shareable **Copy link**.

> The popup opens `report.html#r=<url-safe-base64 of {page,capturedAt,summary}>` (shareable, small)
> **and** the background worker injects the full record set into the tab (`scripting`). So a
> *copied* `#r=` link shows the grade/charts/domains; the **timeline & explorer need the records**,
> which only arrive when you open the report from the extension (or drop an exported JSON).

## Allowlist & controls

- **Mute/unmute** any third-party domain from the popup — muted domains stay listed but stop
  counting as trackers. Persisted in `chrome.storage.local`, honored by the report too.
- **Options page** (open in a tab) to manage the allowlist.
- **Context menu** — right-click → "Analyze this page with NetLens".
- **Keyboard shortcut** — `Ctrl/Cmd+Shift+L` opens the popup.

## Run locally

```bash
npm test      # extension core/ unit tests (node, no browser)
npm run site  # serve site/ on http://localhost:8090  (matches the extension's dev routing)
npm run pack  # zip extension/ → netlens-extension.zip (Web Store upload)
```

Load the extension:

1. `chrome://extensions` → enable **Developer mode**
2. **Load unpacked** → select the **`extension/`** folder
3. Open a site, **reload it once**, click the NetLens icon → **Open full report ↗**
   (→ `localhost:8090` in dev, `https://netlens.toolwizhub.com` once published — detected via the
   absence of `update_url` in the manifest, so the dev server must run on **8090**).

## Architecture

- `extension/core/` is **PURE** — no DOM, no chrome APIs — so it's node-tested. The chrome.* layers
  (background, content, popup, options) are verified by loading unpacked.
- Render untrusted values (domains, URLs) with `textContent`, never `innerHTML`.

```
extension/
  manifest.json       MV3 (webRequest, storage, tabs, scripting, contextMenus, <all_urls>)
  background.js       service worker — capture · classify · cookies/security headers · badge ·
                      persistence · open+inject report · context menu
  content/timing.js   in-page Resource Timing reporter (transfer sizes; guards against reload)
  core/               PURE engine, node-tested
    etld.js           registrable domain (eTLD+1)
    classify.js       url + page domain → { party, vendor, category }
    pii.js            conservative PII-in-URL detector
    aggregate.js      records → summary (totals, charts, domains, pii) · privacyGrade · applyAllowlist
  data/trackers.js    known-vendor map (domain → company + category)
  popup/              popup UI + mute/unmute + "Open full report" routing
  options/            allowlist manager (options page)
  icons/  tests/
site/
  index.html          marketing landing (splash, hero, features, install)
  report.html         in-depth report viewer (decodes #r= / injected records / dropped JSON)
  css/  js/  assets/  robots.txt  sitemap.xml
```

## Build / deploy

- **Extension:** `npm run pack` (or zip the `extension/` folder) → upload to the Chrome Web Store.
- **Site:** Cloudflare Pages — build command empty, **output dir `site/`**, domain
  `netlens.toolwizhub.com`.

## Roadmap

- ✅ Detection engine, popup, in-depth report, allowlist, options, context menu, shortcut
- ⏭️ Category blocking (`declarativeNetRequest`) · request-body PII (`debugger`) · session diff · Firefox build
