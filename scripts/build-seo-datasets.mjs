/**
 * AI Experts Corner — build-seo-datasets.mjs v3
 * ─────────────────────────────────────────────
 * Generates ALL static JSON datasets for the Astro build.
 *
 * v3 additions over v2:
 *  - tag-map.json + tag-paths.json
 *  - use-case-map.json + use-case-paths.json
 *  - industry-map.json + industry-paths.json
 *  - feature-map.json + feature-paths.json
 *  - pricing-map.json + pricing-paths.json  (proper structure, was 0 KB)
 *  - tool-type-map.json + tool-type-paths.json
 *  - compare-pairs.json now includes .slug field for Astro routing
 *  - featured-tools.json has global_top[] with full tool objects
 *  - category-map.json has full tool objects (not just handles)
 */

import fs   from "fs";
import path from "path";

const root    = process.cwd();
const INPUT   = path.join(root, "src/data/tools_production.json");
const OUT_DIR = path.join(root, "src/data/build");

// ─── UTILITIES ───────────────────────────────────────────────────

const slugify = (v = "") =>
  String(v).toLowerCase().trim()
    .replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "").replace(/-{2,}/g, "-");

const safeStr = (v, fb = "")  => typeof v === "string" ? v.trim() : fb;
const safeArr = (v)           => Array.isArray(v) ? v.filter(Boolean).map(s => String(s).trim()) : [];
const safeNum = (v, fb = 0)   => typeof v === "number" && isFinite(v) ? v : fb;

const readJson = (filePath) => {
  if (!fs.existsSync(filePath)) throw new Error(`Input file not found: ${filePath}`);
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "").trim();
  try { return JSON.parse(raw); }
  catch (e) { throw new Error(`Invalid JSON in ${filePath}: ${e.message}`); }
};

const writeJson = (filePath, data) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  const kb = (JSON.stringify(data).length / 1024).toFixed(1);
  console.log(`  ✓ ${path.basename(filePath).padEnd(35)} ${kb} KB`);
};

// ─── LOAD ────────────────────────────────────────────────────────

console.log("\nAI Experts Corner — Build SEO Datasets v3");
console.log("────────────────────────────────────────────");
console.log(`Input: ${INPUT}\n`);

const raw = readJson(INPUT);
if (!Array.isArray(raw)) throw new Error("tools_production.json must be an array");
console.log(`Loaded:  ${raw.length} raw tools`);

// ─── FILTER ──────────────────────────────────────────────────────

const skipped = [], duplicates = [];
const seen = new Set();
const tools = [];

for (let i = 0; i < raw.length; i++) {
  const item = raw[i];
  const handle = safeStr(item?.handle);
  const name   = safeStr(item?.name);
  if (!handle || !name) { skipped.push({ i, reason: "missing handle/name" }); continue; }
  if (seen.has(handle))  { duplicates.push(handle); continue; }
  seen.add(handle);
  if (item.visibility === "hidden" || item.indexable === false || item.is_canonical === false) {
    skipped.push({ handle, reason: "non-public" }); continue;
  }
  tools.push(item);
}

console.log(`Public:  ${tools.length} tools`);
console.log(`Skipped: ${skipped.length}  Dupes: ${duplicates.length}\n`);
console.log("Writing datasets...");

// ─── TOOL SHAPE ──────────────────────────────────────────────────
// Compact tool object used in all maps (avoids duplicating huge fields)

const toolShape = (t) => ({
  handle:        safeStr(t.handle),
  name:          safeStr(t.name_clean || t.name),
  tagline:       safeStr(t.seo_title || t.short || t.desc).slice(0, 120),
  description:   safeStr(t.desc || t.short),
  pricing_tier:  safeStr(t.pricing || t.pricing_tier, "Unknown"),
  logo_domain:   safeStr(t.canonical_domain || t.logo_url?.match(/clearbit\.com\/([^?]+)/)?.[1] || ""),
  website_url:   safeStr(t.url),
  affiliate_url: t.partnerstack_match ? safeStr(t.url) : "",
  category:      safeStr(t.cat, "Other AI Tools"),
  category_slug: safeStr(t.catSlug || slugify(t.cat || "other")),
  feature_tags:  safeArr(t.tags).slice(0, 6),
  use_cases:     safeArr(t.use_cases).slice(0, 4),
  industries:    safeArr(t.industries).slice(0, 3),
  display_score: safeNum(t.display_score),
  is_featured:   safeNum(t.homepage_priority_score) >= 70,
  has_api:           !!t.has_api,
  has_mobile:        !!t.has_mobile,
  has_chrome_ext:    !!t.has_chrome_ext,
  is_open_source:    !!t.is_open_source,
  related_tools:     safeArr(t.related_tools).slice(0, 6),
  compare_targets:   safeArr(t.comparison_targets).slice(0, 4),
  seo_title:         safeStr(t.seo_title),
  seo_description:   safeStr(t.seo_description),
  complexity:        safeStr(t.complexity),
  target_audience:   safeStr(Array.isArray(t.target_audience) ? t.target_audience[0] : t.target_audience),
  workflow_stage:    safeStr(Array.isArray(t.workflow_stage) ? t.workflow_stage[0] : t.workflow_stage),
  commercial_score:  safeNum(t.commercial_intent_score),
  homepage_score:    safeNum(t.homepage_priority_score),
  prompt_score:      safeNum(t.prompt_library_score),
});

// ─── 1. TOOL PATHS ───────────────────────────────────────────────

const toolsByScore = [...tools].sort((a, b) => safeNum(b.display_score) - safeNum(a.display_score));
const toolPaths = toolsByScore.map(t => t.handle);
writeJson(path.join(OUT_DIR, "tool-paths.json"), toolPaths);

// ─── 2. TOOL MAP ─────────────────────────────────────────────────

const toolMap = Object.fromEntries(tools.map(t => [t.handle, toolShape(t)]));
writeJson(path.join(OUT_DIR, "tool-map.json"), toolMap);

// ─── 3. CATEGORY PATHS & MAP ─────────────────────────────────────

const catGroups = new Map();
for (const t of tools) {
  const slug = safeStr(t.catSlug || slugify(t.cat || "other"));
  const name = safeStr(t.cat, "Other AI Tools");
  if (!catGroups.has(slug)) catGroups.set(slug, { slug, name, tools: [] });
  catGroups.get(slug).tools.push(t);
}
const sortedCats = [...catGroups.values()].sort((a, b) => b.tools.length - a.tools.length);
const categoryPaths = sortedCats.map(c => c.slug);
const categoryMap = Object.fromEntries(sortedCats.map(cat => {
  const topTools = [...cat.tools]
    .sort((a, b) => safeNum(b.display_score) - safeNum(a.display_score))
    .slice(0, 48)
    .map(toolShape);
  return [cat.slug, {
    slug: cat.slug, name: cat.name, count: cat.tools.length,
    tools: topTools,
    seo_title: `Best ${cat.name} Tools — Top AI Tools for ${cat.name}`,
    description: `Discover the ${cat.tools.length} best ${cat.name.toLowerCase()} tools. Compare pricing, features and alternatives.`,
  }];
}));
writeJson(path.join(OUT_DIR, "category-paths.json"), categoryPaths);
writeJson(path.join(OUT_DIR, "category-map.json"), categoryMap);

// ─── 4. RELATED MAP ──────────────────────────────────────────────

// related-map: store compact tool objects (NOT nested full objects — keeps size small)
const relatedMap = Object.fromEntries(tools.map(t => [
  t.handle,
  safeArr(t.related_tools).slice(0, 8)
    .filter(h => toolMap[h])
    .map(h => ({ handle: h, name: toolMap[h].name, tagline: toolMap[h].tagline, pricing_tier: toolMap[h].pricing_tier, logo_domain: toolMap[h].logo_domain, affiliate_url: toolMap[h].affiliate_url })),
]));
writeJson(path.join(OUT_DIR, "related-map.json"), relatedMap);

// ─── 5. COMPARE MAP + PAIRS ──────────────────────────────────────

const compareMap = Object.fromEntries(tools.map(t => [t.handle, safeArr(t.comparison_targets).slice(0, 4)]));
const seenPairs  = new Set();
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
writeJson(path.join(OUT_DIR, "compare-map.json"), compareMap);
writeJson(path.join(OUT_DIR, "compare-pairs.json"), comparePairs);

// ─── 6. ALTERNATIVES MAP ─────────────────────────────────────────

const alternativesMap = Object.fromEntries(tools.map(t => {
  const alts = safeArr(t.related_tools).slice(0, 8)
    .filter(h => toolMap[h])
    .sort((a, b) => (toolMap[b]?.display_score ?? 0) - (toolMap[a]?.display_score ?? 0))
    .map(h => ({ handle: h, name: toolMap[h].name, tagline: toolMap[h].tagline, pricing_tier: toolMap[h].pricing_tier, logo_domain: toolMap[h].logo_domain, affiliate_url: toolMap[h].affiliate_url }));
  return [t.handle, alts];
}));
writeJson(path.join(OUT_DIR, "alternatives-map.json"), alternativesMap);

// ─── 7. BEST-OF MAP ──────────────────────────────────────────────

const bestOfGroups = new Map();
for (const t of tools) {
  for (const q of safeArr(t.best_for_queries)) {
    const slug = slugify(q);
    if (!slug) continue;
    if (!bestOfGroups.has(slug)) bestOfGroups.set(slug, { slug, query: q, tools: [] });
    bestOfGroups.get(slug).tools.push(t);
  }
}
const bestOfMap = Object.fromEntries(
  [...bestOfGroups.entries()]
    .filter(([, g]) => g.tools.length >= 3)
    .map(([slug, g]) => {
      const sorted = [...g.tools].sort((a, b) => safeNum(b.commercial_intent_score) - safeNum(a.commercial_intent_score)).slice(0, 24).map(toolShape);
      return [slug, { slug, name: g.query, tools: sorted, count: sorted.length,
        description: `The best AI tools for ${g.query}. Compare and find the right tool for your needs.` }];
    })
);
const bestOfPaths = Object.keys(bestOfMap);
writeJson(path.join(OUT_DIR, "best-of-map.json"), bestOfMap);
writeJson(path.join(OUT_DIR, "best-of-paths.json"), bestOfPaths);

// ─── 8. PROMPT LIBRARY ───────────────────────────────────────────

const promptTools = tools
  .filter(t => safeNum(t.prompt_library_score) >= 40 && safeArr(t.prompt_use_cases).length > 0)
  .sort((a, b) => safeNum(b.prompt_library_score) - safeNum(a.prompt_library_score));
const promptMap   = Object.fromEntries(promptTools.map(t => [t.handle, { ...toolShape(t), prompt_use_cases: safeArr(t.prompt_use_cases) }]));
const promptPaths = promptTools.map(t => t.handle);
writeJson(path.join(OUT_DIR, "prompt-library-map.json"), promptMap);
writeJson(path.join(OUT_DIR, "prompt-library-paths.json"), promptPaths);

// ─── 9. TAG MAP + PATHS ──────────────────────────────────────────

const tagGroups = new Map();
for (const t of tools) {
  for (const tag of safeArr(t.tags).slice(0, 8)) {
    const slug = slugify(tag);
    if (!slug || slug.length < 2) continue;
    if (!tagGroups.has(slug)) tagGroups.set(slug, { slug, name: tag, tools: [] });
    tagGroups.get(slug).tools.push(t);
  }
}
const tagMap = Object.fromEntries(
  [...tagGroups.entries()]
    .filter(([, g]) => g.tools.length >= 3)
    .map(([slug, g]) => {
      const sorted = [...g.tools].sort((a, b) => safeNum(b.display_score) - safeNum(a.display_score)).slice(0, 48).map(toolShape);
      return [slug, { slug, name: g.name, count: sorted.length, tools: sorted,
        description: `AI tools tagged with "${g.name}". Compare features, pricing and alternatives.` }];
    })
);
const tagPaths = Object.keys(tagMap);
writeJson(path.join(OUT_DIR, "tag-map.json"), tagMap);
writeJson(path.join(OUT_DIR, "tag-paths.json"), tagPaths);

// ─── 10. USE-CASE MAP + PATHS ────────────────────────────────────

const ucGroups = new Map();
for (const t of tools) {
  for (const uc of safeArr(t.use_cases).slice(0, 5)) {
    const slug = slugify(uc);
    if (!slug || slug.length < 3) continue;
    if (!ucGroups.has(slug)) ucGroups.set(slug, { slug, name: uc, tools: [] });
    ucGroups.get(slug).tools.push(t);
  }
}
const ucMap = Object.fromEntries(
  [...ucGroups.entries()]
    .filter(([, g]) => g.tools.length >= 3)
    .map(([slug, g]) => {
      const sorted = [...g.tools].sort((a, b) => safeNum(b.display_score) - safeNum(a.display_score)).slice(0, 48).map(toolShape);
      return [slug, { slug, name: g.name, count: sorted.length, tools: sorted,
        description: `Best AI tools for ${g.name}. Find and compare the top options.` }];
    })
);
const ucPaths = Object.keys(ucMap);
writeJson(path.join(OUT_DIR, "use-case-map.json"), ucMap);
writeJson(path.join(OUT_DIR, "use-case-paths.json"), ucPaths);

// ─── 11. INDUSTRY MAP + PATHS ────────────────────────────────────

const indGroups = new Map();
for (const t of tools) {
  for (const ind of safeArr(t.industries).slice(0, 4)) {
    const slug = slugify(ind);
    if (!slug || slug.length < 2) continue;
    if (!indGroups.has(slug)) indGroups.set(slug, { slug, name: ind, tools: [] });
    indGroups.get(slug).tools.push(t);
  }
}
const indMap = Object.fromEntries(
  [...indGroups.entries()]
    .filter(([, g]) => g.tools.length >= 3)
    .map(([slug, g]) => {
      const sorted = [...g.tools].sort((a, b) => safeNum(b.display_score) - safeNum(a.display_score)).slice(0, 48).map(toolShape);
      return [slug, { slug, name: g.name, count: sorted.length, tools: sorted,
        description: `Best AI tools for the ${g.name} industry. Compare features and pricing.` }];
    })
);
const indPaths = Object.keys(indMap);
writeJson(path.join(OUT_DIR, "industry-map.json"), indMap);
writeJson(path.join(OUT_DIR, "industry-paths.json"), indPaths);

// ─── 12. FEATURE MAP + PATHS ─────────────────────────────────────

const featGroups = new Map();
for (const t of tools) {
  for (const ff of safeArr(t.feature_flags).slice(0, 6)) {
    const slug = slugify(ff);
    if (!slug || slug.length < 2) continue;
    if (!featGroups.has(slug)) featGroups.set(slug, { slug, name: ff, tools: [] });
    featGroups.get(slug).tools.push(t);
  }
}
const featureMap = Object.fromEntries(
  [...featGroups.entries()]
    .filter(([, g]) => g.tools.length >= 3)
    .map(([slug, g]) => {
      const sorted = [...g.tools].sort((a, b) => safeNum(b.display_score) - safeNum(a.display_score)).slice(0, 48).map(toolShape);
      return [slug, { slug, name: g.name, count: sorted.length, tools: sorted,
        description: `AI tools with ${g.name} feature. Find the best options for your workflow.` }];
    })
);
const featurePaths = Object.keys(featureMap);
writeJson(path.join(OUT_DIR, "feature-map.json"), featureMap);
writeJson(path.join(OUT_DIR, "feature-paths.json"), featurePaths);

// ─── 13. PRICING MAP + PATHS ─────────────────────────────────────

const PRICING_TIERS = ["Free", "Freemium", "Paid"];
const getPricing = (t) => safeStr(t.pricing || t.pricing_tier, "").toLowerCase();
const pricingMap = Object.fromEntries(PRICING_TIERS.map(tier => {
  const slug  = tier.toLowerCase();
  const tTools = tools.filter(t => getPricing(t) === slug)
    .sort((a, b) => safeNum(b.display_score) - safeNum(a.display_score))
    .slice(0, 200)
    .map(toolShape);
  return [slug, { slug, name: tier, count: tTools.length, tools: tTools,
    description: `Browse all ${tier.toLowerCase()} AI tools. Compare features and find the best options.` }];
}));
const pricingPaths = Object.keys(pricingMap).filter(k => pricingMap[k].count > 0);
writeJson(path.join(OUT_DIR, "pricing-map.json"), pricingMap);
writeJson(path.join(OUT_DIR, "pricing-paths.json"), pricingPaths);

// ─── 14. TOOL-TYPE MAP + PATHS ───────────────────────────────────

const ttGroups = new Map();
for (const t of tools) {
  const rawType = safeStr(t.tool_type || t.type || t.cat, "").trim();
  if (!rawType) continue;
  const slug = slugify(rawType);
  if (!slug || slug.length < 2) continue;
  if (!ttGroups.has(slug)) ttGroups.set(slug, { slug, name: rawType, tools: [] });
  ttGroups.get(slug).tools.push(t);
}
const ttMap = Object.fromEntries(
  [...ttGroups.entries()]
    .filter(([, g]) => g.tools.length >= 3)
    .map(([slug, g]) => {
      const sorted = [...g.tools].sort((a, b) => safeNum(b.display_score) - safeNum(a.display_score)).slice(0, 48).map(toolShape);
      return [slug, { slug, name: g.name, count: sorted.length, tools: sorted }];
    })
);
const ttPaths = Object.keys(ttMap);
writeJson(path.join(OUT_DIR, "tool-type-map.json"), ttMap);
writeJson(path.join(OUT_DIR, "tool-type-paths.json"), ttPaths);

// ─── 15. FEATURED TOOLS ──────────────────────────────────────────
// global_top: full tool objects sorted by homepage_priority_score
// by_category: top 5 per category

const featuredGlobal = toolsByScore
  .filter(t => safeStr(t.desc || t.short).length >= 20)
  .sort((a, b) => safeNum(b.homepage_priority_score) - safeNum(a.homepage_priority_score))
  .slice(0, 30)
  .map(toolShape);

const featuredByCategory = Object.fromEntries(
  sortedCats.slice(0, 20).map(cat => [
    cat.slug,
    cat.tools
      .sort((a, b) => safeNum(b.homepage_priority_score) - safeNum(a.homepage_priority_score))
      .slice(0, 5)
      .map(toolShape),
  ])
);

const featuredJson = {
  generated_at: new Date().toISOString(),
  global_top:   featuredGlobal,
  by_category:  featuredByCategory,
};
writeJson(path.join(OUT_DIR, "featured-tools.json"), featuredJson);

// ─── 16. HOMEPAGE DATA ───────────────────────────────────────────

const newTools = tools
  .filter(t => safeStr(t.added_date || t.created_at))
  .sort((a, b) => (b.added_date || b.created_at || "").localeCompare(a.added_date || a.created_at || ""))
  .slice(0, 12)
  .map(toolShape);

const homepageData = {
  generated_at:  new Date().toISOString(),
  total_tools:   tools.length,
  total_cats:    sortedCats.length,
  featured_tools: featuredGlobal.slice(0, 6),
  new_tools:     newTools.length > 0 ? newTools : featuredGlobal.slice(6, 14),
  pricing_dist:  {
    free:     tools.filter(t => getPricing(t) === "free").length,
    freemium: tools.filter(t => getPricing(t) === "freemium").length,
    paid:     tools.filter(t => getPricing(t) === "paid").length,
  },
};
writeJson(path.join(OUT_DIR, "homepage-data.json"), homepageData);

// ─── 17. PRICING STATS ───────────────────────────────────────────

const pricingStats = {
  free:     tools.filter(t => getPricing(t) === "free").length,
  freemium: tools.filter(t => getPricing(t) === "freemium").length,
  paid:     tools.filter(t => getPricing(t) === "paid").length,
  unknown:  tools.filter(t => !["free","freemium","paid"].includes(getPricing(t))).length,
};
writeJson(path.join(OUT_DIR, "pricing-stats.json"), pricingStats);

// ─── 18. CATEGORY STATS ──────────────────────────────────────────

const categoryStats = Object.fromEntries(sortedCats.map(c => [c.name, c.tools.length]));
writeJson(path.join(OUT_DIR, "category-stats.json"), categoryStats);

// ─── 19. SITEMAP DATA ────────────────────────────────────────────

const sitemapData = {
  generated_at: new Date().toISOString(),
  urls: [
    { path: "/",          priority: 1.0, changefreq: "daily"   },
    { path: "/ai-tools",  priority: 0.9, changefreq: "daily"   },
    { path: "/vs",        priority: 0.7, changefreq: "weekly"  },
    { path: "/best",      priority: 0.7, changefreq: "weekly"  },
    ...categoryPaths.map(s => ({ path: `/ai-tools/category/${s}`, priority: 0.8, changefreq: "weekly" })),
    ...toolPaths.slice(0, 500).map(h  => ({ path: `/ai-tools/${h}`, priority: 0.7, changefreq: "monthly" })),
    ...toolPaths.slice(500).map(h     => ({ path: `/ai-tools/${h}`, priority: 0.5, changefreq: "monthly" })),
    ...comparePairs.slice(0, 5000).map(p => ({ path: `/vs/${p.slug}`, priority: 0.6, changefreq: "monthly" })),
    ...bestOfPaths.map(s => ({ path: `/best/${s}`, priority: 0.65, changefreq: "weekly" })),
  ],
};
writeJson(path.join(OUT_DIR, "sitemap-data.json"), sitemapData);

// ─── 20. BUILD META + DEBUG ──────────────────────────────────────

writeJson(path.join(OUT_DIR, "build-meta.json"), {
  generated_at: new Date().toISOString(),
  version: "v3",
  tool_count: tools.length,
  category_count: sortedCats.length,
  tag_count: tagPaths.length,
  industry_count: indPaths.length,
  feature_count: featurePaths.length,
  use_case_count: ucPaths.length,
  compare_pairs: comparePairs.length,
  best_of_pages: bestOfPaths.length,
  sitemap_urls: sitemapData.urls.length,
  skipped: skipped.length,
  duplicates: duplicates.length,
});
writeJson(path.join(OUT_DIR, "skipped-records.json"), { skipped: skipped.slice(0, 100), duplicates: duplicates.slice(0, 100) });

// ─── 21. TOOL PAGE DATA (slim — voor [slug].astro props patroon) ──
// Bevat alleen de top-3000 tools (gesorteerd op score) met embedded related tools.
// Eén bestand < 10MB, vervangt tool-map.json + related-map.json in page renders.

const compactTool = (h) => {
  const t = toolMap[h];
  if (!t) return null;
  return {
    handle: t.handle,
    name: t.name,
    tagline: t.tagline,
    pricing_tier: t.pricing_tier,
    logo_domain: t.logo_domain,
    affiliate_url: t.affiliate_url,
    category: t.category,
    category_slug: t.category_slug,
  };
};

const top3000Handles = toolPaths.slice(0, 3000);

const toolPageData = Object.fromEntries(
  top3000Handles.map(h => {
    const t = toolMap[h];
    if (!t) return [h, null];
    const related = safeArr(t.related_tools).slice(0, 6)
      .map(compactTool).filter(Boolean);
    return [h, { ...t, related }];
  }).filter(([, v]) => v !== null)
);
writeJson(path.join(OUT_DIR, "tool-page-data.json"), toolPageData);

// ─── 22. ALTERNATIVES PAGE DATA (slim) ────────────────────────────
// Top-3000 tools met hun alternatieven embedded. < 8MB.
// Vervangt alternatives-map.json + tool-map.json in alternatives/[slug].astro.

const altPageData = Object.fromEntries(
  top3000Handles
    .filter(h => toolMap[h])
    .map(h => {
      const t = toolMap[h];
      const alts = safeArr(t.related_tools).slice(0, 8)
        .map(compactTool).filter(Boolean);
      return [h, {
        handle: t.handle,
        name: t.name,
        tagline: t.tagline,
        pricing_tier: t.pricing_tier,
        logo_domain: t.logo_domain,
        category: t.category,
        category_slug: t.category_slug,
        alts,
      }];
    })
);
writeJson(path.join(OUT_DIR, "alternatives-page-data.json"), altPageData);

// ─── 23. COMPARE PAGE DATA (slim) ─────────────────────────────────
// Top-2000 compare paren met beide tool objecten embedded. < 3MB.
// Vervangt compare-pairs.json + tool-map.json in vs/[slug].astro.

const comparePageData = Object.fromEntries(
  comparePairs.slice(0, 2000)
    .filter(p => toolMap[p.a] && toolMap[p.b])
    .map(p => {
      const ta = toolMap[p.a];
      const tb = toolMap[p.b];
      return [p.slug, {
        slug: p.slug,
        toolA: { ...compactTool(p.a), tagline: ta.tagline, description: ta.description,
          website_url: ta.website_url, feature_tags: ta.feature_tags,
          has_api: ta.has_api, has_mobile: ta.has_mobile,
          has_chrome_ext: ta.has_chrome_ext, is_open_source: ta.is_open_source },
        toolB: { ...compactTool(p.b), tagline: tb.tagline, description: tb.description,
          website_url: tb.website_url, feature_tags: tb.feature_tags,
          has_api: tb.has_api, has_mobile: tb.has_mobile,
          has_chrome_ext: tb.has_chrome_ext, is_open_source: tb.is_open_source },
      }];
    })
);
writeJson(path.join(OUT_DIR, "compare-page-data.json"), comparePageData);

// ─── SUMMARY ─────────────────────────────────────────────────────

console.log("\n✅ All datasets generated");
console.log("────────────────────────────────────────────");
console.log(`Tools:        ${tools.length}`);
console.log(`Categories:   ${sortedCats.length}`);
console.log(`Tags:         ${tagPaths.length}`);
console.log(`Industries:   ${indPaths.length}`);
console.log(`Features:     ${featurePaths.length}`);
console.log(`Use Cases:    ${ucPaths.length}`);
console.log(`Compare pairs:${comparePairs.length}`);
console.log(`Best-of pages:${bestOfPaths.length}`);
console.log(`Sitemap URLs: ${sitemapData.urls.length}`);
console.log(`Output:       ${OUT_DIR}\n`);
