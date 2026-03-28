#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const CONFIG = {
  datasets: [
    "data/raw/tools_source.json",
    "data/staging/normalized/tools_normalized.json",
    "data/staging/enriched/tools_production.current.json",
    "data/master/tools_master.seed.json",
    "data/master/tools_master.json",

    "src/data/build/authority-tool-map.json",
    "src/data/build/global-top100.json",
    "src/data/build/category-top10.json",
    "src/data/build/featured-tools.json",
    "src/data/build/homepage-data.json",

    "src/data/build/alternatives-map.json",
    "src/data/build/alternatives-page-data.json",
    "src/data/build/best-of-map.json",
    "src/data/build/best-of-paths.json",
    "src/data/build/compare-map.json",
    "src/data/build/compare-page-data.json",
    "src/data/build/compare-pairs.json",
    "src/data/build/related-map.json",

    "src/data/build/category-map.json",
    "src/data/build/category-paths.json",
    "src/data/build/category-stats.json",
    "src/data/build/feature-map.json",
    "src/data/build/feature-paths.json",
    "src/data/build/industry-map.json",
    "src/data/build/industry-paths.json",
    "src/data/build/pricing-map.json",
    "src/data/build/pricing-paths.json",
    "src/data/build/pricing-stats.json",
    "src/data/build/tag-map.json",
    "src/data/build/tag-paths.json",
    "src/data/build/tool-map.json",
    "src/data/build/tool-page-data.json",
    "src/data/build/tool-paths.json",
    "src/data/build/tool-type-map.json",
    "src/data/build/tool-type-paths.json",
    "src/data/build/use-case-map.json",
    "src/data/build/use-case-paths.json",
    "src/data/build/prompt-library-map.json",
    "src/data/build/prompt-library-paths.json",
    "src/data/build/sitemap-data.json"
  ],
  outputs: {
    inventory: "data/reports/audits/json-intelligence-inventory.json",
    matrix: "data/reports/audits/json-intelligence-matrix.json",
    opportunities: "data/reports/audits/json-intelligence-opportunities.json",
    summary: "data/reports/audits/json-intelligence-summary.md"
  },
  identityFields: ["id", "handle", "slug", "url", "name", "title", "path"],
  fieldSampleLimit: 5,
  recordSampleLimit: 50,
  maxExamples: 20
};

function exists(filePath) {
  try {
    fs.accessSync(filePath);
    return true;
  } catch {
    return false;
  }
}

function ensureDirForFile(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  ensureDirForFile(filePath);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function writeText(filePath, text) {
  ensureDirForFile(filePath);
  fs.writeFileSync(filePath, text, "utf8");
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (isPlainObject(value)) return Object.keys(value).length === 0;
  return false;
}

function truncate(value, max = 140) {
  const str = typeof value === "string" ? value : JSON.stringify(value);
  if (!str) return "";
  return str.length > max ? str.slice(0, max) + "…" : str;
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return "[" + value.map(stableStringify).join(",") + "]";
  }
  if (isPlainObject(value)) {
    const keys = Object.keys(value).sort();
    return "{" + keys.map((k) => JSON.stringify(k) + ":" + stableStringify(value[k])).join(",") + "}";
  }
  return JSON.stringify(value);
}

function sha1(value) {
  return crypto.createHash("sha1").update(value).digest("hex");
}

function inferType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function normalizeRecords(data) {
  if (Array.isArray(data)) return data;

  if (isPlainObject(data)) {
    if (Array.isArray(data.items)) return data.items;
    if (Array.isArray(data.tools)) return data.tools;
    if (Array.isArray(data.records)) return data.records;
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data.pages)) return data.pages;

    const values = Object.values(data);
    if (values.length > 0 && values.every((v) => isPlainObject(v))) {
      return values;
    }
  }

  return null;
}

function buildIdentity(record) {
  for (const field of CONFIG.identityFields) {
    if (!isEmpty(record[field])) {
      return field + ":" + String(record[field]).trim().toLowerCase();
    }
  }
  return null;
}

function summarizeFields(records) {
  const fields = new Map();
  let seen = 0;

  for (const record of records) {
    if (!isPlainObject(record)) continue;
    seen += 1;
    if (seen > CONFIG.recordSampleLimit) break;

    for (const [field, value] of Object.entries(record)) {
      if (!fields.has(field)) {
        fields.set(field, {
          field,
          present: 0,
          empty: 0,
          types: new Map(),
          samples: []
        });
      }

      const stat = fields.get(field);
      stat.present += 1;
      if (isEmpty(value)) stat.empty += 1;

      const t = inferType(value);
      stat.types.set(t, (stat.types.get(t) || 0) + 1);

      if (!isEmpty(value) && stat.samples.length < CONFIG.fieldSampleLimit) {
        stat.samples.push(truncate(value));
      }
    }
  }

  return Array.from(fields.values())
    .map((f) => ({
      field: f.field,
      present: f.present,
      empty: f.empty,
      types: Object.fromEntries(Array.from(f.types.entries()).sort((a, b) => b[1] - a[1])),
      samples: f.samples
    }))
    .sort((a, b) => b.present - a.present || a.field.localeCompare(b.field));
}

function classifyDataset(filePath, parsed, records) {
  const name = filePath.toLowerCase();

  if (name.includes("audit") || name.includes("report") || name.includes("inventory")) {
    return "report";
  }
  if (name.includes("search_index")) {
    return "search_payload";
  }
  if (name.includes("page-data") || name.includes("page_data")) {
    return "page_payload";
  }
  if (name.includes("map") || name.includes("paths") || name.includes("stats") || name.includes("top100") || name.includes("top10")) {
    return "derived_build";
  }
  if (name.includes("master")) {
    return "master_candidate";
  }
  if (name.includes("normalized")) {
    return "normalized_candidate";
  }
  if (name.includes("production") || name.includes("enriched")) {
    return "enriched_candidate";
  }
  if (name.includes("source") || name.includes("raw")) {
    return "raw_candidate";
  }

  if (records && Array.isArray(records)) return "record_dataset";
  if (isPlainObject(parsed)) return "object_dataset";

  return "unknown";
}

function auditDataset(filePath) {
  const abs = path.resolve(filePath);
  if (!exists(abs)) {
    return {
      path: filePath,
      exists: false
    };
  }

  const raw = fs.readFileSync(abs, "utf8");
  const parsed = JSON.parse(raw);
  const records = normalizeRecords(parsed);
  const stat = fs.statSync(abs);

  const result = {
    path: filePath,
    exists: true,
    size_bytes: stat.size,
    size_mb: Number((stat.size / 1024 / 1024).toFixed(2)),
    top_level_type: Array.isArray(parsed) ? "array" : typeof parsed,
    dataset_kind: classifyDataset(filePath, parsed, records),
    sha1: sha1(raw)
  };

  if (records) {
    const identities = [];
    for (const record of records.slice(0, 2000)) {
      if (isPlainObject(record)) {
        const id = buildIdentity(record);
        if (id) identities.push(id);
      }
    }

    const uniqueIdentityCount = new Set(identities).size;

    result.record_count = records.length;
    result.sample_identity_count = identities.length;
    result.sample_unique_identity_count = uniqueIdentityCount;
    result.field_count = summarizeFields(records).length;
    result.fields = summarizeFields(records);
  } else if (isPlainObject(parsed)) {
    result.top_level_keys = Object.keys(parsed).slice(0, 200);
    result.top_level_key_count = Object.keys(parsed).length;
  }

  return result;
}

function loadDatasetRecords(filePath) {
  const abs = path.resolve(filePath);
  if (!exists(abs)) return [];
  const parsed = readJson(abs);
  const records = normalizeRecords(parsed);
  return records && Array.isArray(records) ? records : [];
}

function buildFieldPresenceMap(records) {
  const map = {};
  for (const record of records.slice(0, 5000)) {
    if (!isPlainObject(record)) continue;
    for (const [field, value] of Object.entries(record)) {
      if (!map[field]) {
        map[field] = {
          present: 0,
          non_empty: 0
        };
      }
      map[field].present += 1;
      if (!isEmpty(value)) map[field].non_empty += 1;
    }
  }
  return map;
}

function compareToMaster(masterPath, otherPath) {
  const masterRecords = loadDatasetRecords(masterPath);
  const otherRecords = loadDatasetRecords(otherPath);

  if (!masterRecords.length || !otherRecords.length) {
    return {
      master_path: masterPath,
      other_path: otherPath,
      comparable: false
    };
  }

  const masterMap = new Map();
  for (const record of masterRecords) {
    const id = buildIdentity(record);
    if (id) masterMap.set(id, record);
  }

  const otherMap = new Map();
  for (const record of otherRecords) {
    const id = buildIdentity(record);
    if (id) otherMap.set(id, record);
  }

  const sharedIds = [];
  for (const id of otherMap.keys()) {
    if (masterMap.has(id)) sharedIds.push(id);
  }

  const opportunities = [];
  const masterPresence = buildFieldPresenceMap(masterRecords);
  const otherPresence = buildFieldPresenceMap(otherRecords);

  const allFields = new Set([
    ...Object.keys(masterPresence),
    ...Object.keys(otherPresence)
  ]);

  for (const field of Array.from(allFields).sort()) {
    const masterInfo = masterPresence[field] || { present: 0, non_empty: 0 };
    const otherInfo = otherPresence[field] || { present: 0, non_empty: 0 };

    if (
      otherInfo.non_empty > masterInfo.non_empty &&
      !field.startsWith("_")
    ) {
      opportunities.push({
        field,
        master_non_empty_sample_count: masterInfo.non_empty,
        other_non_empty_sample_count: otherInfo.non_empty,
        delta: otherInfo.non_empty - masterInfo.non_empty
      });
    }
  }

  return {
    master_path: masterPath,
    other_path: otherPath,
    comparable: true,
    master_record_count: masterRecords.length,
    other_record_count: otherRecords.length,
    master_identity_count: masterMap.size,
    other_identity_count: otherMap.size,
    shared_identity_count: sharedIds.length,
    shared_ratio_against_other: Number((sharedIds.length / Math.max(otherMap.size, 1)).toFixed(4)),
    shared_ratio_against_master: Number((sharedIds.length / Math.max(masterMap.size, 1)).toFixed(4)),
    enrichment_opportunities: opportunities.slice(0, 100)
  };
}

function buildSummaryMarkdown(inventory, comparisons) {
  const lines = [];
  lines.push("# JSON Intelligence Audit Summary");
  lines.push("");
  lines.push(`Generated at: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("## Dataset inventory");
  lines.push("");

  for (const item of inventory) {
    if (!item.exists) {
      lines.push(`- \`${item.path}\` → missing`);
      continue;
    }

    lines.push(
      `- \`${item.path}\` → ${item.dataset_kind}, ${item.size_mb} MB` +
      (typeof item.record_count === "number" ? `, ${item.record_count} records` : "")
    );
  }

  lines.push("");
  lines.push("## Best enrichment opportunities vs master");
  lines.push("");

  for (const cmp of comparisons.filter((c) => c.comparable)) {
    lines.push(
      `### ${cmp.other_path}\n- shared identities: ${cmp.shared_identity_count}\n- overlap vs other: ${cmp.shared_ratio_against_other}`
    );

    const top = cmp.enrichment_opportunities.slice(0, 10);
    for (const opp of top) {
      lines.push(
        `- ${opp.field}: other ${opp.other_non_empty_sample_count} vs master ${opp.master_non_empty_sample_count}`
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

function main() {
  const inventory = CONFIG.datasets.map(auditDataset);

  const masterPath = exists(CONFIG.datasets.find((p) => p === "data/master/tools_master.json"))
    ? "data/master/tools_master.json"
    : "data/master/tools_master.seed.json";

  const comparisonTargets = CONFIG.datasets.filter((p) => p !== masterPath);
  const comparisons = comparisonTargets.map((otherPath) => compareToMaster(masterPath, otherPath));

  const opportunities = comparisons
    .filter((c) => c.comparable)
    .map((c) => ({
      dataset: c.other_path,
      shared_identity_count: c.shared_identity_count,
      shared_ratio_against_other: c.shared_ratio_against_other,
      top_enrichment_opportunities: c.enrichment_opportunities.slice(0, 25)
    }));

  writeJson(CONFIG.outputs.inventory, inventory);
  writeJson(CONFIG.outputs.matrix, comparisons);
  writeJson(CONFIG.outputs.opportunities, opportunities);
  writeText(CONFIG.outputs.summary, buildSummaryMarkdown(inventory, comparisons));

  console.log("========================================");
  console.log("JSON INTELLIGENCE AUDIT COMPLETE");
  console.log("========================================");
  console.log("Inventory:     " + CONFIG.outputs.inventory);
  console.log("Matrix:        " + CONFIG.outputs.matrix);
  console.log("Opportunities: " + CONFIG.outputs.opportunities);
  console.log("Summary:       " + CONFIG.outputs.summary);
}

main();