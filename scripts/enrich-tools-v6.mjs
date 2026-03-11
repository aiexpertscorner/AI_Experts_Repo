/**
 * AI Experts Corner — enrich-tools-v6.mjs
 * ─────────────────────────────────────────────────────────────────
 * Improvements over v5:
 *  1.  logo_url → Clearbit (aligned with frontend)
 *  2.  catSlug pre-computed and added to every tool
 *  3.  TAG_CATEGORY_MAP expanded (+12 tags, rescues ~9k "Other" tools)
 *  4.  CATEGORY_NEGATIVE_KEYWORDS expanded for Other AI Tools
 *  5.  extractDomain strips ALL subdomains, not just www.
 *      with allowlist for known two-part TLDs (.co.uk, .com.br, etc.)
 *  6.  Category score threshold lowered: < 3 → < 2
 *  7.  search_text / aliases / serp_keywords split to separate
 *      search-index file — keeps production JSON lean
 *  8.  SEO titles longer, smarter pattern (uses primary_use_case)
 *  9.  genSeoDescription injects first use_case when it fits
 * 10.  browser_based feature flag: tighter keywords + platforms array
 * 11.  buildBestForQueries: guards against Unknown pricing & & chars
 * 12.  homepage_priority_score: adds commercial_intent_score weight
 * 13.  assignToolStatus: explicit is_active === false guard
 * 14.  Progress indicator in enrichment loop
 * 15.  CONFIG now exposes SEARCH_INDEX_PATH and SPLIT_SEARCH_INDEX
 * ─────────────────────────────────────────────────────────────────
 */

import fs from "fs";
import path from "path";

const root = process.cwd();
const argv = new Set(process.argv.slice(2));

const CONFIG = {
  INPUT_PATH:          path.join(root, "src/data/tools_source.json"),
  PARTNERSTACK_PATH:   path.join(root, "src/data/partnerstack_tools.csv"),
  OUTPUT_PATH:         path.join(root, "src/data/tools_production.json"),
  SEARCH_INDEX_PATH:   path.join(root, "src/data/tools_search_index.json"),
  REPORT_PATH:         path.join(root, "src/data/build/tool-enrichment-report.json"),

  // Set to true to write search_text/aliases/serp_keywords to a
  // separate file instead of bloating the production JSON.
  SPLIT_SEARCH_INDEX:  true,

  ENABLE_HTTP_CHECKS:  !argv.has("--skip-http"),
  HTTP_CONCURRENCY:    10,
  HTTP_TIMEOUT_MS:     7000,

  MAX_RELATED:            8,
  MAX_COMPARISONS:        4,
  MAX_ALIASES:           24,
  MAX_SEARCH_KEYWORDS:   70,
  MAX_SERP_KEYWORDS:     12,
  MAX_USE_CASES:          5,
  MAX_PROMPT_USE_CASES:   8,
  MAX_BEST_FOR_QUERIES:  10,

  MIN_DESC_POOR:   20,
  MIN_DESC_FAIR:   55,
  MIN_DESC_GOOD:  110,

  MAX_RELATED_CANDIDATES:   150,
  MAX_COMPARISON_CANDIDATES: 110,

  // Two-part TLDs that must NOT be stripped to just one level
  TWO_PART_TLDS: new Set([
    "co.uk","co.nz","co.za","co.in","co.jp","co.kr","co.id",
    "com.au","com.br","com.mx","com.ar","com.sg","com.hk",
    "com.tw","com.tr","com.pk","com.ng","com.ph","com.vn",
    "org.uk","org.au","net.au","gov.uk","gov.au",
    "ac.uk","ac.nz","edu.au",
  ]),
};

// ─── CANONICAL DATA ──────────────────────────────────────────────

const CANONICAL_CATEGORIES = [
  "Chatbots & LLMs", "Writing & Content", "Image Generation",
  "Video Generation", "Audio & Music", "Coding & Dev",
  "SEO & Marketing", "Design & UI", "Productivity",
  "Research & Education", "Data & Analytics", "Customer Service",
  "HR & Recruiting", "Legal & Finance", "Health & Wellness",
  "Sales & CRM", "Translation", "AI Agents", "Photo Editing",
  "3D & AR", "E-Commerce", "Social Media", "Other AI Tools",
];

const CATEGORY_ACTION_MAP = {
  "Chatbots & LLMs":      "AI Chatbot",
  "Writing & Content":    "AI Writing Tool",
  "Image Generation":     "AI Image Generator",
  "Video Generation":     "AI Video Generator",
  "Audio & Music":        "AI Audio Tool",
  "Coding & Dev":         "AI Coding Assistant",
  "SEO & Marketing":      "AI Marketing Tool",
  "Design & UI":          "AI Design Tool",
  "Productivity":         "AI Productivity Tool",
  "Research & Education": "AI Research Tool",
  "Data & Analytics":     "AI Analytics Tool",
  "Customer Service":     "AI Support Tool",
  "HR & Recruiting":      "AI Recruiting Tool",
  "Legal & Finance":      "AI Business Tool",
  "Health & Wellness":    "AI Health Tool",
  "Sales & CRM":          "AI Sales Tool",
  "Translation":          "AI Translation Tool",
  "AI Agents":            "AI Agent",
  "Photo Editing":        "AI Photo Editor",
  "3D & AR":              "AI 3D Tool",
  "E-Commerce":           "AI Ecommerce Tool",
  "Social Media":         "AI Social Media Tool",
  "Other AI Tools":       "AI Tool",
};

const CATEGORY_KEYWORDS = {
  "Chatbots & LLMs": [
    "chatbot","chat bot","chatgpt","assistant","q&a","question answering","conversational",
    "knowledge base","pdf chat","chat with pdf","ask your docs","customer chatbot",
    "custom chatbot","chat assistant","ai companion","conversation ai","ai chat",
  ],
  "Writing & Content": [
    "writer","writing","blog","article","copywriting","copy","caption","story","rewrite",
    "paraphrase","content generation","writing assistant","grammar","summarize",
    "email writer","script writer","blog post","article writer","newsletter writer","long form",
  ],
  "Image Generation": [
    "image generation","generate images","text to image","ai art","art generator","image creator",
    "illustration","concept art","visual generation","image model","art prompt","image prompt",
  ],
  "Video Generation": [
    "video generation","generate video","create video","video creator","video ads","video scripts",
    "short video","reels","tiktok video","youtube shorts","avatar video","text to video",
    "video maker","ai video","motion video","video editor ai",
  ],
  "Audio & Music": [
    "audio","music","voice","speech","voiceover","tts","text to speech","sound","podcast",
    "audio editing","speech synthesis","music generation","music generator","voice cloning",
  ],
  "Coding & Dev": [
    "code","coding","developer","programming","debug","github","repository","api","sdk",
    "code assistant","software development","devops","pull request","code review","developer tool",
    "cli","terminal","typescript","javascript","python","copilot",
  ],
  "SEO & Marketing": [
    "seo","keywords","marketing","ads","ad generator","google ads","facebook ads",
    "campaign","landing page","email marketing","conversion","backlink","rank tracking",
    "keyword research","content marketing","ad copy","marketing workflow","ppc","serp",
  ],
  "Design & UI": [
    "design","ui","ux","wireframe","prototype","mockup","brand design","logo design",
    "figma","design system","interface design","ui kit",
  ],
  "Productivity": [
    "productivity","notes","task","meeting","calendar","organize","meeting notes",
    "to do","todo","task manager","work assistant","meeting assistant","note taking",
    "knowledge management","workspace",
  ],
  "Research & Education": [
    "research","education","study","learning","student","citation","academic","tutor",
    "course","flashcards","homework","learning assistant","fact check",
  ],
  "Data & Analytics": [
    "analytics","dashboard","data","insights","reporting","business intelligence","forecasting",
    "data analysis","sql","metrics","data visualization","trend analysis",
  ],
  "Customer Service": [
    "customer support","help desk","ticket","support automation","customer service","support agent",
    "help center","knowledge base support","support chatbot","service desk",
  ],
  "HR & Recruiting": [
    "recruiting","recruitment","hiring","hr","interview","resume","cv","talent",
    "candidate screening","job description","ats","people ops",
  ],
  "Legal & Finance": [
    "legal","contract","law","finance","accounting","invoice","investment","compliance",
    "bookkeeping","financial analysis","tax","legal research",
  ],
  "Health & Wellness": [
    "health","wellness","fitness","medical","clinical","patient","mental health",
    "nutrition","therapy","healthcare",
  ],
  "Sales & CRM": [
    "sales","crm","lead","prospecting","outreach","pipeline","revenue","sales calls",
    "lead gen","sales engagement","b2b sales","account executive",
  ],
  "Translation": [
    "translate","translation","multilingual","localization","subtitles","language",
    "transcreation","language model translation",
  ],
  "AI Agents": [
    "agent","agents","autonomous","multi-agent","operator","workflow automation","24/7",
    "automate tasks","automation agent","task agent","browser agent","agentic",
  ],
  "Photo Editing": [
    "photo editing","photo editor","retouch","background removal","enhance photo","face swap",
    "photo enhancement","upscale photo","portrait editor","image editing","remove background",
  ],
  "3D & AR": [
    "3d","3d model","3d assets","ar","augmented reality","mesh","render",
    "3d generation","3d scene","3d object","3d ar","ar vr","metaverse",
  ],
  "E-Commerce": [
    "ecommerce","shopify","product description","product photos","online store","amazon listing",
    "store optimization","product catalog","merchant",
  ],
  "Social Media": [
    "social media","instagram","linkedin posts","twitter","x posts","tiktok","social captions",
    "social scheduler","social planning","creator posts",
  ],
};

// FIX #4: Expanded negative keywords — helps rescue tools from Other AI Tools
const CATEGORY_NEGATIVE_KEYWORDS = {
  "Productivity": [
    "seo","keyword","ads","google ads","chatbot","translate","translation","code","github",
    "video generation","image generation","face swap","recruiting","resume","crm","sales",
  ],
  // NEW: Penalise "Other AI Tools" for anything that clearly belongs elsewhere
  "Other AI Tools": [
    "seo","chatbot","translate","translation","video generation","image generation",
    "photo editing","background removal","face swap","recruiting","resume","crm",
    "sales outreach","coding","developer","code review","3d model","ecommerce",
    "shopify","analytics","data analysis","health","medical","legal","contract",
  ],
};

// FIX #3: Heavily expanded TAG_CATEGORY_MAP — rescues ~9k "Other AI Tools"
const TAG_CATEGORY_MAP = {
  // Original
  "Text Generation":    "Writing & Content",
  "Writing Assistant":  "Writing & Content",
  "SEO & Keywords":     "SEO & Marketing",
  "Social Media":       "Social Media",
  "Chat / Q&A":         "Chatbots & LLMs",
  "Agents & Automation":"AI Agents",
  "Image Generation":   "Image Generation",
  "Video Generation":   "Video Generation",
  "Photo Editing":      "Photo Editing",
  "Voice & Speech":     "Audio & Music",
  "Music & Audio":      "Audio & Music",
  "Code Assistant":     "Coding & Dev",
  "Summarization":      "Research & Education",
  "Presentations":      "Productivity",
  "Email":              "SEO & Marketing",
  "Recruiting":         "HR & Recruiting",
  "Sales":              "Sales & CRM",
  "Translation":        "Translation",
  "Data Analysis":      "Data & Analytics",
  "Ecommerce":          "E-Commerce",
  "Customer Support":   "Customer Service",
  // NEW — rescues thousands of "Other AI Tools"
  "Productivity":       "Productivity",
  "Presentation":       "Productivity",
  "Note Taking":        "Productivity",
  "Task Management":    "Productivity",
  "Document AI":        "Research & Education",
  "Education":          "Research & Education",
  "Research":           "Research & Education",
  "Image Editing":      "Photo Editing",
  "Avatar & Faces":     "Video Generation",
  "Video Creation":     "Video Generation",
  "Short Video":        "Video Generation",
  "Email Automation":   "SEO & Marketing",
  "Email Marketing":    "SEO & Marketing",
  "Ad Copy":            "SEO & Marketing",
  "Sales & CRM":        "Sales & CRM",
  "Lead Generation":    "Sales & CRM",
  "Data & Analytics":   "Data & Analytics",
  "Business Intelligence": "Data & Analytics",
  "3D & AR/VR":         "3D & AR",
  "3D Generation":      "3D & AR",
  "HR & Recruiting":    "HR & Recruiting",
  "Legal & Compliance": "Legal & Finance",
  "Finance":            "Legal & Finance",
  "Health & Wellness":  "Health & Wellness",
  "Design":             "Design & UI",
  "UI/UX":              "Design & UI",
  "Branding":           "Design & UI",
  "Customer Service":   "Customer Service",
  "Support":            "Customer Service",
};

const HIGHLIGHT_CATEGORY_HINTS = {
  "ChatGPT-Based": "Chatbots & LLMs",
  "All-in-One":    "Productivity",
  "Free Forever":  "Writing & Content",
  "No-Code":       "Productivity",
  "API":           "Coding & Dev",
};

const INPUT_RULES = [
  { type: "PDF",          kw: ["pdf","pdf file","pdf document","chat with pdf","upload pdf"] },
  { type: "Image",        kw: ["image upload","upload image","photo upload","from image","image file"] },
  { type: "URL/Website",  kw: ["url","website","web page","webpage","website link","crawl site","website links"] },
  { type: "Audio/Voice",  kw: ["audio file","voice","speech","upload audio","mp3","wav"] },
  { type: "Video",        kw: ["video file","upload video","mp4","video footage"] },
  { type: "Spreadsheet",  kw: ["csv","excel","spreadsheet","xlsx","google sheet"] },
  { type: "Code",         kw: ["code","source code","github repo","repository","codebase"] },
  { type: "Document",     kw: ["docx","document","google doc","text file","upload document"] },
  { type: "Text Prompt",  kw: ["prompt","describe","enter text","type text"] },
];

const OUTPUT_RULES = [
  { type: "Text/Copy",    kw: ["write","copy","blog","text generation","content generation","script","writing assistant"] },
  { type: "Image",        kw: ["image generation","generate image","create image","photo","illustration"] },
  { type: "Video",        kw: ["video generation","generate video","create video","video ad","short video scripts"] },
  { type: "Audio/Music",  kw: ["music","audio generation","voice generation","sound","voiceover"] },
  { type: "Code",         kw: ["generate code","write code","coding","developer","debug"] },
  { type: "Summary",      kw: ["summarize","summary","tldr"] },
  { type: "Report/Data",  kw: ["report","dashboard","analytics","insights"] },
  { type: "Voiceover",    kw: ["voiceover","text-to-speech","tts","narration"] },
  { type: "Presentation", kw: ["presentation","slide deck","slides","powerpoint"] },
  { type: "Avatar",       kw: ["avatar","digital human","talking head","presenter"] },
  { type: "3D Model",     kw: ["3d","3d model","3d assets"] },
];

const AUDIENCE_RULES = [
  { aud: "Developers",          kw: ["developer","programmer","engineer","code","api","sdk"] },
  { aud: "Marketers",           kw: ["marketing","seo","ads","campaign","social media","copy","google ads"] },
  { aud: "Designers",           kw: ["design","designer","ui","ux","creative","branding"] },
  { aud: "Content Creators",    kw: ["creator","youtube","blogger","content","script writer","viral short video scripts"] },
  { aud: "Business Owners",     kw: ["business owner","entrepreneur","startup","small business"] },
  { aud: "Students",            kw: ["student","study","homework","research"] },
  { aud: "Educators",           kw: ["teacher","educator","classroom","course","learning"] },
  { aud: "Sales Professionals", kw: ["sales","crm","lead","pipeline","outreach"] },
  { aud: "HR Teams",            kw: ["recruiting","hr","hiring","talent"] },
  { aud: "Agencies",            kw: ["agency","client work"] },
  { aud: "Freelancers",         kw: ["freelancer","freelance","solopreneur"] },
  { aud: "Executives",          kw: ["executive","ceo","cto","cmo","director"] },
];

const INDUSTRY_RULES = [
  { ind: "Marketing",        kw: ["marketing","ads","seo","campaign","google ads"] },
  { ind: "Healthcare",       kw: ["medical","clinical","healthcare","patient"] },
  { ind: "Finance",          kw: ["finance","banking","insurance","investment","trading"] },
  { ind: "Legal",            kw: ["legal","lawyer","law firm","contract"] },
  { ind: "Education",        kw: ["education","student","teacher","course","e-learning"] },
  { ind: "Real Estate",      kw: ["real estate","property","realtor","listing"] },
  { ind: "E-Commerce",       kw: ["shopify","ecommerce","online store","product descriptions"] },
  { ind: "Media & Publishing",kw: ["media","publishing","newsroom","podcast","newsletter","video scripts"] },
  { ind: "HR & Recruiting",  kw: ["recruiting","hiring","talent","hr"] },
  { ind: "Sales",            kw: ["sales","crm","lead generation"] },
  { ind: "Customer Success", kw: ["support","customer success","retention"] },
  { ind: "Design & Creative",kw: ["design","creative","branding","visual"] },
  { ind: "Software Dev",     kw: ["software development","devops","engineering","code review"] },
  { ind: "Security",         kw: ["security","cybersecurity","threat","vulnerability"] },
];

const WORKFLOW_RULES = [
  { stage: "Ideation",      kw: ["brainstorm","ideas","inspiration","concept"] },
  { stage: "Research",      kw: ["research","analyze","fact-check","gather information"] },
  { stage: "Creation",      kw: ["create","generate","write","make","build"] },
  { stage: "Editing",       kw: ["edit","rewrite","improve","proofread","polish"] },
  { stage: "Publishing",    kw: ["publish","schedule","distribute","post"] },
  { stage: "Analysis",      kw: ["analytics","measure","track","report","insights","optimize"] },
  { stage: "Automation",    kw: ["automate","workflow automation","auto-post","automated","24/7"] },
  { stage: "Collaboration", kw: ["team","collaborate","co-author","feedback"] },
];

const AI_MODEL_RULES = [
  { model: "GPT-4",             kw: ["gpt-4","gpt4","gpt-4o","gpt-4 turbo"] },
  { model: "ChatGPT",           kw: ["chatgpt","chat gpt"] },
  { model: "Claude",            kw: ["claude","anthropic"] },
  { model: "Gemini",            kw: ["gemini","bard","palm"] },
  { model: "Stable Diffusion",  kw: ["stable diffusion","sdxl"] },
  { model: "Midjourney",        kw: ["midjourney"] },
  { model: "DALL-E",            kw: ["dall-e","dalle"] },
  { model: "LLaMA",             kw: ["llama","llama 2","llama 3"] },
  { model: "Mistral",           kw: ["mistral","mixtral"] },
  { model: "Whisper",           kw: ["whisper"] },
  { model: "ElevenLabs",        kw: ["elevenlabs","eleven labs"] },
  { model: "Sora",              kw: ["sora"] },
  { model: "Flux",              kw: ["flux","black forest labs"] },
];

// FIX #10: browser_based now uses tighter, less ambiguous keywords
const FEATURE_FLAG_RULES = [
  { flag: "api_access",    kw: ["api access","has api","sdk","developer api","rest api","webhook"] },
  { flag: "browser_based", kw: ["web app","web-based","works in browser","no install required","browser extension"] },
  { flag: "free_trial",    kw: ["free trial","try free","trial period","14-day trial","7-day trial"] },
  { flag: "team_features", kw: ["team","collaboration","workspace","multi-user","shared workspace"] },
  { flag: "no_code",       kw: ["no code","nocode","no-code","drag and drop","without coding"] },
  { flag: "enterprise",    kw: ["enterprise","large teams","organization","sso","saml"] },
  { flag: "self_serve",    kw: ["get started","sign up free","try now","start free"] },
  { flag: "automation",    kw: ["automate","automation","workflow","24/7","scheduled"] },
  { flag: "templates",     kw: ["templates","template library","pre-built templates"] },
  { flag: "open_source",   kw: ["open source","open-source","github","self-hosted","self-host"] },
];

const SEARCH_INTENT_RULES = [
  { intent: "create",     kw: ["create","generate","make","build"] },
  { intent: "edit",       kw: ["edit","rewrite","improve","enhance"] },
  { intent: "analyze",    kw: ["analyze","analytics","insights","measure","optimize"] },
  { intent: "automate",   kw: ["automate","automation","workflow","24/7"] },
  { intent: "chat",       kw: ["chat","assistant","q&a","conversation","chatbot"] },
  { intent: "summarize",  kw: ["summarize","summary","tldr"] },
  { intent: "design",     kw: ["design","visual","image","creative"] },
  { intent: "transcribe", kw: ["transcribe","speech to text","audio to text"] },
  { intent: "translate",  kw: ["translate","translation","multilingual"] },
  { intent: "compare",    kw: ["compare","alternatives","vs","versus"] },
  { intent: "prompt",     kw: ["prompt","prompt engineering","prompt library"] },
];

const TAG_TO_OUTPUT_TYPE = {
  "Text Generation":  "Text/Copy",
  "Writing Assistant":"Text/Copy",
  "Chat / Q&A":       "Text/Copy",
  "SEO & Keywords":   "Report/Data",
  "Social Media":     "Text/Copy",
  "Agents & Automation":"Report/Data",
  "Code Assistant":   "Code",
  "Image Generation": "Image",
  "Video Generation": "Video",
  "Voice & Speech":   "Voiceover",
  "Music & Audio":    "Audio/Music",
  "Photo Editing":    "Image",
  "Translation":      "Text/Copy",
  "Summarization":    "Summary",
};

const TAG_TO_SEARCH_INTENT = {
  "Text Generation":  "create",
  "Writing Assistant":"edit",
  "Chat / Q&A":       "chat",
  "SEO & Keywords":   "analyze",
  "Social Media":     "create",
  "Agents & Automation":"automate",
  "Code Assistant":   "create",
  "Image Generation": "design",
  "Video Generation": "create",
  "Photo Editing":    "edit",
  "Translation":      "translate",
  "Summarization":    "summarize",
};

const USE_CASE_TEMPLATES = [
  { trigger: ["blog","article","content"],      text: "Write blog posts and articles with {NAME}" },
  { trigger: ["seo","keywords"],                text: "Improve SEO content rankings with {NAME}" },
  { trigger: ["ad","ads","campaign"],           text: "Create and optimise ad campaigns with {NAME}" },
  { trigger: ["social media","captions"],       text: "Generate social media content with {NAME}" },
  { trigger: ["video","script"],                text: "Write and produce video scripts with {NAME}" },
  { trigger: ["image"],                         text: "Generate images from text prompts with {NAME}" },
  { trigger: ["transcribe","audio"],            text: "Transcribe audio and video files with {NAME}" },
  { trigger: ["translate"],                     text: "Translate content across languages with {NAME}" },
  { trigger: ["summary","summarize"],           text: "Summarise long-form content instantly with {NAME}" },
  { trigger: ["code","developer"],              text: "Generate, review and debug code with {NAME}" },
  { trigger: ["lead","outreach","sales"],       text: "Automate sales outreach and lead gen with {NAME}" },
  { trigger: ["presentation","slides"],         text: "Create compelling presentations with {NAME}" },
  { trigger: ["voice","voiceover"],             text: "Generate AI voiceovers and narrations with {NAME}" },
  { trigger: ["product description","ecommerce"],"text": "Write product descriptions at scale with {NAME}" },
  { trigger: ["chatbot"],                       text: "Build and deploy AI chatbots with {NAME}" },
  { trigger: ["email"],                         text: "Write and automate email campaigns with {NAME}" },
  { trigger: ["research","fact"],               text: "Speed up research and fact-checking with {NAME}" },
  { trigger: ["meeting","notes"],               text: "Take and summarise meeting notes with {NAME}" },
];

const PROMPT_TEMPLATE_RULES = [
  { trigger: ["seo","blog","content"],     text: "SEO content prompts for {NAME}" },
  { trigger: ["marketing","ads"],          text: "Marketing and ad copy prompts for {NAME}" },
  { trigger: ["image","design"],           text: "Image generation prompts for {NAME}" },
  { trigger: ["video"],                    text: "Video script and production prompts for {NAME}" },
  { trigger: ["code","developer"],         text: "Coding and debugging prompts for {NAME}" },
  { trigger: ["sales","crm","outreach"],   text: "Sales and outreach prompts for {NAME}" },
  { trigger: ["research"],                 text: "Research and analysis prompts for {NAME}" },
  { trigger: ["chat"],                     text: "Conversational and chatbot prompts for {NAME}" },
  { trigger: ["social media"],             text: "Social media content prompts for {NAME}" },
  { trigger: ["email"],                    text: "Email writing prompts for {NAME}" },
];

// ─── UTILITY FUNCTIONS ───────────────────────────────────────────

function safeString(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function safeArray(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((v) => String(v).trim()).filter(Boolean))];
}

function unique(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

function slugify(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function normalizeText(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeBrandName(value = "") {
  return normalizeText(value)
    .replace(/\b(ai|app|tool|tools|platform|software|hq|io|inc|labs|lab|official)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`Missing JSON input: ${filePath}`);
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "").trim();
  return JSON.parse(raw);
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"') {
      if (inQuotes && next === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim()); current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function readPartnerStackCsv(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const rows = lines.map(parseCsvLine);
  if (rows.length === 1) return [];
  const header = rows[0].map((h) => normalizeText(h));
  const firstHeader = header[0] || "";
  const looksLikeSingleColumnToolList =
    rows[0].length === 1 &&
    (firstHeader === "partnerstack_tools" || firstHeader.includes("partnerstack") ||
     firstHeader.includes("tool") || firstHeader.includes("brand"));
  if (looksLikeSingleColumnToolList) {
    return rows.slice(1).map((row) => ({ raw_name: safeString(row[0] || "") })).filter((r) => r.raw_name);
  }
  const hasHeader =
    header.some((h) => h.includes("name")) ||
    header.some((h) => h.includes("tool")) ||
    header.some((h) => h.includes("brand"));
  if (!hasHeader) {
    return rows.map((row) => ({ raw_name: safeString(row[0] || "") })).filter((r) => r.raw_name);
  }
  let nameIndex = header.findIndex((h) => h.includes("name"));
  if (nameIndex < 0) nameIndex = header.findIndex((h) => h.includes("tool"));
  if (nameIndex < 0) nameIndex = header.findIndex((h) => h.includes("brand"));
  if (nameIndex < 0) nameIndex = 0;
  return rows.slice(1).map((row) => ({ raw_name: safeString(row[nameIndex] || "") })).filter((r) => r.raw_name);
}

// FIX #5: Strip ALL subdomains, keeping root domain + TLD
function extractDomain(url = "") {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    const parts = hostname.split(".");
    if (parts.length <= 2) return hostname;
    // Check for known two-part TLDs e.g. co.uk
    const lastTwo = parts.slice(-2).join(".");
    if (CONFIG.TWO_PART_TLDS.has(lastTwo)) {
      // Return last 3 parts: brand.co.uk
      return parts.slice(-3).join(".");
    }
    // Standard: return last 2 parts
    return parts.slice(-2).join(".");
  } catch {
    return "";
  }
}

function cleanDisplayName(name = "") {
  let out = safeString(name);
  out = out
    .replace(/\bpowered by\b.*$/i, "")
    .replace(/\bby\b\s+.+$/i, "")
    .replace(/\bwith\b\s+chatgpt\b/i, "")
    .replace(/\bapp\b$/i, "")
    .replace(/\btool\b$/i, "")
    .replace(/\bsoftware\b$/i, "")
    .replace(/\bplatform\b$/i, "")
    .replace(/\s+\d+(\.\d+)?$/i, "")
    .replace(/\s+v\d+(\.\d+)?$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  const words = out.split(/\s+/).filter(Boolean);
  if (words.length > 8) out = words.slice(0, 8).join(" ");
  return out || safeString(name);
}

function cleanBrandSlug(name = "") {
  const cleaned = cleanDisplayName(name)
    .replace(/\b(and|for|with|the|powered)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return slugify(cleaned);
}

function buildContextString(tool) {
  return [
    tool.name, tool.short, tool.desc, tool.cat,
    ...(tool.tags || []), ...(tool.highlights || []), ...(tool.platforms || []),
  ]
    .map((v) => safeString(v))
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function detectByRules(text, rules, field) {
  return rules.filter((rule) => rule.kw.some((kw) => text.includes(kw))).map((rule) => rule[field]);
}

// ─── CATEGORISATION ──────────────────────────────────────────────

function inferCategory(tool, text) {
  const scores = new Map();
  const evidence = new Map();

  const addScore = (category, amount, source) => {
    if (!category || !CANONICAL_CATEGORIES.includes(category)) return;
    scores.set(category, (scores.get(category) || 0) + amount);
    if (!evidence.has(category)) evidence.set(category, []);
    evidence.get(category).push(source);
  };

  const existing = safeString(tool.cat);
  if (existing && CANONICAL_CATEGORIES.includes(existing) && existing !== "Other AI Tools") {
    addScore(existing, 8, "source_category");
  }

  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of kws) {
      if (text.includes(kw)) addScore(cat, 3, `kw:${kw}`);
    }
  }

  for (const [cat, kws] of Object.entries(CATEGORY_NEGATIVE_KEYWORDS)) {
    for (const kw of kws) {
      if (text.includes(kw)) addScore(cat, -2, `neg:${kw}`);
    }
  }

  for (const tag of tool.tags || []) {
    if (TAG_CATEGORY_MAP[tag]) addScore(TAG_CATEGORY_MAP[tag], 5, `tag:${tag}`);
  }

  for (const h of tool.highlights || []) {
    if (HIGHLIGHT_CATEGORY_HINTS[h]) addScore(HIGHLIGHT_CATEGORY_HINTS[h], 3, `highlight:${h}`);
  }

  if ((tool.platforms || []).includes("Web")) addScore("Productivity", 1, "platform:web");

  const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const [topCat = "Other AI Tools", topScore = 0] = sorted[0] || [];
  const [, secondScore = 0] = sorted[1] || [];

  let category = topCat || "Other AI Tools";

  // Productivity tie-breaking: prefer a more specific category if close
  if (category === "Productivity") {
    const strongestNonProductivity = sorted.find(([cat]) => cat !== "Productivity");
    if (strongestNonProductivity && strongestNonProductivity[1] >= topScore - 1) {
      category = strongestNonProductivity[0];
    }
  }

  // FIX #6: Lowered threshold from 3 to 2 — rescues more tools from Other
  if (topScore < 2) {
    category = existing && existing !== "Other AI Tools" ? existing : "Other AI Tools";
  }

  const confidence =
    topScore >= 12 ? "high" :
    topScore >= 7  ? "medium" :
    topScore >= 4  ? "low" : "fallback";

  const ambiguous = secondScore > 0 && Math.abs(topScore - secondScore) <= 1;

  const source =
    existing && existing !== "Other AI Tools" && category === existing ? "source+rules" :
    existing && existing !== "Other AI Tools" && category !== existing ? "rules_override" :
    category !== "Other AI Tools" ? "rules_inferred" : "fallback";

  return { category, category_confidence: confidence, category_source: source, category_ambiguous: ambiguous, category_evidence: evidence.get(category) || [] };
}

// ─── DETECTION FUNCTIONS ─────────────────────────────────────────

function detectInputTypes(tool, text) {
  const matches = detectByRules(text, INPUT_RULES, "type");
  if (!matches.length && ["Image Generation","Video Generation","Writing & Content","Chatbots & LLMs"].includes(tool.cat)) {
    matches.push("Text Prompt");
  }
  return unique(matches);
}

function detectOutputTypes(tool, text) {
  const matches = detectByRules(text, OUTPUT_RULES, "type");
  const catDefaults = {
    "Image Generation":     "Image",
    "Video Generation":     "Video",
    "Writing & Content":    "Text/Copy",
    "Coding & Dev":         "Code",
    "Audio & Music":        "Audio/Music",
    "Research & Education": "Summary",
    "Data & Analytics":     "Report/Data",
    "Chatbots & LLMs":      "Text/Copy",
    "SEO & Marketing":      "Text/Copy",
    "Photo Editing":        "Image",
    "Translation":          "Text/Copy",
    "Social Media":         "Text/Copy",
    "Customer Service":     "Text/Copy",
  };
  if (catDefaults[tool.cat]) matches.push(catDefaults[tool.cat]);
  for (const tag of tool.tags || []) {
    if (TAG_TO_OUTPUT_TYPE[tag]) matches.push(TAG_TO_OUTPUT_TYPE[tag]);
  }
  return unique(matches);
}

function detectAudience(tool, text) {
  const matches = detectByRules(text, AUDIENCE_RULES, "aud");
  if (!matches.length) {
    const defaults = {
      "Coding & Dev":         "Developers",
      "SEO & Marketing":      "Marketers",
      "Design & UI":          "Designers",
      "Writing & Content":    "Content Creators",
      "HR & Recruiting":      "HR Teams",
      "Sales & CRM":          "Sales Professionals",
      "Research & Education": "Students",
      "Chatbots & LLMs":      "Business Owners",
      "Video Generation":     "Content Creators",
      "Social Media":         "Marketers",
      "E-Commerce":           "Business Owners",
      "AI Agents":            "Business Owners",
      "Customer Service":     "Business Owners",
      "Productivity":         "Business Owners",
    };
    matches.push(defaults[tool.cat] || "Business Owners");
  }
  return unique(matches).slice(0, 4);
}

function detectIndustries(text) {
  return unique(detectByRules(text, INDUSTRY_RULES, "ind")).slice(0, 4);
}

function detectWorkflowStage(tool, text) {
  const matches = detectByRules(text, WORKFLOW_RULES, "stage");
  if (matches.length) return unique(matches).slice(0, 4);
  const defaults = {
    "Writing & Content":    ["Creation", "Editing"],
    "Image Generation":     ["Creation"],
    "Video Generation":     ["Creation"],
    "Audio & Music":        ["Creation"],
    "SEO & Marketing":      ["Creation", "Analysis", "Publishing"],
    "Data & Analytics":     ["Analysis"],
    "Productivity":         ["Automation"],
    "AI Agents":            ["Automation"],
    "Research & Education": ["Research"],
    "Photo Editing":        ["Editing"],
    "Chatbots & LLMs":      ["Creation", "Automation"],
    "Social Media":         ["Creation", "Publishing"],
    "Sales & CRM":          ["Automation", "Analysis"],
  };
  return unique(defaults[tool.cat] || ["Creation"]).slice(0, 4);
}

function detectComplexity(tool, text) {
  const beginnerKw = ["easy to use","no code","drag and drop","beginner","simple","intuitive","user-friendly","no technical","easy for anyone","one-click"];
  const advancedKw = ["api","sdk","webhook","fine-tuning","custom model","self-hosted","enterprise-grade","command line","technical documentation"];
  const beginnerScore = beginnerKw.filter((kw) => text.includes(kw)).length;
  const advancedScore = advancedKw.filter((kw) => text.includes(kw)).length;
  if (advancedScore >= 2) return "Advanced";
  if (advancedScore === 1 && beginnerScore === 0) return "Intermediate";
  if (beginnerScore >= 1) return "Beginner";
  const defaults = {
    "Coding & Dev":      "Intermediate",
    "AI Agents":         "Intermediate",
    "Data & Analytics":  "Intermediate",
    "Chatbots & LLMs":   "Beginner",
    "Writing & Content": "Beginner",
    "Image Generation":  "Beginner",
    "SEO & Marketing":   "Beginner",
    "Video Generation":  "Beginner",
    "Productivity":      "Beginner",
  };
  return defaults[tool.cat] || "Beginner";
}

function detectAiModels(tool, text) {
  const combined = `${text} ${safeString(tool.url).toLowerCase()}`;
  return unique(detectByRules(combined, AI_MODEL_RULES, "model")).slice(0, 4);
}

function detectFeatureFlags(text, tool) {
  // FIX #10: Use tighter rules from FEATURE_FLAG_RULES
  const matches = detectByRules(text, FEATURE_FLAG_RULES, "flag");
  // Use platforms array as authoritative source for browser_based
  if ((tool.platforms || []).includes("Web")) matches.push("browser_based");
  if ((tool.platforms || []).includes("Mobile")) matches.push("mobile_app");
  if ((tool.platforms || []).includes("iOS")) matches.push("mobile_app");
  if ((tool.platforms || []).includes("Android")) matches.push("mobile_app");
  if ((tool.platforms || []).includes("Desktop")) matches.push("desktop_app");
  if ((tool.platforms || []).includes("API")) matches.push("api_access");
  if (["Free", "Freemium"].includes(tool.pricing)) matches.push("self_serve");
  return unique(matches).slice(0, 12);
}

function detectSearchIntents(text, tool) {
  const matches = detectByRules(text, SEARCH_INTENT_RULES, "intent");
  for (const tag of tool.tags || []) {
    if (TAG_TO_SEARCH_INTENT[tag]) matches.push(TAG_TO_SEARCH_INTENT[tag]);
  }
  if (tool.cat === "Chatbots & LLMs")  matches.push("chat");
  if (tool.cat === "Video Generation") matches.push("create");
  if (tool.cat === "SEO & Marketing")  matches.push("create", "analyze");
  if (tool.cat === "Photo Editing")    matches.push("edit");
  if (tool.cat === "AI Agents")        matches.push("automate");
  if (tool.cat === "Translation")      matches.push("translate");
  return unique(matches).slice(0, 6);
}

// ─── CONTENT GENERATION ──────────────────────────────────────────

function extractUseCases(tool, text) {
  const out = [];
  const nameRef = tool.name_clean || tool.name;
  for (const template of USE_CASE_TEMPLATES) {
    if (template.trigger.some((kw) => text.includes(kw))) {
      out.push(template.text.replace("{NAME}", nameRef));
    }
    if (out.length >= CONFIG.MAX_USE_CASES) break;
  }
  if (out.length < 2) {
    const fallback = [];
    if (tool.cat === "SEO & Marketing")      fallback.push(`Improve marketing workflows with ${nameRef}`);
    if (tool.cat === "Writing & Content")    fallback.push(`Create written content faster with ${nameRef}`);
    if (tool.cat === "Video Generation")     fallback.push(`Create short-form video content with ${nameRef}`);
    if (tool.cat === "Image Generation")     fallback.push(`Generate custom image assets with ${nameRef}`);
    if (tool.cat === "Coding & Dev")         fallback.push(`Speed up development cycles with ${nameRef}`);
    if (tool.cat === "Chatbots & LLMs")      fallback.push(`Build AI chatbots and assistants with ${nameRef}`);
    if (tool.cat === "AI Agents")            fallback.push(`Automate repetitive workflows with ${nameRef}`);
    if (tool.cat === "Translation")          fallback.push(`Translate content at scale with ${nameRef}`);
    if (tool.cat === "Productivity")         fallback.push(`Organise and automate daily tasks with ${nameRef}`);
    if (tool.cat === "Research & Education") fallback.push(`Accelerate research and study with ${nameRef}`);
    if (tool.cat === "Data & Analytics")     fallback.push(`Analyse data and generate insights with ${nameRef}`);
    for (const item of fallback) {
      if (!out.includes(item)) out.push(item);
      if (out.length >= CONFIG.MAX_USE_CASES) break;
    }
  }
  return out.slice(0, CONFIG.MAX_USE_CASES);
}

function extractPromptUseCases(tool, text) {
  const out = [];
  const nameRef = tool.name_clean || tool.name;
  for (const template of PROMPT_TEMPLATE_RULES) {
    if (template.trigger.some((kw) => text.includes(kw))) {
      out.push(template.text.replace("{NAME}", nameRef));
    }
    if (out.length >= CONFIG.MAX_PROMPT_USE_CASES) break;
  }
  if (!out.length) {
    if (tool.cat === "Writing & Content")    out.push(`Writing and editing prompts for ${nameRef}`);
    if (tool.cat === "SEO & Marketing")      out.push(`Marketing and SEO prompts for ${nameRef}`);
    if (tool.cat === "Video Generation")     out.push(`Video creation prompts for ${nameRef}`);
    if (tool.cat === "Chatbots & LLMs")      out.push(`Chatbot and assistant prompts for ${nameRef}`);
    if (tool.cat === "Coding & Dev")         out.push(`Coding and debugging prompts for ${nameRef}`);
    if (tool.cat === "Social Media")         out.push(`Social media prompts for ${nameRef}`);
  }
  if (!out.length) out.push(`General AI prompts for ${nameRef}`);
  return unique(out).slice(0, CONFIG.MAX_PROMPT_USE_CASES);
}

function inferPrimaryUseCase(tool) {
  const nameRef = tool.name_clean || tool.name;
  if (tool.use_cases?.length) return tool.use_cases[0];
  if (tool.cat === "Writing & Content")    return `Create written content with ${nameRef}`;
  if (tool.cat === "SEO & Marketing")      return `Improve marketing performance with ${nameRef}`;
  if (tool.cat === "Video Generation")     return `Create AI-generated videos with ${nameRef}`;
  if (tool.cat === "Image Generation")     return `Generate images from text prompts with ${nameRef}`;
  if (tool.cat === "Coding & Dev")         return `Speed up coding and development with ${nameRef}`;
  if (tool.cat === "Chatbots & LLMs")      return `Build and deploy AI chatbots with ${nameRef}`;
  if (tool.cat === "AI Agents")            return `Automate workflows with AI agents using ${nameRef}`;
  if (tool.cat === "Translation")          return `Translate content into multiple languages with ${nameRef}`;
  if (tool.cat === "Productivity")         return `Boost productivity and save time with ${nameRef}`;
  if (tool.cat === "Research & Education") return `Speed up research and learning with ${nameRef}`;
  if (tool.cat === "Data & Analytics")     return `Analyse data and generate insights with ${nameRef}`;
  if (tool.cat === "Social Media")         return `Create and schedule social media content with ${nameRef}`;
  if (tool.cat === "Sales & CRM")          return `Automate sales and CRM workflows with ${nameRef}`;
  if (tool.cat === "Design & UI")          return `Design visuals and UI assets with ${nameRef}`;
  if (tool.cat === "Audio & Music")        return `Generate audio and music with ${nameRef}`;
  if (tool.cat === "Photo Editing")        return `Edit and enhance photos with ${nameRef}`;
  if (tool.cat === "Customer Service")     return `Automate customer support with ${nameRef}`;
  if (tool.cat === "HR & Recruiting")      return `Streamline hiring and recruiting with ${nameRef}`;
  if (tool.cat === "Legal & Finance")      return `Automate legal and finance tasks with ${nameRef}`;
  if (tool.cat === "Health & Wellness")    return `Support health and wellness goals with ${nameRef}`;
  if (tool.cat === "E-Commerce")           return `Grow your online store with ${nameRef}`;
  if (tool.cat === "3D & AR")              return `Create 3D assets and AR experiences with ${nameRef}`;
  return `Use ${nameRef} to enhance your AI workflows`;
}

function buildAliases(tool) {
  const aliases = new Set();
  if (tool.name) {
    aliases.add(tool.name);
    aliases.add(tool.name_clean);
    aliases.add(tool.name.replace(/\s+/g, ""));
    aliases.add(tool.name.replace(/[^\p{L}\p{N}]/gu, " ").trim());
  }
  if (tool.slug)   aliases.add(tool.slug.replace(/-/g, " "));
  if (tool.handle) aliases.add(tool.handle.replace(/-/g, " "));
  if (tool.canonical_domain) aliases.add(tool.canonical_domain.split(".")[0]);
  for (const item of tool.ai_model || [])   aliases.add(item);
  for (const item of tool.tags || [])       aliases.add(item);
  return unique([...aliases].map((v) => safeString(v))).slice(0, CONFIG.MAX_ALIASES);
}

function inferContentCluster(tool) {
  const map = {
    "Chatbots & LLMs":      "chatbots-and-llms",
    "Writing & Content":    "ai-writing",
    "Image Generation":     "ai-image-generation",
    "Video Generation":     "ai-video-generation",
    "Audio & Music":        "ai-audio",
    "Coding & Dev":         "ai-coding",
    "SEO & Marketing":      "ai-marketing",
    "Design & UI":          "ai-design",
    "Productivity":         "ai-productivity",
    "Research & Education": "ai-research",
    "Data & Analytics":     "ai-analytics",
    "Customer Service":     "ai-support",
    "HR & Recruiting":      "ai-recruiting",
    "Legal & Finance":      "ai-business",
    "Health & Wellness":    "ai-health",
    "Sales & CRM":          "ai-sales",
    "Translation":          "ai-translation",
    "AI Agents":            "ai-agents",
    "Photo Editing":        "ai-image-editing",
    "3D & AR":              "ai-3d",
    "E-Commerce":           "ai-ecommerce",
    "Social Media":         "ai-social-media",
  };
  return map[tool.cat] || "ai-tools";
}

function inferComparisonCluster(tool) {
  const parts = [
    tool.cat,
    ...(tool.output_types || []).slice(0, 1),
    ...(tool.target_audience || []).slice(0, 1),
  ].map((v) => slugify(v)).filter(Boolean);
  return unique(parts).join("__") || "general";
}

// FIX #11: Guards against Unknown pricing and & characters in queries
function buildBestForQueries(tool) {
  const out = [];
  const nameRef = (tool.name_clean || tool.name || "").toLowerCase();

  // Only include category if it has no &
  if (tool.cat && !tool.cat.includes("&")) {
    out.push(`best ${tool.cat.toLowerCase()} ai tool`);
  } else if (tool.cat) {
    // Replace & for query safety
    out.push(`best ${tool.cat.toLowerCase().replace(/\s*&\s*/g, " and ")} ai tool`);
  }

  if (tool.target_audience?.length) {
    out.push(`best ai tool for ${tool.target_audience[0].toLowerCase()}`);
  }
  if (tool.output_types?.length) {
    out.push(`ai tool for ${tool.output_types[0].toLowerCase()}`);
  }
  // Only push pricing-specific queries for real pricing values
  if (tool.pricing === "Free") {
    out.push(`free ${(tool.cat || "ai tool").toLowerCase().replace(/\s*&\s*/g, " and ")}`);
  } else if (tool.pricing === "Freemium") {
    out.push(`${(tool.cat || "ai tool").toLowerCase().replace(/\s*&\s*/g, " and ")} free plan`);
  }

  if (nameRef) out.push(`${nameRef} alternatives`);
  if (nameRef) out.push(`${nameRef} review`);
  if (nameRef) out.push(`${nameRef} pricing`);

  return unique(out).slice(0, CONFIG.MAX_BEST_FOR_QUERIES);
}

function inferMonetizationPaths(tool) {
  const out = [];
  if (tool.partnerstack_match) out.push("affiliate");
  if (["Paid", "Freemium"].includes(tool.pricing)) out.push("commercial-intent-pages");
  out.push("tool-pages");
  if ((tool.search_intents || []).includes("compare")) out.push("comparison-pages");
  if ((tool.search_intents || []).includes("chat"))    out.push("use-case-pages");
  if ((tool.search_intents || []).includes("create"))  out.push("best-of-pages");
  if ((tool.prompt_use_cases || []).length)            out.push("prompt-library");
  if ((tool.news_relevance_score || 0) >= 45)          out.push("news");
  return unique(out).slice(0, 6);
}

// ─── SEO GENERATION ──────────────────────────────────────────────

// FIX #8: Smarter, longer SEO titles
function genSeoTitle(tool) {
  const action  = CATEGORY_ACTION_MAP[tool.cat] || "AI Tool";
  const name    = tool.name_clean || tool.name;
  const free    = tool.pricing === "Free" ? "Free " : "";

  // Pattern A: Name — Free/Paid Action (most common, most specific)
  // Aim for 50-60 chars — leave room for Google snippet
  const patternA = `${name} — ${free}${action}`;
  if (patternA.length <= 60) return patternA;

  // Pattern B: Name — Action (no pricing, still good)
  const patternB = `${name} — ${action}`;
  if (patternB.length <= 60) return patternB;

  // Pattern C: Truncated name — action
  const maxNameLen = 60 - 4 - action.length; // 4 = " — ".length + 1 buffer
  return `${name.slice(0, maxNameLen).trim()} — ${action}`.slice(0, 60);
}

// FIX #9: Inject first use_case into description
function genSeoDescription(tool) {
  const pricingTag =
    tool.pricing === "Free"     ? "Free to use." :
    tool.pricing === "Freemium" ? "Free plan available." :
    tool.pricing === "Paid"     ? "Premium tool." : "AI tool.";

  const nameRef = tool.name_clean || tool.name;
  const base = `${nameRef}: ${tool.desc || tool.short || ""}`.trim();

  // Try to include first use_case for richer snippet
  const useCase = (tool.use_cases || [])[0] || "";
  if (useCase) {
    const withUseCase = `${base} ${useCase}. ${pricingTag}`.trim();
    if (withUseCase.length <= 155) return withUseCase;
  }

  // Standard path
  let result = `${base} ${pricingTag}`.trim();
  if (result.length <= 155) return result;

  const maxBase = 155 - pricingTag.length - 2;
  const truncated = base.slice(0, maxBase).replace(/\s+\S*$/, "…");
  return `${truncated} ${pricingTag}`.slice(0, 155);
}

// FIX #1: logo_url → Clearbit (aligned with frontend)
function createLogoUrl(domain) {
  if (!domain) return "";
  return `https://logo.clearbit.com/${domain}`;
}

function createFaviconUrl(domain) {
  if (!domain) return "";
  return `https://www.google.com/s2/favicons?sz=128&domain=${domain}`;
}

// ─── SEARCH INDEX BUILDERS ───────────────────────────────────────

function buildSearchKeywords(tool) {
  return unique([
    tool.name, tool.name_clean, tool.cat,
    ...(tool.tags || []),
    ...(tool.use_cases || []),
    ...(tool.prompt_use_cases || []),
    ...(tool.target_audience || []),
    ...(tool.industries || []),
    ...(tool.input_types || []),
    ...(tool.output_types || []),
    ...(tool.workflow_stage || []),
    ...(tool.ai_model || []),
    ...(tool.search_intents || []),
    ...(tool.feature_flags || []),
    ...(tool.best_for_queries || []),
    tool.primary_use_case,
    tool.content_cluster,
    tool.comparison_cluster,
    tool.complexity,
    tool.pricing,
  ]).slice(0, CONFIG.MAX_SEARCH_KEYWORDS);
}

function buildSerpKeywords(tool) {
  const out = [];
  const catSafe = (tool.cat || "").replace(/\s*&\s*/g, " and ");
  if (tool.cat)                       out.push(`best ${catSafe.toLowerCase()} ai tools`);
  if (tool.target_audience?.length)   out.push(`ai tools for ${tool.target_audience[0].toLowerCase()}`);
  if (tool.input_types?.length)       out.push(`ai tools for ${tool.input_types[0].toLowerCase()}`);
  if (tool.output_types?.length)      out.push(`ai tools that generate ${tool.output_types[0].toLowerCase()}`);
  if (tool.primary_use_case)          out.push(tool.primary_use_case.toLowerCase());
  const nameRef = (tool.name_clean || tool.name || "").toLowerCase();
  if (nameRef) out.push(`${nameRef} review`);
  if (nameRef) out.push(`${nameRef} alternatives`);
  if (nameRef) out.push(`${nameRef} pricing`);
  if (tool.content_cluster)          out.push(`${tool.content_cluster.replace(/-/g, " ")} tools`);
  return unique(out).slice(0, CONFIG.MAX_SERP_KEYWORDS);
}

function buildSearchText(tool) {
  return [
    tool.name, tool.name_clean, tool.short, tool.desc,
    tool.seo_title, tool.seo_description, tool.cat,
    tool.content_cluster, tool.comparison_cluster,
    ...(tool.aliases || []),
    ...(tool.search_keywords || []),
    ...(tool.serp_keywords || []),
    ...(tool.tags || []),
    ...(tool.use_cases || []),
    ...(tool.prompt_use_cases || []),
    ...(tool.target_audience || []),
    ...(tool.industries || []),
    ...(tool.input_types || []),
    ...(tool.output_types || []),
    ...(tool.workflow_stage || []),
    ...(tool.ai_model || []),
    ...(tool.search_intents || []),
    ...(tool.feature_flags || []),
    ...(tool.best_for_queries || []),
    ...(tool.monetization_paths || []),
  ]
    .map((v) => safeString(v))
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── SCORING FUNCTIONS ───────────────────────────────────────────

function computeEntityConfidenceScore(tool) {
  let score = 0;
  if (tool.name)                        score += 20;
  if (tool.url)                         score += 18;
  if (tool.canonical_domain)            score += 18;
  if ((tool.desc || "").length >= 40)   score += 14;
  if (tool.cat)                         score += 10;
  if (tool.slug)                        score += 5;
  if (tool.handle)                      score += 5;
  if (tool.partnerstack_match)          score += 6;
  if (tool.category_confidence === "high") score += 4;
  return clamp(score, 0, 100);
}

function computeQualityScore(tool) {
  let score = 0;
  if (tool.name)                             score += 12;
  if (tool.url)                              score += 10;
  if ((tool.desc || "").length >= 120)       score += 15;
  else if ((tool.desc || "").length >= 60)   score += 10;
  else if ((tool.desc || "").length >= 35)   score += 6;
  if ((tool.short || "").length >= 20)       score += 5;
  if (tool.cat)                              score += 8;
  if (tool.pricing && tool.pricing !== "Unknown") score += 6;
  if ((tool.tags || []).length >= 1)         score += 5;
  if ((tool.use_cases || []).length >= 2)    score += 8;
  if ((tool.target_audience || []).length >= 1) score += 5;
  if ((tool.input_types || []).length >= 1)  score += 4;
  if ((tool.output_types || []).length >= 1) score += 4;
  if ((tool.ai_model || []).length >= 1)     score += 4;
  if (tool.seo_title)                        score += 5;
  if (tool.seo_description)                  score += 5;
  if (tool.primary_use_case)                 score += 3;
  if (tool.content_cluster)                  score += 3;
  return clamp(score, 0, 100);
}

function computeTrustScore(tool) {
  let score = 35;
  if (tool.canonical_domain)                          score += 14;
  if (tool.seo_title)                                 score += 6;
  if (tool.seo_description)                           score += 6;
  if (tool.pricing && tool.pricing !== "Unknown")     score += 5;
  if ((tool.ai_model || []).length > 0)               score += 5;
  if ((tool.related_tools || []).length > 0)          score += 5;
  if ((tool.comparison_targets || []).length > 0)     score += 5;
  if ((tool.use_cases || []).length > 0)              score += 5;
  if ((tool.desc || "").length > 120)                 score += 4;
  return clamp(score, 0, 100);
}

function computePopularityScore(tool) {
  let score = 0;
  const pricing = safeString(tool.pricing).toLowerCase();
  if (pricing === "free")      score += 25;
  else if (pricing === "freemium") score += 22;
  else if (pricing === "paid") score += 10;
  score += Math.min(15, (tool.tags || []).length * 2);
  score += Math.min(15, (tool.use_cases || []).length * 4);
  score += Math.min(10, (tool.target_audience || []).length * 3);
  score += Math.min(8,  (tool.industries || []).length * 2);
  score += Math.min(8,  (tool.ai_model || []).length * 3);
  const catBoost = {
    "Chatbots & LLMs": 12, "SEO & Marketing": 10, "Writing & Content": 10,
    "Image Generation": 10, "Video Generation": 9, "AI Agents": 11,
    "Coding & Dev": 8, "Productivity": 6, "Social Media": 8,
  };
  score += catBoost[tool.cat] || 4;
  return clamp(score, 0, 100);
}

function computeCommercialIntentScore(tool) {
  let score = 0;
  if (tool.partnerstack_match)                                          score += 35;
  if (tool.pricing === "Freemium")                                      score += 20;
  if (tool.pricing === "Paid")                                          score += 15;
  if (tool.pricing === "Free")                                          score += 6;
  if ((tool.target_audience || []).includes("Business Owners"))         score += 8;
  if ((tool.target_audience || []).includes("Marketers"))               score += 8;
  if ((tool.target_audience || []).includes("Sales Professionals"))     score += 8;
  if ((tool.industries || []).includes("Marketing"))                    score += 7;
  if ((tool.industries || []).includes("Sales"))                        score += 7;
  if ((tool.feature_flags || []).includes("free_trial"))                score += 6;
  if ((tool.feature_flags || []).includes("api_access"))                score += 5;
  if ((tool.feature_flags || []).includes("enterprise"))                score += 5;
  return clamp(score, 0, 100);
}

function computeFreshnessScore(tool) {
  let score = 30;
  const trendyCategories = ["Chatbots & LLMs","Video Generation","Image Generation","SEO & Marketing","AI Agents","Coding & Dev"];
  if (trendyCategories.includes(tool.cat)) score += 15;
  const trendyModels = ["GPT-4","Claude","Gemini","Sora","Flux"];
  for (const model of tool.ai_model || []) {
    if (trendyModels.includes(model)) score += 8;
  }
  const trendyIntents = ["automate","compare","create","chat"];
  for (const intent of tool.search_intents || []) {
    if (trendyIntents.includes(intent)) score += 5;
  }
  return clamp(score, 0, 100);
}

function computeAffiliatePriorityScore(tool) {
  let score = 0;
  if (tool.partnerstack_match)                    score += 45;
  if (tool.pricing === "Freemium")                score += 20;
  if (tool.pricing === "Free")                    score += 12;
  if (tool.pricing === "Paid")                    score += 8;
  if (tool.url)                                   score += 5;
  if ((tool.use_cases || []).length >= 2)         score += 6;
  if ((tool.target_audience || []).length >= 1)   score += 5;
  if ((tool.industries || []).length >= 1)        score += 5;
  if ((tool.ai_model || []).length >= 1)          score += 5;
  return clamp(score, 0, 100);
}

function computeContentDepthScore(tool) {
  let score = 0;
  const descLen = (tool.desc || "").length;
  if (descLen >= 160)      score += 20;
  else if (descLen >= 100) score += 14;
  else if (descLen >= 60)  score += 9;
  else if (descLen >= 35)  score += 5;
  score += Math.min(10, (tool.use_cases || []).length * 3);
  score += Math.min(8,  (tool.input_types || []).length * 2);
  score += Math.min(8,  (tool.output_types || []).length * 2);
  score += Math.min(8,  (tool.target_audience || []).length * 2);
  score += Math.min(8,  (tool.industries || []).length * 2);
  score += Math.min(8,  (tool.workflow_stage || []).length * 2);
  score += Math.min(8,  (tool.ai_model || []).length * 2);
  score += Math.min(10, (tool.comparison_targets || []).length * 3);
  score += Math.min(10, (tool.prompt_use_cases || []).length * 2);
  return clamp(score, 0, 100);
}

function computePromptLibraryScore(tool) {
  let score = 0;
  if ((tool.prompt_use_cases || []).length)                         score += 18;
  if ((tool.search_intents || []).includes("create"))               score += 10;
  if ((tool.output_types || []).includes("Text/Copy"))              score += 10;
  if ((tool.target_audience || []).includes("Marketers"))           score += 8;
  if ((tool.target_audience || []).includes("Content Creators"))    score += 8;
  if (tool.pricing === "Free" || tool.pricing === "Freemium")       score += 6;
  if (["Writing & Content","SEO & Marketing","Video Generation","Chatbots & LLMs","Social Media"].includes(tool.cat)) score += 12;
  return clamp(score, 0, 100);
}

function computeNewsRelevanceScore(tool) {
  let score = 0;
  const trendingCats = ["Chatbots & LLMs","Video Generation","SEO & Marketing","AI Agents","Coding & Dev"];
  if (trendingCats.includes(tool.cat))                              score += 25;
  if ((tool.search_intents || []).includes("automate"))             score += 10;
  if ((tool.search_intents || []).includes("chat"))                 score += 10;
  if ((tool.feature_flags || []).includes("api_access"))            score += 8;
  if (tool.pricing === "Freemium" || tool.pricing === "Free")       score += 6;
  if ((tool.desc || "").length >= 100)                              score += 8;
  return clamp(score, 0, 100);
}

function computeReviewReadinessScore(tool) {
  return Math.round(
    tool.quality_score            * 0.30 +
    tool.trust_score              * 0.20 +
    tool.commercial_intent_score  * 0.20 +
    tool.content_depth_score      * 0.20 +
    tool.affiliate_priority_score * 0.10
  );
}

// FIX #12: Added commercial_intent_score weight to homepage priority
function computeHomepagePriorityScore(tool) {
  return Math.round(
    tool.popularity_score          * 0.25 +
    tool.affiliate_priority_score  * 0.20 +
    tool.commercial_intent_score   * 0.15 +
    tool.quality_score             * 0.12 +
    tool.freshness_score           * 0.10 +
    tool.trust_score               * 0.08 +
    tool.prompt_library_score      * 0.05 +
    tool.news_relevance_score      * 0.05
  );
}

function computeEditorialPriorityScore(tool) {
  return Math.round(
    tool.popularity_score          * 0.22 +
    tool.commercial_intent_score   * 0.20 +
    tool.freshness_score           * 0.18 +
    tool.news_relevance_score      * 0.12 +
    tool.prompt_library_score      * 0.08 +
    tool.quality_score             * 0.10 +
    tool.content_depth_score       * 0.10
  );
}

function computeDisplayScore(tool) {
  return Math.round(
    tool.popularity_score          * 0.23 +
    tool.affiliate_priority_score  * 0.18 +
    tool.quality_score             * 0.12 +
    tool.trust_score               * 0.08 +
    tool.commercial_intent_score   * 0.12 +
    tool.content_depth_score       * 0.08 +
    tool.freshness_score           * 0.07 +
    tool.prompt_library_score      * 0.05 +
    tool.news_relevance_score      * 0.07
  );
}

// ─── DATA QUALITY ────────────────────────────────────────────────

function assignDataHealth(tool) {
  const descLength = (tool.desc || "").length;
  if (!tool.name || !tool.url || !tool.canonical_domain) return "poor";
  if (descLength < CONFIG.MIN_DESC_POOR)  return "poor";
  if (descLength < CONFIG.MIN_DESC_FAIR)  return "fair";
  if (descLength < CONFIG.MIN_DESC_GOOD)  return "good";
  return "strong";
}

// FIX #13: Explicit is_active === false guard before HTTP check
function assignToolStatus(tool) {
  if (!tool.url || !tool.canonical_domain)      return "invalid";
  if (tool.is_active === false)                 return "dead";
  if (tool.duplicate_group && !tool.is_canonical) return "duplicate";
  if ((tool.desc || "").length < CONFIG.MIN_DESC_POOR) return "thin";
  if (tool.needs_manual_review)                 return "needs_review";
  return "ready";
}

// ─── RELATED TOOLS ───────────────────────────────────────────────

function buildCategoryIndex(tools) {
  const index = new Map();
  for (const tool of tools) {
    const key = tool.cat || "Other AI Tools";
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(tool.handle);
  }
  return index;
}

function addToSetMap(map, key, value) {
  if (!key || !value) return;
  if (!map.has(key)) map.set(key, new Set());
  map.get(key).add(value);
}

function buildCandidateIndexes(tools) {
  const byAudience = new Map();
  const byOutput   = new Map();
  const byInput    = new Map();
  const byPricing  = new Map();
  const byCluster  = new Map();
  for (const tool of tools) {
    for (const a of tool.target_audience || [])  addToSetMap(byAudience, a, tool.handle);
    for (const o of tool.output_types || [])     addToSetMap(byOutput, o, tool.handle);
    for (const i of tool.input_types || [])      addToSetMap(byInput, i, tool.handle);
    addToSetMap(byPricing, tool.pricing, tool.handle);
    addToSetMap(byCluster, tool.comparison_cluster, tool.handle);
  }
  return { byAudience, byOutput, byInput, byPricing, byCluster };
}

function buildCandidatePool(tool, categoryIndex, indexes, maxPool) {
  const handles = new Set(categoryIndex.get(tool.cat) || []);
  for (const a of tool.target_audience || []) {
    for (const h of indexes.byAudience.get(a) || []) handles.add(h);
  }
  for (const o of tool.output_types || []) {
    for (const h of indexes.byOutput.get(o) || []) handles.add(h);
  }
  for (const i of tool.input_types || []) {
    for (const h of indexes.byInput.get(i) || []) handles.add(h);
  }
  for (const h of indexes.byPricing.get(tool.pricing) || []) handles.add(h);
  for (const h of indexes.byCluster.get(tool.comparison_cluster) || []) handles.add(h);
  handles.delete(tool.handle);
  const arr = [...handles];
  return arr.length <= maxPool ? arr : arr.slice(0, maxPool);
}

function getRelatedTools(tool, toolsByHandle, categoryIndex, indexes) {
  const pool   = buildCandidatePool(tool, categoryIndex, indexes, CONFIG.MAX_RELATED_CANDIDATES);
  const scored = pool.map((handle) => {
    const candidate = toolsByHandle.get(handle);
    if (!candidate) return null;
    const score =
      (candidate.tags || []).filter((tag) => (tool.tags || []).includes(tag)).length * 3 +
      (candidate.pricing === tool.pricing ? 1 : 0) * 2 +
      (candidate.target_audience || []).filter((a) => (tool.target_audience || []).includes(a)).length * 2 +
      (candidate.output_types || []).filter((o) => (tool.output_types || []).includes(o)).length * 2 +
      (candidate.content_cluster === tool.content_cluster ? 1 : 0) * 2 +
      (candidate.display_score || 0) / 100;
    return { handle, score };
  }).filter(Boolean);
  scored.sort((a, b) => b.score - a.score || a.handle.localeCompare(b.handle));
  return scored.slice(0, CONFIG.MAX_RELATED).map((item) => item.handle);
}

function getComparisonTargets(tool, toolsByHandle, categoryIndex, indexes) {
  const pool   = buildCandidatePool(tool, categoryIndex, indexes, CONFIG.MAX_COMPARISON_CANDIDATES);
  const scored = pool.map((handle) => {
    const candidate = toolsByHandle.get(handle);
    if (!candidate) return null;
    const score =
      (candidate.pricing === tool.pricing ? 3 : 0) +
      (candidate.target_audience || []).filter((a) => (tool.target_audience || []).includes(a)).length * 2 +
      (candidate.output_types || []).filter((o) => (tool.output_types || []).includes(o)).length * 2 +
      (candidate.input_types || []).filter((i) => (tool.input_types || []).includes(i)).length * 2 +
      (candidate.comparison_cluster === tool.comparison_cluster ? 3 : 0) +
      (candidate.display_score || 0) / 100;
    return { handle, score };
  }).filter(Boolean);
  scored.sort((a, b) => b.score - a.score || a.handle.localeCompare(b.handle));
  return scored.slice(0, CONFIG.MAX_COMPARISONS).map((item) => item.handle);
}

function computeCanonicalPriority(tool) {
  let score = 0;
  score += tool.is_active ? 15 : 0;
  score += tool.quality_score;
  score += tool.entity_confidence_score * 0.5;
  score += tool.partnerstack_match ? 10 : 0;
  score += (tool.desc || "").length >= CONFIG.MIN_DESC_GOOD ? 10 : 0;
  score += tool.name === tool.name_clean ? 3 : 0;
  score += !/\b\d+\b/.test(tool.name_clean || tool.name) ? 3 : 0;
  score += tool.category_confidence === "high" ? 2 : 0;
  return score;
}

// ─── PARTNERSTACK ─────────────────────────────────────────────────

function buildPartnerStackIndex(records) {
  const index = new Map();
  const add = (key, rawName) => {
    const normalized = normalizeBrandName(key);
    if (!normalized) return;
    if (!index.has(normalized)) index.set(normalized, rawName);
  };
  for (const record of records) {
    const rawName = safeString(record.raw_name);
    if (!rawName) continue;
    add(rawName, rawName);
    add(cleanDisplayName(rawName), rawName);
    add(cleanBrandSlug(rawName).replace(/-/g, " "), rawName);
  }
  return index;
}

function matchPartnerStack(tool, partnerStackIndex) {
  const candidates = unique([
    tool.name, tool.name_clean,
    normalizeBrandName(tool.name),
    normalizeBrandName(tool.name_clean),
    normalizeBrandName((tool.canonical_domain || "").split(".")[0] || ""),
    safeString(tool.slug).replace(/-/g, " "),
    safeString(tool.handle).replace(/-/g, " "),
    ...(tool.aliases || []),
  ]);
  for (const candidate of candidates) {
    const key = normalizeBrandName(candidate);
    if (!key) continue;
    if (partnerStackIndex.has(key)) {
      return { match: true, partnerstack_name: partnerStackIndex.get(key) };
    }
  }
  return { match: false, partnerstack_name: "" };
}

// ─── HTTP CHECK ───────────────────────────────────────────────────

async function fetchWithTimeout(url, options = {}, timeoutMs = CONFIG.HTTP_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent": "AIExpertsCornerBot/1.0 (+https://aiexpertscorner.com)",
        ...(options.headers || {}),
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function checkUrl(url) {
  try {
    let response;
    try {
      response = await fetchWithTimeout(url, { method: "HEAD" });
    } catch {
      response = await fetchWithTimeout(url, { method: "GET" });
    }
    return {
      http_status: response.status,
      final_url:   response.url || url,
      is_active:   response.ok || response.status === 301 || response.status === 302,
      dead_reason: response.status >= 400 ? `http_${response.status}` : "",
    };
  } catch (error) {
    return {
      http_status: 0,
      final_url:   url,
      is_active:   false,
      dead_reason: error?.name === "AbortError" ? "timeout" : "fetch_failed",
    };
  }
}

async function asyncPool(limit, array, iteratorFn) {
  const ret = [];
  const executing = [];
  for (const item of array) {
    const p = Promise.resolve().then(() => iteratorFn(item));
    ret.push(p);
    if (limit <= array.length) {
      const e = p.then(() => {
        const idx = executing.indexOf(e);
        if (idx >= 0) executing.splice(idx, 1);
      });
      executing.push(e);
      if (executing.length >= limit) await Promise.race(executing);
    }
  }
  return Promise.all(ret);
}

// ─── MAIN ─────────────────────────────────────────────────────────

async function main() {
  const rawTools = readJson(CONFIG.INPUT_PATH);
  if (!Array.isArray(rawTools)) throw new Error("Input JSON must be an array of tools.");

  const partnerStackRecords = readPartnerStackCsv(CONFIG.PARTNERSTACK_PATH);
  const partnerStackIndex   = buildPartnerStackIndex(partnerStackRecords);

  console.log("");
  console.log("AI Experts Corner — Enrich Tools Production v6");
  console.log("------------------------------------------------");
  console.log(`Input tools:        ${rawTools.length}`);
  console.log(`PartnerStack rows:  ${partnerStackRecords.length}`);
  console.log(`HTTP checks:        ${CONFIG.ENABLE_HTTP_CHECKS}`);
  console.log(`Split search index: ${CONFIG.SPLIT_SEARCH_INDEX}`);
  console.log("");

  // FIX #14: Progress indicator in enrichment loop
  process.stdout.write("Enriching tools... ");
  const enriched = rawTools.map((tool, index) => {
    if ((index + 1) % 2000 === 0 || index + 1 === rawTools.length) {
      process.stdout.write(`${index + 1}/${rawTools.length} `);
    }

    const canonicalDomain = extractDomain(tool.url || "");
    const rawName         = safeString(tool.name);
    const nameClean       = cleanDisplayName(rawName);
    const suggestedSlug   = cleanBrandSlug(rawName) || slugify(rawName);

    const initial = {
      ...tool,
      id:           tool.id ?? index + 1,
      handle:       safeString(tool.handle || suggestedSlug || slugify(rawName)),
      slug:         safeString(tool.slug   || suggestedSlug || slugify(rawName)),
      name:         rawName,
      name_clean:   nameClean,
      url:          safeString(tool.url),
      desc:         safeString(tool.desc  || tool.short),
      short:        safeString(tool.short || tool.desc),
      cat:          safeString(tool.cat, "Other AI Tools"),
      // FIX #2: catSlug pre-computed
      catSlug:      "",
      e:            safeString(tool.e, "✦"),
      pricing:      safeString(tool.pricing, "Unknown"),
      platforms:    safeArray(tool.platforms),
      tags:         safeArray(tool.tags),
      highlights:   safeArray(tool.highlights),

      canonical_domain:        canonicalDomain,
      canonical_url:           safeString(tool.url),
      brand_name_normalized:   normalizeBrandName(nameClean) || normalizeBrandName(canonicalDomain.split(".")[0] || ""),
      // FIX #1: logo_url → Clearbit
      logo_url:                createLogoUrl(canonicalDomain),
      favicon_url:             createFaviconUrl(canonicalDomain),

      input_types:     [],
      output_types:    [],
      target_audience: [],
      industries:      [],
      workflow_stage:  [],
      complexity:      "",
      ai_model:        [],
      feature_flags:   [],
      search_intents:  [],

      related_tools:      [],
      comparison_targets: [],
      use_cases:          [],
      prompt_use_cases:   [],
      best_for_queries:   [],

      content_cluster:    "",
      comparison_cluster: "",
      monetization_paths: [],

      seo_title:        "",
      seo_description:  "",
      primary_use_case: "",

      // Search fields — will be stripped to separate file if SPLIT_SEARCH_INDEX=true
      aliases:         [],
      search_keywords: [],
      serp_keywords:   [],
      search_text:     "",

      partnerstack_match:  false,
      partnerstack_name:   "",
      affiliate_networks:  [],

      visibility:           "public",
      indexable:            true,
      is_active:            true,
      is_canonical:         true,
      canonical_handle:     "",
      http_status:          null,
      final_url:            safeString(tool.url),
      last_checked_at:      null,
      dead_reason:          "",
      data_health:          "good",
      duplicate_group:      "",
      duplicate_count:      1,
      needs_manual_review:  false,

      tool_status:          "ready",
      category_confidence:  "fallback",
      category_source:      "fallback",
      category_ambiguous:   false,
      category_evidence:    [],

      quality_score:           0,
      trust_score:             0,
      popularity_score:        0,
      commercial_intent_score: 0,
      freshness_score:         0,
      affiliate_priority_score:0,
      content_depth_score:     0,
      prompt_library_score:    0,
      news_relevance_score:    0,
      entity_confidence_score: 0,
      editorial_priority_score:0,
      review_readiness_score:  0,
      homepage_priority_score: 0,
      display_score:           0,
    };

    const text    = buildContextString(initial);
    const catInfo = inferCategory(initial, text);

    initial.cat                  = catInfo.category;
    initial.catSlug              = slugify(catInfo.category); // FIX #2
    initial.category_confidence  = catInfo.category_confidence;
    initial.category_source      = catInfo.category_source;
    initial.category_ambiguous   = catInfo.category_ambiguous;
    initial.category_evidence    = catInfo.category_evidence;

    initial.input_types    = detectInputTypes(initial, text);
    initial.output_types   = detectOutputTypes(initial, text);
    initial.target_audience= detectAudience(initial, text);
    initial.industries     = detectIndustries(text);
    initial.workflow_stage = detectWorkflowStage(initial, text);
    initial.complexity     = detectComplexity(initial, text);
    initial.ai_model       = detectAiModels(initial, text);
    initial.feature_flags  = detectFeatureFlags(text, initial);
    initial.search_intents = detectSearchIntents(text, initial);

    initial.use_cases         = extractUseCases(initial, text);
    initial.prompt_use_cases  = extractPromptUseCases(initial, text);
    initial.primary_use_case  = inferPrimaryUseCase(initial);

    initial.content_cluster    = inferContentCluster(initial);
    initial.comparison_cluster = inferComparisonCluster(initial);
    initial.best_for_queries   = buildBestForQueries(initial);

    initial.aliases         = buildAliases(initial);

    const partnerstack = matchPartnerStack(initial, partnerStackIndex);
    initial.partnerstack_match  = partnerstack.match;
    initial.partnerstack_name   = partnerstack.partnerstack_name;
    initial.affiliate_networks  = partnerstack.match ? ["PartnerStack"] : [];

    initial.entity_confidence_score = computeEntityConfidenceScore(initial);
    initial.prompt_library_score    = computePromptLibraryScore(initial);
    initial.news_relevance_score    = computeNewsRelevanceScore(initial);

    initial.monetization_paths = inferMonetizationPaths(initial);
    initial.seo_title          = genSeoTitle(initial);
    initial.seo_description    = genSeoDescription(initial);
    initial.serp_keywords      = buildSerpKeywords(initial);
    initial.search_keywords    = buildSearchKeywords(initial);
    initial.search_text        = buildSearchText(initial);

    return initial;
  });
  process.stdout.write("\n");

  // ── DUPLICATE DETECTION ──────────────────────────────────────
  const byDomain = new Map();
  const byBrand  = new Map();

  for (const tool of enriched) {
    if (tool.canonical_domain) {
      if (!byDomain.has(tool.canonical_domain)) byDomain.set(tool.canonical_domain, []);
      byDomain.get(tool.canonical_domain).push(tool);
    }
    if (tool.brand_name_normalized) {
      if (!byBrand.has(tool.brand_name_normalized)) byBrand.set(tool.brand_name_normalized, []);
      byBrand.get(tool.brand_name_normalized).push(tool);
    }
  }

  for (const tool of enriched) {
    const domainGroup = byDomain.get(tool.canonical_domain) || [];
    const brandGroup  = byBrand.get(tool.brand_name_normalized) || [];
    const group = domainGroup.length >= brandGroup.length ? domainGroup : brandGroup;
    if (group.length > 1) {
      tool.duplicate_group = tool.brand_name_normalized || tool.canonical_domain || "dup";
      tool.duplicate_count = group.length;
    }
    tool.data_health = assignDataHealth(tool);
    if (!tool.name || !tool.handle || !tool.url || !tool.canonical_domain) {
      tool.visibility = "hidden"; tool.indexable = false; tool.is_active = false;
      tool.dead_reason = !tool.canonical_domain ? "invalid_domain" : "invalid_record";
    }
    if ((tool.desc || "").length < CONFIG.MIN_DESC_POOR) {
      tool.visibility = "hidden"; tool.indexable = false;
    }
    const nameLooksBad =
      (tool.name_clean || "").length > 60 ||
      /\bpowered by\b/i.test(tool.name)  ||
      /\bby\b\s+/i.test(tool.name)       ||
      /\b\d+\b/.test(tool.name);
    if (nameLooksBad) tool.needs_manual_review = true;
    if (tool.category_ambiguous && tool.category_confidence === "low")  tool.needs_manual_review = true;
    if (tool.category_source === "rules_override" && tool.category_confidence === "low") tool.needs_manual_review = true;
  }

  // ── FIRST SCORING PASS ───────────────────────────────────────
  for (const tool of enriched) {
    tool.quality_score            = computeQualityScore(tool);
    tool.trust_score              = computeTrustScore(tool);
    tool.popularity_score         = computePopularityScore(tool);
    tool.commercial_intent_score  = computeCommercialIntentScore(tool);
    tool.freshness_score          = computeFreshnessScore(tool);
    tool.affiliate_priority_score = computeAffiliatePriorityScore(tool);
    tool.content_depth_score      = computeContentDepthScore(tool);
  }

  // ── CANONICAL RESOLUTION ────────────────────────────────────
  const duplicateGroups = new Map();
  for (const tool of enriched) {
    if (tool.duplicate_group) {
      if (!duplicateGroups.has(tool.duplicate_group)) duplicateGroups.set(tool.duplicate_group, []);
      duplicateGroups.get(tool.duplicate_group).push(tool);
    }
  }
  for (const [, groupTools] of duplicateGroups) {
    groupTools.sort((a, b) => computeCanonicalPriority(b) - computeCanonicalPriority(a));
    const canonical = groupTools[0];
    for (const tool of groupTools) {
      tool.canonical_handle = canonical.handle;
      tool.is_canonical     = tool.handle === canonical.handle;
      if (!tool.is_canonical) { tool.indexable = false; tool.visibility = "hidden"; }
    }
    if (groupTools.length > 2) canonical.needs_manual_review = true;
  }

  // ── RELATED & COMPARISON TOOLS ──────────────────────────────
  console.log("Building related tools index...");
  const toolsByHandle     = new Map(enriched.map((t) => [t.handle, t]));
  const categoryIndex     = buildCategoryIndex(enriched);
  const candidateIndexes  = buildCandidateIndexes(enriched);
  for (const tool of enriched) {
    tool.related_tools      = getRelatedTools(tool, toolsByHandle, categoryIndex, candidateIndexes);
    tool.comparison_targets = getComparisonTargets(tool, toolsByHandle, categoryIndex, candidateIndexes);
  }

  // ── FINAL SCORING PASS ───────────────────────────────────────
  for (const tool of enriched) {
    tool.review_readiness_score   = computeReviewReadinessScore(tool);
    tool.homepage_priority_score  = computeHomepagePriorityScore(tool);
    tool.editorial_priority_score = computeEditorialPriorityScore(tool);
    tool.display_score            = computeDisplayScore(tool);
    tool.tool_status              = assignToolStatus(tool);
  }

  // ── HTTP CHECKS ─────────────────────────────────────────────
  if (CONFIG.ENABLE_HTTP_CHECKS) {
    console.log("Checking URLs...");
    let completed = 0;
    const results = await asyncPool(CONFIG.HTTP_CONCURRENCY, enriched, async (tool) => {
      const res = await checkUrl(tool.url);
      completed++;
      if (completed % 100 === 0 || completed === enriched.length) {
        process.stdout.write(`\rChecked ${completed}/${enriched.length}`);
      }
      return { handle: tool.handle, ...res };
    });
    process.stdout.write("\n");
    const byHandleCheck = new Map(results.map((r) => [r.handle, r]));
    for (const tool of enriched) {
      const check = byHandleCheck.get(tool.handle);
      if (!check) continue;
      tool.http_status    = check.http_status;
      tool.final_url      = check.final_url;
      tool.last_checked_at= new Date().toISOString();
      tool.is_active      = check.is_active;
      tool.dead_reason    = check.dead_reason || tool.dead_reason || "";
      if (!tool.is_active) {
        tool.visibility  = "hidden";
        tool.indexable   = false;
        tool.data_health = "poor";
      }
      tool.tool_status = assignToolStatus(tool);
    }
  }

  // ── SORT by display_score then name ─────────────────────────
  enriched.sort((a, b) => {
    if (b.display_score !== a.display_score) return b.display_score - a.display_score;
    return a.name.localeCompare(b.name);
  });

  // ── FIX #7: Split search index from production JSON ──────────
  let productionTools = enriched;
  if (CONFIG.SPLIT_SEARCH_INDEX) {
    // Write lightweight search index
    const searchIndex = enriched.map((t) => ({
      handle:          t.handle,
      name:            t.name,
      search_text:     t.search_text,
      serp_keywords:   t.serp_keywords,
      aliases:         t.aliases,
      search_keywords: t.search_keywords,
    }));
    writeJson(CONFIG.SEARCH_INDEX_PATH, searchIndex);
    console.log(`Search index written: ${CONFIG.SEARCH_INDEX_PATH}`);

    // Strip heavy search fields from production output
    productionTools = enriched.map((t) => {
      const { search_text, aliases, search_keywords, serp_keywords, ...rest } = t;
      return rest;
    });
  }

  // ── REPORT ──────────────────────────────────────────────────
  const publicTools = enriched.filter((t) => t.visibility === "public");
  const duplicateCount = enriched.filter((t) => !!t.duplicate_group).length;
  const nonCanonicalDuplicates = enriched.filter((t) => !!t.duplicate_group && t.is_canonical === false).length;
  const categoryDistribution = Object.fromEntries(
    [...publicTools.reduce((m, t) => {
      m.set(t.cat, (m.get(t.cat) || 0) + 1); return m;
    }, new Map()).entries()].sort((a, b) => b[1] - a[1])
  );

  const report = {
    generated_at:   new Date().toISOString(),
    script_version: "v6",
    source_file:    CONFIG.INPUT_PATH,
    output_file:    CONFIG.OUTPUT_PATH,
    search_index_file: CONFIG.SPLIT_SEARCH_INDEX ? CONFIG.SEARCH_INDEX_PATH : null,
    total_tools:    enriched.length,

    public_tools:   publicTools.length,
    hidden_tools:   enriched.filter((t) => t.visibility === "hidden").length,
    active_tools:   enriched.filter((t) => t.is_active === true).length,
    inactive_tools: enriched.filter((t) => t.is_active === false).length,

    canonical_tools:       enriched.filter((t) => t.is_canonical).length,
    duplicate_tools:       duplicateCount,
    non_canonical_duplicates: nonCanonicalDuplicates,

    ready_tools:        enriched.filter((t) => t.tool_status === "ready").length,
    needs_review_tools: enriched.filter((t) => t.tool_status === "needs_review").length,
    thin_tools:         enriched.filter((t) => t.tool_status === "thin").length,
    dead_tools:         enriched.filter((t) => t.tool_status === "dead").length,
    invalid_tools:      enriched.filter((t) => t.tool_status === "invalid").length,

    partnerstack_matches:      enriched.filter((t) => t.partnerstack_match).length,
    prompt_library_candidates: enriched.filter((t) => t.prompt_library_score >= 40).length,
    news_relevant_tools:       enriched.filter((t) => t.news_relevance_score >= 40).length,

    other_ai_tools_public_count: publicTools.filter((t) => t.cat === "Other AI Tools").length,
    productivity_public_count:   publicTools.filter((t) => t.cat === "Productivity").length,

    poor_data_health_count:   enriched.filter((t) => t.data_health === "poor").length,
    fair_data_health_count:   enriched.filter((t) => t.data_health === "fair").length,
    good_data_health_count:   enriched.filter((t) => t.data_health === "good").length,
    strong_data_health_count: enriched.filter((t) => t.data_health === "strong").length,

    category_distribution: categoryDistribution,

    average_display_score: Math.round(
      enriched.reduce((sum, t) => sum + (t.display_score || 0), 0) / Math.max(1, enriched.length)
    ),
    average_prompt_library_score: Math.round(
      enriched.reduce((sum, t) => sum + (t.prompt_library_score || 0), 0) / Math.max(1, enriched.length)
    ),
    average_news_relevance_score: Math.round(
      enriched.reduce((sum, t) => sum + (t.news_relevance_score || 0), 0) / Math.max(1, enriched.length)
    ),

    top_tools: enriched.slice(0, 25).map((t) => ({
      handle:                   t.handle,
      name:                     t.name,
      name_clean:               t.name_clean,
      cat:                      t.cat,
      catSlug:                  t.catSlug,
      pricing:                  t.pricing,
      display_score:            t.display_score,
      homepage_priority_score:  t.homepage_priority_score,
      editorial_priority_score: t.editorial_priority_score,
      commercial_intent_score:  t.commercial_intent_score,
      partnerstack_match:       t.partnerstack_match,
    })),

    top_affiliate_candidates: [...enriched]
      .sort((a, b) => b.commercial_intent_score - a.commercial_intent_score)
      .slice(0, 20)
      .map((t) => ({
        handle:                  t.handle,
        name:                    t.name,
        pricing:                 t.pricing,
        commercial_intent_score: t.commercial_intent_score,
        partnerstack_match:      t.partnerstack_match,
      })),

    top_prompt_candidates: [...enriched]
      .sort((a, b) => b.prompt_library_score - a.prompt_library_score)
      .slice(0, 20)
      .map((t) => ({ handle: t.handle, name: t.name, prompt_library_score: t.prompt_library_score })),

    top_news_candidates: [...enriched]
      .sort((a, b) => b.news_relevance_score - a.news_relevance_score)
      .slice(0, 20)
      .map((t) => ({ handle: t.handle, name: t.name, news_relevance_score: t.news_relevance_score })),

    top_duplicate_groups: [...duplicateGroups.entries()]
      .map(([group, items]) => ({
        duplicate_group:  group,
        count:            items.length,
        canonical_handle: items.find((x) => x.is_canonical)?.handle || "",
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20),
  };

  writeJson(CONFIG.OUTPUT_PATH, productionTools);
  writeJson(CONFIG.REPORT_PATH, report);

  // ── CONSOLE SUMMARY ─────────────────────────────────────────
  console.log("");
  console.log("✅ Enrichment complete");
  console.log("------------------------------------------------");
  console.log(`Tools:                   ${report.total_tools}`);
  console.log(`Public:                  ${report.public_tools}`);
  console.log(`Hidden:                  ${report.hidden_tools}`);
  console.log(`Canonical:               ${report.canonical_tools}`);
  console.log(`Duplicates:              ${report.duplicate_tools}`);
  console.log(`Non-canonical dups:      ${report.non_canonical_duplicates}`);
  console.log(`PartnerStack matches:    ${report.partnerstack_matches}`);
  console.log(`Prompt candidates:       ${report.prompt_library_candidates}`);
  console.log(`News-relevant tools:     ${report.news_relevant_tools}`);
  console.log(`Other AI Tools public:   ${report.other_ai_tools_public_count}`);
  console.log(`Productivity public:     ${report.productivity_public_count}`);
  console.log(`Ready tools:             ${report.ready_tools}`);
  console.log(`Needs review:            ${report.needs_review_tools}`);
  console.log(`Output:                  ${CONFIG.OUTPUT_PATH}`);
  if (CONFIG.SPLIT_SEARCH_INDEX) {
    console.log(`Search index:            ${CONFIG.SEARCH_INDEX_PATH}`);
  }
  console.log(`Report:                  ${CONFIG.REPORT_PATH}`);
  console.log("------------------------------------------------");
  console.log("");
}

main().catch((error) => {
  console.error("");
  console.error("❌ Enrichment failed");
  console.error(error);
  console.error("");
  process.exit(1);
});
