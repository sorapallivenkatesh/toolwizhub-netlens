/* data/trackers.js — trimmed known-vendor map (eTLD+1 → company + category).
   Sourced from common entries in DuckDuckGo Tracker Radar / Disconnect lists.
   Ships inside the extension — no network lookups. Extend freely. */

export const TRACKERS = {
  // analytics
  "google-analytics.com": { company: "Google", category: "analytics" },
  "analytics.google.com": { company: "Google", category: "analytics" },
  "mixpanel.com": { company: "Mixpanel", category: "analytics" },
  "segment.com": { company: "Segment", category: "analytics" },
  "amplitude.com": { company: "Amplitude", category: "analytics" },
  "hotjar.com": { company: "Hotjar", category: "analytics" },
  "clarity.ms": { company: "Microsoft Clarity", category: "analytics" },

  // tag managers
  "googletagmanager.com": { company: "Google", category: "tagmanager" },
  "tealium.com": { company: "Tealium", category: "tagmanager" },

  // ads
  "doubleclick.net": { company: "Google", category: "ads" },
  "googlesyndication.com": { company: "Google", category: "ads" },
  "criteo.com": { company: "Criteo", category: "ads" },
  "taboola.com": { company: "Taboola", category: "ads" },
  "outbrain.com": { company: "Outbrain", category: "ads" },
  "amazon-adsystem.com": { company: "Amazon", category: "ads" },
};

// categories that count toward the "tracker" privacy tally / badge
export const TRACKING_CATEGORIES = new Set(["analytics", "ads", "social", "abtest"]);
