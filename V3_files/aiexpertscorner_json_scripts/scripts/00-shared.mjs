import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const BLUEPRINT_DIR = path.resolve(ROOT, "..", "aiexpertscorner_json_blueprint");
const INPUT_FILE = path.resolve(ROOT, "..", "aiexpertscorner_top100_tools_schema.json");
const OUTPUT_DIR = path.resolve(ROOT, "output");

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

export function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

export function exists(filePath) {
  return fs.existsSync(filePath);
}

export function loadContext() {
  const toolsData = readJson(INPUT_FILE);
  const tools = Array.isArray(toolsData?.tools) ? toolsData.tools : [];
  return {
    root: ROOT,
    inputFile: INPUT_FILE,
    blueprintDir: BLUEPRINT_DIR,
    outputDir: OUTPUT_DIR,
    dataset: toolsData,
    tools,
    fieldDefinitions: readJson(path.join(BLUEPRINT_DIR, "field_definitions.json")),
    allowedValues: readJson(path.join(BLUEPRINT_DIR, "allowed_values.json")),
    enrichmentRules: readJson(path.join(BLUEPRINT_DIR, "enrichment_rules.json")),
    scoringFormulas: readJson(path.join(BLUEPRINT_DIR, "scoring_formulas.json")),
    pageBlueprints: readJson(path.join(BLUEPRINT_DIR, "page_blueprints.json")),
    schemaExtensions: readJson(path.join(BLUEPRINT_DIR, "schema_extensions.json")),
  };
}

export function toArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value == null || value === "") return [];
  return [value];
}

export function isFilled(value) {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return false;
}

export function kebab(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function uniq(arr) {
  return [...new Set((arr || []).filter(Boolean))];
}

export function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

export function avg(values) {
  const clean = values.filter((v) => Number.isFinite(v));
  if (!clean.length) return null;
  return clean.reduce((a, b) => a + b, 0) / clean.length;
}

export function valueCount(arr) {
  const map = new Map();
  for (const item of arr || []) {
    map.set(item, (map.get(item) || 0) + 1);
  }
  return map;
}

export function getAllowedMap(allowedValues) {
  const registries = {
    platforms: new Set(allowedValues.platforms || []),
    pricing_models: new Set(allowedValues.pricing_models || []),
    skill_levels: new Set(allowedValues.skill_levels || []),
    ai_type: new Set(allowedValues.ai_type || []),
    funding_stage: new Set(allowedValues.funding_stage || []),
    public_private_status: new Set(allowedValues.public_private_status || []),
    ownership_type: new Set(allowedValues.ownership_type || []),
    company_size_range: new Set(allowedValues.company_size_range || []),
    workflow_complexity: new Set(allowedValues.workflow_complexity || []),
    serp_intents: new Set(allowedValues.serp_intents || []),
    data_health: new Set(allowedValues.data_health || []),
    stack_role: new Set(allowedValues.stack_role || []),
    roles: new Set(allowedValues.roles || []),
    personas: new Set(allowedValues.personas || []),
    departments: new Set(allowedValues.departments || []),
    common_capabilities: new Set(allowedValues.common_capabilities || []),
    common_use_cases: new Set(allowedValues.common_use_cases || []),
    common_industries: new Set(allowedValues.common_industries || []),
    common_integrations: new Set(allowedValues.common_integrations || []),
    common_content_types: new Set(allowedValues.common_content_types || []),
  };

  const categories = new Set();
  const subcategories = new Set();
  const microcategories = new Set();

  for (const category of allowedValues.categories || []) {
    if (category?.slug) categories.add(category.slug);
    for (const sub of category?.subcategories || []) {
      if (sub?.slug) subcategories.add(sub.slug);
      for (const micro of sub?.microcategories || []) {
        if (micro?.slug) microcategories.add(micro.slug);
      }
    }
  }

  registries.categories = categories;
  registries.subcategories = subcategories;
  registries.microcategories = microcategories;
  return registries;
}

export function toolCompleteness(tool, fieldDefinitions, tier = "tier_a_top100") {
  const weights = { P0: 5, P1: 2, P2: 1 };
  let total = 0;
  let filled = 0;
  const missingP0 = [];
  const missingP1 = [];
  const missingP2 = [];

  for (const [field, def] of Object.entries(fieldDefinitions.fields || {})) {
    const weight = weights[def.priority] || 1;
    total += weight;
    const present = isFilled(tool[field]);
    if (present) {
      filled += weight;
    } else {
      if (def.priority === "P0") missingP0.push(field);
      else if (def.priority === "P1") missingP1.push(field);
      else missingP2.push(field);
    }
  }

  return {
    score: total ? Math.round((filled / total) * 1000) / 10 : 0,
    missingP0,
    missingP1,
    missingP2,
  };
}

export function deriveScore(tool) {
  const directFields = [
    "score_overall",
    "score_feature_depth",
    "score_value_for_money",
    "score_compare_value",
    "score_bestof_value",
    "score_trust",
    "score_popularity",
    "score_workflow_fit",
    "score_beginner_fit",
    "score_integration_strength",
    "score_uniqueness",
    "score_aeo_value",
    "score_geo_value",
    "score_seo_value",
  ];

  const direct = avg(directFields.map((f) => num(tool[f], NaN)));
  if (direct != null) return Math.round(clamp(direct));

  let fallback = 50;
  fallback += toArray(tool.use_cases).length * 2;
  fallback += toArray(tool.capabilities).length * 2;
  fallback += toArray(tool.integrations).length * 1.5;
  fallback += tool.free_trial ? 3 : 0;
  fallback += tool.freemium ? 3 : 0;
  fallback += num(tool.rating_average, 0) * 4;
  fallback += Math.min(num(tool.review_count_total, 0) / 20, 12);
  fallback += toArray(tool.compare_candidates).length * 1.5;
  return Math.round(clamp(fallback));
}

export function deriveReadiness(tool, fieldDefinitions) {
  const c = toolCompleteness(tool, fieldDefinitions);
  const score = deriveScore(tool);
  const build = c.missingP0.length <= 5 && c.score >= 45;
  const index = build && score >= 55 && c.missingP0.length <= 2;
  return {
    completeness_score: c.score,
    quality_score: score,
    build_state: build ? (index ? "build_index" : "build_noindex") : "skip",
  };
}

export function slimTool(tool) {
  return {
    id: tool.id,
    name: tool.display_name || tool.name,
    slug: tool.slug,
    tagline: tool.tagline,
    short_description: tool.short_description,
    long_description: tool.long_description,
    category: tool.category,
    subcategory: tool.subcategory,
    microcategory: tool.microcategory,
    categories: toArray(tool.categories),
    subcategories: toArray(tool.subcategories),
    microcategories: toArray(tool.microcategories),
    use_cases: toArray(tool.use_cases),
    capabilities: toArray(tool.capabilities),
    integrations: toArray(tool.integrations),
    pricing_model: tool.pricing_model,
    pricing_models: toArray(tool.pricing_models),
    free_trial: tool.free_trial,
    freemium: tool.freemium,
    starting_price: tool.starting_price,
    homepage_url: tool.homepage_url,
    pricing_url: tool.pricing_url,
    logo_url: tool.logo_url,
    score_overall: deriveScore(tool),
  };
}
