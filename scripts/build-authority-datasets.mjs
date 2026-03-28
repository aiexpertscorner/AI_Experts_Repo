/**
 * AIExpertsCorner — build-authority-datasets.mjs
 * Run AFTER inject-canonical-tools.mjs:
 *   npm run inject && npm run datasets && npm run authority
 */

import fs   from "fs";
import path from "path";

const root    = process.cwd();
const INPUT   = path.join(root, "src/data/tools_production.json");
const OUT_DIR = path.join(root, "src/data/build");

const writeJson = (filePath, data) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  const kb = (JSON.stringify(data).length / 1024).toFixed(1);
  console.log(`  ✓ ${path.basename(filePath).padEnd(35)} ${kb} KB`);
};

let productionTools = [];
if (fs.existsSync(INPUT)) {
  const raw = JSON.parse(fs.readFileSync(INPUT, "utf8").replace(/^\uFEFF/, ""));
  productionTools = Array.isArray(raw) ? raw : [];
  console.log(`Loaded ${productionTools.length} production tools`);
}

const byHandle = new Map(productionTools.map(t => [t.handle, t]));
const findTool = (h) => h ? (byHandle.get(h) ?? null) : null;

const FAVICON_OVERRIDES = {
  "notebooklm.google.com": "https://www.google.com/s2/favicons?domain=notebooklm.google.com&sz=128",
  "klingai.com":           "https://www.google.com/s2/favicons?domain=klingai.com&sz=128",
  "janitorai.com":         "https://www.google.com/s2/favicons?domain=janitorai.com&sz=128",
  "vidnoz.com":            "https://www.google.com/s2/favicons?domain=vidnoz.com&sz=128",
  "vadu.ai":               "https://www.google.com/s2/favicons?domain=vadu.ai&sz=128",
};
const logoUrl = (d) => FAVICON_OVERRIDES[d] || `https://logo.clearbit.com/${d}`;

function buildEntry(handle, displayName, logoDomain) {
  const p = findTool(handle);
  return {
    handle,
    name:          p?.name_clean || p?.name || displayName,
    display_name:  displayName,
    logo_domain:   logoDomain,
    logo_url:      logoUrl(logoDomain),
    category:      p?.cat || "",
    cat_slug:      p?.cat_slug || "",
    pricing_tier:  p?.pricing || p?.pricing_tier || "unknown",
    website_url:   p?.url || "",
    tagline:       p?.seo_title || p?.short?.slice(0, 120) || "",
    in_production: !!p,
  };
}

// ── TOP 100 [rank, handle, display_name, logo_domain] ─────────
// Handles confirmed from tools_production.json + inject script
const TOP100 = [
  [1,  "chatgpt",                        "ChatGPT",             "openai.com"],
  [2,  "google-gemini",                  "Google Gemini",       "google.com"],
  [3,  "canva-ai",                       "Canva AI",            "canva.com"],
  [4,  "claude",                         "Claude",              "anthropic.com"],
  [5,  "deepseek-v3",                    "DeepSeek",            "deepseek.com"],
  [6,  "grok",                           "Grok",                "x.ai"],
  [7,  "perplexity-ai",                  "Perplexity AI",       "perplexity.ai"],
  [8,  "microsoft-copilot",              "Microsoft Copilot",   "microsoft.com"],
  [9,  "deepl",                          "DeepL",               "deepl.com"],
  [10, "character-ai",                   "Character.ai",        "character.ai"],
  [11, "midjourney",                     "Midjourney",          "midjourney.com"],
  [12, "github-copilot",                 "GitHub Copilot",      "github.com"],
  [13, "suno-ai",                        "Suno",                "suno.com"],
  [14, "quillbot-paraphraser",           "QuillBot",            "quillbot.com"],
  [15, "grammarly",                      "Grammarly",           "grammarly.com"],
  [16, "cursor",                         "Cursor",              "cursor.com"],
  [17, "elevenlabs",                     "ElevenLabs",          "elevenlabs.io"],
  [18, "notebooklm",                     "NotebookLM",          "notebooklm.google.com"],
  [19, "runwayml",                       "Runway",              "runwayml.com"],
  [20, "hugging-face",                   "Hugging Face",        "huggingface.co"],
  [21, "kimi-chat",                      "Kimi",                "moonshot.cn"],
  [22, "capcut-com",                     "CapCut AI",           "capcut.com"],
  [23, "gamma",                          "Gamma",               "gamma.app"],
  [24, "leonardo-labs",                  "Leonardo.ai",         "leonardo.ai"],
  [25, "replit",                         "Replit",              "replit.com"],
  [26, "dall-e-3",                       "DALL-E 3",            "openai.com"],
  [27, "notion-ai",                      "Notion AI",           "notion.so"],
  [28, "jasper",                         "Jasper",              "jasper.ai"],
  [29, "zapier-com",                     "Zapier AI",           "zapier.com"],
  [30, "heygen",                         "HeyGen",              "heygen.com"],
  [31, "poe",                            "Poe",                 "poe.com"],
  [32, "descript",                       "Descript",            "descript.com"],
  [33, "lovable",                        "Lovable",             "lovable.dev"],
  [34, "opusclip",                       "OpusClip",            "opus.pro"],
  [35, "invideo",                        "InVideo AI",          "invideo.io"],
  [36, "synthesia",                      "Synthesia",           "synthesia.io"],
  [37, "stable-diffusion",               "Stable Diffusion",    "stability.ai"],
  [38, "otter-ai",                       "Otter.ai",            "otter.ai"],
  [39, "murf-ai",                        "Murf AI",             "murf.ai"],
  [40, "copy-ai",                        "Copy.ai",             "copy.ai"],
  [41, "fathom-2-0",                     "Fathom",              "fathom.video"],
  [42, "luma-dream-machine",             "Luma Dream Machine",  "lumalabs.ai"],
  [43, "veed-io",                        "Veed.io",             "veed.io"],
  [44, "ideogram",                       "Ideogram",            "ideogram.ai"],
  [45, "firefly",                        "Adobe Firefly",       "adobe.com"],
  [46, "udio-ai",                        "Udio",                "udio.com"],
  [47, "consensus",                      "Consensus",           "consensus.app"],
  [48, "photoroom",                      "Photoroom",           "photoroom.com"],
  [49, "kling-ai-sora-like-video-model", "Kling AI",            "klingai.com"],
  [50, "windsurf",                       "Windsurf",            "codeium.com"],
  [51, "claude-code",                    "Claude Code",         "anthropic.com"],
  [52, "n8n",                            "n8n",                 "n8n.io"],
  [53, "remove-bg",                      "Remove.bg",           "remove.bg"],
  [54, "beautiful-ai",                   "Beautiful.ai",        "beautiful.ai"],
  [55, "v0-dev-by-vercel-labs",          "Vercel v0",           "vercel.com"],
  [56, "pixlr",                          "Pixlr AI",            "pixlr.com"],
  [57, "janitorai",                      "Janitor AI",          "janitorai.com"],
  [58, "speechify",                      "Speechify",           "speechify.com"],
  [59, "pika-labs",                      "Pika Labs",           "pika.art"],
  [60, "wordtune",                       "Wordtune",            "wordtune.com"],
  [61, "blackbox-ai-1",                  "Blackbox AI",         "blackbox.ai"],
  [62, "semrush",                        "Semrush AI",          "semrush.com"],
  [63, "liner-ai-1",                     "Liner",               "getliner.com"],
  [64, "writesonic",                     "WriteSonic",          "writesonic.com"],
  [65, "tome",                           "Tome",                "tome.app"],
  [66, "miro-assist",                    "Miro Assist",         "miro.com"],
  [67, "chatpdf",                        "ChatPDF",             "chatpdf.com"],
  [68, "cutout-pro",                     "Cutout.pro",          "cutout.pro"],
  [69, "salesforce-einstein",            "Salesforce Einstein", "salesforce.com"],
  [70, "anyword",                        "Anyword",             "anyword.com"],
  [71, "fliki",                          "Fliki",               "fliki.ai"],
  [72, "surferseo-com",                  "Surfer SEO",          "surferseo.com"],
  [73, "hubspot-com",                    "HubSpot AI",          "hubspot.com"],
  [74, "pi",                             "Pi",                  "inflection.ai"],
  [75, "krisp",                          "Krisp",               "krisp.ai"],
  [76, "vidnoz-headshot-generator",      "Vidnoz",              "vidnoz.com"],
  [77, "syllaby",                        "Syllaby.io",          "syllaby.io"],
  [78, "glean",                          "Glean",               "glean.com"],
  [79, "claude",                         "Claude Enterprise",   "anthropic.com"],
  [80, "looka",                          "Looka",               "looka.com"],
  [81, "frase",                          "Frase.io",            "frase.io"],
  [82, "fireflies-ai",                   "Fireflies.ai",        "fireflies.ai"],
  [83, "aiva",                           "AIVA",                "aiva.ai"],
  [84, "zoom-ai-companion",              "Zoom AI Companion",   "zoom.us"],
  [85, "play-ht",                        "PlayHT",              "play.ht"],
  [86, "asana-ai",                       "Asana AI",            "asana.com"],
  [87, "clearscope",                     "Clearscope",          "clearscope.io"],
  [88, "winston-ai",                     "Winston AI",          "gowinston.ai"],
  [89, "shopify-magic",                  "Shopify Magic",       "shopify.com"],
  [90, "crayon-ai",                      "Crayon",              "crayon.com"],
  [91, "zendesk-ai",                     "Zendesk AI",          "zendesk.com"],
  [92, "brandwatch-ai",                  "Brandwatch AI",       "brandwatch.com"],
  [93, "magnific-ai",                    "Magnific AI",         "magnific.ai"],
  [94, "mem-ai",                         "Mem",                 "mem.ai"],
  [95, "harvey-ai",                      "Harvey",              "harvey.ai"],
  [96, "codeium",                        "Codeium",             "codeium.com"],
  [97, "spline",                         "Spline AI",           "spline.design"],
  [98, "eightify",                       "Eightify",            "eightify.app"],
  [99, "vadu-ai",                        "Vadu AI",             "vadu.ai"],
  [100,"lovo-ai",                        "Lovo.ai",             "lovo.ai"],
];

// ── CATEGORY TOP 10 ────────────────────────────────────────────
const CATEGORY_TOP10 = {
  "chatbots-and-llms": { name: "Chatbots & LLMs", tools: [
    ["chatgpt","ChatGPT","openai.com"],["google-gemini","Google Gemini","google.com"],
    ["claude","Claude","anthropic.com"],["deepseek-v3","DeepSeek","deepseek.com"],
    ["grok","Grok","x.ai"],["microsoft-copilot","Microsoft Copilot","microsoft.com"],
    ["kimi-chat","Kimi","moonshot.cn"],["pi","Pi","inflection.ai"],
    ["poe","Poe","poe.com"],["perplexity-ai","Perplexity AI","perplexity.ai"],
  ]},
  "writing-and-content": { name: "Writing & Content", tools: [
    ["grammarly","Grammarly","grammarly.com"],["quillbot-paraphraser","QuillBot","quillbot.com"],
    ["jasper","Jasper","jasper.ai"],["copy-ai","Copy.ai","copy.ai"],
    ["writesonic","WriteSonic","writesonic.com"],["notion-ai","Notion AI","notion.so"],
    ["anyword","Anyword","anyword.com"],["wordtune","Wordtune","wordtune.com"],
    ["liner-ai-1","Liner","getliner.com"],["fliki","Fliki","fliki.ai"],
  ]},
  "image-generation": { name: "Image Generation", tools: [
    ["midjourney","Midjourney","midjourney.com"],["dall-e-3","DALL-E 3","openai.com"],
    ["stable-diffusion","Stable Diffusion","stability.ai"],["leonardo-labs","Leonardo.ai","leonardo.ai"],
    ["firefly","Adobe Firefly","adobe.com"],["ideogram","Ideogram","ideogram.ai"],
    ["canva-ai","Canva AI","canva.com"],["photoroom","Photoroom","photoroom.com"],
    ["remove-bg","Remove.bg","remove.bg"],["pixlr","Pixlr AI","pixlr.com"],
  ]},
  "video-generation": { name: "Video Generation", tools: [
    ["runwayml","Runway","runwayml.com"],["kling-ai-sora-like-video-model","Kling AI","klingai.com"],
    ["luma-dream-machine","Luma Dream Machine","lumalabs.ai"],["pika-labs","Pika Labs","pika.art"],
    ["heygen","HeyGen","heygen.com"],["invideo","InVideo AI","invideo.io"],
    ["synthesia","Synthesia","synthesia.io"],["opusclip","OpusClip","opus.pro"],
    ["veed-io","Veed.io","veed.io"],["vidnoz-headshot-generator","Vidnoz","vidnoz.com"],
  ]},
  "audio-and-music": { name: "Audio & Music", tools: [
    ["suno-ai","Suno","suno.com"],["udio-ai","Udio","udio.com"],
    ["elevenlabs","ElevenLabs","elevenlabs.io"],["murf-ai","Murf AI","murf.ai"],
    ["descript","Descript","descript.com"],["play-ht","PlayHT","play.ht"],
    ["aiva","AIVA","aiva.ai"],["speechify","Speechify","speechify.com"],
    ["krisp","Krisp","krisp.ai"],["fireflies-ai","Fireflies.ai","fireflies.ai"],
  ]},
  "coding-and-dev": { name: "Coding & Dev", tools: [
    ["cursor","Cursor","cursor.com"],["github-copilot","GitHub Copilot","github.com"],
    ["windsurf","Windsurf","codeium.com"],["replit","Replit","replit.com"],
    ["claude-code","Claude Code","anthropic.com"],["hugging-face","Hugging Face","huggingface.co"],
    ["blackbox-ai-1","Blackbox AI","blackbox.ai"],["v0-dev-by-vercel-labs","Vercel v0","vercel.com"],
    ["lovable","Lovable","lovable.dev"],["codeium","Codeium","codeium.com"],
  ]},
  "research-and-education": { name: "Research & Education", tools: [
    ["perplexity-ai","Perplexity AI","perplexity.ai"],["notebooklm","NotebookLM","notebooklm.google.com"],
    ["consensus","Consensus","consensus.app"],["chatpdf","ChatPDF","chatpdf.com"],
    ["liner-ai-1","Liner","getliner.com"],["winston-ai","Winston AI","gowinston.ai"],
    ["eightify","Eightify","eightify.app"],["hugging-face","Hugging Face","huggingface.co"],
    ["frase","Frase.io","frase.io"],["clearscope","Clearscope","clearscope.io"],
  ]},
  "design-and-ui": { name: "Design & UI", tools: [
    ["canva-ai","Canva AI","canva.com"],["v0-dev-by-vercel-labs","Vercel v0","vercel.com"],
    ["lovable","Lovable","lovable.dev"],["beautiful-ai","Beautiful.ai","beautiful.ai"],
    ["gamma","Gamma","gamma.app"],["looka","Looka","looka.com"],
    ["spline","Spline AI","spline.design"],["magnific-ai","Magnific AI","magnific.ai"],
    ["cutout-pro","Cutout.pro","cutout.pro"],["photoroom","Photoroom","photoroom.com"],
  ]},
  "seo-and-marketing": { name: "SEO & Marketing", tools: [
    ["semrush","Semrush AI","semrush.com"],["surferseo-com","Surfer SEO","surferseo.com"],
    ["clearscope","Clearscope","clearscope.io"],["frase","Frase.io","frase.io"],
    ["hubspot-com","HubSpot AI","hubspot.com"],["syllaby","Syllaby.io","syllaby.io"],
    ["brandwatch-ai","Brandwatch AI","brandwatch.com"],["crayon-ai","Crayon","crayon.com"],
    ["anyword","Anyword","anyword.com"],["jasper","Jasper","jasper.ai"],
  ]},
  "productivity": { name: "Productivity", tools: [
    ["notion-ai","Notion AI","notion.so"],["gamma","Gamma","gamma.app"],
    ["otter-ai","Otter.ai","otter.ai"],["fathom-2-0","Fathom","fathom.video"],
    ["zapier-com","Zapier AI","zapier.com"],["zoom-ai-companion","Zoom AI Companion","zoom.us"],
    ["mem-ai","Mem","mem.ai"],["asana-ai","Asana AI","asana.com"],
    ["beautiful-ai","Beautiful.ai","beautiful.ai"],["fireflies-ai","Fireflies.ai","fireflies.ai"],
  ]},
  "ai-agents": { name: "AI Agents", tools: [
    ["n8n","n8n","n8n.io"],["zapier-com","Zapier Central","zapier.com"],
    ["replit","Replit Agent","replit.com"],["lovable","Lovable","lovable.dev"],
    ["hugging-face","Hugging Face","huggingface.co"],["cursor","Cursor","cursor.com"],
    ["windsurf","Windsurf","codeium.com"],["claude-code","Claude Code","anthropic.com"],
    ["glean","Glean","glean.com"],["perplexity-ai","Perplexity AI","perplexity.ai"],
  ]},
  "social-media": { name: "Social Media", tools: [
    ["opusclip","OpusClip","opus.pro"],["capcut-com","CapCut AI","capcut.com"],
    ["invideo","InVideo AI","invideo.io"],["veed-io","Veed.io","veed.io"],
    ["heygen","HeyGen","heygen.com"],["syllaby","Syllaby.io","syllaby.io"],
    ["writesonic","WriteSonic","writesonic.com"],["vidnoz-headshot-generator","Vidnoz","vidnoz.com"],
    ["fliki","Fliki","fliki.ai"],["canva-ai","Canva AI","canva.com"],
  ]},
  "e-commerce": { name: "E-Commerce", tools: [
    ["shopify-magic","Shopify Magic","shopify.com"],["photoroom","Photoroom","photoroom.com"],
    ["remove-bg","Remove.bg","remove.bg"],["cutout-pro","Cutout.pro","cutout.pro"],
    ["magnific-ai","Magnific AI","magnific.ai"],["canva-ai","Canva AI","canva.com"],
    ["jasper","Jasper","jasper.ai"],["looka","Looka","looka.com"],
    ["anyword","Anyword","anyword.com"],["hubspot-com","HubSpot AI","hubspot.com"],
  ]},
  "sales-and-crm": { name: "Sales & CRM", tools: [
    ["salesforce-einstein","Salesforce Einstein","salesforce.com"],["hubspot-com","HubSpot AI","hubspot.com"],
    ["glean","Glean","glean.com"],["anyword","Anyword","anyword.com"],
    ["writesonic","WriteSonic","writesonic.com"],["jasper","Jasper","jasper.ai"],
    ["copy-ai","Copy.ai","copy.ai"],["frase","Frase.io","frase.io"],
    ["clearscope","Clearscope","clearscope.io"],["semrush","Semrush AI","semrush.com"],
  ]},
  "customer-service": { name: "Customer Service", tools: [
    ["heygen","HeyGen","heygen.com"],["synthesia","Synthesia","synthesia.io"],
    ["elevenlabs","ElevenLabs","elevenlabs.io"],["murf-ai","Murf AI","murf.ai"],
    ["play-ht","PlayHT","play.ht"],["zapier-com","Zapier AI","zapier.com"],
    ["invideo","InVideo AI","invideo.io"],["notion-ai","Notion AI","notion.so"],
    ["glean","Glean","glean.com"],["chatpdf","ChatPDF","chatpdf.com"],
  ]},
  "legal-and-finance": { name: "Legal & Finance", tools: [
    ["harvey-ai","Harvey","harvey.ai"],["perplexity-ai","Perplexity AI","perplexity.ai"],
    ["consensus","Consensus","consensus.app"],["notebooklm","NotebookLM","notebooklm.google.com"],
    ["claude","Claude","anthropic.com"],["chatpdf","ChatPDF","chatpdf.com"],
    ["glean","Glean","glean.com"],["jasper","Jasper","jasper.ai"],
    ["writesonic","WriteSonic","writesonic.com"],["clearscope","Clearscope","clearscope.io"],
  ]},
  "translation": { name: "Translation", tools: [
    ["deepl","DeepL","deepl.com"],["heygen","HeyGen","heygen.com"],
    ["elevenlabs","ElevenLabs","elevenlabs.io"],["speechify","Speechify","speechify.com"],
    ["murf-ai","Murf AI","murf.ai"],["fliki","Fliki","fliki.ai"],
    ["veed-io","Veed.io","veed.io"],["invideo","InVideo AI","invideo.io"],
    ["play-ht","PlayHT","play.ht"],["chatpdf","ChatPDF","chatpdf.com"],
  ]},
  "photo-editing": { name: "Photo Editing", tools: [
    ["photoroom","Photoroom","photoroom.com"],["remove-bg","Remove.bg","remove.bg"],
    ["pixlr","Pixlr AI","pixlr.com"],["magnific-ai","Magnific AI","magnific.ai"],
    ["cutout-pro","Cutout.pro","cutout.pro"],["canva-ai","Canva AI","canva.com"],
    ["firefly","Adobe Firefly","adobe.com"],["stable-diffusion","Stable Diffusion","stability.ai"],
    ["ideogram","Ideogram","ideogram.ai"],["eightify","Eightify","eightify.app"],
  ]},
  "3d-and-ar": { name: "3D & AR", tools: [
    ["spline","Spline AI","spline.design"],["luma-dream-machine","Luma AI","lumalabs.ai"],
    ["runwayml","Runway","runwayml.com"],["stable-diffusion","Stable Diffusion","stability.ai"],
    ["firefly","Adobe Firefly","adobe.com"],["ideogram","Ideogram","ideogram.ai"],
    ["leonardo-labs","Leonardo.ai","leonardo.ai"],["midjourney","Midjourney","midjourney.com"],
    ["canva-ai","Canva AI","canva.com"],["invideo","InVideo AI","invideo.io"],
  ]},
  "data-and-analytics": { name: "Data & Analytics", tools: [
    ["perplexity-ai","Perplexity AI","perplexity.ai"],["notebooklm","NotebookLM","notebooklm.google.com"],
    ["consensus","Consensus","consensus.app"],["glean","Glean","glean.com"],
    ["chatpdf","ChatPDF","chatpdf.com"],["clearscope","Clearscope","clearscope.io"],
    ["semrush","Semrush AI","semrush.com"],["surferseo-com","Surfer SEO","surferseo.com"],
    ["frase","Frase.io","frase.io"],["hubspot-com","HubSpot AI","hubspot.com"],
  ]},
  "hr-and-recruiting": { name: "HR & Recruiting", tools: [
    ["chatgpt","ChatGPT","openai.com"],["claude","Claude","anthropic.com"],
    ["notion-ai","Notion AI","notion.so"],["grammarly","Grammarly","grammarly.com"],
    ["otter-ai","Otter.ai","otter.ai"],["fathom-2-0","Fathom","fathom.video"],
    ["zoom-ai-companion","Zoom AI Companion","zoom.us"],["asana-ai","Asana AI","asana.com"],
    ["glean","Glean","glean.com"],["jasper","Jasper","jasper.ai"],
  ]},
  "health-and-wellness": { name: "Health & Wellness", tools: [
    ["chatgpt","ChatGPT","openai.com"],["claude","Claude","anthropic.com"],
    ["perplexity-ai","Perplexity AI","perplexity.ai"],["notebooklm","NotebookLM","notebooklm.google.com"],
    ["speechify","Speechify","speechify.com"],["elevenlabs","ElevenLabs","elevenlabs.io"],
    ["consensus","Consensus","consensus.app"],["otter-ai","Otter.ai","otter.ai"],
    ["murf-ai","Murf AI","murf.ai"],["notion-ai","Notion AI","notion.so"],
  ]},
  "other-tools": { name: "Other AI Tools", tools: [
    ["character-ai","Character.ai","character.ai"],["janitorai","Janitor AI","janitorai.com"],
    ["hugging-face","Hugging Face","huggingface.co"],["poe","Poe","poe.com"],
    ["eightify","Eightify","eightify.app"],["lovo-ai","Lovo.ai","lovo.ai"],
    ["vadu-ai","Vadu AI","vadu.ai"],["pixlr","Pixlr AI","pixlr.com"],
    ["cutout-pro","Cutout.pro","cutout.pro"],["glean","Glean","glean.com"],
  ]},
};

// ─── Build ────────────────────────────────────────────────────

console.log("\n📊 Building global-top100.json...");
const globalTop100 = TOP100.map(([rank, handle, displayName, logoDomain]) => ({
  rank, ...buildEntry(handle, displayName, logoDomain),
}));
writeJson(path.join(OUT_DIR, "global-top100.json"), {
  generated_at: new Date().toISOString(),
  total: globalTop100.length,
  matched_in_production: globalTop100.filter(t => t.in_production).length,
  tools: globalTop100,
});

console.log("\n📂 Building category-top10.json...");
const catTop10Out = {};
for (const [slug, cat] of Object.entries(CATEGORY_TOP10)) {
  catTop10Out[slug] = {
    name: cat.name, slug,
    tools: cat.tools.map(([h, n, d], i) => ({ rank: i + 1, ...buildEntry(h, n, d) })),
  };
}
writeJson(path.join(OUT_DIR, "category-top10.json"), {
  generated_at: new Date().toISOString(),
  categories: Object.keys(catTop10Out).length,
  data: catTop10Out,
});

console.log("\n🗺  Building authority-tool-map.json...");
const authorityMap = {};
const seen = new Set();
for (const t of globalTop100) {
  seen.add(t.handle);
  authorityMap[t.handle] = { ...t, global_rank: t.rank, is_global_top100: true };
}
for (const [slug, cat] of Object.entries(catTop10Out)) {
  for (const t of cat.tools) {
    if (!seen.has(t.handle)) { seen.add(t.handle); authorityMap[t.handle] = { ...t, is_global_top100: false }; }
    const e = authorityMap[t.handle];
    if (!e.category_ranks) e.category_ranks = {};
    e.category_ranks[slug] = t.rank;
  }
}
writeJson(path.join(OUT_DIR, "authority-tool-map.json"), authorityMap);

// ─── Summary ──────────────────────────────────────────────────
const matched   = globalTop100.filter(t => t.in_production);
const unmatched = globalTop100.filter(t => !t.in_production);
console.log(`\n✅ Done — ${matched.length}/${globalTop100.length} matched in production`);
console.log(`   Authority map: ${Object.keys(authorityMap).length} unique tools`);
if (unmatched.length) {
  console.log(`\n⚠  Still missing (run "npm run inject" first):`);
  unmatched.forEach(t => console.log(`   ✗ #${t.rank} ${t.display_name} → "${t.handle}"`));
}
