# 🔭 NetLens — Network Analyzer

A **privacy-first browser extension** that passively watches every network request a
website makes and turns it into a **categorized, plain-English breakdown** — *who is this
site talking to, why, and how much?* — without ever opening DevTools.

A ToolWizHub tool. Landing page: **netlens.toolwizhub.com**.

## Runs 100% locally

Captures never leave your machine — no backend, no uploads, no tracking. The known-vendor
dataset ships **inside** the extension (no phone-home lookups).

## What it shows

- **Privacy grade (A–F)** from third-party + tracker counts.
- **By category** — analytics, ads, social, tag managers, CDNs, fonts, monitoring, payment,
  support, video, consent, A/B testing (matched against a known-vendor list).
- **First-party vs third-party** split (by registrable domain / eTLD+1).
- **Per-domain breakdown** — requests, bytes, vendor, category.
- **Live badge** — third-party tracker count for the current tab.
- **Export** the full report as JSON.

## Install (development)

Chrome / Edge:

1. Go to `chrome://extensions`
2. Enable **Developer mode** (top-right)
3. **Load unpacked** → select this `netlens/` folder
4. Open any website, then click the NetLens toolbar icon. (Reload the page once so the
   extension sees its requests from the start.)

## How it works

```
content/timing.js   in-page: Resource Timing → accurate transfer sizes + duration
        │ sendMessage
        ▼
background.js        service worker: webRequest captures every request (URL, type,
                     status, initiator), classifies it, merges sizes, badges the tab,
                     persists to chrome.storage.session, answers the popup
        ▲ sendMessage
popup/               reads the active tab's records → core/aggregate → renders
```

- `chrome.webRequest` gives method / resourceType / status / initiator passively on any site.
- It can't report transfer size, so the content script's **Resource Timing** fills that in.
- Response **bodies** (for future PII-in-payload detection) need the `chrome.debugger` API —
  a deliberate later, opt-in mode.

## Structure

```
manifest.json            MV3 manifest
background.js            service worker — capture + classify + badge + persistence
content/timing.js        in-page Resource Timing reporter
core/                    PURE logic — no DOM, no chrome APIs (testable in node)
  etld.js                registrable domain (eTLD+1) extractor
  classify.js            url + page domain → { party, vendor, category }
  aggregate.js           records → summary (totals, byCategory, byParty, domains, grade)
data/trackers.js         trimmed known-vendor map (domain → company + category)
popup/                   popup.html / .css / .js — the breakdown UI (dark glass)
icons/                   16 / 48 / 128 (ToolWizHub brand mark)
tests/classify.test.js   offline core tests
```

## Develop & test

```bash
npm test     # runs the pure core/ tests in node (no browser needed)
```
Reload the extension card in `chrome://extensions` after edits; click **"service worker"**
on the card to open its console for debugging.

## Roadmap

1. ✅ **MVP** — passive capture, party + type + vendor categorization, popup, badge, JSON export
2. "Who it talks to" map · cookie/storage audit · HAR export · per-domain drill-down
3. **PII-in-payloads** detection (reuse the ToolWizHub PII Scanner engine) · session diff ·
   optional blocking (`declarativeNetRequest`) · server GeoIP · Firefox build

## Publishing

- **Chrome Web Store** — one-time $5 dev fee; zip the folder, upload, fill the listing.
- **Firefox AMO** — free; the MV3 `webRequest` code mostly ports.
