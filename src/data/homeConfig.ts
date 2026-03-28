// src/data/homeConfig.ts

export const SITE_NAME = "AIExpertsCorner";
export const SITE_URL  = "https://aiexpertscorner.com";
export const SITE_DESC = "The most complete AI tools directory. Browse 19,000+ AI tools, compare pricing and find the best tool for any workflow.";

export const MAIN_NAV = [
  { label: "AI Tools",  href: "/tools",       soon: false },
  { label: "Compare",   href: "/compare",     soon: false },
  { label: "Best Of",   href: "/best",        soon: false },
  { label: "Workflows", href: "/workflow",    soon: false },
  { label: "Learn AI",  href: "/learn-ai",    soon: true  },
  { label: "AI News",   href: "/ai-news",     soon: true  },
];

export const FOOTER_LINKS: Record<string, { label: string; href: string }[]> = {
  "AI Tools": [
    { label: "All AI Tools",        href: "/tools" },
    { label: "Free AI Tools",       href: "/tools/pricing/free" },
    { label: "Freemium Tools",      href: "/tools/pricing/freemium" },
    { label: "AI Agents",           href: "/tools/category/ai-automation-agents" },
    { label: "AI Writing Tools",    href: "/tools/category/ai-writing" },
    { label: "AI Image Generators", href: "/tools/category/ai-image-generation" },
    { label: "AI Coding Tools",     href: "/tools/category/ai-coding" },
    { label: "Submit a Tool",       href: "/submit-tool" },
  ],
  "Explore": [
    { label: "Compare Tools",     href: "/compare" },
    { label: "Find Alternatives", href: "/alternatives" },
    { label: "Best-Of Lists",     href: "/best" },
    { label: "By Use Case",       href: "/use-case" },
    { label: "By Industry",       href: "/industry" },
    { label: "By Capability",     href: "/capability" },
    { label: "Workflows",         href: "/workflow" },
    { label: "Subcategories",     href: "/subcategory" },
  ],
  "Company": [
    { label: "About Us",         href: "/about" },
    { label: "Contact",          href: "/contact" },
    { label: "Privacy Policy",   href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Sitemap",          href: "/sitemap.xml" },
  ],
};

export const CAT_EMOJI: Record<string, string> = {
  "ai-automation-agents":   "🤖",
  "ai-writing":             "✍️",
  "ai-image-generation":    "🎨",
  "ai-video":               "🎬",
  "ai-audio-voice":         "🎵",
  "ai-coding":              "💻",
  "ai-marketing":           "📈",
  "ai-design":              "🖌️",
  "ai-productivity":        "⚡",
  "ai-research":            "🎓",
  "ai-data-analytics":      "📊",
  "ai-customer-support":    "🎧",
  "ai-business-operations": "👥",
  "ai-sales":               "💼",
  "ai-translation":         "🌍",
  "other-ai-tools":         "🔧",
  // Legacy slugs (old main branch)
  "chatbots-and-llms":      "💬",
  "writing-and-content":    "✍️",
  "image-generation":       "🎨",
  "video-generation":       "🎬",
  "audio-and-music":        "🎵",
  "coding-and-dev":         "💻",
  "seo-and-marketing":      "📈",
  "design-and-ui":          "🖌️",
  "productivity":           "⚡",
  "research-and-education": "🎓",
  "data-and-analytics":     "📊",
  "customer-service":       "🎧",
  "hr-and-recruiting":      "👥",
  "legal-and-finance":      "⚖️",
  "health-and-wellness":    "❤️",
  "sales-and-crm":          "💼",
  "translation":            "🌍",
  "ai-agents":              "🤖",
  "photo-editing":          "📸",
  "3d-and-ar":              "🧊",
  "e-commerce":             "🛒",
  "social-media":           "📱",
};
