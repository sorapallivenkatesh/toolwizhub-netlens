# 🔭 NetLens

A privacy-first **browser extension** that categorizes every network request a website makes —
trackers, ads, APIs, CDNs, fonts — with an A–F privacy grade. Runs 100% locally. A ToolWizHub tool.

This is a **monorepo** with two parts:

```
extension/   the MV3 browser extension (Chrome/Edge)   → load unpacked / zip for the Web Store
site/        the landing page + in-depth report viewer → netlens.toolwizhub.com (Cloudflare Pages)
```

## Run locally

```bash
npm test     # extension core/ unit tests (node, no browser)
npm run site # serve site/ on http://localhost:8090  (matches the extension's dev routing)
```

Load the extension:

1. `chrome://extensions` → enable **Developer mode**
2. **Load unpacked** → select the **`extension/`** folder
3. Open a site, reload it once, click the NetLens icon. "Open full report ↗" opens the report page
   (→ `localhost:8090` in dev, `https://netlens.toolwizhub.com` once published).

## How the pieces connect

The popup builds a compact `{ page, capturedAt, summary }` payload, URL-safe-base64 encodes it, and
opens `…/report.html#r=<payload>`. The site's `report.html` decodes it and renders the full
breakdown (no extra permissions; the link is shareable). Dev vs prod is detected via the absence of
`update_url` in the manifest, so the dev server must run on **8090**.

## Build / deploy

- **Extension:** `npm run pack` → `netlens-extension.zip` (or just zip the `extension/` folder); upload to the Chrome Web Store.
- **Site:** Cloudflare Pages — build command empty, **output dir `site/`**, domain `netlens.toolwizhub.com`.

## Structure

```
extension/
  manifest.json     MV3 manifest
  background.js     service worker — capture + classify + badge + persistence
  content/timing.js in-page Resource Timing reporter (transfer sizes)
  core/             PURE engine — etld.js · classify.js · aggregate.js (node-tested)
  data/trackers.js  known-vendor map (domain → company + category)
  popup/            popup UI (dark glass) + "Open full report" routing
  icons/  tests/
site/
  index.html        marketing landing (splash, hero, features, install)
  report.html       in-depth report viewer (decodes the #r= payload)
  css/  js/  assets/  robots.txt  sitemap.xml
```
