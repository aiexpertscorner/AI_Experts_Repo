/**
 * AIExpertsCorner — inject-canonical-tools.mjs
 * ─────────────────────────────────────────────────────────────
 * Injects clean canonical entries for authority AI tools that are
 * missing from tools_production.json (e.g. "chatgpt", "google-gemini").
 *
 * Rules:
 *   - Only injects if handle does NOT already exist
 *   - Existing entries are NEVER overwritten
 *   - All injected entries flagged with is_canonical: true
 *   - High display_score so they rank at top of all listings
 *
 * Run: node scripts/inject-canonical-tools.mjs
 * After: node scripts/build-seo-datasets.mjs && node scripts/build-authority-datasets.mjs
 * ─────────────────────────────────────────────────────────────
 */

import fs   from "fs";
import path from "path";

const root  = process.cwd();
const FILE  = path.join(root, "src/data/tools_production.json");
const SCORE = 99999; // ensures these float to the top everywhere

// ─── Canonical authority tool definitions ────────────────────
// Fields mirror tools_production.json schema.
// Add/edit here whenever a major tool needs a clean canonical page.

const CANONICAL_TOOLS = [

  // ── Chatbots & LLMs ──────────────────────────────────────────
  {
    handle:        "chatgpt",
    name:          "ChatGPT",
    name_clean:    "ChatGPT",
    url:           "https://chatgpt.com",
    logo_domain:   "openai.com",
    cat:           "Chatbots & LLMs",
    cat_slug:      "chatbots-and-llms",
    pricing:       "freemium",
    pricing_tier:  "freemium",
    short:         "ChatGPT is OpenAI's conversational AI assistant used by millions for writing, coding, research, and more.",
    seo_title:     "ChatGPT — AI Chatbot by OpenAI",
    tags:          ["chatbot", "llm", "writing", "coding", "research"],
    display_score: SCORE,
    homepage_priority_score: SCORE,
    is_canonical:  true,
  },
  {
    handle:        "google-gemini",
    name:          "Google Gemini",
    name_clean:    "Google Gemini",
    url:           "https://gemini.google.com",
    logo_domain:   "google.com",
    cat:           "Chatbots & LLMs",
    cat_slug:      "chatbots-and-llms",
    pricing:       "freemium",
    pricing_tier:  "freemium",
    short:         "Google Gemini is Google's multimodal AI assistant, deeply integrated with Google Workspace and Search.",
    seo_title:     "Google Gemini — AI Assistant by Google",
    tags:          ["chatbot", "llm", "multimodal", "google"],
    display_score: SCORE - 1,
    homepage_priority_score: SCORE - 1,
    is_canonical:  true,
  },
  {
    handle:        "claude",
    name:          "Claude",
    name_clean:    "Claude",
    url:           "https://claude.ai",
    logo_domain:   "anthropic.com",
    cat:           "Chatbots & LLMs",
    cat_slug:      "chatbots-and-llms",
    pricing:       "freemium",
    pricing_tier:  "freemium",
    short:         "Claude is Anthropic's AI assistant, known for nuanced reasoning, long context windows, and safety-focused design.",
    seo_title:     "Claude — AI Assistant by Anthropic",
    tags:          ["chatbot", "llm", "writing", "safety", "reasoning"],
    display_score: SCORE - 2,
    homepage_priority_score: SCORE - 2,
    is_canonical:  true,
  },
  {
    handle:        "microsoft-copilot",
    name:          "Microsoft Copilot",
    name_clean:    "Microsoft Copilot",
    url:           "https://copilot.microsoft.com",
    logo_domain:   "microsoft.com",
    cat:           "Chatbots & LLMs",
    cat_slug:      "chatbots-and-llms",
    pricing:       "freemium",
    pricing_tier:  "freemium",
    short:         "Microsoft Copilot is an AI assistant built into Windows, Edge, and Microsoft 365, powered by OpenAI models.",
    seo_title:     "Microsoft Copilot — AI Assistant by Microsoft",
    tags:          ["chatbot", "productivity", "microsoft", "windows", "office"],
    display_score: SCORE - 3,
    homepage_priority_score: SCORE - 3,
    is_canonical:  true,
  },
  {
    handle:        "github-copilot",
    name:          "GitHub Copilot",
    name_clean:    "GitHub Copilot",
    url:           "https://github.com/features/copilot",
    logo_domain:   "github.com",
    cat:           "Coding & Dev",
    cat_slug:      "coding-and-dev",
    pricing:       "paid",
    pricing_tier:  "paid",
    short:         "GitHub Copilot is an AI pair programmer that suggests code completions and entire functions directly in your editor.",
    seo_title:     "GitHub Copilot — AI Code Assistant by GitHub",
    tags:          ["coding", "developer", "autocomplete", "github", "vscode"],
    display_score: SCORE - 4,
    homepage_priority_score: SCORE - 4,
    is_canonical:  true,
  },

  // ── Creative tools ───────────────────────────────────────────
  {
    handle:        "canva-ai",
    name:          "Canva AI",
    name_clean:    "Canva AI",
    url:           "https://www.canva.com/ai-image-generator/",
    logo_domain:   "canva.com",
    cat:           "Design & UI",
    cat_slug:      "design-and-ui",
    pricing:       "freemium",
    pricing_tier:  "freemium",
    short:         "Canva AI brings powerful AI features to Canva's design platform — generate images, write copy, and create presentations.",
    seo_title:     "Canva AI — AI Design Tools by Canva",
    tags:          ["design", "image-generation", "presentations", "marketing"],
    display_score: SCORE - 5,
    homepage_priority_score: SCORE - 5,
    is_canonical:  true,
  },
  {
    handle:        "notebooklm",
    name:          "NotebookLM",
    name_clean:    "NotebookLM",
    url:           "https://notebooklm.google.com",
    logo_domain:   "notebooklm.google.com",
    cat:           "Research & Education",
    cat_slug:      "research-and-education",
    pricing:       "free",
    pricing_tier:  "free",
    short:         "NotebookLM is Google's AI-powered research tool that lets you ask questions and generate summaries from your own documents.",
    seo_title:     "NotebookLM — AI Research Tool by Google",
    tags:          ["research", "documents", "summarization", "google", "education"],
    display_score: SCORE - 6,
    homepage_priority_score: SCORE - 6,
    is_canonical:  true,
  },
  {
    handle:        "dall-e-3",
    name:          "DALL-E 3",
    name_clean:    "DALL-E 3",
    url:           "https://openai.com/dall-e-3",
    logo_domain:   "openai.com",
    cat:           "Image Generation",
    cat_slug:      "image-generation",
    pricing:       "freemium",
    pricing_tier:  "freemium",
    short:         "DALL-E 3 is OpenAI's text-to-image model, capable of generating highly detailed and creative images from natural language prompts.",
    seo_title:     "DALL-E 3 — AI Image Generator by OpenAI",
    tags:          ["image-generation", "text-to-image", "openai", "creative"],
    display_score: SCORE - 7,
    homepage_priority_score: SCORE - 7,
    is_canonical:  true,
  },
  {
    handle:        "ideogram",
    name:          "Ideogram",
    name_clean:    "Ideogram",
    url:           "https://ideogram.ai",
    logo_domain:   "ideogram.ai",
    cat:           "Image Generation",
    cat_slug:      "image-generation",
    pricing:       "freemium",
    pricing_tier:  "freemium",
    short:         "Ideogram is an AI image generator specializing in accurate text rendering within images — ideal for logos, posters, and social media.",
    seo_title:     "Ideogram — AI Image Generator with Text Rendering",
    tags:          ["image-generation", "text-in-image", "logo", "design"],
    display_score: SCORE - 8,
    homepage_priority_score: SCORE - 8,
    is_canonical:  true,
  },
  {
    handle:        "opusclip",
    name:          "OpusClip",
    name_clean:    "OpusClip",
    url:           "https://www.opus.pro",
    logo_domain:   "opus.pro",
    cat:           "Video Generation",
    cat_slug:      "video-generation",
    pricing:       "freemium",
    pricing_tier:  "freemium",
    short:         "OpusClip uses AI to automatically clip long videos into viral short-form content for TikTok, Reels, and YouTube Shorts.",
    seo_title:     "OpusClip — AI Video Clipping Tool",
    tags:          ["video", "social-media", "shorts", "reels", "repurposing"],
    display_score: SCORE - 9,
    homepage_priority_score: SCORE - 9,
    is_canonical:  true,
  },
  {
    handle:        "pika-labs",
    name:          "Pika Labs",
    name_clean:    "Pika Labs",
    url:           "https://pika.art",
    logo_domain:   "pika.art",
    cat:           "Video Generation",
    cat_slug:      "video-generation",
    pricing:       "freemium",
    pricing_tier:  "freemium",
    short:         "Pika is an AI video generation platform that transforms text and images into cinematic video clips.",
    seo_title:     "Pika Labs — AI Video Generator",
    tags:          ["video-generation", "text-to-video", "creative"],
    display_score: SCORE - 10,
    homepage_priority_score: SCORE - 10,
    is_canonical:  true,
  },
  {
    handle:        "elevenlabs",
    name:          "ElevenLabs",
    name_clean:    "ElevenLabs",
    url:           "https://elevenlabs.io",
    logo_domain:   "elevenlabs.io",
    cat:           "Audio & Music",
    cat_slug:      "audio-and-music",
    pricing:       "freemium",
    pricing_tier:  "freemium",
    short:         "ElevenLabs creates ultra-realistic AI voices for voiceovers, audiobooks, dubbing, and voice cloning.",
    seo_title:     "ElevenLabs — AI Voice Generator & Voice Cloning",
    tags:          ["voice", "text-to-speech", "voice-cloning", "audio", "dubbing"],
    display_score: SCORE - 11,
    homepage_priority_score: SCORE - 11,
    is_canonical:  true,
  },
  {
    handle:        "gamma",
    name:          "Gamma",
    name_clean:    "Gamma",
    url:           "https://gamma.app",
    logo_domain:   "gamma.app",
    cat:           "Productivity",
    cat_slug:      "productivity",
    pricing:       "freemium",
    pricing_tier:  "freemium",
    short:         "Gamma is an AI-powered presentation and document tool that creates beautiful slides and pages from a simple text prompt.",
    seo_title:     "Gamma — AI Presentation & Document Builder",
    tags:          ["presentations", "slides", "productivity", "design", "documents"],
    display_score: SCORE - 12,
    homepage_priority_score: SCORE - 12,
    is_canonical:  true,
  },

  // ── Coding ───────────────────────────────────────────────────
  {
    handle:        "codeium",
    name:          "Codeium",
    name_clean:    "Codeium",
    url:           "https://codeium.com",
    logo_domain:   "codeium.com",
    cat:           "Coding & Dev",
    cat_slug:      "coding-and-dev",
    pricing:       "freemium",
    pricing_tier:  "freemium",
    short:         "Codeium is a free AI coding assistant with autocomplete, chat, and search — supporting 70+ programming languages.",
    seo_title:     "Codeium — Free AI Code Assistant",
    tags:          ["coding", "autocomplete", "developer", "free", "ide"],
    display_score: SCORE - 13,
    homepage_priority_score: SCORE - 13,
    is_canonical:  true,
  },
  {
    handle:        "claude-code",
    name:          "Claude Code",
    name_clean:    "Claude Code",
    url:           "https://claude.ai/code",
    logo_domain:   "anthropic.com",
    cat:           "Coding & Dev",
    cat_slug:      "coding-and-dev",
    pricing:       "paid",
    pricing_tier:  "paid",
    short:         "Claude Code is Anthropic's agentic coding tool that works in the terminal to write, edit, and run code autonomously.",
    seo_title:     "Claude Code — Agentic AI Coding by Anthropic",
    tags:          ["coding", "agents", "terminal", "developer", "anthropic"],
    display_score: SCORE - 14,
    homepage_priority_score: SCORE - 14,
    is_canonical:  true,
  },

  // ── Automation & Agents ──────────────────────────────────────
  {
    handle:        "n8n",
    name:          "n8n",
    name_clean:    "n8n",
    url:           "https://n8n.io",
    logo_domain:   "n8n.io",
    cat:           "AI Agents",
    cat_slug:      "ai-agents",
    pricing:       "freemium",
    pricing_tier:  "freemium",
    short:         "n8n is an open-source workflow automation tool that connects apps and services — with powerful AI agent capabilities.",
    seo_title:     "n8n — Open Source AI Workflow Automation",
    tags:          ["automation", "workflow", "no-code", "agents", "open-source"],
    display_score: SCORE - 15,
    homepage_priority_score: SCORE - 15,
    is_canonical:  true,
  },

  // ── SEO & Marketing ──────────────────────────────────────────
  {
    handle:        "semrush",
    name:          "Semrush",
    name_clean:    "Semrush",
    url:           "https://www.semrush.com",
    logo_domain:   "semrush.com",
    cat:           "SEO & Marketing",
    cat_slug:      "seo-and-marketing",
    pricing:       "paid",
    pricing_tier:  "paid",
    short:         "Semrush is an all-in-one SEO and marketing platform with AI-powered tools for keyword research, competitor analysis, and content optimization.",
    seo_title:     "Semrush — AI-Powered SEO & Marketing Platform",
    tags:          ["seo", "marketing", "keyword-research", "competitor-analysis"],
    display_score: SCORE - 16,
    homepage_priority_score: SCORE - 16,
    is_canonical:  true,
  },
  {
    handle:        "brandwatch-ai",
    name:          "Brandwatch AI",
    name_clean:    "Brandwatch AI",
    url:           "https://www.brandwatch.com",
    logo_domain:   "brandwatch.com",
    cat:           "SEO & Marketing",
    cat_slug:      "seo-and-marketing",
    pricing:       "paid",
    pricing_tier:  "paid",
    short:         "Brandwatch AI provides social listening, consumer intelligence, and AI-powered market research for brands and agencies.",
    seo_title:     "Brandwatch AI — Social Listening & Market Intelligence",
    tags:          ["social-listening", "marketing", "analytics", "brand"],
    display_score: SCORE - 17,
    homepage_priority_score: SCORE - 17,
    is_canonical:  true,
  },

  // ── Productivity & Business ───────────────────────────────────
  {
    handle:        "notion-ai",
    name:          "Notion AI",
    name_clean:    "Notion AI",
    url:           "https://www.notion.so/product/ai",
    logo_domain:   "notion.so",
    cat:           "Productivity",
    cat_slug:      "productivity",
    pricing:       "freemium",
    pricing_tier:  "freemium",
    short:         "Notion AI is a built-in AI assistant inside Notion that helps you write, summarize, translate, and organize your notes and docs.",
    seo_title:     "Notion AI — AI Writing Assistant in Notion",
    tags:          ["productivity", "writing", "notes", "workspace", "ai-assistant"],
    display_score: SCORE - 18,
    homepage_priority_score: SCORE - 18,
    is_canonical:  true,
  },
  {
    handle:        "zoom-ai-companion",
    name:          "Zoom AI Companion",
    name_clean:    "Zoom AI Companion",
    url:           "https://www.zoom.com/en/ai-assistant/",
    logo_domain:   "zoom.us",
    cat:           "Productivity",
    cat_slug:      "productivity",
    pricing:       "freemium",
    pricing_tier:  "freemium",
    short:         "Zoom AI Companion helps you summarize meetings, compose messages, and stay productive — built into your Zoom workspace.",
    seo_title:     "Zoom AI Companion — AI Meeting Assistant",
    tags:          ["meetings", "productivity", "transcription", "summarization"],
    display_score: SCORE - 19,
    homepage_priority_score: SCORE - 19,
    is_canonical:  true,
  },
  {
    handle:        "asana-ai",
    name:          "Asana AI",
    name_clean:    "Asana AI",
    url:           "https://asana.com/product/ai",
    logo_domain:   "asana.com",
    cat:           "Productivity",
    cat_slug:      "productivity",
    pricing:       "freemium",
    pricing_tier:  "freemium",
    short:         "Asana AI brings intelligent automation and AI-powered project management features to the popular Asana work management platform.",
    seo_title:     "Asana AI — AI-Powered Project Management",
    tags:          ["project-management", "productivity", "automation", "teams"],
    display_score: SCORE - 20,
    homepage_priority_score: SCORE - 20,
    is_canonical:  true,
  },

  // ── Sales & CRM ──────────────────────────────────────────────
  {
    handle:        "salesforce-einstein",
    name:          "Salesforce Einstein",
    name_clean:    "Salesforce Einstein",
    url:           "https://www.salesforce.com/products/einstein/",
    logo_domain:   "salesforce.com",
    cat:           "Sales & CRM",
    cat_slug:      "sales-and-crm",
    pricing:       "paid",
    pricing_tier:  "paid",
    short:         "Salesforce Einstein is an AI layer built into Salesforce CRM, delivering predictive analytics, automation, and AI-powered insights.",
    seo_title:     "Salesforce Einstein — AI CRM by Salesforce",
    tags:          ["crm", "sales", "automation", "analytics", "enterprise"],
    display_score: SCORE - 21,
    homepage_priority_score: SCORE - 21,
    is_canonical:  true,
  },

  // ── E-Commerce ───────────────────────────────────────────────
  {
    handle:        "shopify-magic",
    name:          "Shopify Magic",
    name_clean:    "Shopify Magic",
    url:           "https://www.shopify.com/magic",
    logo_domain:   "shopify.com",
    cat:           "E-Commerce",
    cat_slug:      "e-commerce",
    pricing:       "freemium",
    pricing_tier:  "freemium",
    short:         "Shopify Magic is Shopify's suite of AI tools that helps merchants write product descriptions, automate workflows, and grow their store.",
    seo_title:     "Shopify Magic — AI Tools for E-Commerce",
    tags:          ["e-commerce", "shopify", "product-descriptions", "automation"],
    display_score: SCORE - 22,
    homepage_priority_score: SCORE - 22,
    is_canonical:  true,
  },
];

// ─── Inject into tools_production.json ───────────────────────

if (!fs.existsSync(FILE)) {
  console.error("✗ tools_production.json not found at:", FILE);
  process.exit(1);
}

const raw  = fs.readFileSync(FILE, "utf8").replace(/^\uFEFF/, "");
const data = JSON.parse(raw);

if (!Array.isArray(data)) {
  console.error("✗ tools_production.json is not an array");
  process.exit(1);
}

const existingHandles = new Set(data.map(t => t.handle));

let injected = 0;
let skipped  = 0;

for (const tool of CANONICAL_TOOLS) {
  if (existingHandles.has(tool.handle)) {
    console.log(`  ⏭  SKIP   ${tool.handle.padEnd(30)} (already exists)`);
    skipped++;
  } else {
    data.push(tool);
    existingHandles.add(tool.handle);
    console.log(`  ✓  ADDED  ${tool.handle.padEnd(30)} ${tool.name}`);
    injected++;
  }
}

// Write back
fs.writeFileSync(FILE, JSON.stringify(data, null, 2), "utf8");

console.log(`\n✅ Done — injected ${injected} canonical tools, skipped ${skipped}`);
console.log(`   Total tools in production: ${data.length}`);
console.log(`\nNext steps:`);
console.log(`   npm run datasets      → rebuild all SEO datasets`);
console.log(`   npm run authority     → rebuild authority datasets`);
console.log(`   npm run build         → full site build`);
