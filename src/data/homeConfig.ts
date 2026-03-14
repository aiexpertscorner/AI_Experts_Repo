export const SITE_NAME = "AI Experts Corner";
export const SITE_URL = "https://aiexpertscorner.com";
export const SITE_DESC =
  "Discover the best AI tools, compare pricing, explore alternatives, and find the right products for every workflow.";

export const MAIN_NAV = [
  { label: "AI Tools", href: "/ai-tools", soon: false },
  { label: "Compare", href: "/vs", soon: false },
  { label: "Best Of", href: "/best", soon: false },
  { label: "Workflows", href: "/ai-workflows", soon: true },
  { label: "Learn AI", href: "/learn-ai", soon: true },
  { label: "AI News", href: "/ai-news", soon: true },
] as const;

export const FOOTER_LINKS = {
  Directory: [
    { label: "All AI Tools", href: "/ai-tools" },
    { label: "Free AI Tools", href: "/ai-tools/pricing/free" },
    { label: "Freemium Tools", href: "/ai-tools/pricing/freemium" },
    { label: "AI Automation & Agents", href: "/ai-tools/category/ai-automation-agents" },
    { label: "AI Writing", href: "/ai-tools/category/ai-writing" },
    { label: "AI Image Generation", href: "/ai-tools/category/ai-image-generation" },
  ],
  Explore: [
    { label: "Compare Tools", href: "/vs" },
    { label: "Alternatives", href: "/alternatives" },
    { label: "Best Of", href: "/best" },
    { label: "Use Cases", href: "/ai-tools/use-case" },
    { label: "Industries", href: "/ai-tools/industry" },
    { label: "Submit Tool", href: "/submit-tool" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ],
} as const;
