#!/usr/bin/env node
/**
 * V3 non-destructive data migration script
 *
 * Purpose:
 * - create the new V3 data folder structure
 * - copy selected files from current repo locations into the V3 structure
 * - optionally rename files during copy
 * - never overwrite existing targets unless --overwrite is passed
 * - generate JSON + Markdown migration reports
 * - support dry-run mode by default
 *
 * Usage:
 *   node scripts/migrate-v3-data-structure.mjs
 *   node scripts/migrate-v3-data-structure.mjs --apply
 *   node scripts/migrate-v3-data-structure.mjs --apply --overwrite
 *   node scripts/migrate-v3-data-structure.mjs --apply --config migration.v3.config.json
 *
 * Default behavior:
 * - dry run
 *
 * Recommended:
 *   npm run migrate:v3:data
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const DEFAULT_CONFIG = {
  rootDir: ".",
  outputDir: "data/migration-reports",
  createDirectories: [
    "data/raw",
    "data/staging/normalized",
    "data/staging/enriched",
    "data/master",
    "data/build/authority",
    "data/build/maps",
    "data/build/listings",
    "data/build/comparisons",
    "data/build/alternatives",
    "data/build/homepage",
    "data/build/prompts",
    "data/build/workflows",
    "data/build/insights",
    "data/page-payloads/search",
    "data/page-payloads/tools",
    "data/page-payloads/compare",
    "data/page-payloads/alternatives",
    "data/page-payloads/homepage",
    "data/reports/audits",
    "data/reports/inspections",
    "data/reports/validation"
  ],
  migrations: [
    {
      source: "src/data/tools_source.json",
      target: "data/raw/tools_source.json",
      category: "raw",
      action: "copy",
      required: true,
      notes: "Canonical raw source candidate"
    },
    {
      source: "src/data/build/tools-normalized.json",
      target: "data/staging/normalized/tools_normalized.json",
      category: "normalized",
      action: "copy",
      required: false,
      notes: "Promote misplaced normalized file into staging/normalized"
    },
    {
      source: "src/data/tools_production.json",
      target: "data/staging/enriched/tools_production.current.json",
      category: "enriched-current",
      action: "copy",
      required: true,
      notes: "Current enriched transitional dataset"
    },
    {
      source: "src/data/build/tools-master-mapped.json",
      target: "data/master/tools_master.seed.json",
      category: "master-seed",
      action: "copy",
      required: false,
      notes: "Strongest current master seed candidate"
    },
    {
      source: "src/data/tools_search_index.json",
      target: "data/page-payloads/search/tools_search_index.json",
      category: "page-payload-search",
      action: "copy",
      required: false,
      notes: "Derived search payload"
    },

    {
      source: "src/data/build/authority-tool-map.json",
      target: "data/build/authority/authority-tool-map.json",
      category: "build-authority",
      action: "copy",
      required: false
    },
    {
      source: "src/data/build/global-top100.json",
      target: "data/build/authority/global-top100.json",
      category: "build-authority",
      action: "copy",
      required: false
    },
    {
      source: "src/data/build/category-top10.json",
      target: "data/build/authority/category-top10.json",
      category: "build-authority",
      action: "copy",
      required: false
    },

    {
      source: "src/data/build/tool-map.json",
      target: "data/build/maps/tool-map.json",
      category: "build-maps",
      action: "copy",
      required: false
    },
    {
      source: "src/data/build/category-map.json",
      target: "data/build/maps/category-map.json",
      category: "build-maps",
      action: "copy",
      required: false
    },
    {
      source: "src/data/build/tag-map.json",
      target: "data/build/maps/tag-map.json",
      category: "build-maps",
      action: "copy",
      required: false
    },
    {
      source: "src/data/build/feature-map.json",
      target: "data/build/maps/feature-map.json",
      category: "build-maps",
      action: "copy",
      required: false
    },
    {
      source: "src/data/build/industry-map.json",
      target: "data/build/maps/industry-map.json",
      category: "build-maps",
      action: "copy",
      required: false
    },
    {
      source: "src/data/build/use-case-map.json",
      target: "data/build/maps/use-case-map.json",
      category: "build-maps",
      action: "copy",
      required: false
    },
    {
      source: "src/data/build/prompt-library-map.json",
      target: "data/build/maps/prompt-library-map.json",
      category: "build-maps",
      action: "copy",
      required: false
    },

    {
      source: "src/data/build/category-paths.json",
      target: "data/build/listings/category-paths.json",
      category: "build-listings",
      action: "copy",
      required: false
    },
    {
      source: "src/data/build/tag-paths.json",
      target: "data/build/listings/tag-paths.json",
      category: "build-listings",
      action: "copy",
      required: false
    },
    {
      source: "src/data/build/feature-paths.json",
      target: "data/build/listings/feature-paths.json",
      category: "build-listings",
      action: "copy",
      required: false
    },
    {
      source: "src/data/build/industry-paths.json",
      target: "data/build/listings/industry-paths.json",
      category: "build-listings",
      action: "copy",
      required: false
    },
    {
      source: "src/data/build/use-case-paths.json",
      target: "data/build/listings/use-case-paths.json",
      category: "build-listings",
      action: "copy",
      required: false
    },
    {
      source: "src/data/build/prompt-library-paths.json",
      target: "data/build/listings/prompt-library-paths.json",
      category: "build-listings",
      action: "copy",
      required: false
    },

    {
      source: "src/data/build/homepage-data.json",
      target: "data/build/homepage/homepage-data.json",
      category: "build-homepage",
      action: "copy",
      required: false
    },

    {
      source: "src/data/build/compare-pairs.json",
      target: "data/build/comparisons/compare-pairs.json",
      category: "build-comparisons",
      action: "copy",
      required: false
    },

    {
      source: "src/data/build/compare-page-data.json",
      target: "data/page-payloads/compare/compare-page-data.json",
      category: "page-payload-compare",
      action: "copy",
      required: false
    },
    {
      source: "src/data/build/alternatives-page-data.json",
      target: "data/page-payloads/alternatives/alternatives-page-data.json",
      category: "page-payload-alternatives",
      action: "copy",
      required: false
    },
    {
      source: "src/data/build/tool-page-data.json",
      target: "data/page-payloads/tools/tool-page-data.json",
      category: "page-payload-tools",
      action: "copy",
      required: false
    },

    {
      source: "src/data/build/data-layer-audit.json",
      target: "data/reports/audits/data-layer-audit.json",
      category: "reports-audits",
      action: "copy",
      required: false
    },
    {
      source: "src/data/build/data-layer-audit.md",
      target: "data/reports/audits/data-layer-audit.md",
      category: "reports-audits",
      action: "copy",
      required: false
    },
    {
      source: "src/data/build/project-data-inventory.json",
      target: "data/reports/audits/project-data-inventory.json",
      category: "reports-audits",
      action: "copy",
      required: false
    },
    {
      source: "src/data/build/project-data-inventory.md",
      target: "data/reports/audits/project-data-inventory.md",
      category: "reports-audits",
      action: "copy",
      required: false
    }
  ],
  reportBasename: "v3-data-migration"
};

function parseArgs(argv) {
  const args = {
    apply: false,
    overwrite: false,
    verbose: false,
    configPath: null
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--apply") args.apply = true;
    else if (arg === "--overwrite") args.overwrite = true;
    else if (arg === "--verbose") args.verbose = true;
    else if (arg === "--config") {
      args.configPath = argv[i + 1] || null;
      i += 1;
    }
  }

  return args;
}

function deepMerge(base, override) {
  if (Array.isArray(base) || Array.isArray(override)) {
    return override;
  }

  if (isPlainObject(base) && isPlainObject(override)) {
    const out = { ...base };
    for (const key of Object.keys(override)) {
      if (key in base) out[key] = deepMerge(base[key], override[key]);
      else out[key] = override[key];
    }
    return out;
  }

  return override;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exists(filePath) {
  try {
    fs.accessSync(filePath);
    return true;
  } catch {
    return false;
  }
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function normalizePath(p) {
  return p.split(path.sep).join("/");
}

function loadConfig(args) {
  let config = structuredCloneSafe(DEFAULT_CONFIG);
  if (args.configPath) {
    const configPath = path.resolve(args.configPath);
    if (!exists(configPath)) {
      throw new Error("Config file not found: " + configPath);
    }
    const custom = JSON.parse(fs.readFileSync(configPath, "utf8"));
    config = deepMerge(config, custom);
  }
  return config;
}

function structuredCloneSafe(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function sha1File(filePath) {
  const hash = crypto.createHash("sha1");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

function statFile(filePath) {
  const stat = fs.statSync(filePath);
  return {
    size: stat.size,
    mtimeMs: stat.mtimeMs
  };
}

function safeReadJsonInfo(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);

    const info = {
      validJson: true,
      topLevelType: Array.isArray(parsed) ? "array" : typeof parsed
    };

    if (Array.isArray(parsed)) {
      info.recordCount = parsed.length;
    } else if (isPlainObject(parsed)) {
      if (Array.isArray(parsed.items)) info.recordCount = parsed.items.length;
      else if (Array.isArray(parsed.tools)) info.recordCount = parsed.tools.length;
      else if (Array.isArray(parsed.records)) info.recordCount = parsed.records.length;
      else if (Array.isArray(parsed.data)) info.recordCount = parsed.data.length;
      else info.topLevelKeyCount = Object.keys(parsed).length;
    }

    return info;
  } catch (error) {
    return {
      validJson: false,
      parseError: String(error && error.message ? error.message : error)
    };
  }
}

function relativeToRoot(rootDir, filePath) {
  return normalizePath(path.relative(rootDir, filePath));
}

function planDirectories(rootDir, directories) {
  return directories.map((dir) => {
    const abs = path.resolve(rootDir, dir);
    return {
      relative: normalizePath(dir),
      absolute: abs,
      exists: exists(abs)
    };
  });
}

function createDirectories(plan, apply, verbose) {
  const results = [];

  for (const dir of plan) {
    const result = {
      ...dir,
      action: dir.exists ? "exists" : apply ? "created" : "would_create"
    };

    if (!dir.exists && apply) {
      ensureDir(dir.absolute);
    }

    if (verbose) {
      console.log("[dir] " + result.action + " -> " + result.relative);
    }

    results.push(result);
  }

  return results;
}

function analyzeMigration(rootDir, item) {
  const sourceAbs = path.resolve(rootDir, item.source);
  const targetAbs = path.resolve(rootDir, item.target);

  const sourceExists = exists(sourceAbs);
  const targetExists = exists(targetAbs);

  const sourceInfo = {
    exists: sourceExists,
    absolute: sourceAbs,
    relative: normalizePath(item.source)
  };

  const targetInfo = {
    exists: targetExists,
    absolute: targetAbs,
    relative: normalizePath(item.target)
  };

  if (sourceExists) {
    sourceInfo.stat = statFile(sourceAbs);
    sourceInfo.sha1 = sha1File(sourceAbs);
    sourceInfo.jsonInfo = item.source.toLowerCase().endsWith(".json")
      ? safeReadJsonInfo(sourceAbs)
      : null;
  }

  if (targetExists) {
    targetInfo.stat = statFile(targetAbs);
    targetInfo.sha1 = sha1File(targetAbs);
    targetInfo.jsonInfo = item.target.toLowerCase().endsWith(".json")
      ? safeReadJsonInfo(targetAbs)
      : null;
  }

  let decision = "review";
  let reason = "";

  if (!sourceExists) {
    decision = item.required ? "missing_required_source" : "missing_optional_source";
    reason = item.required
      ? "Required source file is missing."
      : "Optional source file is missing.";
  } else if (!targetExists) {
    decision = "copy";
    reason = "Target does not exist yet.";
  } else if (sourceInfo.sha1 === targetInfo.sha1) {
    decision = "skip_identical";
    reason = "Target already exists and is identical.";
  } else {
    decision = "conflict";
    reason = "Target exists but differs from source.";
  }

  return {
    category: item.category,
    action: item.action,
    required: !!item.required,
    notes: item.notes || "",
    source: sourceInfo,
    target: targetInfo,
    decision,
    reason
  };
}

function executeMigration(rootDir, analyzedItem, args) {
  const out = { ...analyzedItem };
  const targetDir = path.dirname(analyzedItem.target.absolute);

  if (analyzedItem.decision === "missing_required_source" || analyzedItem.decision === "missing_optional_source") {
    out.execution = "skipped_missing_source";
    return out;
  }

  if (analyzedItem.decision === "skip_identical") {
    out.execution = "skipped_identical";
    return out;
  }

  if (analyzedItem.decision === "conflict" && !args.overwrite) {
    out.execution = args.apply ? "skipped_conflict" : "would_skip_conflict";
    return out;
  }

  if (!args.apply) {
    out.execution =
      analyzedItem.decision === "conflict" && args.overwrite
        ? "would_overwrite"
        : "would_copy";
    return out;
  }

  ensureDir(targetDir);

  if (analyzedItem.decision === "conflict" && args.overwrite) {
    fs.copyFileSync(analyzedItem.source.absolute, analyzedItem.target.absolute);
    out.execution = "overwritten";
  } else {
    fs.copyFileSync(analyzedItem.source.absolute, analyzedItem.target.absolute);
    out.execution = "copied";
  }

  out.target.exists = true;
  out.target.stat = statFile(analyzedItem.target.absolute);
  out.target.sha1 = sha1File(analyzedItem.target.absolute);
  out.target.jsonInfo = analyzedItem.target.relative.toLowerCase().endsWith(".json")
    ? safeReadJsonInfo(analyzedItem.target.absolute)
    : null;

  return out;
}

function summarizeExecutions(results) {
  const summary = {};
  for (const result of results) {
    const key = result.execution || result.decision || "unknown";
    summary[key] = (summary[key] || 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(summary).sort((a, b) => b[1] - a[1])
  );
}

function summarizeByCategory(results) {
  const categories = {};
  for (const result of results) {
    if (!categories[result.category]) {
      categories[result.category] = {
        total: 0,
        copied: 0,
        overwritten: 0,
        skipped: 0,
        missing: 0,
        conflicts: 0
      };
    }

    const bucket = categories[result.category];
    bucket.total += 1;

    const exec = result.execution || "";
    const decision = result.decision || "";

    if (exec === "copied") bucket.copied += 1;
    if (exec === "overwritten") bucket.overwritten += 1;
    if (
      exec.startsWith("skipped") ||
      exec.startsWith("would_skip") ||
      exec === "skipped_identical"
    ) {
      bucket.skipped += 1;
    }
    if (decision.includes("missing")) bucket.missing += 1;
    if (decision === "conflict") bucket.conflicts += 1;
  }

  return categories;
}

function buildMarkdownReport(report) {
  const lines = [];

  lines.push("# V3 Data Migration Report");
  lines.push("");
  lines.push("Generated at: " + report.generatedAt);
  lines.push("Mode: " + (report.apply ? "apply" : "dry-run"));
  lines.push("Overwrite: " + (report.overwrite ? "true" : "false"));
  lines.push("");

  lines.push("## Directories");
  lines.push("");
  for (const dir of report.directories.results) {
    lines.push("- `" + dir.relative + "` → " + dir.action);
  }
  lines.push("");

  lines.push("## Migration summary");
  lines.push("");
  for (const entry of Object.entries(report.summary.executionCounts)) {
    lines.push("- " + entry[0] + ": **" + entry[1] + "**");
  }
  lines.push("");

  lines.push("## Category summary");
  lines.push("");
  for (const entry of Object.entries(report.summary.byCategory)) {
    const value = entry[1];
    lines.push(
      "- **" +
        entry[0] +
        "**: total=" +
        value.total +
        ", copied=" +
        value.copied +
        ", overwritten=" +
        value.overwritten +
        ", skipped=" +
        value.skipped +
        ", missing=" +
        value.missing +
        ", conflicts=" +
        value.conflicts
    );
  }
  lines.push("");

  lines.push("## File decisions");
  lines.push("");
  for (const item of report.results) {
    lines.push("### " + item.source.relative + " → " + item.target.relative);
    lines.push("- category: `" + item.category + "`");
    lines.push("- required: " + (item.required ? "true" : "false"));
    lines.push("- decision: **" + item.decision + "**");
    lines.push("- execution: **" + (item.execution || "n/a") + "**");
    lines.push("- reason: " + item.reason);
    if (item.notes) lines.push("- notes: " + item.notes);
    if (item.source.exists && item.source.stat) {
      lines.push(
        "- source size: " +
          item.source.stat.size +
          " bytes" +
          (typeof item.source.jsonInfo?.recordCount === "number"
            ? ", records=" + item.source.jsonInfo.recordCount
            : "")
      );
    }
    if (item.target.exists && item.target.stat) {
      lines.push(
        "- target size: " +
          item.target.stat.size +
          " bytes" +
          (typeof item.target.jsonInfo?.recordCount === "number"
            ? ", records=" + item.target.jsonInfo.recordCount
            : "")
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

function writeReports(rootDir, config, report) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const baseDir = path.resolve(rootDir, config.outputDir);
  ensureDir(baseDir);

  const jsonPath = path.join(baseDir, config.reportBasename + "-" + timestamp + ".json");
  const mdPath = path.join(baseDir, config.reportBasename + "-" + timestamp + ".md");
  const latestJsonPath = path.join(baseDir, config.reportBasename + "-latest.json");
  const latestMdPath = path.join(baseDir, config.reportBasename + "-latest.md");

  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf8");
  fs.writeFileSync(mdPath, buildMarkdownReport(report), "utf8");
  fs.writeFileSync(latestJsonPath, JSON.stringify(report, null, 2), "utf8");
  fs.writeFileSync(latestMdPath, buildMarkdownReport(report), "utf8");

  return {
    jsonPath,
    mdPath,
    latestJsonPath,
    latestMdPath
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = loadConfig(args);
  const rootDir = path.resolve(config.rootDir);

  const directoryPlan = planDirectories(rootDir, config.createDirectories);
  const directoryResults = createDirectories(directoryPlan, args.apply, args.verbose);

  const analyzed = config.migrations.map((item) => analyzeMigration(rootDir, item));
  const results = analyzed.map((item) => executeMigration(rootDir, item, args));

  const report = {
    generatedAt: new Date().toISOString(),
    apply: args.apply,
    overwrite: args.overwrite,
    rootDir: normalizePath(rootDir),
    directories: {
      planned: directoryPlan.length,
      results: directoryResults
    },
    summary: {
      executionCounts: summarizeExecutions(results),
      byCategory: summarizeByCategory(results)
    },
    results
  };

  const reportPaths = writeReports(rootDir, config, report);

  console.log("========================================");
  console.log("V3 DATA MIGRATION COMPLETE");
  console.log("========================================");
  console.log("Mode:       " + (args.apply ? "apply" : "dry-run"));
  console.log("Overwrite:  " + (args.overwrite ? "true" : "false"));
  console.log("Root:       " + normalizePath(rootDir));
  console.log("JSON report: " + normalizePath(reportPaths.jsonPath));
  console.log("MD report:   " + normalizePath(reportPaths.mdPath));
  console.log("");

  for (const entry of Object.entries(report.summary.executionCounts)) {
    console.log("- " + entry[0] + ": " + entry[1]);
  }
}

main();