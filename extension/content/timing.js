/* content/timing.js — runs in the page. Reads the browser's Resource Timing
   entries (accurate transfer size + duration, which webRequest can't give) and
   forwards them to the service worker, which merges them by URL. Read-only. */

(() => {
  let obs;
  const stop = () => { try { obs?.disconnect(); } catch {} };

  const send = (entries) => {
    if (!entries.length) return;
    // After the extension is reloaded/updated, this content script lives on but its
    // context is dead — chrome.runtime.id goes undefined and sendMessage throws
    // synchronously ("Extension context invalidated"). Guard + stop observing.
    if (!chrome.runtime?.id) { stop(); return; }
    try {
      chrome.runtime.sendMessage({
        type: "netlens:rt",
        entries: entries.map((e) => ({
          name: e.name,
          transferSize: e.transferSize || 0,   // 0 for cross-origin without Timing-Allow-Origin
          duration: e.duration || 0,
          initiatorType: e.initiatorType,
        })),
      }).catch(() => {}); // worker asleep / page closing — ignore (async)
    } catch { stop(); } // context invalidated — ignore (sync)
  };

  // flush anything already loaded, then stream new entries as they arrive
  try { send(performance.getEntriesByType("resource")); } catch {}
  try {
    obs = new PerformanceObserver((list) => send(list.getEntries()));
    obs.observe({ type: "resource", buffered: true });
  } catch {}
})();
