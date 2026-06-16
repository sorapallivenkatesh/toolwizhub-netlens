/* content/timing.js — runs in the page. Reads the browser's Resource Timing
   entries (accurate transfer size + duration, which webRequest can't give) and
   forwards them to the service worker, which merges them by URL. Read-only. */

(() => {
  const send = (entries) => {
    if (!entries.length) return;
    chrome.runtime.sendMessage({
      type: "netlens:rt",
      entries: entries.map((e) => ({
        name: e.name,
        transferSize: e.transferSize || 0,   // 0 for cross-origin without Timing-Allow-Origin
        duration: e.duration || 0,
        initiatorType: e.initiatorType,
      })),
    }).catch(() => {}); // worker asleep / page closing — ignore
  };

  // flush anything already loaded, then stream new entries as they arrive
  try { send(performance.getEntriesByType("resource")); } catch {}
  try {
    new PerformanceObserver((list) => send(list.getEntries())).observe({ type: "resource", buffered: true });
  } catch {}
})();
