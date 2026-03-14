#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const TARGET_DIRS = {
  scripts: path.join(ROOT, "scripts"),
  pages: path.join(ROOT, "src", "pages"),
  components: path.join(ROOT, "src", "components"),
  data: path.join(ROOT, "src", "data"),
};

const REPORT_PATH = path.join(
  ROOT,
  "src",
  "data",
  "build",
  "inspect-build-logic-report.json"
);

const FILE_EXTENSIONS = new Set([".mjs", ".js", ".astro", ".ts", ".json"]);

function normalizeSlashes(input) {
  return input.replace(/\\/g, "/");
}

function relativeFromRoot(absPath) {
  return normalizeSlashes(path.relative(ROOT, absPath));
}

function safeRead(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function walk(dir, results = []) {
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (
        entry.name === "node_modules" ||
        entry.name === ".git" ||
        entry.name === "dist" ||
        entry.name === ".astro" ||
        entry.name === ".vercel" ||
        entry.name === ".output"
      ) {
        continue;
      }
      walk(abs, results);
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (FILE_EXTENSIONS.has(ext)) {
        results.push(abs);
      }
    }
  }

  return results;
}

function uniq(arr) {
  return [...new Set(arr)].sort();
}

function getJsonFiles() {
  return walk(TARGET_DIRS.data)
    .filter((p) => p.endsWith(".json"))
    .map((abs) => ({
      abs,
      rel: relativeFromRoot(abs),
      base: path.basename(abs),
    }))
    .sort((a, b) => a.rel.localeCompare(b.rel));
}

function getCodeFiles() {
  return [
    ...walk(TARGET_DIRS.scripts),
    ...walk(TARGET_DIRS.pages),
    ...walk(TARGET_DIRS.components),
  ].filter((p) => {
    const ext = path.extname(p).toLowerCase();
    return ext === ".mjs" || ext === ".js" || ext === ".astro" || ext === ".ts";
  });
}

function classifyFile(absPath) {
  const rel = relativeFromRoot(absPath);

  if (rel.startsWith("scripts/")) return "script";
  if (rel.startsWith("src/pages/")) return "page";
  if (rel.startsWith("src/components/")) return "component";
  return "other";
}

function findJsonMentions(content, jsonFiles) {
  const mentions = [];

  for (const json of jsonFiles) {
    const rel = normalizeSlashes(json.rel);
    const base = json.base;

    const relEscaped = escapeRegex(rel);
    const baseEscaped = escapeRegex(base);

    const relRegex = new RegExp(relEscaped, "g");
    const baseRegex = new RegExp(`(^|[^\\w.-])${baseEscaped}([^\\w.-]|$)`, "g");

    const relCount = (content.match(relRegex) || []).length;
    const baseCount = (content.match(baseRegex) || []).length;

    if (relCount > 0 || baseCount > 0) {
      mentions.push({
        jsonRel: rel,
        jsonBase: base,
        matches: relCount + baseCount,
      });
    }
  }

  return mentions.sort((a, b) => b.matches - a.matches);
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function detectReadWriteHeuristics(content, jsonFiles) {
  const reads = new Set();
  const writes = new Set();
  const unknown = new Set();

  const readHints = [
    /readFileSync\s*\(/,
    /readFile\s*\(/,
    /JSON\.parse\s*\(/,
    /import\s+.*?from\s+["'`].*?\.json["'`]/,
    /existsSync\s*\(/,
  ];

  const writeHints = [
    /writeFileSync\s*\(/,
    /writeFile\s*\(/,
    /outputFile\s*\(/,
    /mkdirSync\s*\(/,
  ];

  for (const json of jsonFiles) {
    const rel = normalizeSlashes(json.rel);
    const base = json.base;

    const lines = content.split("\n");
    let matched = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes(rel) || line.includes(base)) {
        matched = true;
        const windowText = lines.slice(Math.max(0, i - 3), Math.min(lines.length, i + 4)).join("\n");

        const isWrite = writeHints.some((rx) => rx.test(windowText));
        const isRead = readHints.some((rx) => rx.test(windowText));

        if (isWrite) writes.add(rel);
        else if (isRead) reads.add(rel);
        else unknown.add(rel);
      }
    }

    if (!matched && content.includes(base)) {
      unknown.add(rel);
    }
  }

  for (const r of reads) unknown.delete(r);
  for (const w of writes) unknown.delete(w);

  return {
    reads: uniq([...reads]),
    writes: uniq([...writes]),
    unknown: uniq([...unknown]),
  };
}

function analyzeFiles(jsonFiles, codeFiles) {
  const fileAnalyses = [];
  const jsonReferences = {};

  for (const json of jsonFiles) {
    jsonReferences[json.rel] = {
      referencedBy: [],
      scriptsReading: [],
      scriptsWriting: [],
      pagesUsing: [],
      componentsUsing: [],
      unknownUsage: [],
    };
  }

  for (const abs of codeFiles) {
    const rel = relativeFromRoot(abs);
    const type = classifyFile(abs);
    const content = safeRead(abs);

    const mentions = findJsonMentions(content, jsonFiles);
    const heuristics = type === "script"
      ? detectReadWriteHeuristics(content, jsonFiles)
      : { reads: [], writes: [], unknown: [] };

    const analysis = {
      file: rel,
      type,
      mentions: mentions.map((m) => m.jsonRel),
      readJson: heuristics.reads,
      writeJson: heuristics.writes,
      unknownJson: heuristics.unknown,
    };

    fileAnalyses.push(analysis);

    for (const mention of mentions) {
      const ref = jsonReferences[mention.jsonRel];
      ref.referencedBy.push(rel);

      if (type === "script") {
        if (heuristics.reads.includes(mention.jsonRel)) ref.scriptsReading.push(rel);
        else if (heuristics.writes.includes(mention.jsonRel)) ref.scriptsWriting.push(rel);
        else ref.unknownUsage.push(rel);
      } else if (type === "page") {
        ref.pagesUsing.push(rel);
      } else if (type === "component") {
        ref.componentsUsing.push(rel);
      } else {
        ref.unknownUsage.push(rel);
      }
    }
  }

  for (const ref of Object.values(jsonReferences)) {
    ref.referencedBy = uniq(ref.referencedBy);
    ref.scriptsReading = uniq(ref.scriptsReading);
    ref.scriptsWriting = uniq(ref.scriptsWriting);
    ref.pagesUsing = uniq(ref.pagesUsing);
    ref.componentsUsing = uniq(ref.componentsUsing);
    ref.unknownUsage = uniq(ref.unknownUsage);
  }

  return {
    fileAnalyses: fileAnalyses.sort((a, b) => a.file.localeCompare(b.file)),
    jsonReferences,
  };
}

function buildPipelineEdges(jsonReferences) {
  const edges = [];

  for (const [jsonRel, ref] of Object.entries(jsonReferences)) {
    for (const reader of ref.scriptsReading) {
      edges.push({
        from: jsonRel,
        via: reader,
        to: "(script-read)",
        kind: "json->script",
      });
    }

    for (const writer of ref.scriptsWriting) {
      edges.push({
        from: writer,
        via: "(writes)",
        to: jsonRel,
        kind: "script->json",
      });
    }

    for (const page of ref.pagesUsing) {
      edges.push({
        from: jsonRel,
        via: "(used-by)",
        to: page,
        kind: "json->page",
      });
    }

    for (const component of ref.componentsUsing) {
      edges.push({
        from: jsonRel,
        via: "(used-by)",
        to: component,
        kind: "json->component",
      });
    }
  }

  return edges;
}

function buildScriptChains(fileAnalyses) {
  const scripts = fileAnalyses.filter((f) => f.type === "script");
  const pages = fileAnalyses.filter((f) => f.type === "page");
  const chains = [];

  for (const script of scripts) {
    for (const input of script.readJson) {
      for (const output of script.writeJson) {
        const consumers = pages
          .filter((p) => p.mentions.includes(output))
          .map((p) => p.file);

        chains.push({
          input,
          script: script.file,
          output,
          pages: uniq(consumers),
        });
      }
    }
  }

  return chains.sort((a, b) => {
    if (a.script !== b.script) return a.script.localeCompare(b.script);
    if (a.input !== b.input) return a.input.localeCompare(b.input);
    return a.output.localeCompare(b.output);
  });
}

function summarize(fileAnalyses, jsonReferences, chains) {
  const scripts = fileAnalyses.filter((f) => f.type === "script");
  const pages = fileAnalyses.filter((f) => f.type === "page");
  const components = fileAnalyses.filter((f) => f.type === "component");

  const orphanJson = Object.entries(jsonReferences)
    .filter(([, ref]) => ref.referencedBy.length === 0)
    .map(([jsonRel]) => jsonRel)
    .sort();

  const buildOutputs = Object.entries(jsonReferences)
    .filter(([, ref]) => ref.scriptsWriting.length > 0)
    .map(([jsonRel]) => jsonRel)
    .sort();

  const pageDataJson = Object.entries(jsonReferences)
    .filter(([, ref]) => ref.pagesUsing.length > 0)
    .map(([jsonRel]) => jsonRel)
    .sort();

  return {
    counts: {
      scripts: scripts.length,
      pages: pages.length,
      components: components.length,
      jsonFiles: Object.keys(jsonReferences).length,
      chains: chains.length,
      orphanJson: orphanJson.length,
      buildOutputs: buildOutputs.length,
      pageDataJson: pageDataJson.length,
    },
    orphanJson,
    buildOutputs,
    pageDataJson,
  };
}

function printReport({ summary, jsonFiles, fileAnalyses, jsonReferences, chains }) {
  console.log("");
  console.log("========================================");
  console.log("AIEXPERTSCORNER BUILD LOGIC INSPECTOR");
  console.log("========================================");
  console.log("");

  console.log("ROOT:", ROOT);
  console.log("");

  console.log("SUMMARY");
  console.log("----------------------------------------");
  console.log(`Scripts:        ${summary.counts.scripts}`);
  console.log(`Pages:          ${summary.counts.pages}`);
  console.log(`Components:     ${summary.counts.components}`);
  console.log(`JSON files:     ${summary.counts.jsonFiles}`);
  console.log(`Script chains:  ${summary.counts.chains}`);
  console.log(`Orphan JSON:    ${summary.counts.orphanJson}`);
  console.log("");

  console.log("LIKELY BUILD PIPELINE CHAINS");
  console.log("----------------------------------------");
  if (!chains.length) {
    console.log("No script chains detected.");
  } else {
    for (const chain of chains) {
      console.log(`${chain.input}`);
      console.log(`  -> ${chain.script}`);
      console.log(`  -> ${chain.output}`);
      if (chain.pages.length) {
        for (const page of chain.pages) {
          console.log(`  -> ${page}`);
        }
      } else {
        console.log(`  -> (no direct page consumer detected)`);
      }
      console.log("");
    }
  }

  console.log("SCRIPT INPUT / OUTPUT SUMMARY");
  console.log("----------------------------------------");
  const scripts = fileAnalyses.filter((f) => f.type === "script");
  for (const script of scripts) {
    console.log(script.file);
    console.log(`  reads:   ${script.readJson.length ? script.readJson.join(", ") : "-"}`);
    console.log(`  writes:  ${script.writeJson.length ? script.writeJson.join(", ") : "-"}`);
    console.log(`  unknown: ${script.unknownJson.length ? script.unknownJson.join(", ") : "-"}`);
    console.log("");
  }

  console.log("JSON -> PAGE / COMPONENT USAGE");
  console.log("----------------------------------------");
  for (const json of jsonFiles) {
    const ref = jsonReferences[json.rel];
    if (!ref) continue;

    console.log(json.rel);
    console.log(`  scripts reading:  ${ref.scriptsReading.length ? ref.scriptsReading.join(", ") : "-"}`);
    console.log(`  scripts writing:  ${ref.scriptsWriting.length ? ref.scriptsWriting.join(", ") : "-"}`);
    console.log(`  pages using:      ${ref.pagesUsing.length ? ref.pagesUsing.join(", ") : "-"}`);
    console.log(`  components using: ${ref.componentsUsing.length ? ref.componentsUsing.join(", ") : "-"}`);
    if (ref.unknownUsage.length) {
      console.log(`  unknown usage:    ${ref.unknownUsage.join(", ")}`);
    }
    console.log("");
  }

  console.log("ORPHAN / UNREFERENCED JSON");
  console.log("----------------------------------------");
  if (!summary.orphanJson.length) {
    console.log("None");
  } else {
    for (const json of summary.orphanJson) {
      console.log(json);
    }
  }
  console.log("");

  console.log("REPORT WRITTEN TO");
  console.log("----------------------------------------");
  console.log(relativeFromRoot(REPORT_PATH));
  console.log("");
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function main() {
  const jsonFiles = getJsonFiles();
  const codeFiles = getCodeFiles();
  const { fileAnalyses, jsonReferences } = analyzeFiles(jsonFiles, codeFiles);
  const chains = buildScriptChains(fileAnalyses);
  const summary = summarize(fileAnalyses, jsonReferences, chains);

  const report = {
    generatedAt: new Date().toISOString(),
    root: ROOT,
    summary,
    jsonFiles: jsonFiles.map((j) => j.rel),
    fileAnalyses,
    jsonReferences,
    chains,
  };

  ensureDir(REPORT_PATH);
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");

  printReport({
    summary,
    jsonFiles,
    fileAnalyses,
    jsonReferences,
    chains,
  });
}

main();