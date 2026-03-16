import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const ROOT = process.cwd();

export const PATHS = {
  toolsInput: path.join(ROOT, "src", "data", "tools_production.json"),
  importsDir: path.join(ROOT, "data", "imports"),
  taxonomyCsv: path.join(ROOT, "data", "imports", "aiexpertscorner_taxonomy_master_blueprint-1.csv"),
  pageRulesCsv: path.join(ROOT, "data", "imports", "aiexpertscorner_page_generation_rules.csv"),
  configDir: path.join(ROOT, "src", "config", "taxonomy"),
  derivedDir: path.join(ROOT, "src", "data", "derived"),
  taxonomyDir: path.join(ROOT, "src", "data", "derived", "taxonomy"),
  graphsDir: path.join(ROOT, "src", "data", "derived", "graphs"),
  reviewDir: path.join(ROOT, "src", "data", "derived", "review"),
  cacheDir: path.join(ROOT, "src", "data", "derived", "cache"),
  buildDir: path.join(ROOT, "src", "data", "build"),
  payloadsDir: path.join(ROOT, "src", "data", "build", "page-payloads"),
  normalizedTools: path.join(ROOT, "src", "data", "derived", "tools.normalized.json"),
  taxonomyTools: path.join(ROOT, "src", "data", "derived", "tools.taxonomy.json"),
  enrichedTools: path.join(ROOT, "src", "data", "derived", "tools.enriched.json"),
  fingerprints: path.join(ROOT, "src", "data", "derived", "cache", "tool-fingerprints.json")
};

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

export function ensureBaseDirs() {
  [
    PATHS.derivedDir,
    PATHS.taxonomyDir,
    PATHS.graphsDir,
    PATHS.reviewDir,
    PATHS.cacheDir,
    PATHS.buildDir,
    PATHS.payloadsDir
  ].forEach(ensureDir);
}

export function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

export function exists(filePath) {
  return fs.existsSync(filePath);
}

export function kebab(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function toArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value == null || value === "") return [];
  return [value];
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
  const clean = (values || []).filter((v) => Number.isFinite(v));
  if (!clean.length) return null;
  return clean.reduce((a, b) => a + b, 0) / clean.length;
}

export function pick(obj, keys) {
  const out = {};
  for (const key of keys) out[key] = obj?.[key];
  return out;
}

export function parseCsv(filePath) {
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] ?? "";
    });
    return row;
  });
}

function splitCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"' && inQuotes && next === '"') {
      current += '"';
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += ch;
  }

  result.push(current.trim());
  return result;
}

export function readToolsInput() {
  const raw = readJson(PATHS.toolsInput, []);
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.tools)) return raw.tools;
  return [];
}

export function stringBlob(tool) {
  return [
    tool.name,
    tool.display_name,
    tool.tagline,
    tool.short,
    tool.short_description,
    tool.desc,
    tool.description,
    ...(tool.feature_tags || []),
    ...(tool.tags || []),
    ...(tool.use_cases || []),
    ...(tool.capabilities || []),
    ...(tool.integrations || [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function getDomainFromUrl(input) {
  if (!input || typeof input !== "string") return "";
  try {
    const normalized = input.startsWith("http://") || input.startsWith("https://") ? input : `https://${input}`;
    return new URL(normalized).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function normalizePricingTier(tool) {
  const seed = String(tool.pricing_tier || tool.pricing_model || tool.pricing || "").toLowerCase();
  if (!seed) {
    if (tool.freemium) return "freemium";
    if (tool.free_trial) return "paid";
    return "unknown";
  }
  if (seed.includes("freemium")) return "freemium";
  if (seed.includes("free")) return "free";
  if (seed.includes("enterprise") || seed.includes("paid") || seed.includes("subscription")) return "paid";
  return seed;
}

export function fingerprintTool(tool) {
  const stable = {
    name: tool.name,
    display_name: tool.display_name,
    slug: tool.slug,
    handle: tool.handle,
    url: tool.url,
    website_url: tool.website_url,
    homepage_url: tool.homepage_url,
    logo_url: tool.logo_url,
    tagline: tool.tagline,
    short: tool.short,
    short_description: tool.short_description,
    desc: tool.desc,
    description: tool.description,
    category: tool.category,
    subcategory: tool.subcategory,
    microcategory: tool.microcategory,
    tags: tool.tags,
    feature_tags: tool.feature_tags,
    integrations: tool.integrations,
    capabilities: tool.capabilities,
    use_cases: tool.use_cases,
    pricing_tier: tool.pricing_tier,
    pricing: tool.pricing,
    pricing_model: tool.pricing_model,
    review_count_total: tool.review_count_total,
    rating_average: tool.rating_average,
    featured: tool.is_featured
  };
  return crypto.createHash("sha1").update(JSON.stringify(stable)).digest("hex");
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
    "score_seo_value"
  ];
  const direct = avg(directFields.map((f) => Number(tool?.[f])));
  if (direct != null) return Math.round(clamp(direct));

  let fallback = 45;
  fallback += toArray(tool.use_cases).length * 2;
  fallback += toArray(tool.capabilities).length * 2;
  fallback += toArray(tool.integrations).length * 1.5;
  fallback += tool.free_trial ? 3 : 0;
  fallback += tool.freemium ? 3 : 0;
  fallback += num(tool.rating_average, 0) * 4;
  fallback += Math.min(num(tool.review_count_total, 0) / 20, 12);
  return Math.round(clamp(fallback));
}

export function overallEntityScore(tool) {
  return (
    num(tool.score_overall, deriveScore(tool)) +
    num(tool.score_bestof_value, 0) +
    num(tool.score_compare_value, 0) +
    num(tool.content_readiness_score, 0)
  );
}

export function toolCardSlim(tool) {
  return {
    slug: tool.slug,
    name: tool.display_name || tool.name,
    category: tool.category || null,
    subcategory: tool.subcategory || null,
    microcategory: tool.microcategory || null,
    pricing_tier: tool.pricing_tier || null,
    logo_url: tool.logo_url || null,
    logo_domain: tool.logo_domain || null,
    website_url: tool.website_url || tool.url || tool.homepage_url || null,
    score_overall: num(tool.score_overall, deriveScore(tool)),
    is_featured: !!tool.is_featured
  };
}
