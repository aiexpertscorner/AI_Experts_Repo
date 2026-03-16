#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const DEFAULT_CONFIG = {
  files: [
    { key: "tools_source", path: "src/data/tools_source.json" },
    { key: "tools_production", path: "src/data/tools_production.json" },
    { key: "tools_search_index", path: "src/data/build/tools_search_index.json" }
  ],
  outputJson: "src/data/build/data-layer-audit.json",
  outputMd: "src/data/build/data-layer-audit.md",
  sampleLimit: 5,
  keyFields: ["id", "handle", "slug", "url", "name"],
  completenessFields: [
    "id",
    "handle",
    "slug",
    "name",
    "url",
    "desc",
    "short",
    "pricing",
    "cat",
    "category",
    "subcategory",
    "tags",
    "useCases",
    "platforms"
  ]
};

function fileExists(filePath) {
  try {
    fs.accessSync(filePath);
    return true;
  } catch {
    return false;
  }
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

function safeReadJson(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function inferValueType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function isEmptyValue(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (isPlainObject(value) && Object.keys(value).length === 0) return true;
  return false;
}

function truncate(value, max = 120) {
  const str =
    typeof value === "string" ? value : JSON.stringify(value);
  if (!str) return "";
  return str.length > max ? str.slice(0, max) + "…" : str;
}

function normalizeRecords(data) {
  if (Array.isArray(data)) return data;
  if (isPlainObject(data)) {
    if (Array.isArray(data.items)) return data.items;
    if (Array.isArray(data.tools)) return data.tools;
    if (Array.isArray(data.records)) return data.records;
    if (Array.isArray(data.data)) return data.data;
    const values = Object.values(data);
    if (values.every((v) => isPlainObject(v))) {
      return values;
    }
  }
  throw new Error("Unsupported JSON structure: expected array or object with tools/items/records/data");
}

function collectFieldStats(records, sampleLimit = 5) {
  const fieldStats = new Map();

  for (const record of records) {
    if (!isPlainObject(record)) continue;

    for (const [field, value] of Object.entries(record)) {
      if (!fieldStats.has(field)) {
        fieldStats.set(field, {
          field,
          presentCount: 0,
          emptyCount: 0,
          types: new Map(),
          samples: []
        });
      }

      const stat = fieldStats.get(field);
      stat.presentCount += 1;

      if (isEmptyValue(value)) {
        stat.emptyCount += 1;
      }

      const valueType = inferValueType(value);
      stat.types.set(valueType, (stat.types.get(valueType) || 0) + 1);

      if (stat.samples.length < sampleLimit && !isEmptyValue(value)) {
        stat.samples.push(truncate(value));
      }
    }
  }

  return [...fieldStats.values()]
    .map((s) => ({
      field: s.field,
      presentCount: s.presentCount,
      presentRatio: records.length ? round(s.presentCount / records.length) : 0,
      emptyCount: s.emptyCount,
      emptyRatio: records.length ? round(s.emptyCount / records.length) : 0,
      types: Object.fromEntries([...s.types.entries()].sort((a, b) => b[1] - a[1])),
      samples: s.samples
    }))
    .sort((a, b) => {
      if (b.presentCount !== a.presentCount) return b.presentCount - a.presentCount;
      return a.field.localeCompare(b.field);
    });
}

function round(num, decimals = 4) {
  return Number(num.toFixed(decimals));
}

function findDuplicates(records, fields) {
  const result = {};

  for (const field of fields) {
    const seen = new Map();
    const dups = new Map();

    for (const record of records) {
      if (!isPlainObject(record)) continue;
      const value = record[field];
      if (isEmptyValue(value)) continue;

      const key = typeof value === "string" ? value.trim() : JSON.stringify(value);

      if (!seen.has(key)) {
        seen.set(key, 1);
      } else {
        seen.set(key, seen.get(key) + 1);
        dups.set(key, seen.get(key));
      }
    }

    const duplicateEntries = [...dups.entries()]
      .map(([value, count]) => ({ value: truncate(value), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 25);

    result[field] = {
      duplicateValueCount: dups.size,
      duplicateEntries
    };
  }

  return result;
}

function recordCompleteness(record, fields) {
  let present = 0;
  for (const field of fields) {
    if (!isEmptyValue(record[field])) present += 1;
  }
  return fields.length ? present / fields.length : 0;
}

function summarizeCompleteness(records, fields) {
  const scores = records
    .filter(isPlainObject)
    .map((r) => recordCompleteness(r, fields));

  if (!scores.length) {
    return {
      avg: 0,
      min: 0,
      max: 0,
      p25: 0,
      p50: 0,
      p75: 0
    };
  }

  const sorted = [...scores].sort((a, b) => a - b);
  return {
    avg: round(sorted.reduce((a, b) => a + b, 0) / sorted.length),
    min: round(sorted[0]),
    max: round(sorted[sorted.length - 1]),
    p25: round(percentile(sorted, 0.25)),
    p50: round(percentile(sorted, 0.5)),
    p75: round(percentile(sorted, 0.75))
  };
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = (sorted.length - 1) * p;
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

function detectCompactIndexShape(fieldNames) {
  const compactHints = ["h", "n", "c", "sc", "p", "t", "s", "l"];
  const hitCount = compactHints.filter((f) => fieldNames.has(f)).length;
  return hitCount >= 4;
}

function classifyDataset({ key, topLevelType, fieldStats, records, duplicates }) {
  const fieldNames = new Set(fieldStats.map((f) => f.field));

  const hasCoreToolFields =
    fieldNames.has("id") &&
    (fieldNames.has("name") || fieldNames.has("n")) &&
    (fieldNames.has("url") || fieldNames.has("u"));

  const hasLongFormFields =
    fieldNames.has("desc") ||
    fieldNames.has("short") ||
    fieldNames.has("highlights") ||
    fieldNames.has("tags") ||
    fieldNames.has("platforms");

  const hasEnrichmentHints =
    fieldNames.has("useCases") ||
    fieldNames.has("audience") ||
    fieldNames.has("subcategory") ||
    fieldNames.has("category") ||
    fieldNames.has("seo") ||
    fieldNames.has("commercial") ||
    fieldNames.has("linking") ||
    fieldNames.has("contentState");

  const compactIndex = detectCompactIndexShape(fieldNames);

  const handleDups = duplicates.handle?.duplicateValueCount || 0;
  const slugDups = duplicates.slug?.duplicateValueCount || 0;
  const urlDups = duplicates.url?.duplicateValueCount || 0;

  if (compactIndex) {
    return {
      label: "derived_search_index_candidate",
      confidence: "high",
      reason: "Compact abbreviated field shape strongly suggests frontend/search payload."
    };
  }

  if (key.includes("source") && hasCoreToolFields && hasLongFormFields && !hasEnrichmentHints) {
    return {
      label: "raw_source_candidate",
      confidence: "high",
      reason: "Contains broad base tool fields without strong enrichment-layer signals."
    };
  }

  if (key.includes("production") && hasCoreToolFields && (hasLongFormFields || hasEnrichmentHints)) {
    return {
      label: "enriched_master_candidate",
      confidence: "medium",
      reason: "Likely canonical production dataset, but audit should confirm separation from derived outputs."
    };
  }

  if (hasEnrichmentHints && hasCoreToolFields) {
    return {
      label: "enriched_master_candidate",
      confidence: "medium",
      reason: "Contains tool identity plus enrichment-oriented fields."
    };
  }

  if (topLevelType === "array" && records.length > 0 && handleDups === 0 && slugDups === 0 && urlDups < 5) {
    return {
      label: "candidate_master_or_normalized",
      confidence: "low",
      reason: "Looks like a record-level dataset, but not enough signals to classify precisely."
    };
  }

  return {
    label: "mixed_or_unclear",
    confidence: "low",
    reason: "Dataset shape does not clearly match raw, enriched, or derived index patterns."
    };
}

function buildIdentityMap(records, fieldPreferenceList) {
  const map = new Map();

  for (const record of records) {
    if (!isPlainObject(record)) continue;

    let key = null;
    for (const field of fieldPreferenceList) {
      if (!isEmptyValue(record[field])) {
        key = String(record[field]).trim().toLowerCase();
        break;
      }
    }

    if (!key) continue;
    map.set(key, record);
  }

  return map;
}

function compareDatasets(a, b) {
  const aMap = buildIdentityMap(a.records, ["id", "handle", "slug", "url", "name", "n", "h"]);
  const bMap = buildIdentityMap(b.records, ["id", "handle", "slug", "url", "name", "n", "h"]);

  const aKeys = new Set(aMap.keys());
  const bKeys = new Set(bMap.keys());

  const shared = [...aKeys].filter((k) => bKeys.has(k));
  const onlyA = [...aKeys].filter((k) => !bKeys.has(k));
  const onlyB = [...bKeys].filter((k) => !aKeys.has(k));

  return {
    pair: `${a.key}__vs__${b.key}`,
    sharedIdentityCount: shared.length,
    onlyLeftCount: onlyA.length,
    onlyRightCount: onlyB.length,
    sharedRatioAgainstLeft: aKeys.size ? round(shared.length / aKeys.size) : 0,
    sharedRatioAgainstRight: bKeys.size ? round(shared.length / bKeys.size) : 0
  };
}

function buildRecommendations(audits) {
  const byKey = Object.fromEntries(audits.map((a) => [a.key, a]));
  const recommendations = [];

  const source = byKey.tools_source;
  const production = byKey.tools_production;
  const search = byKey.tools_search_index;

  if (source) {
    recommendations.push({
      layer: "raw",
      recommendedFile: source.path,
      datasetKey: source.key,
      reason: source.classification.reason
    });
  }

  if (production) {
    recommendations.push({
      layer: "enriched_master",
      recommendedFile: production.path,
      datasetKey: production.key,
      reason: production.classification.reason
    });
  }

  if (search) {
    recommendations.push({
      layer: "derived_search_index",
      recommendedFile: search.path,
      datasetKey: search.key,
      reason: search.classification.reason
    });
  }

  recommendations.push({
    layer: "normalized",
    recommendedFile: "TO_BE_CREATED",
    datasetKey: "tools_normalized",
    reason: "Normalized layer should exist explicitly in V3 even if current repo skips this as a standalone artifact."
  });

  recommendations.push({
    layer: "page_payloads",
    recommendedFile: "TO_BE_REGENERATED",
    datasetKey: "page_payloads",
    reason: "Page payloads should be generated from enriched master + derived maps, not treated as source datasets."
  });

  return recommendations;
}

function buildMarkdown(report) {
  const lines = [];
  lines.push("# Data Layer Audit");
  lines.push("");
  lines.push(`Generated at: ${report.generatedAt}`);
  lines.push("");

  lines.push("## Recommended V3 layer mapping");
  lines.push("");
  for (const rec of report.recommendations) {
    lines.push(`- **${rec.layer}** → \`${rec.recommendedFile}\` (${rec.reason})`);
  }
  lines.push("");

  lines.push("## Dataset summaries");
  lines.push("");

  for (const audit of report.datasets) {
    lines.push(`### ${audit.key}`);
    lines.push(`- Path: \`${audit.path}\``);
    lines.push(`- Exists: ${audit.exists}`);
    if (!audit.exists) {
      lines.push("");
      continue;
    }
    lines.push(`- Records: **${audit.recordCount}**`);
    lines.push(`- Top-level type: \`${audit.topLevelType}\``);
    lines.push(`- Classification: **${audit.classification.label}** (${audit.classification.confidence})`);
    lines.push(`- Reason: ${audit.classification.reason}`);
    lines.push(`- Completeness avg: **${audit.completeness.avg}**`);
    lines.push(`- Total distinct fields: **${audit.totalFields}**`);
    lines.push("");
    lines.push("Top fields:");
    for (const field of audit.fieldStats.slice(0, 20)) {
      lines.push(
        `- \`${field.field}\` present=${field.presentCount} (${field.presentRatio}) empty=${field.emptyCount} (${field.emptyRatio})`
      );
    }
    lines.push("");
  }

  lines.push("## Dataset overlap");
  lines.push("");
  for (const cmp of report.comparisons) {
    lines.push(
      `- **${cmp.pair}**: shared=${cmp.sharedIdentityCount}, left-only=${cmp.onlyLeftCount}, right-only=${cmp.onlyRightCount}`
    );
  }

  lines.push("");
  return lines.join("\n");
}

function auditFile(fileConfig, options) {
  const filePath = path.resolve(fileConfig.path);
  const exists = fileExists(filePath);

  if (!exists) {
    return {
      key: fileConfig.key,
      path: fileConfig.path,
      exists: false
    };
  }

  const rawData = safeReadJson(filePath);
  const topLevelType = Array.isArray(rawData) ? "array" : typeof rawData;
  const records = normalizeRecords(rawData);

  const fieldStats = collectFieldStats(records, options.sampleLimit);
  const duplicates = findDuplicates(records, options.keyFields);
  const completeness = summarizeCompleteness(records, options.completenessFields);
  const classification = classifyDataset({
    key: fileConfig.key,
    topLevelType,
    fieldStats,
    records,
    duplicates
  });

  return {
    key: fileConfig.key,
    path: fileConfig.path,
    exists: true,
    topLevelType,
    recordCount: records.length,
    totalFields: fieldStats.length,
    fieldStats,
    duplicates,
    completeness,
    classification,
    records
  };
}

function stripHeavyData(audit) {
  if (!audit.exists) return audit;
  return {
    ...audit,
    records: undefined
  };
}

function main() {
  const args = process.argv.slice(2);
  const config = structuredClone(DEFAULT_CONFIG);

  if (args.length) {
    const customPaths = args.map((p, i) => ({ key: `custom_${i + 1}`, path: p }));
    config.files = customPaths;
  }

  const audits = config.files.map((f) => auditFile(f, config));
  const existingAudits = audits.filter((a) => a.exists);

  const comparisons = [];
  for (let i = 0; i < existingAudits.length; i++) {
    for (let j = i + 1; j < existingAudits.length; j++) {
      comparisons.push(compareDatasets(existingAudits[i], existingAudits[j]));
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    recommendations: buildRecommendations(existingAudits),
    datasets: audits.map(stripHeavyData),
    comparisons
  };

  ensureDir(config.outputJson);
  ensureDir(config.outputMd);

  fs.writeFileSync(config.outputJson, JSON.stringify(report, null, 2), "utf8");
  fs.writeFileSync(config.outputMd, buildMarkdown(report), "utf8");

  console.log("========================================");
  console.log("DATA LAYER AUDIT COMPLETE");
  console.log("========================================");
  console.log(`JSON report: ${config.outputJson}`);
  console.log(`Markdown report: ${config.outputMd}`);
  console.log("");

  for (const ds of report.datasets) {
    if (!ds.exists) {
      console.log(`- ${ds.key}: MISSING (${ds.path})`);
      continue;
    }
    console.log(
      `- ${ds.key}: ${ds.recordCount} records | ${ds.classification.label} | completeness avg ${ds.completeness.avg}`
    );
  }
}

main();