/**
 * AI Experts Corner — build-seo-datasets.mjs v5
 * ─────────────────────────────────────────────────────────────────
 * Generates ALL static JSON datasets for the Astro build.
 *
 * v5 upgrades:
 *  - PRIMARY INPUT = tools-master-mapped.json
 *  - MASTER TAXONOMY is now the canonical grouping source
 *  - BACKWARD COMPATIBLE with legacy category/tag/use_case fields
 *  - NEW: subcategory-map.json + subcategory-paths.json
 *  - NEW: microcategory-map.json + microcategory-paths.json
 *  - NEW: workflow-map.json + workflow-paths.json
 *  - NEW: capability-map.json + capability-paths.json
 *  - EXTENDED toolShape with master taxonomy fields
 *  - SITEMAP expanded with subcategory/microcategory/workflow/capability URLs
 */

import fs from "fs";
import path from "path";

const root = process.cwd();
const INPUT = process.env.SEO_DATASET_INPUT
  ? path.resolve(process.env.SEO_DATASET_INPUT)
  : path.join(root, "src/data/build/tools-master-mapped.json");
const OUT_DIR = path.join(root, "src/data/build");

// ─── ENV-VAR LIMITS ──────────────────────────────────────────────
const TOOL_PAGE_LIMIT = parseInt(process.env.TOOL_PAGE_LIMIT || "5000", 10);
const COMPARE_PAGE_LIMIT = parseInt(process.env.COMPARE_PAGE_LIMIT || "3000", 10);
const ALT_PAGE_LIMIT = parseInt(process.env.ALT_PAGE_LIMIT || "5000", 10);

console.log(`\nAI Experts Corner — Build SEO Datasets v5`);
console.log(`──────────────────────────────────────────`);
console.log(`Limits: tools=${TOOL_PAGE_LIMIT}  compare=${COMPARE_PAGE_LIMIT}  alt=${ALT_PAGE_LIMIT}`);
console.log(`Input:  ${INPUT}\n`);

// ─── UTILITIES ───────────────────────────────────────────────────
const slugify = (v = "") =>
  String(v)
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "")
    .replace(/-{2,}/g, "-");

const safeStr = (v, fb = "") => (typeof v === "string" && v.trim() ? v.trim() : fb);
const safeArr = (v) => (Array.isArray(v) ? v.filter(Boolean).map((s) => String(s).trim()) : []);
const safeNum = (v, fb = 0) => (typeof v === "number" && isFinite(v) ? v : fb);
const trim = (v, n = 1000) => safeStr(v).slice(0, n);
const unique = (arr) => [...new Set((arr || []).filter(Boolean))];
const currentYear = new Date().getFullYear();

const readJson = (filePath) => {
  if (!fs.existsSync(filePath)) throw new Error(`Input file not found: ${filePath}`);
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "").trim();
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`Invalid JSON in ${filePath}: ${e.message}`);
  }
};

const writeJson = (filePath, data) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const str = JSON.stringify(data);
  fs.writeFileSync(filePath, str, "utf8");
  const kb = (str.length / 1024).toFixed(1);
  console.log(`  ✓ ${path.basename(filePath).padEnd(38)} ${kb.padStart(8)} KB`);
};

const asNameSlugObjects = (arr) =>
  safeArr(arr).map((name) => ({ name, slug: slugify(name) }));

const normalizeMasterList = (arr) => {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((item) => {
      if (!item) return null;
      if (typeof item === "string") {
        return { name: item, slug: slugify(item) };
      }
      if (typeof item === "object") {
        const name = safeStr(item.name || item.label || item.title);
        const slug = safeStr(item.slug || slugify(name));
        if (!name && !slug) return null;
        return { name: name || slug, slug };
      }
      return null;
    })
    .filter(Boolean);
};

const compactMasterList = (arr, limit = 12) =>
  normalizeMasterList(arr)
    .filter((x) => x.slug)
    .slice(0, limit);

const pickPrimaryCategorySlug = (t) =>
  safeStr(
    t.master_category_slug ||
      t.catSlug ||
      t.cat_slug ||
      slugify(t.master_category || t.cat || t.category || "other-ai-tools")
  );

const pickPrimaryCategoryName = (t) =>
  safeStr(t.master_category || t.cat || t.category || "Other AI Tools");

const pickPrimarySubcategorySlug = (t) =>
  safeStr(t.master_subcategory_slug || slugify(t.master_subcategory || ""));

const pickPrimarySubcategoryName = (t) =>
  safeStr(t.master_subcategory || "");

const pickPrimaryMicrocategorySlug = (t) =>
  safeStr(t.master_microcategory_slug || slugify(t.master_microcategory || ""));

const pickPrimaryMicrocategoryName = (t) =>
  safeStr(t.master_microcategory || "");

const pickPricing = (t) => {
  const masterPricing = normalizeMasterList(t.master_pricing_models);
  if (masterPricing.length) return safeStr(masterPricing[0].slug || masterPricing[0].name).toLowerCase();
  return safeStr(t.pricing || t.pricing_tier, "").toLowerCase();
};

const pickLogoDomain = (t) =>
  safeStr(
    t.logo_domain ||
      t.canonical_domain ||
      (t.logo_url?.match(/clearbit\.com\/([^?&]+)/)?.[1]) ||
      ""
  );

const toGroupCard = (t) => {
  const handle = safeStr(t.handle || t.slug);
  return {
    handle,
    slug: handle,
    name: safeStr(t.name_clean || t.name),
    tagline: trim(safeStr(t.seo_title || t.short || t.desc || t.description || t.tagline), 150),
    pricing_tier: safeStr(pickPricing(t), "unknown"),
    logo_domain: pickLogoDomain(t),
    affiliate_url: safeStr(t.partnerstack_match ? (t.url || t.website_url) : ""),
    category: pickPrimaryCategoryName(t),
    category_slug: pickPrimaryCategorySlug(t),
    subcategory: pickPrimarySubcategoryName(t),
    subcategory_slug: pickPrimarySubcategorySlug(t),
    microcategory: pickPrimaryMicrocategoryName(t),
    microcategory_slug: pickPrimaryMicrocategorySlug(t),
    display_score: safeNum(t.display_score),
  };
};

// ─── LOAD ────────────────────────────────────────────────────────
const raw = readJson(INPUT);
if (!Array.isArray(raw)) throw new Error("Input dataset must be an array");
console.log(`Loaded:  ${raw.length} raw tools`);

// ─── FILTER + DEDUP ──────────────────────────────────────────────
const skipped = [];
const duplicates = [];
const seenHandles = new Set();
const seenUrls = new Map();
const tools = [];

for (let i = 0; i < raw.length; i++) {
  const item = raw[i];
  const handle = safeStr(item?.handle || item?.slug);
  const name = safeStr(item?.name || item?.name_clean);

  if (!handle || !name) {
    skipped.push({ i, reason: "missing handle/name" });
    continue;
  }

  if (seenHandles.has(handle)) {
    duplicates.push(handle);
    continue;
  }

  if (item.visibility === "hidden" || item.indexable === false || item.status === "draft") {
    skipped.push({ handle, reason: "non-public" });
    continue;
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
const toolShape = (t) => {
  const handle = safeStr(t.handle || t.slug);
  const logoDomain = pickLogoDomain(t);
  const categorySlug = pickPrimaryCategorySlug(t);
  const categoryName = pickPrimaryCategoryName(t);
  const subcategorySlug = pickPrimarySubcategorySlug(t);
  const subcategoryName = pickPrimarySubcategoryName(t);
  const microcategorySlug = pickPrimaryMicrocategorySlug(t);
  const microcategoryName = pickPrimaryMicrocategoryName(t);
  const description = safeStr(t.desc || t.description || t.short || t.tagline || "");

  const masterCapabilities = compactMasterList(t.master_capabilities, 16);
  const masterUseCases = compactMasterList(t.master_use_cases, 16);
  const masterIndustries = compactMasterList(t.master_industries, 12);
  const masterAiModels = compactMasterList(t.master_ai_models, 12);
  const masterIntegrations = compactMasterList(t.master_integrations, 16);
  const masterAgentTypes = compactMasterList(t.master_agent_types, 12);
  const masterPlatforms = compactMasterList(t.master_platforms, 12);
  const masterPricingModels = compactMasterList(t.master_pricing_models, 6);
  const masterSkillLevels = compactMasterList(t.master_skill_levels, 6);
  const masterContentTypes = compactMasterList(t.master_content_types, 12);
  const masterTags = compactMasterList(t.master_tags, 20);
  const masterWorkflows = compactMasterList(t.master_workflows, 12);

  return {
    handle,
    slug: handle,
    name: safeStr(t.name_clean || t.name),
    tagline: trim(safeStr(t.seo_title || t.short || t.desc || t.description || t.tagline), 150),
    description: trim(description, 1200),
    pricing_tier: safeStr(pickPricing(t), "unknown"),
    logo_domain: logoDomain,
    logo_url: safeStr(t.logo_url),
    website_url: safeStr(t.url || t.website_url),
    affiliate_url: t.partnerstack_match ? safeStr(t.url || t.website_url) : "",
    category: categoryName,
    category_slug: categorySlug,
    subcategory: subcategoryName,
    subcategory_slug: subcategorySlug,
    microcategory: microcategoryName,
    microcategory_slug: microcategorySlug,

    master_category: categoryName,
    master_category_slug: categorySlug,
    master_subcategory: subcategoryName,
    master_subcategory_slug: subcategorySlug,
    master_microcategory: microcategoryName,
    master_microcategory_slug: microcategorySlug,

    master_capabilities: masterCapabilities,
    master_use_cases: masterUseCases,
    master_industries: masterIndustries,
    master_ai_models: masterAiModels,
    master_integrations: masterIntegrations,
    master_agent_types: masterAgentTypes,
    master_platforms: masterPlatforms,
    master_pricing_models: masterPricingModels,
    master_skill_levels: masterSkillLevels,
    master_content_types: masterContentTypes,
    master_tags: masterTags,
    master_workflows: masterWorkflows,

    capability_slugs: masterCapabilities.map((x) => x.slug),
    use_case_slugs: masterUseCases.map((x) => x.slug),
    industry_slugs: masterIndustries.map((x) => x.slug),
    ai_model_slugs: masterAiModels.map((x) => x.slug),
    integration_slugs: masterIntegrations.map((x) => x.slug),
    agent_type_slugs: masterAgentTypes.map((x) => x.slug),
    platform_slugs: masterPlatforms.map((x) => x.slug),
    pricing_model_slugs: masterPricingModels.map((x) => x.slug),
    skill_level_slugs: masterSkillLevels.map((x) => x.slug),
    content_type_slugs: masterContentTypes.map((x) => x.slug),
    tag_slugs: masterTags.map((x) => x.slug),
    workflow_slugs: masterWorkflows.map((x) => x.slug),

    feature_tags: unique([
      ...safeArr(t.tags),
      ...masterTags.map((x) => x.name),
    ]).slice(0, 12),

    use_cases: unique([
      ...safeArr(t.use_cases),
      ...masterUseCases.map((x) => x.name),
    ]).slice(0, 8),

    industries: unique([
      ...safeArr(t.industries),
      ...masterIndustries.map((x) => x.name),
    ]).slice(0, 6),

    display_score: safeNum(t.display_score),
    is_featured: safeNum(t.homepage_priority_score) >= 70 || !!t.is_canonical,
    is_canonical: !!t.is_canonical,
    has_api: !!t.has_api,
    has_mobile: !!t.has_mobile,
    has_chrome_ext: !!t.has_chrome_ext,
    is_open_source: !!t.is_open_source,
    related_tools: safeArr(t.related_tools).slice(0, 8),
    compare_targets: safeArr(t.comparison_targets).slice(0, 8),
    seo_title: trim(safeStr(t.seo_title), 100),
    seo_description: trim(safeStr(t.seo_description), 200),
    complexity: safeStr(t.complexity),
    target_audience: safeStr(Array.isArray(t.target_audience) ? t.target_audience[0] : t.target_audience),
    workflow_stage: safeStr(Array.isArray(t.workflow_stage) ? t.workflow_stage[0] : t.workflow_stage),
    commercial_score: safeNum(t.commercial_intent_score),
    homepage_score: safeNum(t.homepage_priority_score),
    prompt_score: safeNum(t.prompt_library_score),
    company: safeStr(t.company || t.brand || ""),
    company_slug: slugify(safeStr(t.company || t.brand || "")),
    added_date: safeStr(t.added_date || t.created_at || ""),
  };
};

// ─── PREP ────────────────────────────────────────────────────────
const toolsByScore = [...tools].sort((a, b) => safeNum(b.display_score) - safeNum(a.display_score));
const toolPaths = toolsByScore.map((t) => safeStr(t.handle || t.slug));

// ─── 1. TOOL PATHS ───────────────────────────────────────────────
writeJson(path.join(OUT_DIR, "tool-paths.json"), toolPaths);

// ─── 2. TOOL MAP ─────────────────────────────────────────────────
const toolMap = Object.fromEntries(tools.map((t) => [safeStr(t.handle || t.slug), toolShape(t)]));
writeJson(path.join(OUT_DIR, "tool-map.json"), toolMap);

// ─── GROUP HELPERS ───────────────────────────────────────────────
function buildGroupMap({ items, keyFn, nameFn, minCount = 1, cardLimit = 48, descriptionFn, seoTitleFn }) {
  const groups = new Map();

  for (const t of items) {
    const slug = safeStr(keyFn(t));
    const name = safeStr(nameFn(t));
    if (!slug || !name) continue;
    if (!groups.has(slug)) groups.set(slug, { slug, name, tools: [] });
    groups.get(slug).tools.push(t);
  }

  const validGroups = [...groups.values()]
    .filter((g) => g.tools.length >= minCount)
    .sort((a, b) => b.tools.length - a.tools.length);

  const map = Object.fromEntries(
    validGroups.map((g) => {
      const sorted = [...g.tools]
        .sort((a, b) => safeNum(b.display_score) - safeNum(a.display_score))
        .slice(0, cardLimit)
        .map(toolShape);

      return [
        g.slug,
        {
          slug: g.slug,
          name: g.name,
          count: g.tools.length,
          tools: sorted,
          top_tools: sorted.slice(0, 10),
          description: descriptionFn ? descriptionFn(g, sorted) : "",
          seo_title: seoTitleFn ? seoTitleFn(g, sorted) : "",
        },
      ];
    })
  );

  return {
    groups: validGroups,
    map,
    paths: Object.keys(map),
  };
}

// ─── 3. CATEGORY PATHS & MAP ─────────────────────────────────────
const categoryBuilt = buildGroupMap({
  items: tools,
  keyFn: pickPrimaryCategorySlug,
  nameFn: pickPrimaryCategoryName,
  minCount: 1,
  cardLimit: 48,
  descriptionFn: (g) =>
    `Discover the ${g.tools.length} best ${g.name.toLowerCase()} AI tools. Compare pricing, features and alternatives.`,
  seoTitleFn: (g) =>
    `Best ${g.name} AI Tools ${currentYear} — Compare & Review`,
});

const sortedCats = categoryBuilt.groups;
const categoryPaths = categoryBuilt.paths;
const categoryMap = categoryBuilt.map;

writeJson(path.join(OUT_DIR, "category-paths.json"), categoryPaths);
writeJson(path.join(OUT_DIR, "category-map.json"), categoryMap);

const categoryTop10 = Object.fromEntries(
  sortedCats.map((cat) => [
    cat.slug,
    [...cat.tools]
      .sort((a, b) => safeNum(b.display_score) - safeNum(a.display_score))
      .slice(0, 10)
      .map(toolShape),
  ])
);
writeJson(path.join(OUT_DIR, "category-top10.json"), categoryTop10);

// ─── 4. SUBCATEGORY PATHS & MAP ──────────────────────────────────
const subcategoryBuilt = buildGroupMap({
  items: tools.filter((t) => pickPrimarySubcategorySlug(t)),
  keyFn: pickPrimarySubcategorySlug,
  nameFn: pickPrimarySubcategoryName,
  minCount: 2,
  cardLimit: 48,
  descriptionFn: (g) =>
    `Explore the best AI tools in ${g.name.toLowerCase()}. Compare pricing, features, and alternatives.`,
  seoTitleFn: (g) =>
    `Best ${g.name} AI Tools ${currentYear} — Top Options`,
});

writeJson(path.join(OUT_DIR, "subcategory-paths.json"), subcategoryBuilt.paths);
writeJson(path.join(OUT_DIR, "subcategory-map.json"), subcategoryBuilt.map);

// ─── 5. MICROCATEGORY PATHS & MAP ────────────────────────────────
const microcategoryBuilt = buildGroupMap({
  items: tools.filter((t) => pickPrimaryMicrocategorySlug(t)),
  keyFn: pickPrimaryMicrocategorySlug,
  nameFn: pickPrimaryMicrocategoryName,
  minCount: 2,
  cardLimit: 48,
  descriptionFn: (g) =>
    `Explore the best AI tools for ${g.name.toLowerCase()}. Compare features, pricing, and fit.`,
  seoTitleFn: (g) =>
    `Best ${g.name} AI Tools ${currentYear} — Compare Top Picks`,
});

writeJson(path.join(OUT_DIR, "microcategory-paths.json"), microcategoryBuilt.paths);
writeJson(path.join(OUT_DIR, "microcategory-map.json"), microcategoryBuilt.map);

// ─── 6. RELATED MAP ──────────────────────────────────────────────
const relatedMap = Object.fromEntries(
  tools.map((t) => [
    safeStr(t.handle || t.slug),
    safeArr(t.related_tools)
      .slice(0, 8)
      .filter((h) => toolMap[h])
      .map((h) => ({
        handle: h,
        slug: h,
        name: toolMap[h].name,
        tagline: toolMap[h].tagline,
        pricing_tier: toolMap[h].pricing_tier,
        logo_domain: toolMap[h].logo_domain,
        affiliate_url: toolMap[h].affiliate_url,
        category: toolMap[h].category,
        category_slug: toolMap[h].category_slug,
      })),
  ])
);
writeJson(path.join(OUT_DIR, "related-map.json"), relatedMap);

// ─── 7. COMPARE MAP + PAIRS ──────────────────────────────────────
const compareMap = Object.fromEntries(
  tools.map((t) => [safeStr(t.handle || t.slug), safeArr(t.comparison_targets).slice(0, 6)])
);

const seenPairs = new Set();
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

// ─── 8. ALTERNATIVES MAP ─────────────────────────────────────────
const alternativesMap = Object.fromEntries(
  tools.map((t) => {
    const handle = safeStr(t.handle || t.slug);
    return [
      handle,
      safeArr(t.related_tools)
        .slice(0, 8)
        .filter((h) => toolMap[h])
        .sort((a, b) => (toolMap[b]?.display_score ?? 0) - (toolMap[a]?.display_score ?? 0))
        .map((h) => ({
          handle: h,
          slug: h,
          name: toolMap[h].name,
          tagline: toolMap[h].tagline,
          pricing_tier: toolMap[h].pricing_tier,
          logo_domain: toolMap[h].logo_domain,
          affiliate_url: toolMap[h].affiliate_url,
          category: toolMap[h].category,
          category_slug: toolMap[h].category_slug,
        })),
    ];
  })
);
writeJson(path.join(OUT_DIR, "alternatives-map.json"), alternativesMap);

// ─── 9. BEST-OF MAP ──────────────────────────────────────────────
const bestOfGroups = new Map();

for (const t of tools) {
  for (const q of safeArr(t.best_for_queries)) {
    const slug = slugify(q);
    if (!slug || slug.length < 3) continue;
    if (!bestOfGroups.has(slug)) bestOfGroups.set(slug, { slug, query: q, tools: [] });
    bestOfGroups.get(slug).tools.push(t);
  }
}

const bestOfMap = Object.fromEntries(
  [...bestOfGroups.entries()]
    .filter(([, g]) => g.tools.length >= 3)
    .map(([slug, g]) => {
      const sorted = [...g.tools]
        .sort((a, b) => safeNum(b.commercial_intent_score) - safeNum(a.commercial_intent_score))
        .slice(0, 24)
        .map(toolShape);

      return [
        slug,
        {
          slug,
          name: g.query,
          tools: sorted,
          count: sorted.length,
          description: `The best AI tools for ${g.query} in ${currentYear}.`,
          seo_title: `Best AI Tools for ${g.query} — Top ${sorted.length} Options`,
        },
      ];
    })
);
const bestOfPaths = Object.keys(bestOfMap);

writeJson(path.join(OUT_DIR, "best-of-map.json"), bestOfMap);
writeJson(path.join(OUT_DIR, "best-of-paths.json"), bestOfPaths);

// ─── 10. PROMPT LIBRARY ──────────────────────────────────────────
const promptTools = tools
  .filter((t) => safeNum(t.prompt_library_score) >= 40 && safeArr(t.prompt_use_cases).length > 0)
  .sort((a, b) => safeNum(b.prompt_library_score) - safeNum(a.prompt_library_score));

const promptMap = Object.fromEntries(
  promptTools.map((t) => {
    const shape = toolShape(t);
    return [
      shape.handle,
      {
        ...shape,
        prompt_use_cases: safeArr(t.prompt_use_cases),
        example_prompts: safeArr(t.example_prompts).slice(0, 5),
        prompt_description: trim(safeStr(t.prompt_description || shape.description), 500),
      },
    ];
  })
);

const promptPaths = promptTools.map((t) => safeStr(t.handle || t.slug));
writeJson(path.join(OUT_DIR, "prompt-library-map.json"), promptMap);
writeJson(path.join(OUT_DIR, "prompt-library-paths.json"), promptPaths);

// ─── 11. TAG MAP ─────────────────────────────────────────────────
const tagGroups = new Map();

for (const t of tools) {
  const values = unique([
    ...safeArr(t.tags).slice(0, 10),
    ...compactMasterList(t.master_tags, 16).map((x) => x.name),
  ]);

  for (const tag of values) {
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
      const sorted = [...g.tools]
        .sort((a, b) => safeNum(b.display_score) - safeNum(a.display_score))
        .slice(0, 48)
        .map(toolShape);

      return [
        slug,
        {
          slug,
          name: g.name,
          count: g.tools.length,
          tools: sorted,
          description: `Best AI tools tagged with "${g.name}". Compare features, pricing and alternatives.`,
          seo_title: `Best AI Tools for ${g.name} — Top Options ${currentYear}`,
        },
      ];
    })
);

const tagPaths = Object.keys(tagMap);
writeJson(path.join(OUT_DIR, "tag-map.json"), tagMap);
writeJson(path.join(OUT_DIR, "tag-paths.json"), tagPaths);

// ─── 12. USE-CASE MAP ────────────────────────────────────────────
const ucGroups = new Map();

for (const t of tools) {
  const values = unique([
    ...safeArr(t.use_cases).slice(0, 6),
    ...compactMasterList(t.master_use_cases, 12).map((x) => x.name),
  ]);

  for (const uc of values) {
    const slug = slugify(uc);
    if (!slug || slug.length < 3) continue;
    if (!ucGroups.has(slug)) ucGroups.set(slug, { slug, name: uc, tools: [] });
    ucGroups.get(slug).tools.push(t);
  }
}

const ucMap = Object.fromEntries(
  [...ucGroups.entries()]
    .filter(([, g]) => g.tools.length >= 2)
    .map(([slug, g]) => {
      const sorted = [...g.tools]
        .sort((a, b) => safeNum(b.display_score) - safeNum(a.display_score))
        .slice(0, 48)
        .map(toolShape);

      return [
        slug,
        {
          slug,
          name: g.name,
          count: g.tools.length,
          tools: sorted,
          description: `Best AI tools for ${g.name}. Find and compare the top ${sorted.length} options.`,
          seo_title: `Best AI Tools for ${g.name} — Compare ${sorted.length} Options`,
        },
      ];
    })
);

const ucPaths = Object.keys(ucMap);
writeJson(path.join(OUT_DIR, "use-case-map.json"), ucMap);
writeJson(path.join(OUT_DIR, "use-case-paths.json"), ucPaths);

// ─── 13. INDUSTRY MAP ────────────────────────────────────────────
const indGroups = new Map();

for (const t of tools) {
  const values = unique([
    ...safeArr(t.industries).slice(0, 4),
    ...compactMasterList(t.master_industries, 10).map((x) => x.name),
  ]);

  for (const ind of values) {
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
      const sorted = [...g.tools]
        .sort((a, b) => safeNum(b.display_score) - safeNum(a.display_score))
        .slice(0, 48)
        .map(toolShape);

      return [
        slug,
        {
          slug,
          name: g.name,
          count: g.tools.length,
          tools: sorted,
          description: `Best AI tools for the ${g.name} industry. Compare ${sorted.length} options.`,
        },
      ];
    })
);

const indPaths = Object.keys(indMap);
writeJson(path.join(OUT_DIR, "industry-map.json"), indMap);
writeJson(path.join(OUT_DIR, "industry-paths.json"), indPaths);

// ─── 14. FEATURE MAP ─────────────────────────────────────────────
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
      const sorted = [...g.tools]
        .sort((a, b) => safeNum(b.display_score) - safeNum(a.display_score))
        .slice(0, 48)
        .map(toolShape);

      return [slug, { slug, name: g.name, count: sorted.length, tools: sorted }];
    })
);

const featurePaths = Object.keys(featureMap);
writeJson(path.join(OUT_DIR, "feature-map.json"), featureMap);
writeJson(path.join(OUT_DIR, "feature-paths.json"), featurePaths);

// ─── 15. WORKFLOW MAP ────────────────────────────────────────────
const workflowGroups = new Map();

for (const t of tools) {
  const values = unique([
    ...compactMasterList(t.master_workflows, 12).map((x) => x.name),
    ...safeArr(t.workflow_stage).slice(0, 4),
  ]);

  for (const wf of values) {
    const slug = slugify(wf);
    if (!slug || slug.length < 2) continue;
    if (!workflowGroups.has(slug)) workflowGroups.set(slug, { slug, name: wf, tools: [] });
    workflowGroups.get(slug).tools.push(t);
  }
}

const workflowMap = Object.fromEntries(
  [...workflowGroups.entries()]
    .filter(([, g]) => g.tools.length >= 2)
    .map(([slug, g]) => {
      const sorted = [...g.tools]
        .sort((a, b) => safeNum(b.display_score) - safeNum(a.display_score))
        .slice(0, 48)
        .map(toolShape);

      return [
        slug,
        {
          slug,
          name: g.name,
          count: g.tools.length,
          tools: sorted,
          description: `Best AI tools for the ${g.name} workflow. Compare pricing, features, and fit.`,
          seo_title: `Best AI Tools for ${g.name} Workflow — ${currentYear}`,
        },
      ];
    })
);

const workflowPaths = Object.keys(workflowMap);
writeJson(path.join(OUT_DIR, "workflow-map.json"), workflowMap);
writeJson(path.join(OUT_DIR, "workflow-paths.json"), workflowPaths);

// ─── 16. CAPABILITY MAP ──────────────────────────────────────────
const capabilityGroups = new Map();

for (const t of tools) {
  const values = compactMasterList(t.master_capabilities, 16).map((x) => x.name);
  for (const cap of values) {
    const slug = slugify(cap);
    if (!slug || slug.length < 2) continue;
    if (!capabilityGroups.has(slug)) capabilityGroups.set(slug, { slug, name: cap, tools: [] });
    capabilityGroups.get(slug).tools.push(t);
  }
}

const capabilityMap = Object.fromEntries(
  [...capabilityGroups.entries()]
    .filter(([, g]) => g.tools.length >= 2)
    .map(([slug, g]) => {
      const sorted = [...g.tools]
        .sort((a, b) => safeNum(b.display_score) - safeNum(a.display_score))
        .slice(0, 48)
        .map(toolShape);

      return [
        slug,
        {
          slug,
          name: g.name,
          count: g.tools.length,
          tools: sorted,
          description: `Best AI tools with ${g.name} capability. Compare leading options.`,
          seo_title: `Best ${g.name} AI Tools ${currentYear}`,
        },
      ];
    })
);

const capabilityPaths = Object.keys(capabilityMap);
writeJson(path.join(OUT_DIR, "capability-map.json"), capabilityMap);
writeJson(path.join(OUT_DIR, "capability-paths.json"), capabilityPaths);

// ─── 17. PRICING MAP ─────────────────────────────────────────────
const PRICING_TIERS = ["free", "freemium", "paid"];

const pricingMap = Object.fromEntries(
  PRICING_TIERS.map((tier) => {
    const label = tier.charAt(0).toUpperCase() + tier.slice(1);
    const tTools = tools
      .filter((t) => pickPricing(t) === tier)
      .sort((a, b) => safeNum(b.display_score) - safeNum(a.display_score))
      .slice(0, 200)
      .map(toolShape);

    return [
      tier,
      {
        slug: tier,
        name: label,
        count: tTools.length,
        tools: tTools,
        description: `Browse all ${label} AI tools. Compare ${tTools.length} options.`,
        seo_title: `Best ${label} AI Tools ${currentYear} — Top Picks`,
      },
    ];
  })
);

const pricingPaths = PRICING_TIERS.filter((t) => pricingMap[t]?.count > 0);
writeJson(path.join(OUT_DIR, "pricing-map.json"), pricingMap);
writeJson(path.join(OUT_DIR, "pricing-paths.json"), pricingPaths);

// ─── 18. TOOL-TYPE MAP ───────────────────────────────────────────
const ttGroups = new Map();

for (const t of tools) {
  const rawType = safeStr(t.tool_type || t.type || t.master_subcategory || t.cat || "").trim();
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
      const sorted = [...g.tools]
        .sort((a, b) => safeNum(b.display_score) - safeNum(a.display_score))
        .slice(0, 48)
        .map(toolShape);

      return [slug, { slug, name: g.name, count: sorted.length, tools: sorted }];
    })
);

const ttPaths = Object.keys(ttMap);
writeJson(path.join(OUT_DIR, "tool-type-map.json"), ttMap);
writeJson(path.join(OUT_DIR, "tool-type-paths.json"), ttPaths);

// ─── 19. COMPANY MAP ─────────────────────────────────────────────
const companyGroups = new Map();

for (const t of tools) {
  const company = safeStr(t.company || t.brand || "");
  if (!company || company.length < 2) continue;
  const slug = slugify(company);
  if (!slug) continue;
  if (!companyGroups.has(slug)) companyGroups.set(slug, { slug, name: company, tools: [] });
  companyGroups.get(slug).tools.push(t);
}

const companyMap = Object.fromEntries(
  [...companyGroups.entries()]
    .filter(([, g]) => g.tools.length >= 1)
    .map(([slug, g]) => {
      const sorted = [...g.tools]
        .sort((a, b) => safeNum(b.display_score) - safeNum(a.display_score))
        .slice(0, 24)
        .map(toolShape);

      return [
        slug,
        {
          slug,
          name: g.name,
          count: g.tools.length,
          tools: sorted,
          description: `All AI tools by ${g.name}. Compare features, pricing and alternatives.`,
          seo_title: `${g.name} AI Tools — All Products & Pricing`,
        },
      ];
    })
);

const companyPaths = Object.keys(companyMap);
writeJson(path.join(OUT_DIR, "company-map.json"), companyMap);
writeJson(path.join(OUT_DIR, "company-paths.json"), companyPaths);

// ─── 20. FEATURED TOOLS ──────────────────────────────────────────
const featuredGlobal = toolsByScore
  .filter((t) => safeStr(t.desc || t.short || t.description).length >= 20)
  .sort((a, b) => safeNum(b.homepage_priority_score) - safeNum(a.homepage_priority_score))
  .slice(0, 50)
  .map(toolShape);

const featuredByCategory = Object.fromEntries(
  sortedCats.slice(0, 25).map((cat) => [
    cat.slug,
    [...cat.tools]
      .sort((a, b) => safeNum(b.homepage_priority_score) - safeNum(a.homepage_priority_score))
      .slice(0, 10)
      .map(toolShape),
  ])
);

writeJson(path.join(OUT_DIR, "featured-tools.json"), {
  generated_at: new Date().toISOString(),
  global_top: featuredGlobal,
  by_category: featuredByCategory,
});

// ─── 21. HOMEPAGE DATA ───────────────────────────────────────────
const newTools = tools
  .filter((t) => safeStr(t.added_date || t.created_at))
  .sort((a, b) => (b.added_date || b.created_at || "").localeCompare(a.added_date || a.created_at || ""))
  .slice(0, 12)
  .map(toolShape);

writeJson(path.join(OUT_DIR, "homepage-data.json"), {
  generated_at: new Date().toISOString(),
  total_tools: tools.length,
  total_cats: sortedCats.length,
  total_subcategories: subcategoryBuilt.paths.length,
  total_microcategories: microcategoryBuilt.paths.length,
  total_workflows: workflowPaths.length,
  total_compare: comparePairs.length,
  total_bestof: bestOfPaths.length,
  featured_tools: featuredGlobal.slice(0, 10),
  new_tools: newTools.length > 0 ? newTools : featuredGlobal.slice(6, 14),
  pricing_dist: {
    free: tools.filter((t) => pickPricing(t) === "free").length,
    freemium: tools.filter((t) => pickPricing(t) === "freemium").length,
    paid: tools.filter((t) => pickPricing(t) === "paid").length,
  },
});

// ─── 22-23. PRICING STATS + CATEGORY STATS ───────────────────────
writeJson(path.join(OUT_DIR, "pricing-stats.json"), {
  free: tools.filter((t) => pickPricing(t) === "free").length,
  freemium: tools.filter((t) => pickPricing(t) === "freemium").length,
  paid: tools.filter((t) => pickPricing(t) === "paid").length,
  unknown: tools.filter((t) => !["free", "freemium", "paid"].includes(pickPricing(t))).length,
});

writeJson(
  path.join(OUT_DIR, "category-stats.json"),
  Object.fromEntries(sortedCats.map((c) => [c.name, c.tools.length]))
);

// ─── 24. SITEMAP DATA ────────────────────────────────────────────
const sitemapData = {
  generated_at: new Date().toISOString(),
  urls: [
    { path: "/", priority: 1.0, changefreq: "daily" },
    { path: "/ai-tools", priority: 0.9, changefreq: "daily" },
    { path: "/vs", priority: 0.7, changefreq: "weekly" },
    { path: "/best", priority: 0.7, changefreq: "weekly" },
    { path: "/prompts", priority: 0.7, changefreq: "weekly" },
    { path: "/ai-news", priority: 0.6, changefreq: "daily" },

    ...categoryPaths.map((s) => ({ path: `/ai-tools/category/${s}`, priority: 0.8, changefreq: "weekly" })),
    ...subcategoryBuilt.paths.map((s) => ({ path: `/ai-tools/subcategory/${s}`, priority: 0.76, changefreq: "weekly" })),
    ...microcategoryBuilt.paths.map((s) => ({ path: `/ai-tools/microcategory/${s}`, priority: 0.72, changefreq: "weekly" })),
    ...workflowPaths.map((s) => ({ path: `/ai-tools/workflow/${s}`, priority: 0.68, changefreq: "weekly" })),
    ...capabilityPaths.map((s) => ({ path: `/ai-tools/capability/${s}`, priority: 0.66, changefreq: "weekly" })),
    ...tagPaths.map((s) => ({ path: `/ai-tools/tag/${s}`, priority: 0.62, changefreq: "weekly" })),
    ...indPaths.map((s) => ({ path: `/ai-tools/industry/${s}`, priority: 0.62, changefreq: "weekly" })),
    ...ucPaths.map((s) => ({ path: `/ai-tools/use-case/${s}`, priority: 0.64, changefreq: "weekly" })),
    ...pricingPaths.map((s) => ({ path: `/ai-tools/pricing/${s}`, priority: 0.7, changefreq: "weekly" })),
    ...companyPaths.map((s) => ({ path: `/ai-tools/company/${s}`, priority: 0.58, changefreq: "monthly" })),
    ...bestOfPaths.map((s) => ({ path: `/best/${s}`, priority: 0.65, changefreq: "weekly" })),

    ...toolPaths.slice(0, 500).map((h) => ({ path: `/ai-tools/${h}`, priority: 0.7, changefreq: "monthly" })),
    ...toolPaths.slice(500).map((h) => ({ path: `/ai-tools/${h}`, priority: 0.5, changefreq: "monthly" })),
    ...comparePairs.slice(0, 10000).map((p) => ({ path: `/vs/${p.slug}`, priority: 0.5, changefreq: "monthly" })),
  ],
};

writeJson(path.join(OUT_DIR, "sitemap-data.json"), sitemapData);

// ─── 25. BUILD META ──────────────────────────────────────────────
writeJson(path.join(OUT_DIR, "build-meta.json"), {
  generated_at: new Date().toISOString(),
  version: "v5",
  input_file: INPUT,
  tool_count: tools.length,
  category_count: sortedCats.length,
  subcategory_count: subcategoryBuilt.paths.length,
  microcategory_count: microcategoryBuilt.paths.length,
  workflow_count: workflowPaths.length,
  capability_count: capabilityPaths.length,
  tag_count: tagPaths.length,
  industry_count: indPaths.length,
  feature_count: featurePaths.length,
  use_case_count: ucPaths.length,
  company_count: companyPaths.length,
  compare_pairs: comparePairs.length,
  best_of_pages: bestOfPaths.length,
  prompt_tools: promptPaths.length,
  sitemap_urls: sitemapData.urls.length,
  skipped: skipped.length,
  duplicates: duplicates.length,
  limits: {
    tool_page_limit: TOOL_PAGE_LIMIT,
    compare_page_limit: COMPARE_PAGE_LIMIT,
    alt_page_limit: ALT_PAGE_LIMIT,
  },
});

writeJson(path.join(OUT_DIR, "skipped-records.json"), {
  skipped: skipped.slice(0, 100),
  duplicates: duplicates.slice(0, 100),
  dup_urls: [...seenUrls.entries()]
    .filter(([, n]) => n > 1)
    .slice(0, 100)
    .map(([url, n]) => ({ url, n })),
});

// ─── 26. TOOL PAGE DATA ──────────────────────────────────────────
console.log(`\n── Tool page data (TOOL_PAGE_LIMIT=${TOOL_PAGE_LIMIT}) ──`);

const compactRelated = (h) => {
  const t = toolMap[h];
  if (!t) return null;
  return {
    handle: t.handle,
    slug: t.handle,
    name: t.name,
    tagline: t.tagline,
    pricing_tier: t.pricing_tier,
    logo_domain: t.logo_domain,
    affiliate_url: t.affiliate_url,
    category: t.category,
    category_slug: t.category_slug,
    subcategory: t.subcategory,
    subcategory_slug: t.subcategory_slug,
    microcategory: t.microcategory,
    microcategory_slug: t.microcategory_slug,
  };
};

const toolPageData = Object.fromEntries(
  toolPaths
    .slice(0, TOOL_PAGE_LIMIT)
    .map((h) => {
      const t = toolMap[h];
      if (!t) return null;

      return [
        h,
        {
          ...t,
          description: trim(t.description, 1000),
          related: safeArr(t.related_tools).slice(0, 6).map(compactRelated).filter(Boolean),
          compare_with: safeArr(t.compare_targets).slice(0, 4).map(compactRelated).filter(Boolean),
        },
      ];
    })
    .filter(Boolean)
);

writeJson(path.join(OUT_DIR, "tool-page-data.json"), toolPageData);

// ─── 27. ALTERNATIVES PAGE DATA ──────────────────────────────────
console.log(`── Alternatives page data (ALT_PAGE_LIMIT=${ALT_PAGE_LIMIT}) ──`);

const altPageData = Object.fromEntries(
  toolPaths
    .slice(0, ALT_PAGE_LIMIT)
    .filter((h) => toolMap[h])
    .map((h) => {
      const t = toolMap[h];
      return [
        h,
        {
          handle: t.handle,
          slug: t.handle,
          name: t.name,
          tagline: t.tagline,
          description: trim(t.description, 500),
          pricing_tier: t.pricing_tier,
          logo_domain: t.logo_domain,
          category: t.category,
          category_slug: t.category_slug,
          subcategory: t.subcategory,
          subcategory_slug: t.subcategory_slug,
          microcategory: t.microcategory,
          microcategory_slug: t.microcategory_slug,
          alts: safeArr(t.related_tools).slice(0, 8).map(compactRelated).filter(Boolean),
        },
      ];
    })
);

writeJson(path.join(OUT_DIR, "alternatives-page-data.json"), altPageData);

// ─── 28. COMPARE PAGE DATA ───────────────────────────────────────
console.log(`── Compare page data (COMPARE_PAGE_LIMIT=${COMPARE_PAGE_LIMIT}) ──`);

const comparePageData = Object.fromEntries(
  comparePairs
    .slice(0, COMPARE_PAGE_LIMIT)
    .filter((p) => toolMap[p.a] && toolMap[p.b])
    .map((p) => {
      const enrich = (t) => ({
        ...compactRelated(t.handle),
        tagline: t.tagline,
        description: trim(t.description, 400),
        website_url: t.website_url,
        feature_tags: t.feature_tags,
        has_api: t.has_api,
        has_mobile: t.has_mobile,
        has_chrome_ext: t.has_chrome_ext,
        is_open_source: t.is_open_source,
      });

      const ta = toolMap[p.a];
      const tb = toolMap[p.b];

      return [
        p.slug,
        {
          slug: p.slug,
          toolA: enrich(ta),
          toolB: enrich(tb),
          seo_title: `${ta.name} vs ${tb.name} — Full Comparison ${currentYear}`,
          seo_description: `Compare ${ta.name} vs ${tb.name}: pricing, features, and which is right for you.`,
        },
      ];
    })
);

writeJson(path.join(OUT_DIR, "compare-page-data.json"), comparePageData);

// ─── 29. SEARCH INDEX ────────────────────────────────────────────
const searchIndex = tools.map((t) => ({
  h: safeStr(t.handle || t.slug),
  n: safeStr(t.name_clean || t.name),
  c: pickPrimaryCategoryName(t),
  cs: pickPrimaryCategorySlug(t),
  sc: pickPrimarySubcategoryName(t),
  scs: pickPrimarySubcategorySlug(t),
  p: safeStr(pickPricing(t), ""),
  t: trim(safeStr(t.short || t.desc || t.description || ""), 80),
  s: safeNum(t.display_score),
  l: pickLogoDomain(t),
}));

fs.writeFileSync(path.join(root, "src/data/tools_search_index.json"), JSON.stringify(searchIndex), "utf8");
const siKb = (JSON.stringify(searchIndex).length / 1024).toFixed(1);
console.log(`  ✓ ${"tools_search_index.json".padEnd(38)} ${siKb.padStart(8)} KB  (src/data/)`);

// ─── SUMMARY ─────────────────────────────────────────────────────
console.log("\n✅ All datasets generated — v5");
console.log("──────────────────────────────────────────");
console.log(`Tools:           ${tools.length.toLocaleString()}`);
console.log(`Categories:      ${sortedCats.length}`);
console.log(`Subcategories:   ${subcategoryBuilt.paths.length}`);
console.log(`Microcategories: ${microcategoryBuilt.paths.length}`);
console.log(`Capabilities:    ${capabilityPaths.length}`);
console.log(`Workflows:       ${workflowPaths.length}`);
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