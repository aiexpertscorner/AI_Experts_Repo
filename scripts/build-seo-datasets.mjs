/**
 * AI Experts Corner — build-seo-datasets.mjs v4
 * ─────────────────────────────────────────────────────────────────
 * Generates ALL static JSON datasets for the Astro build.
 *
 * v4 changes over v3:
 *  - ENV-VAR CONTROLLED LIMITS (no more hardcoded 3000/2000)
 *      TOOL_PAGE_LIMIT    default 5000  → set 10000-15000 in Cloudflare
 *      COMPARE_PAGE_LIMIT default 3000  → set 5000 in Cloudflare
 *      ALT_PAGE_LIMIT     default 5000  → set 10000 in Cloudflare
 *
 *  - FIELD NAME BUG FIXES in toolShape:
 *      logo_domain: now reads t.logo_domain directly (canonical tools)
 *      category_slug: now reads both t.cat_slug and t.catSlug
 *      Adds explicit slug = handle for audit compatibility
 *
 *  - MEMORY SAFE: description capped at 1000 chars in page data
 *  - NEW: company-map.json + company-paths.json
 *  - IMPROVED: use-case minimum lowered 3→2, more coverage
 *  - IMPROVED: category-top10.json has 10 tools (was 3)
 *  - IMPROVED: sitemap includes tags, industries, use-cases, companies
 */

import fs   from "fs";
import path from "path";

const root    = process.cwd();
const INPUT   = path.join(root, "src/data/tools_production.json");
const OUT_DIR = path.join(root, "src/data/build");

// ─── ENV-VAR LIMITS ──────────────────────────────────────────────
const TOOL_PAGE_LIMIT    = parseInt(process.env.TOOL_PAGE_LIMIT    || "5000",  10);
const COMPARE_PAGE_LIMIT = parseInt(process.env.COMPARE_PAGE_LIMIT || "3000",  10);
const ALT_PAGE_LIMIT     = parseInt(process.env.ALT_PAGE_LIMIT     || "5000",  10);

console.log(`\nAI Experts Corner — Build SEO Datasets v4`);
console.log(`──────────────────────────────────────────`);
console.log(`Limits: tools=${TOOL_PAGE_LIMIT}  compare=${COMPARE_PAGE_LIMIT}  alt=${ALT_PAGE_LIMIT}`);
console.log(`Input:  ${INPUT}\n`);

// ─── UTILITIES ───────────────────────────────────────────────────
const slugify = (v = "") =>
  String(v).toLowerCase().trim()
    .replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "").replace(/-{2,}/g, "-");

const safeStr  = (v, fb = "")  => typeof v === "string" && v.trim() ? v.trim() : fb;
const safeArr  = (v)           => Array.isArray(v) ? v.filter(Boolean).map(s => String(s).trim()) : [];
const safeNum  = (v, fb = 0)   => typeof v === "number" && isFinite(v) ? v : fb;
const trim     = (v, n = 1000) => safeStr(v).slice(0, n);

const readJson = (filePath) => {
  if (!fs.existsSync(filePath)) throw new Error(`Input file not found: ${filePath}`);
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "").trim();
  try { return JSON.parse(raw); }
  catch (e) { throw new Error(`Invalid JSON in ${filePath}: ${e.message}`); }
};
const writeJson = (filePath, data) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const str = JSON.stringify(data);
  fs.writeFileSync(filePath, str, "utf8");
  const kb = (str.length / 1024).toFixed(1);
  console.log(`  ✓ ${path.basename(filePath).padEnd(38)} ${kb.padStart(8)} KB`);
};

// ─── LOAD ────────────────────────────────────────────────────────
const raw = readJson(INPUT);
if (!Array.isArray(raw)) throw new Error("tools_production.json must be an array");
console.log(`Loaded:  ${raw.length} raw tools`);

// ─── FILTER + DEDUP ──────────────────────────────────────────────
const skipped     = [];
const duplicates  = [];
const seenHandles = new Set();
const seenUrls    = new Map();
const tools       = [];

for (let i = 0; i < raw.length; i++) {
  const item   = raw[i];
  const handle = safeStr(item?.handle || item?.slug);
  const name   = safeStr(item?.name);
  if (!handle || !name)           { skipped.push({ i, reason: "missing handle/name" }); continue; }
  if (seenHandles.has(handle))    { duplicates.push(handle); continue; }
  if (item.visibility === "hidden" || item.indexable === false || item.status === "draft") {
    skipped.push({ handle, reason: "non-public" }); continue;
  }
  const url = safeStr(item.url || item.website_url);
  if (url) seenUrls.set(url, (seenUrls.get(url) || 0) + 1);
  seenHandles.add(handle);
  if (!item.handle && item.slug) item.handle = item.slug;
  tools.push(item);
}
const dupUrls = [...seenUrls.entries()].filter(([, n]) => n > 1).length;
console.log(`Public:   ${tools.length} tools`);
console.log(`Skipped:  ${skipped.length}  Dupes: ${duplicates.length}  DupURLs: ${dupUrls}\n`);
console.log("Writing datasets...\n");

// ─── TOOL SHAPE ──────────────────────────────────────────────────
// FIXES: logo_domain reads t.logo_domain directly; cat_slug reads both variants
const toolShape = (t) => {
  const handle = safeStr(t.handle || t.slug);
  const logoDomain = safeStr(
    t.logo_domain || t.canonical_domain ||
    (t.logo_url?.match(/clearbit\.com\/([^?&]+)/)?.[1]) || ""
  );
  const catSlugRaw = safeStr(t.catSlug || t.cat_slug || slugify(t.cat || t.category || "other-tools"));
  const description = safeStr(t.desc || t.description || t.short || t.tagline || "");
  const year = new Date().getFullYear();
  return {
    handle,
    slug:            handle,
    name:            safeStr(t.name_clean || t.name),
    tagline:         trim(safeStr(t.seo_title || t.short || t.desc || t.tagline), 150),
    description:     trim(description, 1200),
    pricing_tier:    safeStr(t.pricing || t.pricing_tier, "unknown"),
    logo_domain:     logoDomain,
    logo_url:        safeStr(t.logo_url),
    website_url:     safeStr(t.url || t.website_url),
    affiliate_url:   t.partnerstack_match ? safeStr(t.url || t.website_url) : "",
    category:        safeStr(t.cat || t.category, "Other AI Tools"),
    category_slug:   catSlugRaw,
    feature_tags:    safeArr(t.tags).slice(0, 8),
    use_cases:       safeArr(t.use_cases).slice(0, 5),
    industries:      safeArr(t.industries).slice(0, 4),
    display_score:   safeNum(t.display_score),
    is_featured:     safeNum(t.homepage_priority_score) >= 70 || !!t.is_canonical,
    is_canonical:    !!t.is_canonical,
    has_api:         !!t.has_api,
    has_mobile:      !!t.has_mobile,
    has_chrome_ext:  !!t.has_chrome_ext,
    is_open_source:  !!t.is_open_source,
    related_tools:   safeArr(t.related_tools).slice(0, 6),
    compare_targets: safeArr(t.comparison_targets).slice(0, 6),
    seo_title:       trim(safeStr(t.seo_title), 100),
    seo_description: trim(safeStr(t.seo_description), 200),
    complexity:      safeStr(t.complexity),
    target_audience: safeStr(Array.isArray(t.target_audience) ? t.target_audience[0] : t.target_audience),
    workflow_stage:  safeStr(Array.isArray(t.workflow_stage)  ? t.workflow_stage[0]  : t.workflow_stage),
    commercial_score:safeNum(t.commercial_intent_score),
    homepage_score:  safeNum(t.homepage_priority_score),
    prompt_score:    safeNum(t.prompt_library_score),
    company:         safeStr(t.company || t.brand || ""),
    company_slug:    slugify(safeStr(t.company || t.brand || "")),
    added_date:      safeStr(t.added_date || t.created_at || ""),
  };
};

// ─── 1. TOOL PATHS ───────────────────────────────────────────────
const toolsByScore = [...tools].sort((a, b) => safeNum(b.display_score) - safeNum(a.display_score));
const toolPaths    = toolsByScore.map(t => safeStr(t.handle || t.slug));
writeJson(path.join(OUT_DIR, "tool-paths.json"), toolPaths);

// ─── 2. TOOL MAP ─────────────────────────────────────────────────
const toolMap = Object.fromEntries(tools.map(t => [safeStr(t.handle || t.slug), toolShape(t)]));
writeJson(path.join(OUT_DIR, "tool-map.json"), toolMap);

// ─── 3. CATEGORY PATHS & MAP ─────────────────────────────────────
const catGroups = new Map();
for (const t of tools) {
  const slug = safeStr(t.catSlug || t.cat_slug || slugify(t.cat || t.category || "other-tools"));
  const name = safeStr(t.cat || t.category, "Other AI Tools");
  if (!catGroups.has(slug)) catGroups.set(slug, { slug, name, tools: [] });
  catGroups.get(slug).tools.push(t);
}
const sortedCats    = [...catGroups.values()].sort((a, b) => b.tools.length - a.tools.length);
const categoryPaths = sortedCats.map(c => c.slug);
const categoryMap   = Object.fromEntries(sortedCats.map(cat => {
  const topTools = [...cat.tools]
    .sort((a, b) => safeNum(b.display_score) - safeNum(a.display_score))
    .slice(0, 48).map(toolShape);
  return [cat.slug, {
    slug: cat.slug, name: cat.name, count: cat.tools.length,
    tools: topTools, top_tools: topTools.slice(0, 10),
    description: `Discover the ${cat.tools.length} best ${cat.name.toLowerCase()} AI tools. Compare pricing, features and alternatives.`,
    seo_title: `Best ${cat.name} AI Tools ${new Date().getFullYear()} — Compare & Review`,
  }];
}));
writeJson(path.join(OUT_DIR, "category-paths.json"), categoryPaths);
writeJson(path.join(OUT_DIR, "category-map.json"),   categoryMap);
const categoryTop10 = Object.fromEntries(sortedCats.map(cat => [
  cat.slug,
  [...cat.tools].sort((a,b)=>safeNum(b.display_score)-safeNum(a.display_score)).slice(0,10).map(toolShape)
]));
writeJson(path.join(OUT_DIR, "category-top10.json"), categoryTop10);

// ─── 4. RELATED MAP ──────────────────────────────────────────────
const relatedMap = Object.fromEntries(tools.map(t => [
  safeStr(t.handle || t.slug),
  safeArr(t.related_tools).slice(0, 8).filter(h => toolMap[h]).map(h => ({
    handle: h, slug: h, name: toolMap[h].name, tagline: toolMap[h].tagline,
    pricing_tier: toolMap[h].pricing_tier, logo_domain: toolMap[h].logo_domain,
    affiliate_url: toolMap[h].affiliate_url, category: toolMap[h].category,
  })),
]));
writeJson(path.join(OUT_DIR, "related-map.json"), relatedMap);

// ─── 5. COMPARE MAP + PAIRS ──────────────────────────────────────
const compareMap   = Object.fromEntries(tools.map(t => [safeStr(t.handle||t.slug), safeArr(t.comparison_targets).slice(0,6)]));
const seenPairs    = new Set();
const comparePairs = [];
for (const [handle, targets] of Object.entries(compareMap)) {
  for (const target of targets) {
    const key = [handle, target].sort().join("__vs__");
    if (!seenPairs.has(key) && toolMap[handle] && toolMap[target]) {
      seenPairs.add(key);
      const [a, b] = [handle, target].sort();
      comparePairs.push({ a, b, slug: `${a}-vs-${b}` });
    }
  }
}
writeJson(path.join(OUT_DIR, "compare-map.json"),   compareMap);
writeJson(path.join(OUT_DIR, "compare-pairs.json"),  comparePairs);

// ─── 6. ALTERNATIVES MAP ─────────────────────────────────────────
const alternativesMap = Object.fromEntries(tools.map(t => {
  const handle = safeStr(t.handle || t.slug);
  return [handle, safeArr(t.related_tools).slice(0, 8).filter(h => toolMap[h])
    .sort((a,b) => (toolMap[b]?.display_score??0)-(toolMap[a]?.display_score??0))
    .map(h => ({ handle:h, slug:h, name:toolMap[h].name, tagline:toolMap[h].tagline,
      pricing_tier:toolMap[h].pricing_tier, logo_domain:toolMap[h].logo_domain,
      affiliate_url:toolMap[h].affiliate_url, category:toolMap[h].category }))];
}));
writeJson(path.join(OUT_DIR, "alternatives-map.json"), alternativesMap);

// ─── 7. BEST-OF MAP ──────────────────────────────────────────────
const bestOfGroups = new Map();
for (const t of tools) {
  for (const q of safeArr(t.best_for_queries)) {
    const slug = slugify(q); if (!slug || slug.length < 3) continue;
    if (!bestOfGroups.has(slug)) bestOfGroups.set(slug, { slug, query: q, tools: [] });
    bestOfGroups.get(slug).tools.push(t);
  }
}
const bestOfMap = Object.fromEntries([...bestOfGroups.entries()]
  .filter(([,g]) => g.tools.length >= 3)
  .map(([slug, g]) => {
    const sorted = [...g.tools].sort((a,b)=>safeNum(b.commercial_intent_score)-safeNum(a.commercial_intent_score)).slice(0,24).map(toolShape);
    return [slug, { slug, name: g.query, tools: sorted, count: sorted.length,
      description: `The best AI tools for ${g.query} in ${new Date().getFullYear()}.`,
      seo_title: `Best AI Tools for ${g.query} — Top ${sorted.length} Options` }];
  }));
const bestOfPaths = Object.keys(bestOfMap);
writeJson(path.join(OUT_DIR, "best-of-map.json"),   bestOfMap);
writeJson(path.join(OUT_DIR, "best-of-paths.json"),  bestOfPaths);

// ─── 8. PROMPT LIBRARY ───────────────────────────────────────────
const promptTools = tools.filter(t => safeNum(t.prompt_library_score) >= 40 && safeArr(t.prompt_use_cases).length > 0)
  .sort((a,b) => safeNum(b.prompt_library_score)-safeNum(a.prompt_library_score));
const promptMap   = Object.fromEntries(promptTools.map(t => {
  const shape = toolShape(t);
  return [shape.handle, { ...shape, prompt_use_cases: safeArr(t.prompt_use_cases),
    example_prompts: safeArr(t.example_prompts).slice(0,5),
    prompt_description: trim(safeStr(t.prompt_description || shape.description), 500) }];
}));
const promptPaths = promptTools.map(t => safeStr(t.handle || t.slug));
writeJson(path.join(OUT_DIR, "prompt-library-map.json"),   promptMap);
writeJson(path.join(OUT_DIR, "prompt-library-paths.json"),  promptPaths);

// ─── 9. TAG MAP ──────────────────────────────────────────────────
const tagGroups = new Map();
for (const t of tools) {
  for (const tag of safeArr(t.tags).slice(0, 10)) {
    const slug = slugify(tag); if (!slug || slug.length < 2) continue;
    if (!tagGroups.has(slug)) tagGroups.set(slug, { slug, name: tag, tools: [] });
    tagGroups.get(slug).tools.push(t);
  }
}
const tagMap = Object.fromEntries([...tagGroups.entries()].filter(([,g])=>g.tools.length>=3).map(([slug,g]) => {
  const sorted = [...g.tools].sort((a,b)=>safeNum(b.display_score)-safeNum(a.display_score)).slice(0,48).map(toolShape);
  return [slug, { slug, name:g.name, count:g.tools.length, tools:sorted,
    description:`Best AI tools tagged with "${g.name}". Compare features, pricing and alternatives.`,
    seo_title:`Best AI Tools for ${g.name} — Top Options ${new Date().getFullYear()}` }];
}));
const tagPaths = Object.keys(tagMap);
writeJson(path.join(OUT_DIR, "tag-map.json"),   tagMap);
writeJson(path.join(OUT_DIR, "tag-paths.json"),  tagPaths);

// ─── 10. USE-CASE MAP (min: 2 tools) ─────────────────────────────
const ucGroups = new Map();
for (const t of tools) {
  for (const uc of safeArr(t.use_cases).slice(0, 6)) {
    const slug = slugify(uc); if (!slug || slug.length < 3) continue;
    if (!ucGroups.has(slug)) ucGroups.set(slug, { slug, name: uc, tools: [] });
    ucGroups.get(slug).tools.push(t);
  }
}
const ucMap = Object.fromEntries([...ucGroups.entries()].filter(([,g])=>g.tools.length>=2).map(([slug,g]) => {
  const sorted = [...g.tools].sort((a,b)=>safeNum(b.display_score)-safeNum(a.display_score)).slice(0,48).map(toolShape);
  return [slug, { slug, name:g.name, count:g.tools.length, tools:sorted,
    description:`Best AI tools for ${g.name}. Find and compare the top ${sorted.length} options.`,
    seo_title:`Best AI Tools for ${g.name} — Compare ${sorted.length} Options` }];
}));
const ucPaths = Object.keys(ucMap);
writeJson(path.join(OUT_DIR, "use-case-map.json"),   ucMap);
writeJson(path.join(OUT_DIR, "use-case-paths.json"),  ucPaths);

// ─── 11. INDUSTRY MAP ────────────────────────────────────────────
const indGroups = new Map();
for (const t of tools) {
  for (const ind of safeArr(t.industries).slice(0, 4)) {
    const slug = slugify(ind); if (!slug || slug.length < 2) continue;
    if (!indGroups.has(slug)) indGroups.set(slug, { slug, name: ind, tools: [] });
    indGroups.get(slug).tools.push(t);
  }
}
const indMap = Object.fromEntries([...indGroups.entries()].filter(([,g])=>g.tools.length>=3).map(([slug,g]) => {
  const sorted = [...g.tools].sort((a,b)=>safeNum(b.display_score)-safeNum(a.display_score)).slice(0,48).map(toolShape);
  return [slug, { slug, name:g.name, count:g.tools.length, tools:sorted,
    description:`Best AI tools for the ${g.name} industry. Compare ${sorted.length} options.` }];
}));
const indPaths = Object.keys(indMap);
writeJson(path.join(OUT_DIR, "industry-map.json"),   indMap);
writeJson(path.join(OUT_DIR, "industry-paths.json"),  indPaths);

// ─── 12. FEATURE MAP ─────────────────────────────────────────────
const featGroups = new Map();
for (const t of tools) {
  for (const ff of safeArr(t.feature_flags).slice(0, 6)) {
    const slug = slugify(ff); if (!slug || slug.length < 2) continue;
    if (!featGroups.has(slug)) featGroups.set(slug, { slug, name: ff, tools: [] });
    featGroups.get(slug).tools.push(t);
  }
}
const featureMap = Object.fromEntries([...featGroups.entries()].filter(([,g])=>g.tools.length>=3).map(([slug,g]) => {
  const sorted = [...g.tools].sort((a,b)=>safeNum(b.display_score)-safeNum(a.display_score)).slice(0,48).map(toolShape);
  return [slug, { slug, name:g.name, count:sorted.length, tools:sorted }];
}));
const featurePaths = Object.keys(featureMap);
writeJson(path.join(OUT_DIR, "feature-map.json"),   featureMap);
writeJson(path.join(OUT_DIR, "feature-paths.json"),  featurePaths);

// ─── 13. PRICING MAP ─────────────────────────────────────────────
const PRICING_TIERS = ["free","freemium","paid"];
const getPricing    = (t) => safeStr(t.pricing || t.pricing_tier,"").toLowerCase();
const pricingMap    = Object.fromEntries(PRICING_TIERS.map(tier => {
  const label = tier.charAt(0).toUpperCase()+tier.slice(1);
  const tTools = tools.filter(t=>getPricing(t)===tier).sort((a,b)=>safeNum(b.display_score)-safeNum(a.display_score)).slice(0,200).map(toolShape);
  return [tier, { slug:tier, name:label, count:tTools.length, tools:tTools,
    description:`Browse all ${label} AI tools. Compare ${tTools.length} options.`,
    seo_title:`Best ${label} AI Tools ${new Date().getFullYear()} — Top Picks` }];
}));
const pricingPaths = PRICING_TIERS.filter(t=>pricingMap[t]?.count>0);
writeJson(path.join(OUT_DIR, "pricing-map.json"),   pricingMap);
writeJson(path.join(OUT_DIR, "pricing-paths.json"),  pricingPaths);

// ─── 14. TOOL-TYPE MAP ───────────────────────────────────────────
const ttGroups = new Map();
for (const t of tools) {
  const rawType = safeStr(t.tool_type || t.type || t.cat,"").trim();
  if (!rawType) continue;
  const slug = slugify(rawType); if (!slug || slug.length < 2) continue;
  if (!ttGroups.has(slug)) ttGroups.set(slug, { slug, name:rawType, tools:[] });
  ttGroups.get(slug).tools.push(t);
}
const ttMap = Object.fromEntries([...ttGroups.entries()].filter(([,g])=>g.tools.length>=3).map(([slug,g]) => {
  const sorted = [...g.tools].sort((a,b)=>safeNum(b.display_score)-safeNum(a.display_score)).slice(0,48).map(toolShape);
  return [slug, { slug, name:g.name, count:sorted.length, tools:sorted }];
}));
const ttPaths = Object.keys(ttMap);
writeJson(path.join(OUT_DIR, "tool-type-map.json"),   ttMap);
writeJson(path.join(OUT_DIR, "tool-type-paths.json"),  ttPaths);

// ─── 15. COMPANY MAP (NEW) ───────────────────────────────────────
const companyGroups = new Map();
for (const t of tools) {
  const company = safeStr(t.company || t.brand || ""); if (!company || company.length < 2) continue;
  const slug = slugify(company); if (!slug) continue;
  if (!companyGroups.has(slug)) companyGroups.set(slug, { slug, name:company, tools:[] });
  companyGroups.get(slug).tools.push(t);
}
const companyMap = Object.fromEntries([...companyGroups.entries()].filter(([,g])=>g.tools.length>=1).map(([slug,g]) => {
  const sorted = [...g.tools].sort((a,b)=>safeNum(b.display_score)-safeNum(a.display_score)).slice(0,24).map(toolShape);
  return [slug, { slug, name:g.name, count:g.tools.length, tools:sorted,
    description:`All AI tools by ${g.name}. Compare features, pricing and alternatives.`,
    seo_title:`${g.name} AI Tools — All Products & Pricing` }];
}));
const companyPaths = Object.keys(companyMap);
writeJson(path.join(OUT_DIR, "company-map.json"),   companyMap);
writeJson(path.join(OUT_DIR, "company-paths.json"),  companyPaths);

// ─── 16. FEATURED TOOLS ──────────────────────────────────────────
const featuredGlobal = toolsByScore
  .filter(t => safeStr(t.desc || t.short || t.description).length >= 20)
  .sort((a,b) => safeNum(b.homepage_priority_score)-safeNum(a.homepage_priority_score))
  .slice(0,50).map(toolShape);
const featuredByCategory = Object.fromEntries(sortedCats.slice(0,23).map(cat => [
  cat.slug,
  [...cat.tools].sort((a,b)=>safeNum(b.homepage_priority_score)-safeNum(a.homepage_priority_score)).slice(0,10).map(toolShape)
]));
writeJson(path.join(OUT_DIR, "featured-tools.json"), {
  generated_at: new Date().toISOString(), global_top: featuredGlobal, by_category: featuredByCategory
});

// ─── 17. HOMEPAGE DATA ───────────────────────────────────────────
const newTools = tools.filter(t => safeStr(t.added_date || t.created_at))
  .sort((a,b) => (b.added_date||b.created_at||"").localeCompare(a.added_date||a.created_at||""))
  .slice(0,12).map(toolShape);
writeJson(path.join(OUT_DIR, "homepage-data.json"), {
  generated_at: new Date().toISOString(), total_tools: tools.length,
  total_cats: sortedCats.length, total_compare: comparePairs.length, total_bestof: bestOfPaths.length,
  featured_tools: featuredGlobal.slice(0,10),
  new_tools: newTools.length > 0 ? newTools : featuredGlobal.slice(6,14),
  pricing_dist: {
    free:     tools.filter(t=>getPricing(t)==="free").length,
    freemium: tools.filter(t=>getPricing(t)==="freemium").length,
    paid:     tools.filter(t=>getPricing(t)==="paid").length,
  },
});

// ─── 18-19. PRICING STATS + CATEGORY STATS ───────────────────────
writeJson(path.join(OUT_DIR, "pricing-stats.json"), {
  free:     tools.filter(t=>getPricing(t)==="free").length,
  freemium: tools.filter(t=>getPricing(t)==="freemium").length,
  paid:     tools.filter(t=>getPricing(t)==="paid").length,
  unknown:  tools.filter(t=>!["free","freemium","paid"].includes(getPricing(t))).length,
});
writeJson(path.join(OUT_DIR, "category-stats.json"),
  Object.fromEntries(sortedCats.map(c => [c.name, c.tools.length]))
);

// ─── 20. SITEMAP DATA ────────────────────────────────────────────
const sitemapData = {
  generated_at: new Date().toISOString(),
  urls: [
    { path:"/",          priority:1.0, changefreq:"daily"   },
    { path:"/tools",  priority:0.9, changefreq:"daily"   },
    { path:"/vs",        priority:0.7, changefreq:"weekly"  },
    { path:"/best",      priority:0.7, changefreq:"weekly"  },
    { path:"/prompts",   priority:0.7, changefreq:"weekly"  },
    { path:"/ai-news",   priority:0.6, changefreq:"daily"   },
    ...categoryPaths.map(s  => ({ path:`/tools/category/${s}`,  priority:0.8, changefreq:"weekly"  })),
    ...tagPaths.map(s       => ({ path:`/tools/tag/${s}`,        priority:0.6, changefreq:"weekly"  })),
    ...indPaths.map(s       => ({ path:`/tools/industry/${s}`,   priority:0.6, changefreq:"weekly"  })),
    ...ucPaths.map(s        => ({ path:`/tools/use-case/${s}`,   priority:0.6, changefreq:"weekly"  })),
    ...pricingPaths.map(s   => ({ path:`/tools/pricing/${s}`,    priority:0.7, changefreq:"weekly"  })),
    ...bestOfPaths.map(s    => ({ path:`/best/${s}`,                 priority:0.65,changefreq:"weekly"  })),
    ...companyPaths.map(s   => ({ path:`/tools/company/${s}`,    priority:0.6, changefreq:"monthly" })),
    ...toolPaths.slice(0,500).map(h  => ({ path:`/tools/${h}`,   priority:0.7, changefreq:"monthly" })),
    ...toolPaths.slice(500).map(h    => ({ path:`/tools/${h}`,   priority:0.5, changefreq:"monthly" })),
    ...comparePairs.slice(0,10000).map(p => ({ path:`/vs/${p.slug}`,priority:0.5, changefreq:"monthly" })),
  ],
};
writeJson(path.join(OUT_DIR, "sitemap-data.json"), sitemapData);

// ─── 21. BUILD META ──────────────────────────────────────────────
writeJson(path.join(OUT_DIR, "build-meta.json"), {
  generated_at: new Date().toISOString(), version:"v4",
  tool_count: tools.length, category_count: sortedCats.length,
  tag_count: tagPaths.length, industry_count: indPaths.length,
  feature_count: featurePaths.length, use_case_count: ucPaths.length,
  company_count: companyPaths.length, compare_pairs: comparePairs.length,
  best_of_pages: bestOfPaths.length, prompt_tools: promptPaths.length,
  sitemap_urls: sitemapData.urls.length, skipped: skipped.length, duplicates: duplicates.length,
  limits: { tool_page_limit:TOOL_PAGE_LIMIT, compare_page_limit:COMPARE_PAGE_LIMIT, alt_page_limit:ALT_PAGE_LIMIT },
});
writeJson(path.join(OUT_DIR, "skipped-records.json"), {
  skipped: skipped.slice(0,100), duplicates: duplicates.slice(0,100),
  dup_urls: [...seenUrls.entries()].filter(([,n])=>n>1).slice(0,100).map(([url,n])=>({url,n})),
});

// ─── 22. TOOL PAGE DATA ──────────────────────────────────────────
// TOOL_PAGE_LIMIT controls how many pages are generated.
// Memory estimate: ~1KB/tool in file. 5000 = ~5MB, 10000 = ~10MB, 15000 = ~15MB
// Cloudflare free: set TOOL_PAGE_LIMIT=10000 + NODE_OPTIONS=--max-old-space-size=3072
console.log(`\n── Tool page data (TOOL_PAGE_LIMIT=${TOOL_PAGE_LIMIT}) ──`);
const compactRelated = (h) => {
  const t = toolMap[h]; if (!t) return null;
  return { handle:t.handle, slug:t.handle, name:t.name, tagline:t.tagline,
    pricing_tier:t.pricing_tier, logo_domain:t.logo_domain,
    affiliate_url:t.affiliate_url, category:t.category, category_slug:t.category_slug };
};
const toolPageData = Object.fromEntries(
  toolPaths.slice(0, TOOL_PAGE_LIMIT).map(h => {
    const t = toolMap[h]; if (!t) return null;
    return [h, { ...t, description: trim(t.description, 1000),
      related:      safeArr(t.related_tools).slice(0,6).map(compactRelated).filter(Boolean),
      compare_with: safeArr(t.compare_targets).slice(0,4).map(compactRelated).filter(Boolean) }];
  }).filter(Boolean)
);
writeJson(path.join(OUT_DIR, "tool-page-data.json"), toolPageData);

// ─── 23. ALTERNATIVES PAGE DATA ──────────────────────────────────
console.log(`── Alternatives page data (ALT_PAGE_LIMIT=${ALT_PAGE_LIMIT}) ──`);
const altPageData = Object.fromEntries(
  toolPaths.slice(0, ALT_PAGE_LIMIT).filter(h => toolMap[h]).map(h => {
    const t = toolMap[h];
    return [h, { handle:t.handle, slug:t.handle, name:t.name, tagline:t.tagline,
      description:trim(t.description,500), pricing_tier:t.pricing_tier,
      logo_domain:t.logo_domain, category:t.category, category_slug:t.category_slug,
      alts: safeArr(t.related_tools).slice(0,8).map(compactRelated).filter(Boolean) }];
  })
);
writeJson(path.join(OUT_DIR, "alternatives-page-data.json"), altPageData);

// ─── 24. COMPARE PAGE DATA ───────────────────────────────────────
console.log(`── Compare page data (COMPARE_PAGE_LIMIT=${COMPARE_PAGE_LIMIT}) ──`);
const comparePageData = Object.fromEntries(
  comparePairs.slice(0, COMPARE_PAGE_LIMIT).filter(p => toolMap[p.a] && toolMap[p.b]).map(p => {
    const enrich = (t) => ({ ...compactRelated(t.handle), tagline:t.tagline,
      description:trim(t.description,400), website_url:t.website_url,
      feature_tags:t.feature_tags, has_api:t.has_api, has_mobile:t.has_mobile,
      has_chrome_ext:t.has_chrome_ext, is_open_source:t.is_open_source });
    const ta = toolMap[p.a], tb = toolMap[p.b];
    return [p.slug, { slug:p.slug, toolA:enrich(ta), toolB:enrich(tb),
      seo_title:`${ta.name} vs ${tb.name} — Full Comparison ${new Date().getFullYear()}`,
      seo_description:`Compare ${ta.name} vs ${tb.name}: pricing, features, and which is right for you.` }];
  })
);
writeJson(path.join(OUT_DIR, "compare-page-data.json"), comparePageData);

// ─── 25. SEARCH INDEX (lightweight) ─────────────────────────────
const searchIndex = tools.map(t => ({
  h: safeStr(t.handle||t.slug), n: safeStr(t.name_clean||t.name),
  c: safeStr(t.cat||t.category,""), p: safeStr(t.pricing||t.pricing_tier,""),
  t: trim(safeStr(t.short||t.desc||""),80), s: safeNum(t.display_score),
  l: safeStr(t.logo_domain||t.canonical_domain||(t.logo_url?.match(/clearbit\.com\/([^?&]+)/)?.[1])||""),
}));
fs.writeFileSync(path.join(root,"src/data/tools_search_index.json"), JSON.stringify(searchIndex), "utf8");
const siKb = (JSON.stringify(searchIndex).length/1024).toFixed(1);
console.log(`  ✓ ${"tools_search_index.json".padEnd(38)} ${siKb.padStart(8)} KB  (src/data/)`);

// ─── SUMMARY ─────────────────────────────────────────────────────
console.log("\n✅ All datasets generated — v4");
console.log("──────────────────────────────────────────");
console.log(`Tools:           ${tools.length.toLocaleString()}`);
console.log(`Categories:      ${sortedCats.length}`);
console.log(`Tags:            ${tagPaths.length}`);
console.log(`Industries:      ${indPaths.length}`);
console.log(`Use Cases:       ${ucPaths.length}`);
console.log(`Companies:       ${companyPaths.length}`);
console.log(`Compare pairs:   ${comparePairs.length.toLocaleString()}`);
console.log(`Best-of pages:   ${bestOfPaths.length}`);
console.log(`Prompts:         ${promptPaths.length}`);
console.log(`Sitemap URLs:    ${sitemapData.urls.length.toLocaleString()}`);
console.log(`\nTool pages:    ${TOOL_PAGE_LIMIT.toLocaleString()} / ${tools.length.toLocaleString()} total`);
console.log(`Alt pages:     ${ALT_PAGE_LIMIT.toLocaleString()} / ${tools.length.toLocaleString()} total`);
console.log(`Compare pages: ${COMPARE_PAGE_LIMIT.toLocaleString()} / ${comparePairs.length.toLocaleString()} total`);
console.log(`\nOutput: ${OUT_DIR}\n`);
