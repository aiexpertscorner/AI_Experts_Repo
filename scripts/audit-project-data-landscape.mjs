#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const CONFIG = {
  scanDirs: ["src/data", "data", "scripts", "docs"],
  outputJson: "src/data/build/project-data-inventory.json",
  outputMd: "src/data/build/project-data-inventory.md",
  maxSampleValues: 5,
  maxDuplicateEntries: 20,
  maxFieldSamples: 60,
  keyFields: ["id", "handle", "slug", "url", "name", "title", "path"],
  sourceIndicators: ["source", "raw", "import", "seed"],
  enrichedIndicators: [
    "production",
    "enriched",
    "master",
    "canonical",
    "taxonomy",
    "authority",
    "score",
    "related",
    "compare",
    "alternatives",
    "usecase",
    "use-case",
    "workflow",
    "audience"
  ],
  buildIndicators: [
    "build",
    "map",
    "paths",
    "stats",
    "index",
    "payload",
    "page-data",
    "sitemap",
    "featured",
    "top100",
    "top10",
    "homepage"
  ],
  reportIndicators: [
    "audit",
    "report",
    "debug",
    "inspect",
    "validation",
    "refactor"
  ],
  ignoreDirs: [
    "node_modules",
    ".git",
    "dist",
    ".astro",
    ".cache",
    "coverage"
  ]
};

function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizePath(p) {
  return p.split(path.sep).join("/");
}

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function isEmptyValue(v) {
  if (v === null || v === undefined) return true;
  if (typeof v === "string" && v.trim() === "") return true;
  if (Array.isArray(v) && v.length === 0) return true;
  if (isPlainObject(v) && Object.keys(v).length === 0) return true;
  return false;
}

function truncate(v, max = 120) {
  const s = typeof v === "string" ? v : JSON.stringify(v);
  if (!s) return "";
  return s.length > max ? s.slice(0, max) + "…" : s;
}

function inferValueType(v) {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v;
}

function shouldIgnoreDir(relPath) {
  const parts = normalizePath(relPath).split("/");
  return CONFIG.ignoreDirs.some((dir) => parts.includes(dir));
}

function walk(dir, out = []) {
  if (!exists(dir)) return out;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = normalizePath(path.relative(process.cwd(), full));

    if (entry.isDirectory()) {
      if (shouldIgnoreDir(rel)) continue;
      walk(full, out);
    } else {
      out.push({
        absPath: full,
        relPath: rel,
        baseName: path.basename(full),
        ext: path.extname(full).toLowerCase(),
        size: fs.statSync(full).size
      });
    }
  }

  return out;
}

function collectFiles() {
  const files = [];
  for (const dir of CONFIG.scanDirs) {
    walk(path.resolve(dir), files);
  }
  return files;
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

function summarizeObjectShape(records, limit = CONFIG.maxFieldSamples) {
  const fields = new Map();
  let seen = 0;

  for (const record of records) {
    if (!isPlainObject(record)) continue;
    seen += 1;
    if (seen > limit) break;

    for (const entry of Object.entries(record)) {
      const k = entry[0];
      const v = entry[1];

      if (!fields.has(k)) {
        fields.set(k, {
          field: k,
          present: 0,
          empty: 0,
          types: new Map(),
          samples: []
        });
      }

      const f = fields.get(k);
      f.present += 1;

      if (isEmptyValue(v)) {
        f.empty += 1;
      }

      const t = inferValueType(v);
      f.types.set(t, (f.types.get(t) || 0) + 1);

      if (!isEmptyValue(v) && f.samples.length < CONFIG.maxSampleValues) {
        f.samples.push(truncate(v));
      }
    }
  }

  return Array.from(fields.values())
    .map((f) => ({
      field: f.field,
      present: f.present,
      empty: f.empty,
      types: Object.fromEntries(
        Array.from(f.types.entries()).sort((a, b) => b[1] - a[1])
      ),
      samples: f.samples
    }))
    .sort((a, b) => {
      if (b.present !== a.present) return b.present - a.present;
      return a.field.localeCompare(b.field);
    });
}

function findDuplicates(records, keys = CONFIG.keyFields) {
  const out = {};

  for (const key of keys) {
    const counts = new Map();

    for (const rec of records) {
      if (!isPlainObject(rec)) continue;
      const v = rec[key];
      if (isEmptyValue(v)) continue;

      const id = typeof v === "string" ? v.trim() : JSON.stringify(v);
      counts.set(id, (counts.get(id) || 0) + 1);
    }

    const dupes = Array.from(counts.entries())
      .filter((entry) => entry[1] > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, CONFIG.maxDuplicateEntries)
      .map((entry) => ({
        value: truncate(entry[0]),
        count: entry[1]
      }));

    out[key] = {
      duplicateValueCount: dupes.length,
      examples: dupes
    };
  }

  return out;
}

function keywordScore(name, words) {
  const n = String(name || "").toLowerCase();
  return words.reduce((acc, w) => acc + (n.includes(w) ? 1 : 0), 0);
}

function classifyJson(file, parsed) {
  const rel = file.relPath.toLowerCase();
  const base = file.baseName.toLowerCase();
  const records = normalizeRecords(parsed);

  const sourceScore = keywordScore(rel, CONFIG.sourceIndicators);
  const enrichedScore = keywordScore(rel, CONFIG.enrichedIndicators);
  const buildScore = keywordScore(rel, CONFIG.buildIndicators);
  const reportScore = keywordScore(rel, CONFIG.reportIndicators);

  if (reportScore >= 1) {
    return {
      kind: "report_or_audit",
      confidence: reportScore >= 2 ? "high" : "medium",
      reason: "Filename/path strongly suggests report/audit/debug output."
    };
  }

  if (records && base.includes("search_index")) {
    return {
      kind: "derived_search_index",
      confidence: "high",
      reason: "Search/index naming plus record dataset shape."
    };
  }

  if (records && sourceScore >= 1 && enrichedScore === 0 && buildScore === 0) {
    return {
      kind: "raw_source_candidate",
      confidence: "high",
      reason: "Filename/path suggests raw/source input dataset."
    };
  }

  if (records && enrichedScore >= 1 && reportScore === 0) {
    return {
      kind: "enriched_or_master_candidate",
      confidence: enrichedScore >= 2 ? "high" : "medium",
      reason: "Filename/path suggests enriched, canonical, taxonomy, authority, or master data."
    };
  }

  if (records && buildScore >= 1) {
    return {
      kind: "derived_build_dataset",
      confidence: buildScore >= 2 ? "high" : "medium",
      reason: "Filename/path suggests generated build data, maps, payloads, stats, or index."
    };
  }

  if (parsed && isPlainObject(parsed) && !records) {
    if (base.includes("schema")) {
      return {
        kind: "schema_or_contract",
        confidence: "high",
        reason: "Schema/contract file."
      };
    }

    if (base.includes("blueprint")) {
      return {
        kind: "blueprint_or_contract",
        confidence: "high",
        reason: "Blueprint/config file."
      };
    }
  }

  return {
    kind: "unclear_or_mixed",
    confidence: "low",
    reason: "Could not confidently classify from filename/path/shape alone."
  };
}

function suggestV3Layer(classification, file) {
  switch (classification.kind) {
    case "raw_source_candidate":
      return "data/raw";
    case "enriched_or_master_candidate":
      if (file.baseName.toLowerCase().includes("production")) {
        return "data/staging/enriched";
      }
      return "data/master_or_staging_review";
    case "derived_search_index":
      return "data/page-payloads/search";
    case "derived_build_dataset":
      return "data/build";
    case "report_or_audit":
      return "data/reports";
    case "schema_or_contract":
    case "blueprint_or_contract":
      return "docs_or_contracts";
    default:
      return "manual_review";
  }
}

function auditJsonFile(file) {
  try {
    const parsed = readJson(file.absPath);
    const records = normalizeRecords(parsed);
    const classification = classifyJson(file, parsed);

    const result = {
      relPath: file.relPath,
      baseName: file.baseName,
      size: file.size,
      topLevelType: Array.isArray(parsed) ? "array" : typeof parsed,
      classification,
      suggestedV3Layer: suggestV3Layer(classification, file)
    };

    if (records) {
      result.recordCount = records.length;
      result.fieldStats = summarizeObjectShape(records);
      result.totalFields = result.fieldStats.length;
      result.duplicates = findDuplicates(records);
    } else if (isPlainObject(parsed)) {
      result.topLevelKeys = Object.keys(parsed).slice(0, 100);
      result.topLevelKeyCount = Object.keys(parsed).length;
    }

    return result;
  } catch (error) {
    return {
      relPath: file.relPath,
      baseName: file.baseName,
      size: file.size,
      error: String(error && error.message ? error.message : error),
      classification: {
        kind: "unreadable_or_invalid",
        confidence: "high",
        reason: "Failed to parse JSON."
      },
      suggestedV3Layer: "manual_review"
    };
  }
}

function classifyScript(file) {
  const rel = file.relPath.toLowerCase();

  const tags = [];
  if (/enrich|inject|canonical/.test(rel)) tags.push("enrichment");
  if (/taxonomy|map-tools/.test(rel)) tags.push("taxonomy");
  if (/authority|top100|featured/.test(rel)) tags.push("authority");
  if (/dataset|payload|page/.test(rel)) tags.push("datasets");
  if (/audit|inspect|validate|report/.test(rel)) tags.push("audit");
  if (/migration|inventory|classify/.test(rel)) tags.push("migration");

  let phase = "unclear";
  if (tags.includes("enrichment")) phase = "enrichment";
  else if (tags.includes("taxonomy")) phase = "taxonomy";
  else if (tags.includes("authority")) phase = "authority";
  else if (tags.includes("datasets")) phase = "datasets";
  else if (tags.includes("audit")) phase = "audit";

  return {
    relPath: file.relPath,
    baseName: file.baseName,
    size: file.size,
    tags,
    suggestedPhase: phase
  };
}

function buildRecommendations(jsonAudits, scriptAudits) {
  const recommendations = [];

  const byKind = (kind) =>
    jsonAudits.filter((x) => x.classification && x.classification.kind === kind);

  const rawCandidates = byKind("raw_source_candidate");
  const enrichedCandidates = byKind("enriched_or_master_candidate");
  const buildCandidates = byKind("derived_build_dataset");
  const reportCandidates = byKind("report_or_audit");
  const searchCandidates = byKind("derived_search_index");

  if (rawCandidates.length) {
    const best = rawCandidates
      .slice()
      .sort((a, b) => (b.recordCount || 0) - (a.recordCount || 0))[0];

    recommendations.push({
      topic: "raw_source",
      recommendation: best.relPath,
      reason: "Best raw/source candidate by classification and dataset shape."
    });
  }

  if (enrichedCandidates.length) {
    const best = enrichedCandidates
      .slice()
      .sort((a, b) => {
        const aScore = (a.totalFields || 0) + ((a.recordCount || 0) / 1000);
        const bScore = (b.totalFields || 0) + ((b.recordCount || 0) / 1000);
        return bScore - aScore;
      })[0];

    recommendations.push({
      topic: "enriched_master_candidate",
      recommendation: best.relPath,
      reason: "Most likely enriched/master candidate based on field richness and classification."
    });
  }

  recommendations.push({
    topic: "normalized_layer",
    recommendation: "Create explicit normalized dataset in data/staging/normalized",
    reason: "Current repo appears to jump from raw/source to production/build without a formal normalized layer."
  });

  recommendations.push({
    topic: "page_payloads",
    recommendation: searchCandidates.length
      ? searchCandidates.map((x) => x.relPath)
      : "Regenerate payloads from enriched master and derived datasets",
    reason: "Search indexes and page payloads should not be source-of-truth."
  });

  recommendations.push({
    topic: "build_outputs",
    recommendation: buildCandidates.map((x) => x.relPath).slice(0, 25),
    reason: "Treat maps/stats/page-data/index payloads as derived build outputs."
  });

  recommendations.push({
    topic: "reports",
    recommendation: reportCandidates.map((x) => x.relPath).slice(0, 25),
    reason: "Keep all audits/debug/inspect outputs under reports, not as canonical data."
  });

  const pipelinePhases = {};
  for (const s of scriptAudits) {
    if (!pipelinePhases[s.suggestedPhase]) {
      pipelinePhases[s.suggestedPhase] = [];
    }
    pipelinePhases[s.suggestedPhase].push(s.relPath);
  }

  recommendations.push({
    topic: "script_pipeline_groups",
    recommendation: pipelinePhases,
    reason: "Use these groups to reorganize scripts in clean-build-v3."
  });

  return recommendations;
}

function buildMarkdown(report) {
  const lines = [];
  lines.push("# Project Data Landscape Audit");
  lines.push("");
  lines.push("Generated at: " + report.generatedAt);
  lines.push("");

  lines.push("## Summary");
  lines.push("- JSON files scanned: **" + report.summary.jsonFileCount + "**");
  lines.push("- Script files scanned: **" + report.summary.scriptFileCount + "**");
  lines.push("");

  lines.push("## JSON classification counts");
  for (const entry of Object.entries(report.summary.jsonKinds)) {
    lines.push("- " + entry[0] + ": **" + entry[1] + "**");
  }
  lines.push("");

  lines.push("## Recommendations");
  for (const rec of report.recommendations) {
    const recommendationText =
      typeof rec.recommendation === "string"
        ? rec.recommendation
        : "see json report";
    lines.push("- **" + rec.topic + "**: " + recommendationText + " — " + rec.reason);
  }
  lines.push("");

  lines.push("## Top JSON candidates");
  const top = report.jsonAudits
    .filter((x) => !x.error)
    .slice()
    .sort((a, b) => (b.recordCount || 0) - (a.recordCount || 0))
    .slice(0, 30);

  for (const j of top) {
    lines.push("### " + j.relPath);
    lines.push("- kind: **" + j.classification.kind + "**");
    lines.push("- suggested V3 layer: `" + j.suggestedV3Layer + "`");
    lines.push("- records: " + (j.recordCount ?? "n/a"));
    lines.push("- fields: " + (j.totalFields ?? "n/a"));
    lines.push("- reason: " + j.classification.reason);
    lines.push("");
  }

  return lines.join("\n");
}

function summarizeKinds(jsonAudits) {
  const out = {};
  for (const j of jsonAudits) {
    const kind = (j.classification && j.classification.kind) || "unknown";
    out[kind] = (out[kind] || 0) + 1;
  }

  return Object.fromEntries(
    Object.entries(out).sort((a, b) => b[1] - a[1])
  );
}

function main() {
  const files = collectFiles();

  const jsonFiles = files.filter((f) => f.ext === ".json");
  const scriptFiles = files.filter(
    (f) =>
      (f.ext === ".js" || f.ext === ".mjs" || f.ext === ".cjs") &&
      f.relPath.startsWith("scripts/")
  );

  const jsonAudits = jsonFiles
    .map(auditJsonFile)
    .sort((a, b) => a.relPath.localeCompare(b.relPath));

  const scriptAudits = scriptFiles
    .map(classifyScript)
    .sort((a, b) => a.relPath.localeCompare(b.relPath));

  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      jsonFileCount: jsonAudits.length,
      scriptFileCount: scriptAudits.length,
      jsonKinds: summarizeKinds(jsonAudits)
    },
    jsonAudits,
    scriptAudits,
    recommendations: buildRecommendations(jsonAudits, scriptAudits)
  };

  ensureDir(CONFIG.outputJson);
  ensureDir(CONFIG.outputMd);

  fs.writeFileSync(CONFIG.outputJson, JSON.stringify(report, null, 2), "utf8");
  fs.writeFileSync(CONFIG.outputMd, buildMarkdown(report), "utf8");

  console.log("========================================");
  console.log("PROJECT DATA LANDSCAPE AUDIT COMPLETE");
  console.log("========================================");
  console.log("JSON files: " + report.summary.jsonFileCount);
  console.log("Scripts:    " + report.summary.scriptFileCount);
  console.log("JSON report: " + CONFIG.outputJson);
  console.log("MD report:   " + CONFIG.outputMd);
}

main();
