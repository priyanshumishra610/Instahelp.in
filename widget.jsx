import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION LAYER - JSON-driven, non-engineer editable
// ═══════════════════════════════════════════════════════════════

const CATEGORIES_CONFIG = {
  appliance_repair: {
    id: "appliance_repair",
    label: "Appliance Repair",
    icon: "🔧",
    keywords: ["ac", "air conditioner", "fridge", "refrigerator", "washing machine", "washer", "dryer", "microwave", "oven", "geyser", "water heater", "dishwasher", "chimney", "cooler", "purifier", "ro", "inverter", "ups", "fan", "mixer", "grinder", "iron"],
    patterns: ["not cooling", "not working", "making noise", "leaking", "broken", "repair", "fix", "service", "maintenance", "amc", "gas refill", "compressor", "thermostat", "motor", "not heating", "not spinning", "water leak", "dripping"],
    intents: { fix: 0.7, consult: 0.2, buy: 0.1 },
    urgencySignals: { high: ["urgent", "emergency", "immediately", "asap", "today", "now", "not working at all", "completely stopped"], medium: ["soon", "this week", "tomorrow"], low: ["when possible", "next week", "flexible", "sometime"] },
  },
  plumbing: {
    id: "plumbing",
    label: "Plumbing",
    icon: "🚿",
    keywords: ["plumber", "plumbing", "pipe", "tap", "faucet", "drain", "toilet", "commode", "bathroom", "sink", "water tank", "pipeline", "sewage", "gutter", "sump", "borewell"],
    patterns: ["leak", "leaking", "blocked", "clogged", "overflow", "no water", "low pressure", "burst", "broken pipe", "installation", "fitting", "repair"],
    intents: { fix: 0.8, consult: 0.1, buy: 0.1 },
    urgencySignals: { high: ["flooding", "burst", "overflow", "sewage", "emergency", "urgent"], medium: ["leak", "dripping", "slow"], low: ["install", "new", "upgrade"] },
  },
  electrical: {
    id: "electrical",
    label: "Electrical",
    icon: "⚡",
    keywords: ["electrician", "electrical", "wiring", "switch", "socket", "mcb", "circuit", "breaker", "light", "fan", "chandelier", "inverter", "generator", "earthing", "meter"],
    patterns: ["short circuit", "sparking", "no power", "tripping", "flickering", "not working", "installation", "repair", "rewiring"],
    intents: { fix: 0.7, consult: 0.15, buy: 0.15 },
    urgencySignals: { high: ["sparking", "short circuit", "no power", "fire", "burning smell", "emergency"], medium: ["flickering", "tripping", "not working"], low: ["install", "new", "upgrade", "rewiring"] },
  },
  cleaning: {
    id: "cleaning",
    label: "Cleaning & Housekeeping",
    icon: "🧹",
    keywords: ["cleaning", "clean", "maid", "housekeeper", "housekeeping", "domestic help", "servant", "bai", "cleaner", "deep clean", "sanitize", "pest", "cockroach", "termite", "bed bugs"],
    patterns: ["deep cleaning", "regular cleaning", "move in", "move out", "post construction", "sofa cleaning", "carpet cleaning", "bathroom cleaning", "kitchen cleaning", "pest control", "fumigation"],
    intents: { fix: 0.3, plan: 0.5, buy: 0.2 },
    urgencySignals: { high: ["today", "urgent", "immediately", "party tonight", "guests coming"], medium: ["this week", "weekend"], low: ["regular", "monthly", "weekly"] },
  },
  painting: {
    id: "painting",
    label: "Painting & Renovation",
    icon: "🎨",
    keywords: ["painting", "paint", "painter", "wall", "interior", "exterior", "waterproofing", "putty", "primer", "texture", "wallpaper", "renovation", "remodel", "carpenter", "carpentry", "furniture"],
    patterns: ["repaint", "new paint", "wall crack", "damp", "seepage", "waterproof", "polish", "modular kitchen", "wardrobe", "cabinet", "shelf"],
    intents: { plan: 0.5, fix: 0.3, buy: 0.2 },
    urgencySignals: { high: ["urgent", "emergency"], medium: ["next month", "soon"], low: ["planning", "thinking", "budget"] },
  },
  event_planning: {
    id: "event_planning",
    label: "Event Planning",
    icon: "🎉",
    keywords: ["party", "birthday", "wedding", "event", "celebration", "anniversary", "engagement", "reception", "ceremony", "function", "gathering", "decoration", "catering", "dj", "photographer"],
    patterns: ["plan", "organize", "arrange", "book", "decoration", "venue", "catering", "entertainment", "theme", "surprise"],
    intents: { plan: 0.7, buy: 0.2, consult: 0.1 },
    urgencySignals: { high: ["tomorrow", "this weekend", "today"], medium: ["next week", "next month"], low: ["few months", "next year", "planning ahead"] },
  },
  travel: {
    id: "travel",
    label: "Travel & Transport",
    icon: "✈️",
    keywords: ["travel", "trip", "flight", "hotel", "cab", "taxi", "bus", "train", "tour", "holiday", "vacation", "package", "visa", "passport", "itinerary", "resort"],
    patterns: ["book", "plan trip", "holiday", "weekend getaway", "honeymoon", "family trip", "budget trip", "luxury", "backpacking"],
    intents: { plan: 0.5, buy: 0.4, consult: 0.1 },
    urgencySignals: { high: ["today", "tomorrow", "emergency travel"], medium: ["next week", "this month"], low: ["planning", "exploring", "few months"] },
  },
  legal: {
    id: "legal",
    label: "Legal & Documentation",
    icon: "⚖️",
    keywords: ["lawyer", "legal", "advocate", "court", "agreement", "contract", "will", "power of attorney", "gst", "tax", "registration", "trademark", "copyright", "patent", "compliance", "rera"],
    patterns: ["draft", "review", "file", "register", "dispute", "notice", "complaint", "consultation", "advice"],
    intents: { consult: 0.6, fix: 0.2, plan: 0.2 },
    urgencySignals: { high: ["court date", "deadline", "notice received", "urgent"], medium: ["soon", "this month"], low: ["planning", "thinking about", "exploring"] },
  },
  tech_support: {
    id: "tech_support",
    label: "Tech & IT Support",
    icon: "💻",
    keywords: ["laptop", "computer", "phone", "mobile", "wifi", "internet", "router", "printer", "cctv", "camera", "software", "virus", "data", "website", "app", "email"],
    patterns: ["slow", "not working", "broken screen", "virus", "hack", "setup", "install", "configure", "repair", "recover", "format", "upgrade"],
    intents: { fix: 0.6, consult: 0.2, buy: 0.2 },
    urgencySignals: { high: ["not working", "crashed", "hacked", "urgent", "data loss"], medium: ["slow", "issue", "problem"], low: ["upgrade", "setup", "new"] },
  },
  health_wellness: {
    id: "health_wellness",
    label: "Health & Wellness",
    icon: "🏥",
    keywords: ["doctor", "nurse", "physiotherapy", "massage", "yoga", "dietitian", "salon", "spa", "beauty", "grooming", "haircut", "facial", "waxing", "manicure", "pedicure"],
    patterns: ["at home", "home visit", "appointment", "consultation", "therapy", "treatment", "session", "package"],
    intents: { plan: 0.4, buy: 0.3, consult: 0.3 },
    urgencySignals: { high: ["emergency", "pain", "today", "now"], medium: ["this week", "soon"], low: ["regular", "monthly", "exploring"] },
  },
};

const PRICING_CONFIG = {
  appliance_repair: { min: 300, max: 2500, unit: "per visit", confidence: "high", factors: ["type of appliance", "nature of repair", "parts needed"] },
  plumbing: { min: 200, max: 3000, unit: "per job", confidence: "high", factors: ["complexity", "materials", "location access"] },
  electrical: { min: 200, max: 5000, unit: "per job", confidence: "high", factors: ["wiring scope", "components", "safety requirements"] },
  cleaning: { min: 500, max: 8000, unit: "per session", confidence: "medium", factors: ["area size", "type of cleaning", "frequency"] },
  painting: { min: 5000, max: 80000, unit: "per project", confidence: "low", factors: ["area sqft", "paint quality", "prep work needed"] },
  event_planning: { min: 5000, max: 500000, unit: "per event", confidence: "low", factors: ["guest count", "venue", "services included"] },
  travel: { min: 2000, max: 200000, unit: "per person", confidence: "low", factors: ["destination", "duration", "accommodation tier"] },
  legal: { min: 1000, max: 50000, unit: "per consultation", confidence: "medium", factors: ["complexity", "urgency", "documentation"] },
  tech_support: { min: 300, max: 5000, unit: "per issue", confidence: "medium", factors: ["device type", "problem complexity", "parts"] },
  health_wellness: { min: 500, max: 10000, unit: "per session", confidence: "medium", factors: ["service type", "duration", "specialist level"] },
};

const SOLUTIONS_CONFIG = {
  concierge: { label: "InstaHelp Concierge", badge: "Recommended", trust: "Verified & Managed", timeEstimate: "Response in 30 min", description: "End-to-end handled by InstaHelp. Vetted professionals, quality guaranteed, single point of contact.", color: "#10b981" },
  marketplace: { label: "Vetted Local Experts", badge: "Compare & Choose", trust: "Background Verified", timeEstimate: "Get 3 quotes in 2 hrs", description: "Browse verified local service providers. Compare ratings, prices and reviews.", color: "#3b82f6" },
  diy: { label: "DIY / Self-Service", badge: "Save Money", trust: "Community Rated", timeEstimate: "Start immediately", description: "Guides, tutorials and product links to handle it yourself.", color: "#8b5cf6" },
};

const POPULAR_QUERIES = [
  { text: "AC not cooling", icon: "❄️" },
  { text: "Need a maid urgently", icon: "🧹" },
  { text: "Plan birthday party", icon: "🎂" },
  { text: "Laptop repair", icon: "💻" },
  { text: "Plumber for leak", icon: "🚿" },
  { text: "Deep home cleaning", icon: "🏠" },
  { text: "Electrician needed", icon: "⚡" },
  { text: "Pest control", icon: "🐛" },
];

const BANGALORE_AREAS = [
  "Koramangala", "Indiranagar", "HSR Layout", "Whitefield", "Electronic City",
  "Jayanagar", "JP Nagar", "Marathahalli", "Bellandur", "Sarjapur Road",
  "BTM Layout", "Hebbal", "Yelahanka", "Banashankari", "Rajajinagar",
  "Malleshwaram", "Basavanagudi", "MG Road", "Brigade Road", "Bannerghatta Road",
];

// ═══════════════════════════════════════════════════════════════
// NLP / CLASSIFICATION ENGINE
// ═══════════════════════════════════════════════════════════════

function classifyQuery(query) {
  const q = query.toLowerCase().trim();
  if (!q) return null;

  const scores = {};

  Object.entries(CATEGORIES_CONFIG).forEach(([catId, cat]) => {
    let score = 0;

    // Keyword matching (weighted)
    cat.keywords.forEach((kw) => {
      if (q.includes(kw)) score += 3;
    });

    // Pattern matching (weighted higher for specificity)
    cat.patterns.forEach((pat) => {
      if (q.includes(pat)) score += 5;
    });

    // Bigram proximity boost
    const words = q.split(/\s+/);
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = words[i] + " " + words[i + 1];
      cat.keywords.forEach((kw) => {
        if (bigram.includes(kw) || kw.includes(bigram)) score += 2;
      });
      cat.patterns.forEach((pat) => {
        if (bigram.includes(pat) || pat.includes(bigram)) score += 3;
      });
    }

    if (score > 0) scores[catId] = score;
  });

  if (Object.keys(scores).length === 0) {
    // Fallback: fuzzy match on individual words
    const words = q.split(/\s+/);
    words.forEach((word) => {
      if (word.length < 3) return;
      Object.entries(CATEGORIES_CONFIG).forEach(([catId, cat]) => {
        cat.keywords.forEach((kw) => {
          if (kw.startsWith(word) || word.startsWith(kw.slice(0, 3))) {
            scores[catId] = (scores[catId] || 0) + 1;
          }
        });
      });
    });
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return { category: "general", intent: "consult", urgency: "medium", confidence: 0.3 };

  const topCat = sorted[0][0];
  const cat = CATEGORIES_CONFIG[topCat];

  // Determine intent
  let intent = "fix";
  const intentScores = { fix: 0, plan: 0, buy: 0, consult: 0 };
  const intentKeywords = {
    fix: ["repair", "fix", "broken", "not working", "issue", "problem", "leak", "noise", "service"],
    plan: ["plan", "organize", "arrange", "book", "setup", "schedule", "prepare"],
    buy: ["buy", "purchase", "order", "get", "need", "want", "install new", "replace"],
    consult: ["advice", "consult", "help", "guide", "suggest", "recommend", "how to", "what should"],
  };

  Object.entries(intentKeywords).forEach(([int, keywords]) => {
    keywords.forEach((kw) => {
      if (q.includes(kw)) intentScores[int] += 2;
    });
  });

  // Apply category default intent weights
  Object.entries(cat.intents).forEach(([int, weight]) => {
    intentScores[int] += weight * 3;
  });

  intent = Object.entries(intentScores).sort((a, b) => b[1] - a[1])[0][0];

  // Determine urgency
  let urgency = "medium";
  let urgencyScore = { high: 0, medium: 0, low: 0 };

  Object.entries(cat.urgencySignals).forEach(([level, signals]) => {
    signals.forEach((signal) => {
      if (q.includes(signal)) urgencyScore[level] += 3;
    });
  });

  // Generic urgency signals
  if (q.match(/\b(urgent|asap|emergency|now|immediately|today)\b/)) urgencyScore.high += 5;
  if (q.match(/\b(soon|this week|tomorrow)\b/)) urgencyScore.medium += 3;
  if (q.match(/\b(whenever|flexible|no rush|planning)\b/)) urgencyScore.low += 3;

  urgency = Object.entries(urgencyScore).sort((a, b) => b[1] - a[1])[0][0];
  if (urgencyScore.high === 0 && urgencyScore.medium === 0 && urgencyScore.low === 0) urgency = "medium";

  const maxScore = sorted[0][1];
  const confidence = Math.min(0.95, 0.3 + maxScore * 0.08);

  return {
    category: topCat,
    categoryLabel: cat.label,
    categoryIcon: cat.icon,
    intent,
    urgency,
    confidence,
    alternateCategories: sorted.slice(1, 3).map(([id]) => ({
      id,
      label: CATEGORIES_CONFIG[id].label,
      icon: CATEGORIES_CONFIG[id].icon,
    })),
  };
}

function getAutosuggestions(query) {
  const q = query.toLowerCase().trim();
  if (q.length < 2) return [];

  const suggestions = [];
  Object.values(CATEGORIES_CONFIG).forEach((cat) => {
    cat.keywords.forEach((kw) => {
      if (kw.includes(q) || q.includes(kw)) {
        cat.patterns.forEach((pat) => {
          const suggestion = `${kw} ${pat}`;
          if (suggestion.includes(q) && !suggestions.includes(suggestion)) {
            suggestions.push(suggestion);
          }
        });
      }
    });
  });

  return suggestions.slice(0, 5);
}

function getPricingEstimate(categoryId, urgency) {
  const pricing = PRICING_CONFIG[categoryId] || PRICING_CONFIG.appliance_repair;
  let multiplier = 1;
  if (urgency === "high") multiplier = 1.3;
  if (urgency === "low") multiplier = 0.85;

  return {
    min: Math.round(pricing.min * multiplier),
    max: Math.round(pricing.max * multiplier),
    unit: pricing.unit,
    confidence: pricing.confidence,
    factors: pricing.factors,
  };
}

function getSolutions(classification, query) {
  if (!classification) return [];

  const solutions = [
    {
      ...SOLUTIONS_CONFIG.concierge,
      type: "concierge",
      priceModifier: "Best value",
      priority: 1,
      monetization: { type: "commission", rate: "15-25%", model: "concierge_upsell" },
    },
    {
      ...SOLUTIONS_CONFIG.marketplace,
      type: "marketplace",
      priceModifier: "Varies",
      priority: 2,
      monetization: { type: "lead_fee", rate: "₹50-200/lead", model: "vendor_routing" },
    },
    {
      ...SOLUTIONS_CONFIG.diy,
      type: "diy",
      priceModifier: "Lowest cost",
      priority: 3,
      monetization: { type: "affiliate", rate: "5-12%", model: "product_links" },
    },
  ];

  // Adjust priority based on category
  if (["travel", "event_planning"].includes(classification.category)) {
    solutions[0].priority = 1;
    solutions[2].priority = 2;
    solutions[1].priority = 3;
  }

  if (classification.urgency === "high") {
    solutions[0].timeEstimate = "Response in 15 min";
    solutions[0].badge = "Fastest Option";
  }

  return solutions.sort((a, b) => a.priority - b.priority);
}

function generateWhatsAppLink(query, location) {
  const phone = "917022702220"; // Replace with actual InstaHelp number
  const message = encodeURIComponent(
    `Hi InstaHelp! I need help with: ${query}${location ? ` in ${location}` : ""}\n\nPlease assist me.`
  );
  return `https://wa.me/${phone}?text=${message}`;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

const FONT_URL = "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=Space+Mono:wght@400;700&display=swap";

export default function InstaHelpWidget() {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [urgency, setUrgency] = useState("auto");
  const [classification, setClassification] = useState(null);
  const [pricing, setPricing] = useState(null);
  const [solutions, setSolutions] = useState([]);
  const [autosuggestions, setAutosuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [activeTab, setActiveTab] = useState("solutions");
  const [expandedSolution, setExpandedSolution] = useState(null);
  const [callbackRequested, setCallbackRequested] = useState(false);
  const [quotesRequested, setQuotesRequested] = useState(false);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);
  const suggestionsRef = useRef(null);

  useEffect(() => {
    const link = document.createElement("link");
    link.href = FONT_URL;
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  const handleQueryChange = useCallback((value) => {
    setQuery(value);
    if (value.length >= 2) {
      const sugg = getAutosuggestions(value);
      setAutosuggestions(sugg);
      setShowSuggestions(sugg.length > 0);
    } else {
      setAutosuggestions([]);
      setShowSuggestions(false);
    }
  }, []);

  const handleLocationChange = useCallback((value) => {
    setLocation(value);
    if (value.length >= 2) {
      const filtered = BANGALORE_AREAS.filter((a) =>
        a.toLowerCase().includes(value.toLowerCase())
      );
      setLocationSuggestions(filtered.slice(0, 5));
    } else {
      setLocationSuggestions([]);
    }
  }, []);

  const analyze = useCallback((q) => {
    const queryToAnalyze = q || query;
    if (!queryToAnalyze.trim()) return;

    setIsAnalyzing(true);
    setShowSuggestions(false);
    setCallbackRequested(false);
    setQuotesRequested(false);

    // Simulate brief processing delay for UX
    setTimeout(() => {
      const result = classifyQuery(queryToAnalyze);
      setClassification(result);

      if (result) {
        const urg = urgency === "auto" ? result.urgency : urgency;
        const price = getPricingEstimate(result.category, urg);
        setPricing(price);
        const sols = getSolutions(result, queryToAnalyze);
        setSolutions(sols);
      }

      setIsAnalyzing(false);
      setShowResults(true);

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }, 600);
  }, [query, urgency]);

  const handleSubmit = (e) => {
    e?.preventDefault?.();
    analyze();
  };

  const selectSuggestion = (text) => {
    setQuery(text);
    setShowSuggestions(false);
    analyze(text);
  };

  const selectPopularQuery = (text) => {
    setQuery(text);
    analyze(text);
  };

  const urgencyLabel = { high: "Urgent", medium: "Normal", low: "Flexible", auto: "Auto-detect" };
  const urgencyColors = { high: "#ef4444", medium: "#f59e0b", low: "#10b981", auto: "#6b7280" };
  const confidenceLabels = { high: "Reliable estimate", medium: "Approximate range", low: "Rough estimate" };
  const confidenceColors = { high: "#10b981", medium: "#f59e0b", low: "#ef4444" };

  const effectiveUrgency = urgency === "auto" ? classification?.urgency || "medium" : urgency;
  const whatsappLink = generateWhatsAppLink(query, location);

  return (
    <div style={styles.root}>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); max-height: 0; }
          to { opacity: 1; transform: translateY(0); max-height: 500px; }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        * { box-sizing: border-box; }
        input:focus, button:focus { outline: none; }
        ::selection { background: #25d36620; color: #0f1f12; }
      `}</style>

      {/* ── HEADER ── */}
      <div style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.logoRow}>
            <div style={styles.logoMark}>
              <span style={{ fontSize: 20 }}>⚡</span>
            </div>
            <div>
              <div style={styles.logoText}>InstaHelp</div>
              <div style={styles.tagline}>Fix any problem. Instantly.</div>
            </div>
          </div>
          <div style={styles.liveIndicator}>
            <span style={styles.liveDot} />
            <span style={styles.liveText}>Live</span>
          </div>
        </div>
      </div>

      {/* ── INPUT SECTION ── */}
      <div style={styles.inputSection}>
        <div style={styles.inputLabel}>What do you need help with?</div>

        <div style={styles.inputWrapper}>
          <div style={styles.inputIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#25d366" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <input
            ref={inputRef}
            style={styles.input}
            placeholder='Try "AC not cooling" or "plan birthday party"'
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit(e)}
            onFocus={() => autosuggestions.length > 0 && setShowSuggestions(true)}
          />
          {query && (
            <button style={styles.clearBtn} onClick={() => { setQuery(""); setShowResults(false); setClassification(null); inputRef.current?.focus(); }}>
              ×
            </button>
          )}
        </div>

        {/* Autosuggestions */}
        {showSuggestions && autosuggestions.length > 0 && (
          <div ref={suggestionsRef} style={styles.suggestionsDropdown}>
            {autosuggestions.map((s, i) => (
              <button key={i} style={styles.suggestionItem} onClick={() => selectSuggestion(s)}
                onMouseEnter={(e) => { e.target.style.background = "#f0fdf4"; }}
                onMouseLeave={(e) => { e.target.style.background = "transparent"; }}>
                <span style={{ color: "#9ca3af", marginRight: 10 }}>↗</span>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Options row */}
        <div style={styles.optionsRow}>
          <button
            style={{ ...styles.optionPill, ...(showLocationInput ? styles.optionPillActive : {}) }}
            onClick={() => setShowLocationInput(!showLocationInput)}
          >
            📍 {location || "Add location"}
          </button>

          <div style={styles.urgencySelector}>
            {["auto", "high", "medium", "low"].map((u) => (
              <button
                key={u}
                style={{
                  ...styles.urgencyBtn,
                  ...(urgency === u ? { background: urgencyColors[u] + "18", color: urgencyColors[u], borderColor: urgencyColors[u] + "40", fontWeight: 600 } : {}),
                }}
                onClick={() => setUrgency(u)}
              >
                {u === "high" && "🔴 "}{u === "medium" && "🟡 "}{u === "low" && "🟢 "}
                {urgencyLabel[u]}
              </button>
            ))}
          </div>
        </div>

        {/* Location input */}
        {showLocationInput && (
          <div style={styles.locationInputWrapper}>
            <input
              style={styles.locationInput}
              placeholder="Enter area (e.g., Koramangala, HSR Layout)"
              value={location}
              onChange={(e) => handleLocationChange(e.target.value)}
            />
            {locationSuggestions.length > 0 && (
              <div style={styles.locationSuggestions}>
                {locationSuggestions.map((area, i) => (
                  <button key={i} style={styles.locationSuggItem} onClick={() => { setLocation(area); setLocationSuggestions([]); }}
                    onMouseEnter={(e) => { e.target.style.background = "#f0fdf4"; }}
                    onMouseLeave={(e) => { e.target.style.background = "transparent"; }}>
                    📍 {area}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Submit button */}
        <button style={styles.submitBtn} onClick={handleSubmit} disabled={!query.trim() || isAnalyzing}>
          {isAnalyzing ? (
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ animation: "pulse 1s infinite" }}>⚡</span> Analyzing your request...
            </span>
          ) : (
            "Find Solutions →"
          )}
        </button>

        {/* Popular queries */}
        {!showResults && (
          <div style={styles.popularSection}>
            <div style={styles.popularLabel}>Popular right now</div>
            <div style={styles.popularGrid}>
              {POPULAR_QUERIES.map((pq, i) => (
                <button key={i} style={{ ...styles.popularChip, animationDelay: `${i * 0.05}s` }}
                  onClick={() => selectPopularQuery(pq.text)}
                  onMouseEnter={(e) => { e.target.style.borderColor = "#25d366"; e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = "0 4px 12px rgba(37,211,102,0.15)"; }}
                  onMouseLeave={(e) => { e.target.style.borderColor = "#e5e7eb"; e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = "none"; }}>
                  <span>{pq.icon}</span> {pq.text}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── RESULTS SECTION ── */}
      {showResults && classification && (
        <div ref={resultsRef} style={styles.resultsSection}>

          {/* Classification card */}
          <div style={styles.classificationCard}>
            <div style={styles.classRow}>
              <div style={styles.classIconBox}>
                <span style={{ fontSize: 28 }}>{classification.categoryIcon || "🔍"}</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={styles.classCategory}>{classification.categoryLabel || "General Assistance"}</div>
                <div style={styles.classMeta}>
                  <span style={styles.classTag}>
                    {classification.intent === "fix" && "🔧 Repair/Fix"}
                    {classification.intent === "plan" && "📋 Planning"}
                    {classification.intent === "buy" && "🛒 Purchase"}
                    {classification.intent === "consult" && "💬 Consultation"}
                  </span>
                  <span style={{ ...styles.classTag, background: urgencyColors[effectiveUrgency] + "15", color: urgencyColors[effectiveUrgency], borderColor: urgencyColors[effectiveUrgency] + "30" }}>
                    {effectiveUrgency === "high" && "🔴 Urgent"}
                    {effectiveUrgency === "medium" && "🟡 Normal"}
                    {effectiveUrgency === "low" && "🟢 Flexible"}
                  </span>
                  <span style={{ ...styles.classTag, background: "#f3f4f6", color: "#6b7280" }}>
                    {Math.round(classification.confidence * 100)}% match
                  </span>
                </div>
              </div>
            </div>
            {classification.alternateCategories?.length > 0 && (
              <div style={styles.altCats}>
                <span style={{ color: "#9ca3af", fontSize: 12 }}>Also related:</span>
                {classification.alternateCategories.map((ac, i) => (
                  <span key={i} style={styles.altCatChip}>{ac.icon} {ac.label}</span>
                ))}
              </div>
            )}
          </div>

          {/* Tab navigation */}
          <div style={styles.tabNav}>
            {[
              { id: "solutions", label: "Solutions", icon: "✨" },
              { id: "pricing", label: "Est. Cost", icon: "💰" },
              { id: "action", label: "Get Help", icon: "🚀" },
            ].map((tab) => (
              <button
                key={tab.id}
                style={{ ...styles.tab, ...(activeTab === tab.id ? styles.tabActive : {}) }}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={styles.tabContent}>

            {/* Solutions tab */}
            {activeTab === "solutions" && (
              <div style={{ animation: "fadeInUp 0.3s ease" }}>
                <div style={styles.sectionTitle}>Best Way to Solve This</div>
                <div style={styles.solutionsGrid}>
                  {solutions.map((sol, i) => (
                    <div key={i}
                      style={{ ...styles.solutionCard, animationDelay: `${i * 0.1}s`, borderColor: expandedSolution === i ? sol.color + "50" : "#e5e7eb", boxShadow: expandedSolution === i ? `0 0 0 1px ${sol.color}20, 0 8px 25px ${sol.color}10` : "0 1px 3px rgba(0,0,0,0.04)" }}
                      onClick={() => setExpandedSolution(expandedSolution === i ? null : i)}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = sol.color + "50"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                      onMouseLeave={(e) => { if (expandedSolution !== i) e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.transform = "translateY(0)"; }}
                    >
                      <div style={styles.solHeader}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                          <div style={{ ...styles.solRank, background: sol.color + "15", color: sol.color }}>{i + 1}</div>
                          <div>
                            <div style={styles.solLabel}>{sol.label}</div>
                            <div style={styles.solTime}>{sol.timeEstimate}</div>
                          </div>
                        </div>
                        <div style={{ ...styles.solBadge, background: sol.color + "12", color: sol.color, borderColor: sol.color + "25" }}>
                          {sol.badge}
                        </div>
                      </div>

                      <div style={styles.solTrust}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill={sol.color} stroke="none">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        <span>{sol.trust}</span>
                      </div>

                      {expandedSolution === i && (
                        <div style={{ ...styles.solExpanded, animation: "fadeInUp 0.2s ease" }}>
                          <p style={styles.solDesc}>{sol.description}</p>
                          <div style={styles.solPriceTag}>{sol.priceModifier}</div>
                          {sol.type === "concierge" && (
                            <a href={whatsappLink} target="_blank" rel="noopener noreferrer" style={styles.solCTA}>
                              Chat on WhatsApp →
                            </a>
                          )}
                          {sol.type === "marketplace" && (
                            <button style={{ ...styles.solCTA, background: "#3b82f6" }}
                              onClick={(e) => { e.stopPropagation(); setQuotesRequested(true); }}>
                              {quotesRequested ? "✓ Quotes Requested!" : "Get 3 Quotes →"}
                            </button>
                          )}
                          {sol.type === "diy" && (
                            <button style={{ ...styles.solCTA, background: "#8b5cf6" }}
                              onClick={(e) => e.stopPropagation()}>
                              View DIY Guides →
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pricing tab */}
            {activeTab === "pricing" && pricing && (
              <div style={{ animation: "fadeInUp 0.3s ease" }}>
                <div style={styles.sectionTitle}>Expected Cost</div>
                <div style={styles.pricingCard}>
                  <div style={styles.priceRange}>
                    <div style={styles.priceLabel}>Estimated Range</div>
                    <div style={styles.priceValues}>
                      <span style={styles.priceMin}>₹{pricing.min.toLocaleString("en-IN")}</span>
                      <span style={styles.priceDash}>-</span>
                      <span style={styles.priceMax}>₹{pricing.max.toLocaleString("en-IN")}</span>
                    </div>
                    <div style={styles.priceUnit}>{pricing.unit}</div>
                  </div>

                  {/* Visual bar */}
                  <div style={styles.priceBar}>
                    <div style={styles.priceBarTrack}>
                      <div style={{ ...styles.priceBarFill, width: "60%", background: `linear-gradient(90deg, #10b981, #f59e0b, #ef4444)` }} />
                    </div>
                    <div style={styles.priceBarLabels}>
                      <span>Budget</span>
                      <span>Average</span>
                      <span>Premium</span>
                    </div>
                  </div>

                  {/* Confidence */}
                  <div style={styles.confidenceRow}>
                    <div style={{ ...styles.confidenceDot, background: confidenceColors[pricing.confidence] }} />
                    <span style={{ color: confidenceColors[pricing.confidence], fontWeight: 600 }}>
                      {confidenceLabels[pricing.confidence]}
                    </span>
                  </div>

                  {/* Factors */}
                  <div style={styles.factorsSection}>
                    <div style={styles.factorsTitle}>Price depends on:</div>
                    <div style={styles.factorsList}>
                      {pricing.factors.map((f, i) => (
                        <span key={i} style={styles.factorChip}>
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>

                  {urgency === "high" && (
                    <div style={styles.urgencySurcharge}>
                      ⚡ Urgent requests may include a 20-30% surcharge for immediate availability
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action tab */}
            {activeTab === "action" && (
              <div style={{ animation: "fadeInUp 0.3s ease" }}>
                <div style={styles.sectionTitle}>Get Help Now</div>

                {/* Primary CTA - WhatsApp */}
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer" style={styles.whatsappCTA}>
                  <div style={styles.waCTAContent}>
                    <div style={styles.waIcon}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                    </div>
                    <div>
                      <div style={styles.waCTATitle}>Chat with InstaHelp</div>
                      <div style={styles.waCTASub}>Get instant help on WhatsApp - typically responds in 5 minutes</div>
                    </div>
                  </div>
                  <div style={styles.waCTAArrow}>→</div>
                </a>

                {/* Secondary CTAs */}
                <div style={styles.secondaryCTAs}>
                  <button
                    style={{ ...styles.secondaryCTA, ...(quotesRequested ? { borderColor: "#10b981", background: "#f0fdf4" } : {}) }}
                    onClick={() => setQuotesRequested(true)}
                  >
                    <div style={styles.secCTAIcon}>📋</div>
                    <div>
                      <div style={styles.secCTATitle}>{quotesRequested ? "✓ Quotes Requested!" : "Get 3 Free Quotes"}</div>
                      <div style={styles.secCTASub}>Compare prices from verified providers</div>
                    </div>
                  </button>

                  <button
                    style={{ ...styles.secondaryCTA, ...(callbackRequested ? { borderColor: "#10b981", background: "#f0fdf4" } : {}) }}
                    onClick={() => setCallbackRequested(true)}
                  >
                    <div style={styles.secCTAIcon}>📞</div>
                    <div>
                      <div style={styles.secCTATitle}>{callbackRequested ? "✓ We'll call you shortly!" : "Request Callback"}</div>
                      <div style={styles.secCTASub}>Our team will call within 30 minutes</div>
                    </div>
                  </button>
                </div>

                {/* Trust signals */}
                <div style={styles.trustBar}>
                  {[
                    { icon: "🛡️", text: "Verified Pros" },
                    { icon: "💰", text: "Best Price Guarantee" },
                    { icon: "⭐", text: "4.8/5 Rating" },
                    { icon: "🔄", text: "100% Satisfaction" },
                  ].map((t, i) => (
                    <div key={i} style={styles.trustItem}>
                      <span>{t.icon}</span>
                      <span style={styles.trustText}>{t.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sticky WhatsApp CTA (always visible in results) */}
          {activeTab !== "action" && (
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer" style={styles.stickyWA}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Chat on WhatsApp
            </a>
          )}

          {/* Footer */}
          <div style={styles.footer}>
            <div style={styles.footerText}>
              Powered by <strong>InstaHelp</strong> · Bangalore's trusted concierge since 2015
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

const styles = {
  root: {
    fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    maxWidth: 480,
    margin: "0 auto",
    background: "#ffffff",
    minHeight: "100vh",
    color: "#111827",
    position: "relative",
  },
  header: {
    background: "linear-gradient(135deg, #0f1f12 0%, #162a1a 50%, #1a3320 100%)",
    padding: "0",
    position: "relative",
    overflow: "hidden",
  },
  headerInner: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    position: "relative",
    zIndex: 1,
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  logoMark: {
    width: 38,
    height: 38,
    borderRadius: 10,
    background: "linear-gradient(135deg, #25d366, #128c7e)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 8px rgba(37,211,102,0.3)",
  },
  logoText: {
    fontSize: 20,
    fontWeight: 700,
    color: "#ffffff",
    letterSpacing: "-0.02em",
  },
  tagline: {
    fontSize: 12,
    color: "#8bbc94",
    fontWeight: 400,
    letterSpacing: "0.02em",
  },
  liveIndicator: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "rgba(37,211,102,0.12)",
    padding: "6px 12px",
    borderRadius: 20,
    border: "1px solid rgba(37,211,102,0.2)",
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#25d366",
    animation: "pulse 2s infinite",
    display: "block",
  },
  liveText: {
    fontSize: 12,
    color: "#25d366",
    fontWeight: 600,
    letterSpacing: "0.05em",
  },
  inputSection: {
    padding: "24px 20px 20px",
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 12,
    letterSpacing: "-0.01em",
  },
  inputWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  inputIcon: {
    position: "absolute",
    left: 14,
    zIndex: 1,
    display: "flex",
    alignItems: "center",
  },
  input: {
    width: "100%",
    padding: "14px 42px 14px 44px",
    fontSize: 15,
    border: "2px solid #e5e7eb",
    borderRadius: 14,
    background: "#fafafa",
    color: "#111827",
    transition: "all 0.2s ease",
    fontFamily: "inherit",
  },
  clearBtn: {
    position: "absolute",
    right: 12,
    width: 28,
    height: 28,
    borderRadius: "50%",
    border: "none",
    background: "#f3f4f6",
    color: "#9ca3af",
    fontSize: 18,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
  },
  suggestionsDropdown: {
    background: "white",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    marginTop: 4,
    boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
    overflow: "hidden",
    animation: "slideDown 0.2s ease",
  },
  suggestionItem: {
    width: "100%",
    padding: "12px 16px",
    border: "none",
    background: "transparent",
    textAlign: "left",
    fontSize: 14,
    color: "#374151",
    cursor: "pointer",
    transition: "background 0.15s",
    fontFamily: "inherit",
    display: "flex",
    alignItems: "center",
  },
  optionsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
    alignItems: "center",
  },
  optionPill: {
    padding: "7px 14px",
    borderRadius: 20,
    border: "1.5px solid #e5e7eb",
    background: "white",
    fontSize: 13,
    color: "#6b7280",
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all 0.2s",
    fontWeight: 500,
  },
  optionPillActive: {
    borderColor: "#25d366",
    background: "#f0fdf4",
    color: "#15803d",
  },
  urgencySelector: {
    display: "flex",
    gap: 4,
    flexWrap: "wrap",
  },
  urgencyBtn: {
    padding: "6px 10px",
    borderRadius: 8,
    border: "1.5px solid #e5e7eb",
    background: "white",
    fontSize: 12,
    color: "#6b7280",
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all 0.15s",
    fontWeight: 500,
    whiteSpace: "nowrap",
  },
  locationInputWrapper: {
    marginTop: 10,
    animation: "slideDown 0.2s ease",
    position: "relative",
  },
  locationInput: {
    width: "100%",
    padding: "12px 16px",
    fontSize: 14,
    border: "2px solid #e5e7eb",
    borderRadius: 12,
    background: "#fafafa",
    color: "#111827",
    fontFamily: "inherit",
  },
  locationSuggestions: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    background: "white",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    marginTop: 4,
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    zIndex: 10,
  },
  locationSuggItem: {
    width: "100%",
    padding: "10px 16px",
    border: "none",
    background: "transparent",
    textAlign: "left",
    fontSize: 13,
    color: "#374151",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  submitBtn: {
    width: "100%",
    padding: "15px",
    marginTop: 16,
    borderRadius: 14,
    border: "none",
    background: "linear-gradient(135deg, #0f1f12, #1a3320)",
    color: "white",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all 0.2s",
    letterSpacing: "-0.01em",
  },
  popularSection: {
    marginTop: 28,
  },
  popularLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: 12,
  },
  popularGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  popularChip: {
    padding: "8px 14px",
    borderRadius: 10,
    border: "1.5px solid #e5e7eb",
    background: "white",
    fontSize: 13,
    color: "#374151",
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontWeight: 500,
    animation: "fadeInUp 0.3s ease both",
  },
  resultsSection: {
    padding: "0 20px 100px",
    animation: "fadeInUp 0.4s ease",
  },
  classificationCard: {
    background: "linear-gradient(135deg, #f0fdf4, #ecfdf5)",
    border: "1.5px solid #bbf7d0",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    animation: "scaleIn 0.3s ease",
  },
  classRow: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  classIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    background: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  },
  classCategory: {
    fontSize: 17,
    fontWeight: 700,
    color: "#111827",
    letterSpacing: "-0.02em",
    marginBottom: 6,
  },
  classMeta: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
  },
  classTag: {
    padding: "3px 9px",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    background: "#dbeafe",
    color: "#2563eb",
    border: "1px solid #bfdbfe",
    letterSpacing: "0.01em",
  },
  altCats: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTop: "1px solid #bbf7d020",
    flexWrap: "wrap",
  },
  altCatChip: {
    padding: "3px 10px",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 500,
    background: "white",
    color: "#6b7280",
    border: "1px solid #e5e7eb",
  },
  tabNav: {
    display: "flex",
    gap: 4,
    background: "#f3f4f6",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    padding: "10px 8px",
    borderRadius: 10,
    border: "none",
    background: "transparent",
    fontSize: 13,
    fontWeight: 500,
    color: "#6b7280",
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all 0.2s",
    textAlign: "center",
  },
  tabActive: {
    background: "white",
    color: "#111827",
    fontWeight: 600,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  },
  tabContent: {
    minHeight: 200,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#111827",
    marginBottom: 14,
    letterSpacing: "-0.02em",
  },
  solutionsGrid: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  solutionCard: {
    border: "1.5px solid #e5e7eb",
    borderRadius: 14,
    padding: 16,
    cursor: "pointer",
    transition: "all 0.2s ease",
    background: "white",
    animation: "fadeInUp 0.3s ease both",
  },
  solHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  solRank: {
    width: 30,
    height: 30,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    fontWeight: 700,
    flexShrink: 0,
  },
  solLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: "#111827",
    letterSpacing: "-0.01em",
  },
  solTime: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 2,
  },
  solBadge: {
    padding: "4px 10px",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    border: "1px solid",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  solTrust: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    fontSize: 12,
    color: "#6b7280",
    fontWeight: 500,
  },
  solExpanded: {
    marginTop: 14,
    paddingTop: 14,
    borderTop: "1px solid #f3f4f6",
  },
  solDesc: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 1.5,
    margin: "0 0 12px 0",
  },
  solPriceTag: {
    fontSize: 12,
    fontWeight: 600,
    color: "#15803d",
    background: "#f0fdf4",
    padding: "4px 10px",
    borderRadius: 6,
    display: "inline-block",
    marginBottom: 12,
  },
  solCTA: {
    display: "block",
    width: "100%",
    padding: "11px",
    borderRadius: 10,
    border: "none",
    background: "#25d366",
    color: "white",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    textAlign: "center",
    textDecoration: "none",
    fontFamily: "inherit",
    transition: "opacity 0.2s",
  },
  pricingCard: {
    background: "white",
    border: "1.5px solid #e5e7eb",
    borderRadius: 16,
    padding: 20,
  },
  priceRange: {
    textAlign: "center",
    marginBottom: 20,
  },
  priceLabel: {
    fontSize: 13,
    color: "#9ca3af",
    fontWeight: 500,
    marginBottom: 8,
  },
  priceValues: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "center",
    gap: 10,
  },
  priceMin: {
    fontSize: 28,
    fontWeight: 700,
    color: "#10b981",
    fontFamily: "'Space Mono', monospace",
    letterSpacing: "-0.02em",
  },
  priceDash: {
    fontSize: 20,
    color: "#d1d5db",
  },
  priceMax: {
    fontSize: 28,
    fontWeight: 700,
    color: "#ef4444",
    fontFamily: "'Space Mono', monospace",
    letterSpacing: "-0.02em",
  },
  priceUnit: {
    fontSize: 13,
    color: "#9ca3af",
    marginTop: 4,
  },
  priceBar: {
    marginBottom: 16,
  },
  priceBarTrack: {
    height: 6,
    background: "#f3f4f6",
    borderRadius: 3,
    overflow: "hidden",
  },
  priceBarFill: {
    height: "100%",
    borderRadius: 3,
    transition: "width 0.6s ease",
  },
  priceBarLabels: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 6,
    fontWeight: 500,
  },
  confidenceRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    fontSize: 13,
  },
  confidenceDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
  },
  factorsSection: {
    marginBottom: 12,
  },
  factorsTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: "#6b7280",
    marginBottom: 8,
  },
  factorsList: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
  },
  factorChip: {
    padding: "5px 10px",
    borderRadius: 6,
    fontSize: 12,
    background: "#f3f4f6",
    color: "#6b7280",
    fontWeight: 500,
  },
  urgencySurcharge: {
    fontSize: 12,
    color: "#f59e0b",
    background: "#fffbeb",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #fde68a",
    marginTop: 8,
    fontWeight: 500,
  },
  whatsappCTA: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "linear-gradient(135deg, #25d366, #128c7e)",
    borderRadius: 16,
    padding: "18px 20px",
    textDecoration: "none",
    marginBottom: 14,
    transition: "all 0.2s",
    boxShadow: "0 4px 15px rgba(37,211,102,0.25)",
    animation: "float 3s ease-in-out infinite",
  },
  waCTAContent: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  waIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    background: "rgba(255,255,255,0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  waCTATitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "white",
    letterSpacing: "-0.01em",
  },
  waCTASub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
    marginTop: 3,
    lineHeight: 1.3,
  },
  waCTAArrow: {
    fontSize: 24,
    color: "white",
    fontWeight: 700,
  },
  secondaryCTAs: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    marginBottom: 20,
  },
  secondaryCTA: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "14px 16px",
    borderRadius: 14,
    border: "1.5px solid #e5e7eb",
    background: "white",
    cursor: "pointer",
    fontFamily: "inherit",
    textAlign: "left",
    transition: "all 0.2s",
    width: "100%",
  },
  secCTAIcon: {
    fontSize: 24,
    width: 44,
    height: 44,
    borderRadius: 12,
    background: "#f3f4f6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  secCTATitle: {
    fontSize: 14,
    fontWeight: 600,
    color: "#111827",
    letterSpacing: "-0.01em",
  },
  secCTASub: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 2,
  },
  trustBar: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
  },
  trustItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 12px",
    borderRadius: 10,
    background: "#f9fafb",
    border: "1px solid #f3f4f6",
  },
  trustText: {
    fontSize: 12,
    fontWeight: 500,
    color: "#6b7280",
  },
  stickyWA: {
    position: "fixed",
    bottom: 20,
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "14px 28px",
    borderRadius: 50,
    background: "#25d366",
    color: "white",
    fontSize: 15,
    fontWeight: 600,
    textDecoration: "none",
    boxShadow: "0 4px 20px rgba(37,211,102,0.35), 0 0 0 4px rgba(37,211,102,0.1)",
    zIndex: 100,
    transition: "all 0.2s",
    fontFamily: "'DM Sans', sans-serif",
    animation: "float 3s ease-in-out infinite",
    maxWidth: 440,
  },
  footer: {
    textAlign: "center",
    padding: "24px 0 16px",
    borderTop: "1px solid #f3f4f6",
    marginTop: 24,
  },
  footerText: {
    fontSize: 12,
    color: "#9ca3af",
  },
};