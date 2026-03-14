import fs from "fs";
import path from "path";

const root = process.cwd();
const BUILD_DIR = path.join(root, "src/data/build");
const SEARCH_INDEX = path.join(root, "src/data/tools_search_index.json");

const REQUIRED_FILES = [
  "tools-master-mapped.json",
  "tool-map.json",
  "tool-paths.json",
  "category-map.json",
  "category-paths.json",
  "subcategory-map.json",
  "subcategory-paths.json",
  "microcategory-map.json",
  "microcategory-paths.json",
  "workflow-map.json",
  "workflow-paths.json",
  "capability-map.json",
  "capability-paths.json",
  "tag-map.json",
  "tag-paths.json",
  "use-case-map.json",
  "use-case-paths.json",
  "industry-map.json",
  "industry-paths.json",
  "company-map.json",
  "company-paths.json",
  "pricing-map.json",
  "pricing-paths.json",
  "compare-map.json",
  "compare-pairs.json",
  "compare-page-data.json",
  "alternatives-map.json",
  "alternatives-page-data.json",
  "tool-page-data.json",
  "featured-tools.json",
  "homepage-data.json",
  "sitemap-data.json",
  "build-meta.json",
  "category-top10.json",
  "pricing-stats.json",
  "category-stats.json",
  "skipped-records.json",
];

function exists(filePath) {
  return fs.existsSync(filePath);
}

function readJson(filePath) {
  if (!exists(filePath)) {
    throw new Error(`Missing file: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "").trim();
  return JSON.parse(raw);
}

function safeArr(v) {
  return Array.isArray(v) ? v : [];
}

function safeObj(v) {
  return v && typeof v === "object" && !Array.isArray(v) ? v : {};
}

function countKeys(obj) {
  return Object.keys(safeObj(obj)).length;
}

function pct(part, total) {
  if (!total) return "0.0%";
  return `${((part / total) * 100).toFixed(1)}%`;
}

function topEntriesFromObject(obj, limit = 10, valueKey = "count") {
  return Object.entries(safeObj(obj))
    .map(([key, value]) => ({
      key,
      value:
        typeof value === "number"
          ? value
          : typeof value?.[valueKey] === "number"
          ? value[valueKey]
          : safeArr(value?.tools).length,
    }))
    .sort((a, b) => b.value - a.value || a.key.localeCompare(b.key))
    .slice(0, limit);
}

function summarizeGroupMap(mapObj) {
  const values = Object.values(safeObj(mapObj));
  const counts = values.map((v) => safeArr(v.tools).length).sort((a, b) => a - b);

  const total = values.length;
  const thin1 = values.filter((v) => safeArr(v.tools).length <= 1).length;
  const thin2 = values.filter((v) => safeArr(v.tools).length <= 2).length;
  const thin3 = values.filter((v) => safeArr(v.tools).length <= 3).length;
  const over20 = values.filter((v) => safeArr(v.tools).length >= 20).length;
  const over50 = values.filter((v) => safeArr(v.tools).length >= 50).length;

  return {
    total,
    min: counts[0] ?? 0,
    p25: counts[Math.floor(total * 0.25)] ?? 0,
    median: counts[Math.floor(total * 0.5)] ?? 0,
    p75: counts[Math.floor(total * 0.75)] ?? 0,
    max: counts[counts.length - 1] ?? 0,
    thin1,
    thin2,
    thin3,
    over20,
    over50,
  };
}

function countToolsWithField(tools, field) {
  return tools.filter((t) => {
    const v = t?.[field];
    if (Array.isArray(v)) return v.length > 0;
    if (v && typeof v === "object") return Object.keys(v).length > 0;
    return !!v;
  }).length;
}

function printSection(title) {
  console.log(`\n${title}`);
  console.log("─".repeat(title.length));
}

function printKV(label, value) {
  console.log(`${label.padEnd(34)} ${value}`);
}

console.log("");
console.log("AI Experts Corner — SEO Build Output Audit");
console.log("═══════════════════════════════════════════");

printSection("1) File existence");

const missingFiles = [];
for (const file of REQUIRED_FILES) {
  const full = path.join(BUILD_DIR, file);
  const ok = exists(full);
  console.log(`${ok ? "✓" : "✗"} ${file}`);
  if (!ok) missingFiles.push(file);
}

const searchIndexExists = exists(SEARCH_INDEX);
console.log(`${searchIndexExists ? "✓" : "✗"} src/data/tools_search_index.json`);

if (missingFiles.length) {
  console.log("\n❌ Missing required build files:");
  for (const f of missingFiles) console.log(`- ${f}`);
  process.exit(1);
}

printSection("2) Load core files");

const masterMapped = readJson(path.join(BUILD_DIR, "tools-master-mapped.json"));
const toolMap = readJson(path.join(BUILD_DIR, "tool-map.json"));
const toolPaths = readJson(path.join(BUILD_DIR, "tool-paths.json"));
const toolPageData = readJson(path.join(BUILD_DIR, "tool-page-data.json"));
const alternativesPageData = readJson(path.join(BUILD_DIR, "alternatives-page-data.json"));
const comparePairs = readJson(path.join(BUILD_DIR, "compare-pairs.json"));
const comparePageData = readJson(path.join(BUILD_DIR, "compare-page-data.json"));
const categoryMap = readJson(path.join(BUILD_DIR, "category-map.json"));
const subcategoryMap = readJson(path.join(BUILD_DIR, "subcategory-map.json"));
const microcategoryMap = readJson(path.join(BUILD_DIR, "microcategory-map.json"));
const workflowMap = readJson(path.join(BUILD_DIR, "workflow-map.json"));
const capabilityMap = readJson(path.join(BUILD_DIR, "capability-map.json"));
const tagMap = readJson(path.join(BUILD_DIR, "tag-map.json"));
const useCaseMap = readJson(path.join(BUILD_DIR, "use-case-map.json"));
const industryMap = readJson(path.join(BUILD_DIR, "industry-map.json"));
const companyMap = readJson(path.join(BUILD_DIR, "company-map.json"));
const pricingMap = readJson(path.join(BUILD_DIR, "pricing-map.json"));
const sitemapData = readJson(path.join(BUILD_DIR, "sitemap-data.json"));
const buildMeta = readJson(path.join(BUILD_DIR, "build-meta.json"));

printKV("master mapped tools", masterMapped.length);
printKV("toolMap entries", countKeys(toolMap));
printKV("toolPaths", safeArr(toolPaths).length);
printKV("toolPageData entries", countKeys(toolPageData));
printKV("alternativesPageData entries", countKeys(alternativesPageData));
printKV("comparePairs", safeArr(comparePairs).length);
printKV("comparePageData entries", countKeys(comparePageData));
printKV("sitemap urls", safeArr(sitemapData.urls).length);

printSection("3) Core consistency");

const toolMapCount = countKeys(toolMap);
const toolPathCount = safeArr(toolPaths).length;
const toolPageCount = countKeys(toolPageData);
const altPageCount = countKeys(alternativesPageData);
const comparePairCount = safeArr(comparePairs).length;
const comparePageCount = countKeys(comparePageData);

printKV("toolMap vs toolPaths", toolMapCount === toolPathCount ? "OK" : `MISMATCH (${toolMapCount} vs ${toolPathCount})`);
printKV("toolPage coverage", `${toolPageCount}/${toolPathCount} (${pct(toolPageCount, toolPathCount)})`);
printKV("altPage coverage", `${altPageCount}/${toolPathCount} (${pct(altPageCount, toolPathCount)})`);
printKV("comparePage coverage", `${comparePageCount}/${comparePairCount} (${pct(comparePageCount, comparePairCount)})`);

printSection("4) Taxonomy coverage on tools-master-mapped");

const taxonomyFields = [
  "master_category_slug",
  "master_subcategory_slug",
  "master_microcategory_slug",
  "master_capabilities",
  "master_use_cases",
  "master_industries",
  "master_ai_models",
  "master_integrations",
  "master_agent_types",
  "master_platforms",
  "master_pricing_models",
  "master_skill_levels",
  "master_content_types",
  "master_tags",
  "master_workflows",
];

for (const field of taxonomyFields) {
  const covered = countToolsWithField(masterMapped, field);
  printKV(field, `${covered}/${masterMapped.length} (${pct(covered, masterMapped.length)})`);
}

printSection("5) Group map health");

const groupMaps = [
  ["categories", categoryMap],
  ["subcategories", subcategoryMap],
  ["microcategories", microcategoryMap],
  ["workflows", workflowMap],
  ["capabilities", capabilityMap],
  ["tags", tagMap],
  ["use-cases", useCaseMap],
  ["industries", industryMap],
  ["companies", companyMap],
  ["pricing", pricingMap],
];

for (const [label, mapObj] of groupMaps) {
  const s = summarizeGroupMap(mapObj);
  console.log(`\n${label}`);
  printKV("total groups", s.total);
  printKV("min / median / max", `${s.min} / ${s.median} / ${s.max}`);
  printKV("p25 / p75", `${s.p25} / ${s.p75}`);
  printKV("groups with <=1 tool", s.thin1);
  printKV("groups with <=2 tools", s.thin2);
  printKV("groups with <=3 tools", s.thin3);
  printKV("groups with >=20 tools", s.over20);
  printKV("groups with >=50 tools", s.over50);
}

printSection("6) Top groups by size");

const topGroups = [
  ["Top categories", categoryMap],
  ["Top subcategories", subcategoryMap],
  ["Top microcategories", microcategoryMap],
  ["Top workflows", workflowMap],
  ["Top capabilities", capabilityMap],
];

for (const [label, mapObj] of topGroups) {
  console.log(`\n${label}`);
  for (const row of topEntriesFromObject(mapObj, 10)) {
    console.log(`- ${row.key}: ${row.value}`);
  }
}

printSection("7) Route presence inside sitemap");

const urls = new Set(safeArr(sitemapData.urls).map((x) => x.path));

const sitemapChecks = [
  ["/ai-tools/category/", categoryMap],
  ["/ai-tools/subcategory/", subcategoryMap],
  ["/ai-tools/microcategory/", microcategoryMap],
  ["/ai-tools/workflow/", workflowMap],
  ["/ai-tools/capability/", capabilityMap],
  ["/ai-tools/tag/", tagMap],
  ["/ai-tools/use-case/", useCaseMap],
  ["/ai-tools/industry/", industryMap],
  ["/ai-tools/company/", companyMap],
];

for (const [prefix, mapObj] of sitemapChecks) {
  const keys = Object.keys(safeObj(mapObj));
  const present = keys.filter((k) => urls.has(`${prefix}${k}`)).length;
  printKV(prefix, `${present}/${keys.length} (${pct(present, keys.length)})`);
}

printSection("8) Spot checks");

const toolMapValues = Object.values(safeObj(toolMap));

const noCategory = toolMapValues.filter((t) => !t.category_slug).length;
const noSubcategory = toolMapValues.filter((t) => !t.subcategory_slug).length;
const noMicrocategory = toolMapValues.filter((t) => !t.microcategory_slug).length;
const noDescription = toolMapValues.filter((t) => !t.description || t.description.length < 30).length;
const noTagline = toolMapValues.filter((t) => !t.tagline || t.tagline.length < 10).length;
const noCompany = toolMapValues.filter((t) => !t.company_slug).length;
const noCompareTargets = toolMapValues.filter((t) => safeArr(t.compare_targets).length === 0).length;
const noRelatedTools = toolMapValues.filter((t) => safeArr(t.related_tools).length === 0).length;

printKV("tools missing category_slug", noCategory);
printKV("tools missing subcategory_slug", noSubcategory);
printKV("tools missing microcategory_slug", noMicrocategory);
printKV("tools thin description", noDescription);
printKV("tools thin tagline", noTagline);
printKV("tools missing company_slug", noCompany);
printKV("tools with no compare_targets", noCompareTargets);
printKV("tools with no related_tools", noRelatedTools);

printSection("9) build-meta sanity");

for (const key of [
  "version",
  "tool_count",
  "category_count",
  "subcategory_count",
  "microcategory_count",
  "workflow_count",
  "capability_count",
  "tag_count",
  "industry_count",
  "use_case_count",
  "company_count",
  "compare_pairs",
  "best_of_pages",
  "prompt_tools",
  "sitemap_urls",
]) {
  if (key in buildMeta) {
    printKV(key, buildMeta[key]);
  }
}

printSection("10) Final verdict");

const warnings = [];

if (toolMapCount !== toolPathCount) warnings.push("toolMap and toolPaths count mismatch");
if (toolPageCount < Math.min(toolPathCount, 1000)) warnings.push("toolPageData coverage looks very low");
if (comparePageCount === 0 && comparePairCount > 0) warnings.push("compare pages missing despite compare pairs");
if (countKeys(subcategoryMap) === 0) warnings.push("subcategory map is empty");
if (countKeys(microcategoryMap) === 0) warnings.push("microcategory map is empty");
if (countKeys(workflowMap) === 0) warnings.push("workflow map is empty");
if (countKeys(capabilityMap) === 0) warnings.push("capability map is empty");
if (noCategory > 0) warnings.push("some tools still have no category_slug");
if (safeArr(sitemapData.urls).length < 1000) warnings.push("sitemap url count seems unexpectedly low");

if (!warnings.length) {
  console.log("✅ Build output looks healthy.");
} else {
  console.log("⚠️ Warnings:");
  for (const w of warnings) console.log(`- ${w}`);
}

console.log("");