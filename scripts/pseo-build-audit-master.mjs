#!/usr/bin/env node
/**
 * pseo-build-audit-master.mjs
 *
 * Full-site pSEO build auditor for Astro/static JSON-driven sites.
 *
 * What it audits:
 * - Page route structure inferred from src/pages
 * - Internal linking patterns in .astro/.md/.mdx/.html/.json outputs
 * - Build datasets in /src/data/build and optional raw/enriched JSON datasets
 * - Coverage between datasets and route/page usage
 * - Cluster/page-type counts and slug maps
 * - Enrichment field coverage and practical usage in page files
 * - Basic site architecture and orphan-risk signals
 *
 * Output:
 * - /audit-output/audit-summary.json
 * - /audit-output/audit-summary.md
 * - /audit-output/page-inventory.json
 * - /audit-output/dataset-inventory.json
 * - /audit-output/internal-link-graph.json
 * - /audit-output/enrichment-coverage.json
 * - /audit-output/route-usage.json
 *
 * Usage examples:
 *   node scripts/pseo-build-audit-master.mjs
 *   node scripts/pseo-build-audit-master.mjs --root .
 *   node scripts/pseo-build-audit-master.mjs --root . --src src --data src/data/build --out audit-output
 *   node scripts/pseo-build-audit-master.mjs --root . --include-dist true
 *
 * Notes:
 * - No external dependencies.
 * - Conservative parser; uses regex/string analysis instead of AST.
 * - Meant for architecture and pSEO audits, not exact compilation semantics.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

// ──────────────────────────────────────────────────────────────────────────────
// CLI
// ──────────────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const raw = argv[i];
    if (!raw.startsWith("--")) continue;
    const key = raw.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

const argv = parseArgs(process.argv);
const ROOT = path.resolve(String(argv.root || process.cwd()));
const SRC_DIR = path.resolve(ROOT, String(argv.src || "src"));
const PAGES_DIR = path.resolve(SRC_DIR, "pages");
const COMPONENTS_DIR = path.resolve(SRC_DIR, "components");
const LAYOUTS_DIR = path.resolve(SRC_DIR, "layouts");
const DATA_DIR = path.resolve(ROOT, String(argv.data || "src/data/build"));
const RAW_DATA_DIR = path.resolve(ROOT, String(argv.rawData || "src/data"));
const DIST_DIR = path.resolve(ROOT, String(argv.dist || "dist"));
const OUT_DIR = path.resolve(ROOT, String(argv.out || "audit-output"));
const INCLUDE_DIST = String(argv.includeDist || "false").toLowerCase() === "true";
const MAX_JSON_PREVIEW_ITEMS = Number(argv.maxJsonPreviewItems || 5);
const MAX_FILE_BYTES = Number(argv.maxFileBytes || 8_000_000);

// ──────────────────────────────────────────────────────────────────────────────
// Config / heuristics
// ──────────────────────────────────────────────────────────────────────────────

const TEXT_EXTENSIONS = new Set([
  ".astro", ".js", ".mjs", ".cjs", ".ts", ".mts", ".cts",
  ".json", ".md", ".mdx", ".html", ".txt", ".yml", ".yaml", ".css"
]);

const PAGE_EXTENSIONS = new Set([".astro", ".md", ".mdx", ".html"]);

const PAGE_TYPE_PATTERNS = [
  { key: "tool-detail", test: (p) => /\/ai-tools\/\[slug\]\.(astro|md|mdx|html)$|\/tools\/\[slug\]\.(astro|md|mdx|html)$/i.test(p) },
  { key: "category", test: (p) => /\/category\//i.test(p) },
  { key: "subcategory", test: (p) => /\/subcategory\//i.test(p) },
  { key: "microcategory", test: (p) => /\/microcategory\//i.test(p) },
  { key: "use-case", test: (p) => /\/use-case\//i.test(p) },
  { key: "workflow", test: (p) => /workflow/i.test(p) },
  { key: "comparison", test: (p) => /\/vs\/|compare/i.test(p) },
  { key: "alternatives", test: (p) => /alternative/i.test(p) },
  { key: "best-of", test: (p) => /\/best\//i.test(p) },
  { key: "pricing", test: (p) => /pricing/i.test(p) },
  { key: "industry", test: (p) => /industry/i.test(p) },
  { key: "feature", test: (p) => /feature/i.test(p) },
  { key: "tool-type", test: (p) => /tool-type/i.test(p) },
  { key: "tag", test: (p) => /\/tag\//i.test(p) },
  { key: "company", test: (p) => /company/i.test(p) },
  { key: "news", test: (p) => /news/i.test(p) },
  { key: "prompt", test: (p) => /prompt/i.test(p) },
  { key: "resource", test: (p) => /resource/i.test(p) },
  { key: "learn", test: (p) => /learn/i.test(p) },
  { key: "submit", test: (p) => /submit-tool|submit/i.test(p) },
  { key: "homepage", test: (p) => /\/index\.(astro|md|mdx|html)$/i.test(p) },
];

const ENRICHMENT_PRIORITY_FIELDS = [
  "id", "handle", "slug", "name", "url", "final_url", "canonical_url", "canonical_domain",
  "brand_name_normalized", "logo_url", "logo_domain", "favicon_url",
  "desc", "short", "tagline", "seo_title", "seo_description",
  "cat", "category", "category_slug", "subcategory", "microcategory",
  "pricing", "pricing_tier", "pricing_model", "pricing_models",
  "platforms", "integrations", "feature_flags", "highlights", "tags",
  "input_types", "output_types", "target_audience", "industries", "workflow_stage",
  "use_cases", "prompt_use_cases", "best_for_queries", "search_intents",
  "related_tools", "comparison_targets", "comparison_cluster", "content_cluster",
  "affiliate_networks", "affiliate_priority_score", "commercial_intent_score",
  "quality_score", "trust_score", "popularity_score", "freshness_score",
  "editorial_priority_score", "review_readiness_score", "homepage_priority_score",
  "display_score", "visibility", "indexable", "is_active", "is_canonical",
  "canonical_handle", "http_status", "last_checked_at", "tool_status", "data_health",
  "duplicate_group", "duplicate_count", "needs_manual_review",
  "category_confidence", "category_source", "category_evidence",
  "primary_use_case", "monetization_paths"
];

const DATASET_ROLE_HINTS = [
  { role: "tool-pages", patterns: [/tool-page-data/i, /tool.*page/i] },
  { role: "category-map", patterns: [/category-map/i] },
  { role: "category-paths", patterns: [/category-paths/i] },
  { role: "subcategory-map", patterns: [/subcategory/i] },
  { role: "microcategory-map", patterns: [/microcategory/i] },
  { role: "feature-map", patterns: [/feature-map/i] },
  { role: "industry-map", patterns: [/industry-map/i] },
  { role: "pricing-map", patterns: [/pricing-map/i] },
  { role: "tag-map", patterns: [/tag-map/i] },
  { role: "tool-type-map", patterns: [/tool-type-map/i] },
  { role: "use-case-map", patterns: [/use-case-map/i] },
  { role: "workflow-map", patterns: [/workflow/i] },
  { role: "compare-page-data", patterns: [/compare-page-data/i, /vs/i] },
  { role: "alternatives-page-data", patterns: [/alternatives-page-data/i, /alternative/i] },
  { role: "homepage-data", patterns: [/homepage-data/i] },
  { role: "featured-tools", patterns: [/featured-tools/i] },
  { role: "related-map", patterns: [/related-map/i] },
  { role: "search-index", patterns: [/search[_-]?index/i] },
  { role: "authority-map", patterns: [/authority/i, /top100/i, /top10/i] },
  { role: "path-list", patterns: [/paths/i] },
  { role: "sitemap-source", patterns: [/sitemap/i] },
];

// ──────────────────────────────────────────────────────────────────────────────
// Utils
// ──────────────────────────────────────────────────────────────────────────────

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readUtf8Safe(filePath) {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile() || stat.size > MAX_FILE_BYTES) return null;
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

function readJsonSafe(filePath) {
  try {
    const raw = readUtf8Safe(filePath);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function fileExists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function walkFiles(dir, out = []) {
  if (!fileExists(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules" || entry.name === ".astro" || entry.name === ".DS_Store") continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(abs, out);
    } else {
      out.push(abs);
    }
  }
  return out;
}

function rel(p) {
  return path.relative(ROOT, p).split(path.sep).join("/");
}

function ext(p) {
  return path.extname(p).toLowerCase();
}

function uniq(arr) {
  return [...new Set(arr)];
}

function countBy(items, keyFn) {
  const out = {};
  for (const item of items) {
    const key = keyFn(item);
    out[key] = (out[key] || 0) + 1;
  }
  return out;
}

function flattenObjectKeys(value, prefix = "", keys = new Set()) {
  if (Array.isArray(value)) {
    for (const item of value.slice(0, MAX_JSON_PREVIEW_ITEMS)) {
      flattenObjectKeys(item, prefix, keys);
    }
    return keys;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      const next = prefix ? `${prefix}.${k}` : k;
      keys.add(next);
      flattenObjectKeys(v, next, keys);
    }
  }
  return keys;
}

function inferJsonShape(value) {
  if (Array.isArray(value)) {
    return {
      topLevelType: "array",
      length: value.length,
      sampleKeys: value.length && value[0] && typeof value[0] === "object"
        ? [...flattenObjectKeys(value[0])].slice(0, 80)
        : [],
    };
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value);
    const firstVal = entries[0]?.[1];
    return {
      topLevelType: "object",
      keyCount: entries.length,
      sampleTopKeys: Object.keys(value).slice(0, 30),
      sampleNestedKeys: firstVal && typeof firstVal === "object"
        ? [...flattenObjectKeys(firstVal)].slice(0, 80)
        : [],
    };
  }

  return { topLevelType: typeof value };
}

function safePct(part, total) {
  if (!total) return 0;
  return Number(((part / total) * 100).toFixed(2));
}

function shortPreview(value, maxLen = 140) {
  const str = typeof value === "string" ? value : JSON.stringify(value);
  return str.length > maxLen ? `${str.slice(0, maxLen)}…` : str;
}

function inferRouteFromPageFile(filePath) {
  const relPath = rel(filePath).replace(/^src\/pages\//, "");
  const noExt = relPath.replace(/\.(astro|md|mdx|html)$/i, "");
  let route = noExt;

  route = route.replace(/\/index$/i, "");
  route = route.replace(/^index$/i, "");
  route = "/" + route;
  route = route.replace(/\/+/g, "/");
  if (route !== "/" && route.endsWith("/")) route = route.slice(0, -1);
  return route || "/";
}

function inferPageType(filePath) {
  const normalized = "/" + rel(filePath);
  for (const def of PAGE_TYPE_PATTERNS) {
    if (def.test(normalized)) return def.key;
  }
  return "other";
}

function inferDatasetRole(filePath) {
  const name = path.basename(filePath);
  for (const hint of DATASET_ROLE_HINTS) {
    if (hint.patterns.some((re) => re.test(name))) return hint.role;
  }
  return "unknown";
}

function extractImports(content) {
  const imports = [];
  const re = /import\s+(?:[^\n]+?\s+from\s+)?["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(content))) imports.push(m[1]);
  return uniq(imports);
}

function extractJsonImports(content) {
  return extractImports(content).filter((s) => s.endsWith(".json") || s.includes("/data/"));
}

function extractLinks(content) {
  const links = [];

  const hrefRe = /(?:href|src)=\{?`?([\/][^"'`}\s>]+)`?\}?/g;
  let m;
  while ((m = hrefRe.exec(content))) links.push(m[1]);

  const quotedHrefRe = /(?:href|src)=["']([^"']+)["']/g;
  while ((m = quotedHrefRe.exec(content))) {
    if (m[1].startsWith("/")) links.push(m[1]);
  }

  const routeTemplateRe = /\/(?:ai-tools|tools|category|compare|best|alternatives|use-case|workflow|feature|industry|pricing|tag|tool-type)[^"'`\s)}]*/g;
  while ((m = routeTemplateRe.exec(content))) links.push(m[0]);

  return uniq(links);
}

function extractLikelySlugFields(sample) {
  const slugFields = [];
  for (const key of ["slug", "handle", "category_slug", "catSlug", "canonical_handle"]) {
    if (sample && typeof sample === "object" && key in sample) slugFields.push(key);
  }
  return slugFields;
}

function summarizeArrayDataset(arr) {
  const sample = arr.find((x) => x && typeof x === "object") || null;
  const fields = sample ? Object.keys(sample) : [];
  const slugFields = extractLikelySlugFields(sample);
  return {
    records: arr.length,
    sampleFields: fields.slice(0, 80),
    slugFields,
  };
}

function summarizeObjectDataset(obj) {
  const topKeys = Object.keys(obj);
  const firstVal = obj[topKeys[0]];
  const nestedFields = firstVal && typeof firstVal === "object" ? Object.keys(firstVal) : [];
  return {
    records: topKeys.length,
    sampleTopKeys: topKeys.slice(0, 20),
    sampleNestedFields: nestedFields.slice(0, 80),
  };
}

function extractAstroPropsUsage(content) {
  const propHits = [];
  const propRe = /tool\?\.([a-zA-Z0-9_]+)/g;
  let m;
  while ((m = propRe.exec(content))) propHits.push(m[1]);

  const genericRe = /(?:\b[a-zA-Z_][a-zA-Z0-9_]*\.)(([a-zA-Z_][a-zA-Z0-9_]*))/g;
  while ((m = genericRe.exec(content))) {
    if (!["map", "filter", "slice", "join", "toLowerCase", "toUpperCase", "replace", "length", "find", "entries", "values", "keys", "sort"].includes(m[1])) {
      propHits.push(m[1]);
    }
  }

  return uniq(propHits);
}

function mdTable(rows, headers) {
  const head = `| ${headers.join(" | ")} |`;
  const sep = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((r) => `| ${headers.map((h) => String(r[h] ?? "")).join(" | ")} |`).join("\n");
  return [head, sep, body].join("\n");
}

// ──────────────────────────────────────────────────────────────────────────────
// Scan project files
// ──────────────────────────────────────────────────────────────────────────────

ensureDir(OUT_DIR);

const allFiles = walkFiles(ROOT);
const srcFiles = allFiles.filter((f) => rel(f).startsWith("src/"));
const pageFiles = srcFiles.filter((f) => rel(f).startsWith("src/pages/") && PAGE_EXTENSIONS.has(ext(f)));
const componentFiles = srcFiles.filter((f) => rel(f).startsWith("src/components/") && TEXT_EXTENSIONS.has(ext(f)));
const layoutFiles = srcFiles.filter((f) => rel(f).startsWith("src/layouts/") && TEXT_EXTENSIONS.has(ext(f)));
const dataFiles = allFiles.filter((f) => rel(f).startsWith(rel(DATA_DIR)) && ext(f) === ".json");
const rawDataFiles = allFiles.filter((f) => rel(f).startsWith(rel(RAW_DATA_DIR)) && ext(f) === ".json" && !rel(f).startsWith(rel(DATA_DIR)));
const distFiles = INCLUDE_DIST && fileExists(DIST_DIR) ? walkFiles(DIST_DIR) : [];

// ──────────────────────────────────────────────────────────────────────────────
// Routes + page inventory
// ──────────────────────────────────────────────────────────────────────────────

const pageInventory = pageFiles.map((file) => {
  const content = readUtf8Safe(file) || "";
  const imports = extractImports(content);
  const jsonImports = extractJsonImports(content);
  const links = extractLinks(content);
  const propsUsed = extractAstroPropsUsage(content);
  const route = inferRouteFromPageFile(file);
  const pageType = inferPageType(file);

  return {
    file: rel(file),
    route,
    pageType,
    imports,
    jsonImports,
    internalLinks: links,
    propsUsed,
    componentCount: imports.filter((i) => i.includes("/components/") || i.startsWith("@/components/")).length,
    layoutCount: imports.filter((i) => i.includes("/layouts/") || i.startsWith("@/layouts/")).length,
    datasetImportCount: jsonImports.length,
  };
});

const routeCounts = countBy(pageInventory, (p) => p.pageType);

// ──────────────────────────────────────────────────────────────────────────────
// Dataset inventory
// ──────────────────────────────────────────────────────────────────────────────

const datasetInventory = [];

for (const file of uniq([...dataFiles, ...rawDataFiles])) {
  const json = readJsonSafe(file);
  const role = inferDatasetRole(file);
  const info = {
    file: rel(file),
    role,
    status: json ? "ok" : "invalid_or_unreadable",
    topLevelType: null,
    records: 0,
    keyCount: 0,
    sampleFields: [],
    sampleTopKeys: [],
    sampleNestedFields: [],
    likelySlugFields: [],
    enrichmentPriorityFieldCoverage: {},
    enrichmentCoveragePct: 0,
    inferredShape: null,
    preview: null,
  };

  if (json !== null) {
    info.inferredShape = inferJsonShape(json);
    info.topLevelType = info.inferredShape.topLevelType;

    if (Array.isArray(json)) {
      const summary = summarizeArrayDataset(json);
      info.records = summary.records;
      info.sampleFields = summary.sampleFields;
      info.likelySlugFields = summary.slugFields;
      const fieldSet = new Set(summary.sampleFields);
      let hits = 0;
      for (const field of ENRICHMENT_PRIORITY_FIELDS) {
        const hit = fieldSet.has(field);
        info.enrichmentPriorityFieldCoverage[field] = hit;
        if (hit) hits += 1;
      }
      info.enrichmentCoveragePct = safePct(hits, ENRICHMENT_PRIORITY_FIELDS.length);
      info.preview = json.slice(0, Math.min(json.length, 2)).map((x) => shortPreview(x));
    } else if (json && typeof json === "object") {
      const summary = summarizeObjectDataset(json);
      info.records = summary.records;
      info.keyCount = summary.records;
      info.sampleTopKeys = summary.sampleTopKeys;
      info.sampleNestedFields = summary.sampleNestedFields;
      const fieldSet = new Set([...summary.sampleTopKeys, ...summary.sampleNestedFields]);
      let hits = 0;
      for (const field of ENRICHMENT_PRIORITY_FIELDS) {
        const hit = fieldSet.has(field);
        info.enrichmentPriorityFieldCoverage[field] = hit;
        if (hit) hits += 1;
      }
      info.enrichmentCoveragePct = safePct(hits, ENRICHMENT_PRIORITY_FIELDS.length);
      info.preview = Object.entries(json).slice(0, 2).map(([k, v]) => `${k}: ${shortPreview(v)}`);
    }
  }

  datasetInventory.push(info);
}

// ──────────────────────────────────────────────────────────────────────────────
// Dataset usage by pages/components
// ──────────────────────────────────────────────────────────────────────────────

const usageTargets = [...pageFiles, ...componentFiles, ...layoutFiles];
const datasetUsageMap = {};
for (const ds of datasetInventory) {
  datasetUsageMap[ds.file] = [];
}

for (const file of usageTargets) {
  const content = readUtf8Safe(file) || "";
  const imports = extractJsonImports(content);
  const relFile = rel(file);
  for (const imp of imports) {
    for (const ds of datasetInventory) {
      const name = path.basename(ds.file);
      if (imp.includes(name) || imp.includes(ds.file.replace(/^src\//, "@/"))) {
        datasetUsageMap[ds.file].push(relFile);
      }
    }
  }
}

for (const ds of datasetInventory) {
  ds.usedBy = uniq(datasetUsageMap[ds.file]);
  ds.usedByCount = ds.usedBy.length;
  ds.isUnused = ds.usedByCount === 0;
}

// ──────────────────────────────────────────────────────────────────────────────
// Internal links graph
// ──────────────────────────────────────────────────────────────────────────────

const graphNodes = pageInventory.map((p) => p.route);
const graphEdges = [];
const routeSet = new Set(graphNodes);

for (const page of pageInventory) {
  for (const link of page.internalLinks) {
    const target = link.replace(/`|\{.*?\}/g, "").replace(/\?.*$/, "").replace(/#.*$/, "");
    graphEdges.push({
      from: page.route,
      to: target,
      existsAsRoute: routeSet.has(target),
    });
  }
}

const inDegree = {};
const outDegree = {};
for (const node of graphNodes) {
  inDegree[node] = 0;
  outDegree[node] = 0;
}
for (const edge of graphEdges) {
  if (edge.from in outDegree) outDegree[edge.from] += 1;
  if (edge.to in inDegree) inDegree[edge.to] += 1;
}

const orphanRiskRoutes = graphNodes.filter((r) => r !== "/" && inDegree[r] === 0);
const deadTargetLinks = graphEdges.filter((e) => !e.existsAsRoute && e.to.startsWith("/"));

// ──────────────────────────────────────────────────────────────────────────────
// Field usage vs enrichment coverage
// ──────────────────────────────────────────────────────────────────────────────

const fieldUsageCounts = {};
for (const file of usageTargets) {
  const content = readUtf8Safe(file) || "";
  const props = extractAstroPropsUsage(content);
  for (const p of props) {
    fieldUsageCounts[p] = (fieldUsageCounts[p] || 0) + 1;
  }
}

const enrichmentCoverage = {
  priorityFields: ENRICHMENT_PRIORITY_FIELDS.map((field) => {
    const datasetsContaining = datasetInventory.filter((d) =>
      d.enrichmentPriorityFieldCoverage && d.enrichmentPriorityFieldCoverage[field]
    ).map((d) => d.file);
    return {
      field,
      usedInCodeFiles: fieldUsageCounts[field] || 0,
      presentInDatasetCount: datasetsContaining.length,
      presentInDatasets: datasetsContaining.slice(0, 20),
    };
  }),
};

// ──────────────────────────────────────────────────────────────────────────────
// Cluster & page family analysis
// ──────────────────────────────────────────────────────────────────────────────

const clusterAnalysis = {
  totalPageFiles: pageInventory.length,
  pageTypes: routeCounts,
  highIntentFamilies: {
    toolDetail: routeCounts["tool-detail"] || 0,
    comparison: routeCounts["comparison"] || 0,
    alternatives: routeCounts["alternatives"] || 0,
    bestOf: routeCounts["best-of"] || 0,
    useCase: routeCounts["use-case"] || 0,
    workflow: routeCounts["workflow"] || 0,
    category: routeCounts["category"] || 0,
    feature: routeCounts["feature"] || 0,
    industry: routeCounts["industry"] || 0,
    pricing: routeCounts["pricing"] || 0,
    tag: routeCounts["tag"] || 0,
    toolType: routeCounts["tool-type"] || 0,
  },
  likelyMissingFamilies: [],
};

if (!clusterAnalysis.highIntentFamilies.workflow) clusterAnalysis.likelyMissingFamilies.push("workflow pages");
if (!clusterAnalysis.highIntentFamilies.useCase) clusterAnalysis.likelyMissingFamilies.push("use-case pages");
if (!clusterAnalysis.highIntentFamilies.alternatives) clusterAnalysis.likelyMissingFamilies.push("alternatives pages");
if (!clusterAnalysis.highIntentFamilies.bestOf) clusterAnalysis.likelyMissingFamilies.push("best-of pages");
if (!clusterAnalysis.highIntentFamilies.comparison) clusterAnalysis.likelyMissingFamilies.push("comparison pages");

// ──────────────────────────────────────────────────────────────────────────────
// Architecture signals
// ──────────────────────────────────────────────────────────────────────────────

const architecture = {
  directories: {
    src: fileExists(SRC_DIR),
    pages: fileExists(PAGES_DIR),
    components: fileExists(COMPONENTS_DIR),
    layouts: fileExists(LAYOUTS_DIR),
    buildData: fileExists(DATA_DIR),
    rawData: fileExists(RAW_DATA_DIR),
    dist: fileExists(DIST_DIR),
  },
  counts: {
    allFiles: allFiles.length,
    srcFiles: srcFiles.length,
    pageFiles: pageFiles.length,
    componentFiles: componentFiles.length,
    layoutFiles: layoutFiles.length,
    buildJsonFiles: dataFiles.length,
    rawJsonFiles: rawDataFiles.length,
    distFiles: distFiles.length,
  },
  routeDepthDistribution: countBy(pageInventory, (p) => String(p.route.split("/").filter(Boolean).length || 0)),
  routesWithNoJsonImports: pageInventory.filter((p) => p.datasetImportCount === 0).map((p) => p.route),
  pagesUsingMostDatasets: [...pageInventory]
    .sort((a, b) => b.datasetImportCount - a.datasetImportCount)
    .slice(0, 15)
    .map((p) => ({ route: p.route, file: p.file, datasetImportCount: p.datasetImportCount })),
};

// ──────────────────────────────────────────────────────────────────────────────
// Score model
// ──────────────────────────────────────────────────────────────────────────────

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

const scoring = (() => {
  const datasetUseRatio = safePct(datasetInventory.filter((d) => !d.isUnused).length, datasetInventory.length || 1);
  const routeCoverageScore = clamp((Object.keys(routeCounts).length / 12) * 100, 0, 100);
  const linkHealthScore = clamp(100 - safePct(deadTargetLinks.length, graphEdges.length || 1), 0, 100);
  const orphanRiskScore = clamp(100 - safePct(orphanRiskRoutes.length, graphNodes.length || 1), 0, 100);
  const enrichmentAvg = datasetInventory.length
    ? Number((datasetInventory.reduce((sum, d) => sum + (d.enrichmentCoveragePct || 0), 0) / datasetInventory.length).toFixed(2))
    : 0;

  const codeUsageCoverageScore = clamp(
    safePct(
      enrichmentCoverage.priorityFields.filter((f) => f.usedInCodeFiles > 0).length,
      enrichmentCoverage.priorityFields.length
    ),
    0,
    100
  );

  const overall = Number((
    routeCoverageScore * 0.20 +
    linkHealthScore * 0.20 +
    orphanRiskScore * 0.15 +
    enrichmentAvg * 0.20 +
    datasetUseRatio * 0.15 +
    codeUsageCoverageScore * 0.10
  ).toFixed(2));

  return {
    overall,
    routeCoverageScore: Number(routeCoverageScore.toFixed(2)),
    linkHealthScore: Number(linkHealthScore.toFixed(2)),
    orphanRiskScore: Number(orphanRiskScore.toFixed(2)),
    enrichmentAvg,
    datasetUseRatio: Number(datasetUseRatio.toFixed(2)),
    codeUsageCoverageScore: Number(codeUsageCoverageScore.toFixed(2)),
  };
})();

// ──────────────────────────────────────────────────────────────────────────────
// Advice engine
// ──────────────────────────────────────────────────────────────────────────────

const advice = [];

if (datasetInventory.some((d) => d.isUnused)) {
  advice.push({
    priority: "high",
    area: "dataset-usage",
    message: `There are ${datasetInventory.filter((d) => d.isUnused).length} JSON datasets not referenced by pages/components. Either wire them into templates or remove/merge them to reduce maintenance overhead.`,
  });
}

if (orphanRiskRoutes.length > 0) {
  advice.push({
    priority: "high",
    area: "internal-linking",
    message: `${orphanRiskRoutes.length} routes have zero detected internal in-links. Add hub → subhub → detail links, breadcrumbs, related blocks, and footer lattice links.`,
  });
}

if (deadTargetLinks.length > 0) {
  advice.push({
    priority: "high",
    area: "link-health",
    message: `${deadTargetLinks.length} internal links point to targets not found in src/pages route inventory. Check renamed routes, legacy paths, and page-family prefixes.`,
  });
}

if ((routeCounts["workflow"] || 0) === 0) {
  advice.push({
    priority: "high",
    area: "page-families",
    message: "Workflow pages appear absent. This is a high-upside pSEO family because workflows connect use case, category, tool, and comparison intents.",
  });
}

if ((routeCounts["use-case"] || 0) === 0) {
  advice.push({
    priority: "high",
    area: "page-families",
    message: "Use-case pages appear absent or underbuilt. Add them as primary commercial-intent cluster pages and link them into category, feature, and best-of hubs.",
  });
}

const lowUseHighCoverageFields = enrichmentCoverage.priorityFields.filter(
  (f) => f.presentInDatasetCount > 0 && f.usedInCodeFiles === 0
).slice(0, 12);

if (lowUseHighCoverageFields.length) {
  advice.push({
    priority: "medium",
    area: "enrichment-utilization",
    message: `Several enriched fields exist in datasets but appear unused in templates: ${lowUseHighCoverageFields.map((f) => f.field).join(", ")}. Surface them in cards, detail pages, comparison blocks, schema, filters, and internal-link modules.`,
  });
}

const weakRoles = datasetInventory
  .filter((d) => d.role !== "unknown" && d.usedByCount === 0)
  .map((d) => `${d.role} (${d.file})`)
  .slice(0, 8);

if (weakRoles.length) {
  advice.push({
    priority: "medium",
    area: "dataset-pipeline",
    message: `Known build datasets with zero detected usage: ${weakRoles.join("; ")}. Verify import paths and whether the live build is still using legacy structures instead of the new dataset layer.`,
  });
}

advice.push({
  priority: "high",
  area: "architecture",
  message: "Target a strict lattice: homepage → main hubs → subhubs → page families → detail pages, plus reverse links (breadcrumbs, related, same-cluster, same-use-case, same-workflow, same-pricing, same-industry).",
});

advice.push({
  priority: "high",
  area: "content-strategy",
  message: "For each tool detail page, expose at least: alternatives, comparisons, best-for use cases, pricing bucket, feature cluster, industry relevance, related workflows, and 3–8 contextual internal links generated from dataset relationships.",
});

advice.push({
  priority: "medium",
  area: "build-pipeline",
  message: "Split pipeline into: enrich → normalize → authority → cluster-map → page-data → audit → build. The audit should fail CI when key datasets are missing, route families drop unexpectedly, or orphan/dead-link thresholds are exceeded.",
});

// ──────────────────────────────────────────────────────────────────────────────
// Final report objects
// ──────────────────────────────────────────────────────────────────────────────

const routeUsage = pageInventory.map((p) => ({
  route: p.route,
  file: p.file,
  pageType: p.pageType,
  datasetImports: p.jsonImports,
  internalLinkCount: p.internalLinks.length,
  propsUsed: p.propsUsed,
}));

const auditSummary = {
  generatedAt: new Date().toISOString(),
  root: ROOT,
  config: {
    srcDir: rel(SRC_DIR),
    pagesDir: rel(PAGES_DIR),
    dataDir: rel(DATA_DIR),
    rawDataDir: rel(RAW_DATA_DIR),
    outDir: rel(OUT_DIR),
    includeDist: INCLUDE_DIST,
  },
  scoring,
  architecture,
  clusterAnalysis,
  routeCounts,
  totals: {
    routes: pageInventory.length,
    datasets: datasetInventory.length,
    internalLinks: graphEdges.length,
    orphanRiskRoutes: orphanRiskRoutes.length,
    deadTargetLinks: deadTargetLinks.length,
  },
  topUnusedDatasets: datasetInventory.filter((d) => d.isUnused).slice(0, 20).map((d) => d.file),
  topOrphanRiskRoutes: orphanRiskRoutes.slice(0, 50),
  topDeadLinks: deadTargetLinks.slice(0, 50),
  mostUsedFieldsInCode: Object.entries(fieldUsageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40)
    .map(([field, count]) => ({ field, count })),
  advice,
};

// ──────────────────────────────────────────────────────────────────────────────
// Markdown report
// ──────────────────────────────────────────────────────────────────────────────

const topDatasetsRows = datasetInventory
  .sort((a, b) => b.records - a.records)
  .slice(0, 15)
  .map((d) => ({
    file: d.file,
    role: d.role,
    records: d.records,
    usedByCount: d.usedByCount,
    enrichmentCoveragePct: `${d.enrichmentCoveragePct}%`,
  }));

const orphanRows = orphanRiskRoutes.slice(0, 20).map((r) => ({ route: r }));
const deadRows = deadTargetLinks.slice(0, 20).map((e) => ({ from: e.from, to: e.to }));
const adviceRows = advice.map((a) => ({ priority: a.priority, area: a.area, message: a.message }));

const markdown = `# pSEO Build Audit Report

Generated: ${auditSummary.generatedAt}
Root: \`${ROOT}\`

## 1. Executive Summary

- Overall score: **${scoring.overall}/100**
- Routes detected: **${auditSummary.totals.routes}**
- Datasets detected: **${auditSummary.totals.datasets}**
- Internal links detected: **${auditSummary.totals.internalLinks}**
- Orphan-risk routes: **${auditSummary.totals.orphanRiskRoutes}**
- Dead internal link targets: **${auditSummary.totals.deadTargetLinks}**

### Score Breakdown

- Route coverage: **${scoring.routeCoverageScore}**
- Link health: **${scoring.linkHealthScore}**
- Orphan resistance: **${scoring.orphanRiskScore}**
- Avg enrichment coverage across datasets: **${scoring.enrichmentAvg}**
- Dataset usage ratio: **${scoring.datasetUseRatio}**
- Code usage of enriched fields: **${scoring.codeUsageCoverageScore}**

## 2. Site Structure

### Page Families

${mdTable(
  Object.entries(routeCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([pageType, count]) => ({ pageType, count })),
  ["pageType", "count"]
)}

### High-Intent Cluster Coverage

${mdTable(
  Object.entries(clusterAnalysis.highIntentFamilies).map(([family, count]) => ({ family, count })),
  ["family", "count"]
)}

${clusterAnalysis.likelyMissingFamilies.length ? `### Likely Missing / Underbuilt Families\n\n- ${clusterAnalysis.likelyMissingFamilies.join("\n- ")}\n` : ""}

## 3. Dataset Inventory

${mdTable(topDatasetsRows, ["file", "role", "records", "usedByCount", "enrichmentCoveragePct"])}

## 4. Orphan Risk Routes

${orphanRows.length ? mdTable(orphanRows, ["route"]) : "No orphan-risk routes detected by current static analysis."}

## 5. Dead Internal Links

${deadRows.length ? mdTable(deadRows, ["from", "to"]) : "No dead internal targets detected by current static analysis."}

## 6. Enrichment vs Actual Usage

The auditor compares high-value enrichment fields with code usage. Fields can exist in datasets but still be underused in cards/pages.

Top code-used fields:

${mdTable(
  auditSummary.mostUsedFieldsInCode.slice(0, 20).map((x) => ({ field: x.field, count: x.count })),
  ["field", "count"]
)}

## 7. Concrete Advice

${mdTable(adviceRows, ["priority", "area", "message"])}

## 8. Practical Next Moves

1. Wire every strategic dataset into a visible page family or remove it.
2. Enforce homepage → hub → subhub → cluster → detail linking.
3. Generate context modules from datasets: related tools, comparisons, alternatives, workflows, pricing neighbors, feature neighbors.
4. Surface more enrichment in templates and schema.
5. Add CI thresholds for orphan risk, dead links, missing datasets, and unexpected page-family drops.
`;

// ──────────────────────────────────────────────────────────────────────────────
// Write outputs
// ──────────────────────────────────────────────────────────────────────────────

fs.writeFileSync(path.join(OUT_DIR, "audit-summary.json"), JSON.stringify(auditSummary, null, 2));
fs.writeFileSync(path.join(OUT_DIR, "audit-summary.md"), markdown);
fs.writeFileSync(path.join(OUT_DIR, "page-inventory.json"), JSON.stringify(pageInventory, null, 2));
fs.writeFileSync(path.join(OUT_DIR, "dataset-inventory.json"), JSON.stringify(datasetInventory, null, 2));
fs.writeFileSync(path.join(OUT_DIR, "internal-link-graph.json"), JSON.stringify({ nodes: graphNodes, edges: graphEdges, inDegree, outDegree }, null, 2));
fs.writeFileSync(path.join(OUT_DIR, "enrichment-coverage.json"), JSON.stringify(enrichmentCoverage, null, 2));
fs.writeFileSync(path.join(OUT_DIR, "route-usage.json"), JSON.stringify(routeUsage, null, 2));

// ──────────────────────────────────────────────────────────────────────────────
// Console output
// ──────────────────────────────────────────────────────────────────────────────

console.log("\n=== pSEO BUILD AUDIT COMPLETE ===");
console.log(`Root:                ${ROOT}`);
console.log(`Routes:              ${auditSummary.totals.routes}`);
console.log(`Datasets:            ${auditSummary.totals.datasets}`);
console.log(`Internal links:      ${auditSummary.totals.internalLinks}`);
console.log(`Orphan-risk routes:  ${auditSummary.totals.orphanRiskRoutes}`);
console.log(`Dead link targets:   ${auditSummary.totals.deadTargetLinks}`);
console.log(`Overall score:       ${scoring.overall}/100`);
console.log(`Output dir:          ${OUT_DIR}`);
console.log("Files written:");
console.log(` - ${path.join(OUT_DIR, "audit-summary.json")}`);
console.log(` - ${path.join(OUT_DIR, "audit-summary.md")}`);
console.log(` - ${path.join(OUT_DIR, "page-inventory.json")}`);
console.log(` - ${path.join(OUT_DIR, "dataset-inventory.json")}`);
console.log(` - ${path.join(OUT_DIR, "internal-link-graph.json")}`);
console.log(` - ${path.join(OUT_DIR, "enrichment-coverage.json")}`);
console.log(` - ${path.join(OUT_DIR, "route-usage.json")}`);
console.log("");
