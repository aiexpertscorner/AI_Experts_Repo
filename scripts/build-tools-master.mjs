#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const CONFIG = {
  inputs: {
    raw: "data/raw/tools_source.json",
    normalized: "data/staging/normalized/tools_normalized.json",
    enriched: "data/staging/enriched/tools_production.current.json",
    seed: "data/master/tools_master.seed.json"
  },
  outputs: {
    master: "data/master/tools_master.json",
    validation: "data/reports/validation/tools_master_validation.json",
    conflicts: "data/reports/validation/tools_master_conflicts.json",
    summary: "data/reports/validation/tools_master_summary.md"
  },
  identityFields: ["id", "handle", "slug", "url", "name"],
  preferredPrimaryFields: [
    "id",
    "handle",
    "slug",
    "name",
    "url",
    "canonical_url",
    "domain",
    "logo",
    "description",
    "short_description",
    "desc",
    "short",
    "pricing",
    "pricing_tier",
    "pricing_model",
    "category",
    "subcategory",
    "cat",
    "tags",
    "platforms",
    "features",
    "highlights",
    "use_cases",
    "useCases",
    "audiences",
    "audience",
    "workflow_stage",
    "workflowStages",
    "related_tools",
    "relatedTools",
    "alternatives",
    "compare_targets",
    "compareTargets",
    "seo",
    "seo_title",
    "seo_description",
    "content_state",
    "contentState",
    "scores",
    "score",
    "authority",
    "editorial_priority",
    "affiliate",
    "affiliate_status",
    "commercial",
    "review_status",
    "reviewState",
    "status"
  ],
  sourcePriority: ["seed", "enriched", "normalized", "raw"],
  requiredCoreFields: ["handle", "slug", "name", "url"],
  arraysToUnique: [
    "tags",
    "platforms",
    "features",
    "highlights",
    "use_cases",
    "useCases",
    "audiences",
    "audience",
    "workflowStages",
    "related_tools",
    "relatedTools",
    "alternatives",
    "compare_targets",
    "compareTargets"
  ]
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

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeSlug(value) {
  return normalizeText(value).toLowerCase().replace(/\s+/g, "-");
}

function normalizeUrl(value) {
  const raw = normalizeText(value);
  if (!raw) return "";
  try {
    const url = new URL(raw);
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return raw.replace(/\/$/, "");
  }
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) {
    return value.split(",").map((x) => x.trim()).filter(Boolean);
  }
  return [];
}

function uniqueArray(arr) {
  const seen = new Set();
  const out = [];
  for (const item of arr) {
    const key = typeof item === "string" ? item.trim().toLowerCase() : stableStringify(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(typeof item === "string" ? item.trim() : item);
  }
  return out;
}

function normalizeRecord(record, sourceName) {
  const out = { ...record };

  if (!isEmpty(out.slug)) out.slug = normalizeSlug(out.slug);
  if (!isEmpty(out.handle)) out.handle = normalizeSlug(out.handle);
  if (!isEmpty(out.url)) out.url = normalizeUrl(out.url);
  if (!isEmpty(out.canonical_url)) out.canonical_url = normalizeUrl(out.canonical_url);

  for (const field of CONFIG.arraysToUnique) {
    if (field in out) {
      out[field] = uniqueArray(normalizeArray(out[field]));
    }
  }

  out._source = sourceName;
  return out;
}

function loadRecords(filePath, sourceName) {
  if (!exists(filePath)) return [];
  const parsed = readJson(filePath);
  if (!Array.isArray(parsed)) {
    throw new Error(`Expected array JSON in ${filePath}`);
  }
  return parsed.map((r) => normalizeRecord(r, sourceName));
}

function buildIdentityCandidates(record) {
  const ids = [];

  if (!isEmpty(record.id)) ids.push("id:" + normalizeText(record.id).toLowerCase());
  if (!isEmpty(record.handle)) ids.push("handle:" + normalizeSlug(record.handle));
  if (!isEmpty(record.slug)) ids.push("slug:" + normalizeSlug(record.slug));
  if (!isEmpty(record.url)) ids.push("url:" + normalizeUrl(record.url).toLowerCase());
  if (!isEmpty(record.name)) ids.push("name:" + normalizeText(record.name).toLowerCase());

  return uniqueArray(ids);
}

function choosePrimaryIdentity(record) {
  const candidates = buildIdentityCandidates(record);
  return candidates[0] || "anon:" + sha1(stableStringify(record)).slice(0, 16);
}

function indexSource(records, sourceName) {
  const byPrimary = new Map();
  const aliasToPrimary = new Map();
  const duplicates = [];

  for (const record of records) {
    const primary = choosePrimaryIdentity(record);
    const aliases = buildIdentityCandidates(record);

    if (byPrimary.has(primary)) {
      duplicates.push({
        source: sourceName,
        primary,
        record_name: record.name || null,
        handle: record.handle || null,
        slug: record.slug || null,
        url: record.url || null
      });
    }

    byPrimary.set(primary, record);

    for (const alias of aliases) {
      if (!aliasToPrimary.has(alias)) {
        aliasToPrimary.set(alias, primary);
      }
    }
  }

  return { byPrimary, aliasToPrimary, duplicates };
}

function resolveCanonicalPrimary(record, sourceIndexes) {
  const aliases = buildIdentityCandidates(record);

  for (const sourceName of CONFIG.sourcePriority) {
    const idx = sourceIndexes[sourceName];
    for (const alias of aliases) {
      if (idx.aliasToPrimary.has(alias)) {
        return idx.aliasToPrimary.get(alias);
      }
    }
  }

  return choosePrimaryIdentity(record);
}

function chooseFieldValue(field, candidates, conflicts) {
  const nonEmpty = candidates.filter((c) => !isEmpty(c.value));
  if (nonEmpty.length === 0) return undefined;
  if (nonEmpty.length === 1) return nonEmpty[0].value;

  const serialized = nonEmpty.map((c) => ({
    source: c.source,
    value: c.value,
    hash: stableStringify(c.value)
  }));

  const distinct = uniqueBy(serialized, (x) => x.hash);

  if (distinct.length > 1) {
    conflicts.push({
      field,
      values: distinct.map((x) => ({
        source: x.source,
        value: x.value
      }))
    });
  }

  return nonEmpty[0].value;
}

function uniqueBy(arr, keyFn) {
  const seen = new Set();
  const out = [];
  for (const item of arr) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function mergeObjects(candidates, sourceMetaConflicts, parentField = "") {
  const out = {};
  const fieldNames = new Set();

  for (const c of candidates) {
    if (isPlainObject(c.value)) {
      for (const key of Object.keys(c.value)) fieldNames.add(key);
    }
  }

  for (const field of Array.from(fieldNames).sort()) {
    const fieldCandidates = candidates
      .filter((c) => isPlainObject(c.value) && field in c.value)
      .map((c) => ({
        source: c.source,
        value: c.value[field]
      }));

    const fullField = parentField ? `${parentField}.${field}` : field;
    out[field] = mergeAny(fullField, fieldCandidates, sourceMetaConflicts);
  }

  return out;
}

function mergeAny(field, candidates, sourceMetaConflicts) {
  const nonEmpty = candidates.filter((c) => !isEmpty(c.value));
  if (nonEmpty.length === 0) return undefined;
  if (nonEmpty.length === 1) return nonEmpty[0].value;

  const allArrays = nonEmpty.every((c) => Array.isArray(c.value));
  if (allArrays) {
    return uniqueArray(nonEmpty.flatMap((c) => c.value));
  }

  const allObjects = nonEmpty.every((c) => isPlainObject(c.value));
  if (allObjects) {
    return mergeObjects(nonEmpty, sourceMetaConflicts, field);
  }

  return chooseFieldValue(field, nonEmpty, sourceMetaConflicts);
}

function mergedFieldOrder(recordsBySource) {
  const fields = new Set(CONFIG.preferredPrimaryFields);
  for (const sourceName of CONFIG.sourcePriority) {
    const record = recordsBySource[sourceName];
    if (!record) continue;
    for (const key of Object.keys(record)) {
      if (!key.startsWith("_")) fields.add(key);
    }
  }
  return Array.from(fields);
}

function consolidateRecord(primaryId, recordsBySource) {
  const merged = {};
  const conflicts = [];
  const fields = mergedFieldOrder(recordsBySource);

  for (const field of fields) {
    const candidates = [];
    for (const sourceName of CONFIG.sourcePriority) {
      const record = recordsBySource[sourceName];
      if (record && field in record) {
        candidates.push({ source: sourceName, value: record[field] });
      }
    }

    const value = mergeAny(field, candidates, conflicts);
    if (!isEmpty(value)) merged[field] = value;
  }

  const sourcePresence = {};
  for (const sourceName of CONFIG.sourcePriority) {
    sourcePresence[sourceName] = !!recordsBySource[sourceName];
  }

  merged._meta = {
    primary_identity: primaryId,
    source_presence: sourcePresence,
    merged_from_sources: CONFIG.sourcePriority.filter((s) => !!recordsBySource[s]),
    conflict_count: conflicts.length
  };

  return { merged, conflicts };
}

function validateRecord(record) {
  const errors = [];
  const warnings = [];

  for (const field of CONFIG.requiredCoreFields) {
    if (isEmpty(record[field])) {
      errors.push(`missing_required:${field}`);
    }
  }

  if (!isEmpty(record.url)) {
    try {
      new URL(record.url);
    } catch {
      warnings.push("invalid_url_format");
    }
  }

  if (!isEmpty(record.slug) && String(record.slug).includes(" ")) {
    warnings.push("slug_contains_spaces");
  }

  if (!isEmpty(record.handle) && String(record.handle).includes(" ")) {
    warnings.push("handle_contains_spaces");
  }

  return { errors, warnings };
}

function buildDuplicateReport(records) {
  const fields = ["id", "handle", "slug", "url", "name"];
  const result = {};

  for (const field of fields) {
    const counts = new Map();

    for (const record of records) {
      if (isEmpty(record[field])) continue;
      const key =
        field === "url"
          ? normalizeUrl(record[field]).toLowerCase()
          : normalizeText(record[field]).toLowerCase();
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    const duplicates = Array.from(counts.entries())
      .filter(([, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 100)
      .map(([value, count]) => ({ value, count }));

    result[field] = {
      duplicate_value_count: duplicates.length,
      examples: duplicates
    };
  }

  return result;
}

function buildSummaryMarkdown(summary) {
  const lines = [];
  lines.push("# Tools Master Consolidation Summary");
  lines.push("");
  lines.push(`Generated at: ${summary.generated_at}`);
  lines.push("");
  lines.push("## Inputs");
  lines.push(`- raw: ${summary.inputs.raw.path} (${summary.inputs.raw.count})`);
  lines.push(`- normalized: ${summary.inputs.normalized.path} (${summary.inputs.normalized.count})`);
  lines.push(`- enriched: ${summary.inputs.enriched.path} (${summary.inputs.enriched.count})`);
  lines.push(`- seed: ${summary.inputs.seed.path} (${summary.inputs.seed.count})`);
  lines.push("");
  lines.push("## Outputs");
  lines.push(`- master records: **${summary.outputs.master_count}**`);
  lines.push(`- records with conflicts: **${summary.outputs.records_with_conflicts}**`);
  lines.push(`- total field conflicts: **${summary.outputs.total_field_conflicts}**`);
  lines.push(`- validation errors: **${summary.validation.total_error_records}**`);
  lines.push(`- validation warnings: **${summary.validation.total_warning_records}**`);
  lines.push("");
  lines.push("## Duplicate summary");
  for (const [field, info] of Object.entries(summary.duplicates)) {
    lines.push(`- ${field}: **${info.duplicate_value_count}** duplicate values`);
  }
  lines.push("");
  return lines.join("\n");
}

function main() {
  const raw = loadRecords(CONFIG.inputs.raw, "raw");
  const normalized = loadRecords(CONFIG.inputs.normalized, "normalized");
  const enriched = loadRecords(CONFIG.inputs.enriched, "enriched");
  const seed = loadRecords(CONFIG.inputs.seed, "seed");

  const sourceIndexes = {
    raw: indexSource(raw, "raw"),
    normalized: indexSource(normalized, "normalized"),
    enriched: indexSource(enriched, "enriched"),
    seed: indexSource(seed, "seed")
  };

  const allRecords = [
    ...raw.map((r) => ({ source: "raw", record: r })),
    ...normalized.map((r) => ({ source: "normalized", record: r })),
    ...enriched.map((r) => ({ source: "enriched", record: r })),
    ...seed.map((r) => ({ source: "seed", record: r }))
  ];

  const grouped = new Map();

  for (const item of allRecords) {
    const primary = resolveCanonicalPrimary(item.record, sourceIndexes);
    if (!grouped.has(primary)) {
      grouped.set(primary, {
        raw: null,
        normalized: null,
        enriched: null,
        seed: null
      });
    }

    const bucket = grouped.get(primary);
    if (!bucket[item.source]) {
      bucket[item.source] = item.record;
    }
  }

  const master = [];
  const conflictsReport = [];
  const validationReport = [];

  for (const [primaryId, recordsBySource] of grouped.entries()) {
    const { merged, conflicts } = consolidateRecord(primaryId, recordsBySource);
    const validation = validateRecord(merged);

    if (conflicts.length > 0) {
      conflictsReport.push({
        primary_identity: primaryId,
        handle: merged.handle || null,
        slug: merged.slug || null,
        name: merged.name || null,
        url: merged.url || null,
        source_presence: merged._meta.source_presence,
        conflicts
      });
    }

    validationReport.push({
      primary_identity: primaryId,
      handle: merged.handle || null,
      slug: merged.slug || null,
      name: merged.name || null,
      url: merged.url || null,
      errors: validation.errors,
      warnings: validation.warnings
    });

    master.push(merged);
  }

  master.sort((a, b) => {
    const ah = normalizeText(a.handle || a.slug || a.name);
    const bh = normalizeText(b.handle || b.slug || b.name);
    return ah.localeCompare(bh);
  });

  const duplicateSummary = buildDuplicateReport(master);
  const errorRecords = validationReport.filter((r) => r.errors.length > 0);
  const warningRecords = validationReport.filter((r) => r.warnings.length > 0);

  const summary = {
    generated_at: new Date().toISOString(),
    inputs: {
      raw: { path: CONFIG.inputs.raw, count: raw.length },
      normalized: { path: CONFIG.inputs.normalized, count: normalized.length },
      enriched: { path: CONFIG.inputs.enriched, count: enriched.length },
      seed: { path: CONFIG.inputs.seed, count: seed.length }
    },
    outputs: {
      master_path: CONFIG.outputs.master,
      master_count: master.length,
      records_with_conflicts: conflictsReport.length,
      total_field_conflicts: conflictsReport.reduce((sum, r) => sum + r.conflicts.length, 0)
    },
    validation: {
      validation_path: CONFIG.outputs.validation,
      total_error_records: errorRecords.length,
      total_warning_records: warningRecords.length
    },
    duplicates: duplicateSummary
  };

  writeJson(CONFIG.outputs.master, master);
  writeJson(CONFIG.outputs.validation, {
    summary,
    error_records: errorRecords.slice(0, 5000),
    warning_records: warningRecords.slice(0, 5000)
  });
  writeJson(CONFIG.outputs.conflicts, {
    summary: {
      record_conflict_count: conflictsReport.length,
      total_field_conflicts: conflictsReport.reduce((sum, r) => sum + r.conflicts.length, 0)
    },
    conflicts: conflictsReport
  });
  writeText(CONFIG.outputs.summary, buildSummaryMarkdown(summary));

  console.log("========================================");
  console.log("TOOLS MASTER CONSOLIDATION COMPLETE");
  console.log("========================================");
  console.log(`Master:      ${CONFIG.outputs.master}`);
  console.log(`Validation:  ${CONFIG.outputs.validation}`);
  console.log(`Conflicts:   ${CONFIG.outputs.conflicts}`);
  console.log(`Summary:     ${CONFIG.outputs.summary}`);
  console.log("");
  console.log(`Master records:           ${summary.outputs.master_count}`);
  console.log(`Records with conflicts:   ${summary.outputs.records_with_conflicts}`);
  console.log(`Validation error records: ${summary.validation.total_error_records}`);
  console.log(`Validation warning recs:  ${summary.validation.total_warning_records}`);
}

main();
