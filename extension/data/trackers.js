/* data/trackers.js — trimmed known-vendor map (eTLD+1 → company + category).
   Sourced from common entries in DuckDuckGo Tracker Radar / Disconnect lists.
   Ships inside the extension — no network lookups. Extend freely.
   Categories: analytics | ads | social | tagmanager | cdn | fonts |
               monitoring | payment | support | video | consent | abtest */

export const TRACKERS = {
  // analytics
  "google-analytics.com": { company: "Google", category: "analytics" },
  "analytics.google.com": { company: "Google", category: "analytics" },
  "mixpanel.com": { company: "Mixpanel", category: "analytics" },
  "segment.com": { company: "Segment", category: "analytics" },
  "segment.io": { company: "Segment", category: "analytics" },
  "amplitude.com": { company: "Amplitude", category: "analytics" },
  "hotjar.com": { company: "Hotjar", category: "analytics" },
  "fullstory.com": { company: "FullStory", category: "analytics" },
  "heap.io": { company: "Heap", category: "analytics" },
  "plausible.io": { company: "Plausible", category: "analytics" },
  "matomo.cloud": { company: "Matomo", category: "analytics" },
  "statcounter.com": { company: "StatCounter", category: "analytics" },
  "clarity.ms": { company: "Microsoft Clarity", category: "analytics" },
  "mouseflow.com": { company: "Mouseflow", category: "analytics" },

  // tag managers
  "googletagmanager.com": { company: "Google", category: "tagmanager" },
  "tealium.com": { company: "Tealium", category: "tagmanager" },
  "ensighten.com": { company: "Ensighten", category: "tagmanager" },

  // ads
  "doubleclick.net": { company: "Google", category: "ads" },
  "googlesyndication.com": { company: "Google", category: "ads" },
  "google-adservices.com": { company: "Google", category: "ads" },
  "adnxs.com": { company: "AppNexus", category: "ads" },
  "criteo.com": { company: "Criteo", category: "ads" },
  "taboola.com": { company: "Taboola", category: "ads" },
  "outbrain.com": { company: "Outbrain", category: "ads" },
  "pubmatic.com": { company: "PubMatic", category: "ads" },
  "rubiconproject.com": { company: "Magnite", category: "ads" },
  "amazon-adsystem.com": { company: "Amazon", category: "ads" },
  "scorecardresearch.com": { company: "Comscore", category: "ads" },
  "adsrvr.org": { company: "The Trade Desk", category: "ads" },
  "casalemedia.com": { company: "Index Exchange", category: "ads" },

  // social
  "facebook.com": { company: "Meta", category: "social" },
  "facebook.net": { company: "Meta", category: "social" },
  "ads-twitter.com": { company: "X", category: "social" },
  "twitter.com": { company: "X", category: "social" },
  "linkedin.com": { company: "LinkedIn", category: "social" },
  "licdn.com": { company: "LinkedIn", category: "social" },
  "pinterest.com": { company: "Pinterest", category: "social" },
  "tiktok.com": { company: "TikTok", category: "social" },
  "snapchat.com": { company: "Snap", category: "social" },
  "redditstatic.com": { company: "Reddit", category: "social" },

  // cdn
  "cloudflare.com": { company: "Cloudflare", category: "cdn" },
  "cloudflareinsights.com": { company: "Cloudflare", category: "analytics" },
  "jsdelivr.net": { company: "jsDelivr", category: "cdn" },
  "unpkg.com": { company: "unpkg", category: "cdn" },
  "bootstrapcdn.com": { company: "BootstrapCDN", category: "cdn" },
  "jquery.com": { company: "jQuery", category: "cdn" },
  "gstatic.com": { company: "Google", category: "cdn" },
  "akamaihd.net": { company: "Akamai", category: "cdn" },

  // fonts
  "googleapis.com": { company: "Google Fonts", category: "fonts" },
  "typekit.net": { company: "Adobe Fonts", category: "fonts" },
  "fontawesome.com": { company: "Font Awesome", category: "fonts" },

  // monitoring
  "sentry.io": { company: "Sentry", category: "monitoring" },
  "bugsnag.com": { company: "Bugsnag", category: "monitoring" },
  "newrelic.com": { company: "New Relic", category: "monitoring" },
  "nr-data.net": { company: "New Relic", category: "monitoring" },
  "datadoghq.com": { company: "Datadog", category: "monitoring" },

  // payment
  "stripe.com": { company: "Stripe", category: "payment" },
  "stripe.network": { company: "Stripe", category: "payment" },
  "paypal.com": { company: "PayPal", category: "payment" },
  "razorpay.com": { company: "Razorpay", category: "payment" },

  // support / chat
  "intercom.io": { company: "Intercom", category: "support" },
  "intercomcdn.com": { company: "Intercom", category: "support" },
  "drift.com": { company: "Drift", category: "support" },
  "zendesk.com": { company: "Zendesk", category: "support" },
  "crisp.chat": { company: "Crisp", category: "support" },
  "tawk.to": { company: "tawk.to", category: "support" },

  // video
  "youtube.com": { company: "YouTube", category: "video" },
  "ytimg.com": { company: "YouTube", category: "video" },
  "vimeo.com": { company: "Vimeo", category: "video" },
  "vimeocdn.com": { company: "Vimeo", category: "video" },

  // consent
  "cookiebot.com": { company: "Cookiebot", category: "consent" },
  "onetrust.com": { company: "OneTrust", category: "consent" },
  "cookielaw.org": { company: "OneTrust", category: "consent" },

  // a/b testing
  "optimizely.com": { company: "Optimizely", category: "abtest" },
  "vwo.com": { company: "VWO", category: "abtest" },

  // fingerprinting
  "fingerprint.com": { company: "FingerprintJS", category: "fingerprinting" },
  "fpjs.io": { company: "FingerprintJS", category: "fingerprinting" },
  "fingerprintjs.com": { company: "FingerprintJS", category: "fingerprinting" },
};

// categories that count toward the "tracker" privacy tally / badge
export const TRACKING_CATEGORIES = new Set(["analytics", "ads", "social", "abtest", "fingerprinting"]);
