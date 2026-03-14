/**
 * AIExpertsCorner — build-tools-taxonomy-overlay.mjs
 * --------------------------------------------------
 * Safe overlay layer on top of tools_production.json.
 *
 * Purpose:
 * - Preserve the existing tool records
 * - Add deterministic normalized taxonomy fields
 * - Do NOT change existing build outputs
 * - Generate inspection-friendly overlay artifacts
 *
 * Outputs:
 * - src/data/build/tools-normalized.json
 * - src/data/build/taxonomy-overlay-report.json
 */

import fs from "fs";
import path from "path";

const root = process.cwd();
const INPUT = path.join(root, "src/data/tools_production.json");
const OUT_DIR = path.join(root, "src/data/build");
const OUT_NORMALIZED = path.join(OUT_DIR, "tools-normalized.json");
const OUT_REPORT = path.join(OUT_DIR, "taxonomy-overlay-report.json");

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Input file not found: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "").trim();
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON in ${filePath}: ${error.message}`);
  }
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const str = JSON.stringify(data, null, 2);
  fs.writeFileSync(filePath, str, "utf8");
  const kb = (str.length / 1024).toFixed(1);
  console.log(`  ✓ ${path.basename(filePath).padEnd(34)} ${kb} KB`);
}

function slugify(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function titleCaseFromSlug(slug = "") {
  return String(slug)
    .split("-")
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function safeStr(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function safeNum(value, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function safeBool(value) {
  return !!value;
}

function safeArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => (typeof item === "string" ? item.trim() : String(item ?? "").trim()))
    .filter(Boolean);
}

function uniqStrings(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function asEntityArray(values) {
  return uniqStrings(values)
    .map(name => {
      const clean = safeStr(name);
      const slug = slugify(clean);
      if (!clean || !slug) return null;
      return { name: clean, slug };
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function firstEntity(values) {
  const arr = asEntityArray(values);
  return arr.length ? arr[0] : null;
}

function normalizePricing(rawPricing) {
  const value = safeStr(rawPricing).toLowerCase();

  if (!value) {
    return { value: "unknown", label: "Unknown" };
  }

  if (["free", "freemium", "paid"].includes(value)) {
    return { value, label: value.charAt(0).toUpperCase() + value.slice(1) };
  }

  if (value.includes("free trial")) {
    return { value: "paid", label: "Paid" };
  }

  if (value.includes("subscription")) {
    return { value: "paid", label: "Paid" };
  }

  return { value, label: titleCaseFromSlug(slugify(value)) || "Unknown" };
}

function normalizeComplexity(rawComplexity) {
  const value = safeStr(rawComplexity).toLowerCase();

  if (!value) {
    return { value: "", label: "" };
  }

  const map = {
    beginner: "Beginner",
    basic: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced",
    expert: "Expert",
  };

  if (map[value]) {
    return { value, label: map[value] };
  }

  return {
    value: slugify(value),
    label: titleCaseFromSlug(slugify(value)),
  };
}

function normalizeCategory(tool) {
  const name =
    safeStr(tool.cat) ||
    safeStr(tool.category) ||
    "Other AI Tools";

  const slug =
    safeStr(tool.catSlug) ||
    safeStr(tool.cat_slug) ||
    slugify(name) ||
    "other-ai-tools";

  return {
    name,
    slug,
    source: safeStr(tool.catSlug) || safeStr(tool.cat_slug) ? "catSlug/cat_slug" : "cat/category",
  };
}

function normalizeToolType(tool, category) {
  const raw = safeStr(tool.tool_type || tool.type || "");
  if (!raw) {
    return {
      name: category.name,
      slug: category.slug,
      source: "category-fallback",
    };
  }

  return {
    name: raw,
    slug: slugify(raw),
    source: safeStr(tool.tool_type) ? "tool_type" : "type",
  };
}

function normalizeCompany(tool) {
  const raw = safeStr(tool.company || tool.brand || tool.brand_name_normalized || "");
  if (!raw) {
    return {
      name: "",
      slug: "",
      source: "",
    };
  }

  return {
    name: raw,
    slug: slugify(raw),
    source: safeStr(tool.company)
      ? "company"
      : safeStr(tool.brand)
      ? "brand"
      : "brand_name_normalized",
  };
}

function normalizeAudience(value) {
  const raw = Array.isArray(value) ? value : value ? [value] : [];
  return asEntityArray(raw);
}

function normalizeScalarOrArray(value) {
  const raw = Array.isArray(value) ? value : value ? [value] : [];
  return asEntityArray(raw);
}

function normalizeHandleArray(values) {
  return uniqStrings(safeArray(values))
    .map(handle => ({ handle, slug: handle }))
    .sort((a, b) => a.handle.localeCompare(b.handle));
}

function buildCapabilities(tool) {
  const useCases = safeArray(tool.use_cases);
  const promptUseCases = safeArray(tool.prompt_use_cases);
  const featureFlags = safeArray(tool.feature_flags);
  const tags = safeArray(tool.tags);

  const combined = uniqStrings([
    ...useCases,
    ...promptUseCases,
    ...featureFlags,
    ...tags,
  ]);

  return asEntityArray(combined);
}

function countNonEmpty(records, getter) {
  let count = 0;
  for (const record of records) {
    const value = getter(record);
    if (Array.isArray(value)) {
      if (value.length > 0) count++;
    } else if (value && typeof value === "object") {
      if (Object.keys(value).length > 0 && Object.values(value).some(Boolean)) count++;
    } else if (value) {
      count++;
    }
  }
  return count;
}

function incrementMap(map, key) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + 1);
}

function topEntries(map, limit = 50) {
  return [...map.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    })
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

console.log("\nAIExpertsCorner — Build Tools Taxonomy Overlay");
console.log("──────────────────────────────────────────────");

const raw = readJson(INPUT);
if (!Array.isArray(raw)) {
  throw new Error("tools_production.json must be an array");
}

console.log(`Loaded: ${raw.length} records`);

const normalizedRecords = [];
const categoryCounts = new Map();
const toolTypeCounts = new Map();
const companyCounts = new Map();
const useCaseCounts = new Map();
const industryCounts = new Map();
const featureCounts = new Map();
const workflowCounts = new Map();
const audienceCounts = new Map();
const platformCounts = new Map();
const inputTypeCounts = new Map();
const outputTypeCounts = new Map();
const searchIntentCounts = new Map();
const capabilityCounts = new Map();
const monetizationCounts = new Map();

for (const tool of raw) {
  const handle = safeStr(tool.handle || tool.slug);
  const category = normalizeCategory(tool);
  const toolType = normalizeToolType(tool, category);
  const company = normalizeCompany(tool);
  const pricing = normalizePricing(tool.pricing || tool.pricing_tier);
  const complexity = normalizeComplexity(tool.complexity);

  const workflowStages = normalizeScalarOrArray(tool.workflow_stage);
  const targetAudiences = normalizeAudience(tool.target_audience);
  const useCases = normalizeScalarOrArray(tool.use_cases);
  const promptUseCases = normalizeScalarOrArray(tool.prompt_use_cases);
  const industries = normalizeScalarOrArray(tool.industries);
  const featureFlags = normalizeScalarOrArray(tool.feature_flags);
  const tags = normalizeScalarOrArray(tool.tags);
  const platforms = normalizeScalarOrArray(tool.platforms);
  const inputTypes = normalizeScalarOrArray(tool.input_types);
  const outputTypes = normalizeScalarOrArray(tool.output_types);
  const searchIntents = normalizeScalarOrArray(tool.search_intents);
  const monetizationPaths = normalizeScalarOrArray(tool.monetization_paths);
  const capabilities = buildCapabilities(tool);

  const primaryUseCase =
    firstEntity(
      safeStr(tool.primary_use_case)
        ? [tool.primary_use_case]
        : useCases.map(item => item.name)
    ) || null;

  const contentCluster = {
    name: safeStr(tool.content_cluster),
    slug: slugify(safeStr(tool.content_cluster)),
  };

  const comparisonCluster = {
    name: safeStr(tool.comparison_cluster),
    slug: slugify(safeStr(tool.comparison_cluster)),
  };

  const normalized = {
    category,
    subcategory: null,
    microcategory: null,
    tool_type: toolType,
    company,
    pricing,
    complexity,
    workflow_stages: workflowStages,
    target_audiences: targetAudiences,
    use_cases: useCases,
    primary_use_case: primaryUseCase,
    prompt_use_cases: promptUseCases,
    industries,
    feature_flags: featureFlags,
    tags,
    platforms,
    input_types: inputTypes,
    output_types: outputTypes,
    search_intents: searchIntents,
    monetization_paths: monetizationPaths,
    capabilities,
    content_cluster: contentCluster.slug ? contentCluster : null,
    comparison_cluster: comparisonCluster.slug ? comparisonCluster : null,
    related_tools: normalizeHandleArray(tool.related_tools),
    comparison_targets: normalizeHandleArray(tool.comparison_targets),
  };

  const record = {
    ...tool,

    normalized_category: category.name,
    normalized_category_slug: category.slug,

    normalized_subcategory: null,
    normalized_subcategory_slug: null,

    normalized_microcategory: null,
    normalized_microcategory_slug: null,

    normalized_tool_type: toolType.name,
    normalized_tool_type_slug: toolType.slug,

    normalized_company: company.name,
    normalized_company_slug: company.slug,

    normalized_pricing_tier: pricing.value,
    normalized_pricing_label: pricing.label,

    normalized_complexity: complexity.value,
    normalized_complexity_label: complexity.label,

    normalized_primary_use_case: primaryUseCase?.name || "",
    normalized_primary_use_case_slug: primaryUseCase?.slug || "",

    normalized_workflow_stages: workflowStages,
    normalized_target_audiences: targetAudiences,
    normalized_use_cases: useCases,
    normalized_prompt_use_cases: promptUseCases,
    normalized_industries: industries,
    normalized_feature_flags: featureFlags,
    normalized_tags: tags,
    normalized_platforms: platforms,
    normalized_input_types: inputTypes,
    normalized_output_types: outputTypes,
    normalized_search_intents: searchIntents,
    normalized_monetization_paths: monetizationPaths,
    normalized_capabilities: capabilities,

    taxonomy: normalized,
  };

  normalizedRecords.push(record);

  incrementMap(categoryCounts, category.slug);
  incrementMap(toolTypeCounts, toolType.slug);
  incrementMap(companyCounts, company.slug);
  useCases.forEach(item => incrementMap(useCaseCounts, item.slug));
  industries.forEach(item => incrementMap(industryCounts, item.slug));
  featureFlags.forEach(item => incrementMap(featureCounts, item.slug));
  workflowStages.forEach(item => incrementMap(workflowCounts, item.slug));
  targetAudiences.forEach(item => incrementMap(audienceCounts, item.slug));
  platforms.forEach(item => incrementMap(platformCounts, item.slug));
  inputTypes.forEach(item => incrementMap(inputTypeCounts, item.slug));
  outputTypes.forEach(item => incrementMap(outputTypeCounts, item.slug));
  searchIntents.forEach(item => incrementMap(searchIntentCounts, item.slug));
  capabilities.forEach(item => incrementMap(capabilityCounts, item.slug));
  monetizationPaths.forEach(item => incrementMap(monetizationCounts, item.slug));
}

writeJson(OUT_NORMALIZED, normalizedRecords);

const report = {
  generated_at: new Date().toISOString(),
  input_file: path.relative(root, INPUT).replace(/\\/g, "/"),
  output_file: path.relative(root, OUT_NORMALIZED).replace(/\\/g, "/"),
  total_tools: normalizedRecords.length,

  field_coverage: {
    normalized_category: countNonEmpty(normalizedRecords, r => r.normalized_category),
    normalized_tool_type: countNonEmpty(normalizedRecords, r => r.normalized_tool_type),
    normalized_company: countNonEmpty(normalizedRecords, r => r.normalized_company),
    normalized_pricing_tier: countNonEmpty(normalizedRecords, r => r.normalized_pricing_tier),
    normalized_complexity: countNonEmpty(normalizedRecords, r => r.normalized_complexity),
    normalized_primary_use_case: countNonEmpty(normalizedRecords, r => r.normalized_primary_use_case),
    normalized_workflow_stages: countNonEmpty(normalizedRecords, r => r.normalized_workflow_stages),
    normalized_target_audiences: countNonEmpty(normalizedRecords, r => r.normalized_target_audiences),
    normalized_use_cases: countNonEmpty(normalizedRecords, r => r.normalized_use_cases),
    normalized_prompt_use_cases: countNonEmpty(normalizedRecords, r => r.normalized_prompt_use_cases),
    normalized_industries: countNonEmpty(normalizedRecords, r => r.normalized_industries),
    normalized_feature_flags: countNonEmpty(normalizedRecords, r => r.normalized_feature_flags),
    normalized_tags: countNonEmpty(normalizedRecords, r => r.normalized_tags),
    normalized_platforms: countNonEmpty(normalizedRecords, r => r.normalized_platforms),
    normalized_input_types: countNonEmpty(normalizedRecords, r => r.normalized_input_types),
    normalized_output_types: countNonEmpty(normalizedRecords, r => r.normalized_output_types),
    normalized_search_intents: countNonEmpty(normalizedRecords, r => r.normalized_search_intents),
    normalized_monetization_paths: countNonEmpty(normalizedRecords, r => r.normalized_monetization_paths),
    normalized_capabilities: countNonEmpty(normalizedRecords, r => r.normalized_capabilities),
  },

  distinct_counts: {
    categories: categoryCounts.size,
    tool_types: toolTypeCounts.size,
    companies: companyCounts.size,
    use_cases: useCaseCounts.size,
    industries: industryCounts.size,
    feature_flags: featureCounts.size,
    workflow_stages: workflowCounts.size,
    target_audiences: audienceCounts.size,
    platforms: platformCounts.size,
    input_types: inputTypeCounts.size,
    output_types: outputTypeCounts.size,
    search_intents: searchIntentCounts.size,
    monetization_paths: monetizationCounts.size,
    capabilities: capabilityCounts.size,
  },

  top_values: {
    categories: topEntries(categoryCounts, 50),
    tool_types: topEntries(toolTypeCounts, 50),
    companies: topEntries(companyCounts, 50),
    use_cases: topEntries(useCaseCounts, 50),
    industries: topEntries(industryCounts, 50),
    feature_flags: topEntries(featureCounts, 50),
    workflow_stages: topEntries(workflowCounts, 50),
    target_audiences: topEntries(audienceCounts, 50),
    platforms: topEntries(platformCounts, 50),
    input_types: topEntries(inputTypeCounts, 50),
    output_types: topEntries(outputTypeCounts, 50),
    search_intents: topEntries(searchIntentCounts, 50),
    monetization_paths: topEntries(monetizationCounts, 50),
    capabilities: topEntries(capabilityCounts, 50),
  },

  notes: [
    "This overlay is additive and non-breaking.",
    "No existing build artifact is replaced in this step.",
    "subcategory and microcategory are intentionally left null until explicit mapping rules are defined.",
    "The next safe integration step is to switch build-authority-datasets.mjs and/or build-seo-datasets.mjs from tools_production.json to tools-normalized.json after inspection.",
  ],
};

writeJson(OUT_REPORT, report);

console.log("\n✅ Taxonomy overlay complete");
console.log("──────────────────────────");
console.log(`Normalized tools: ${normalizedRecords.length}`);
console.log(`Categories:       ${categoryCounts.size}`);
console.log(`Tool types:       ${toolTypeCounts.size}`);
console.log(`Companies:        ${companyCounts.size}`);
console.log(`Use cases:        ${useCaseCounts.size}`);
console.log(`Industries:       ${industryCounts.size}`);
console.log(`Capabilities:     ${capabilityCounts.size}`);
console.log(`\nOutput dir: ${OUT_DIR}\n`);