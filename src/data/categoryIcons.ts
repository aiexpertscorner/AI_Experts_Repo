const svg = (paths: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

const ICONS: Record<string, string> = {
  "ai-automation-agents": svg(`<rect x="5" y="8" width="14" height="10" rx="3"/><path d="M12 8V5M10 5h4"/><circle cx="9" cy="13" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="13" r="1" fill="currentColor" stroke="none"/>`),
  "ai-writing": svg(`<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h6M8 9h2"/>`),
  "ai-image-generation": svg(`<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>`),
  "ai-video": svg(`<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M10 9l5 3-5 3V9z" fill="currentColor" stroke="none"/>`),
  "ai-audio-voice": svg(`<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>`),
  "ai-coding": svg(`<path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/><path d="M14 4l-4 16"/>`),
  "ai-marketing": svg(`<path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 6-6"/>`),
  "ai-design": svg(`<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>`),
  "ai-productivity": svg(`<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14l2 2 4-4"/>`),
  "ai-research": svg(`<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>`),
  "ai-data-analytics": svg(`<rect x="3" y="12" width="4" height="9" rx="1"/><rect x="10" y="7" width="4" height="14" rx="1"/><rect x="17" y="3" width="4" height="18" rx="1"/>`),
  "ai-customer-support": svg(`<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.07 11.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3 .84h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 5.61 5.61l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 15z"/>`),
  "ai-business-operations": svg(`<path d="M4 20V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12"/><path d="M9 20v-6h6v6"/><path d="M8 10h.01M12 10h.01M16 10h.01"/>`),
  "ai-sales": svg(`<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>`),
  "other-ai-tools": svg(`<circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4"/>`),
};

const ALIASES: Record<string, string> = {
  "ai automation and agents": "ai-automation-agents",
  "ai automation agents": "ai-automation-agents",
  "ai writing": "ai-writing",
  "ai image generation": "ai-image-generation",
  "ai video": "ai-video",
  "ai audio voice": "ai-audio-voice",
  "ai coding": "ai-coding",
  "ai marketing": "ai-marketing",
  "ai design": "ai-design",
  "ai productivity": "ai-productivity",
  "ai research": "ai-research",
  "ai data analytics": "ai-data-analytics",
  "ai customer support": "ai-customer-support",
  "ai business operations": "ai-business-operations",
  "ai sales": "ai-sales",
};

const normalize = (value: string) =>
  String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

export function resolveCategoryIconSlug(value: string): string {
  const slugish = String(value || "").toLowerCase().trim();
  if (ICONS[slugish]) return slugish;
  const alias = ALIASES[normalize(value)];
  return alias || "other-ai-tools";
}

export function getCategoryIconMarkup(value: string): string {
  return ICONS[resolveCategoryIconSlug(value)] || ICONS["other-ai-tools"];
}
