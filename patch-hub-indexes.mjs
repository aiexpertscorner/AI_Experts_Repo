#!/usr/bin/env node
/**
 * patch-hub-indexes.mjs
 * AIExpertsCorner — Hub Index Auto-Patcher
 *
 * Applies the following to compare/alternatives/best/use-case index pages:
 *   1. Removes inline <style> blocks
 *   2. Injects hub-listings.css import
 *   3. Injects hub modifier class on wrapper div
 *   4. Reports diff stats
 *
 * Usage:
 *   node patch-hub-indexes.mjs           (dry-run, show what would change)
 *   node patch-hub-indexes.mjs --apply   (write changes to disk)
 *   node patch-hub-indexes.mjs --backup  (create .bak files before patching)
 *
 * Repo: E:\2026_Github\AI_Experts_V3_PROD\AI_Experts_Repo
 */

import fs   from "node:fs";
import path from "node:path";

const ROOT    = path.resolve("E:/2026_Github/AI_Experts_V3_PROD/AI_Experts_Repo");
const PAGES   = path.join(ROOT, "src/pages");
const APPLY   = process.argv.includes("--apply");
const BACKUP  = process.argv.includes("--backup");

// ── Patch definitions ─────────────────────────────────────────────────────────

const PATCHES = [
  {
    id:       "compare",
    file:     "compare/index.astro",
    import:   `import "@/styles/hub-listings.css";`,
    // Class to add to the outer wrapper div
    wrapperPattern: /class="hub"/g,
    wrapperReplace: 'class="hub hub--blue"',
  },
  {
    id:       "alternatives",
    file:     "alternatives/index.astro",
    import:   `import "@/styles/hub-listings.css";`,
    wrapperPattern: /class="hub"/g,
    wrapperReplace: 'class="hub hub--green"',
  },
  {
    id:       "best",
    file:     "best/index.astro",
    import:   `import "@/styles/hub-listings.css";`,
    wrapperPattern: /class="hub"/g,
    wrapperReplace: 'class="hub hub--amber"',
  },
  {
    id:       "use-case",
    file:     "use-case/index.astro",
    import:   `import "@/styles/hub-listings.css";`,
    wrapperPattern: null, // uses .uc-hub, no modifier needed
    wrapperReplace: null,
  },
];

// ── Utility ───────────────────────────────────────────────────────────────────

function removeInlineStyles(src) {
  const original = src;
  // Remove all <style>...</style> and <style is:global>...</style> blocks
  src = src.replace(/<style(\s[^>]*)?>[\s\S]*?<\/style>\s*/g, "");
  const removed = original !== src;
  const count   = (original.match(/<style(\s[^>]*)?>[\s\S]*?<\/style>/g) || []).length;
  return { src, removed, count };
}

function injectImport(src, importStatement) {
  if (src.includes(importStatement)) return { src, injected: false };

  // Find last import in frontmatter and insert after it
  const lastImport = src.lastIndexOf("\nimport ");
  if (lastImport !== -1) {
    const lineEnd = src.indexOf("\n", lastImport + 1);
    if (lineEnd !== -1) {
      src = src.slice(0, lineEnd + 1) + importStatement + "\n" + src.slice(lineEnd + 1);
      return { src, injected: true };
    }
  }

  // Fallback: insert before closing frontmatter ---
  src = src.replace(/^(---\s*\n)([\s\S]*?)(---\s*\n)/, (_, open, body, close) => {
    return open + body + importStatement + "\n" + close;
  });
  return { src, injected: true };
}

function applyWrapperClass(src, pattern, replacement) {
  if (!pattern || !replacement) return { src, applied: false };
  if (!pattern.test(src)) {
    // Try to find class="hub" without modifier
    const hasHub = /class="hub"/.test(src);
    if (!hasHub) return { src, applied: false, notFound: true };
  }
  pattern.lastIndex = 0; // reset regex
  const newSrc = src.replace(pattern, replacement);
  return { src: newSrc, applied: newSrc !== src };
}

// ── Diff summary ──────────────────────────────────────────────────────────────

function diffSummary(original, patched) {
  const origLines   = original.split("\n").length;
  const patchedLines = patched.split("\n").length;
  const delta = patchedLines - origLines;
  return {
    originalLines:  origLines,
    patchedLines,
    delta,
    sizeChange: `${Math.round((patched.length - original.length) / original.length * 100)}%`,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log("\n╔══════════════════════════════════════════════════════════╗");
console.log(`║   Hub Index Patcher  ${APPLY ? "  MODE: APPLY   " : "  MODE: DRY-RUN "}               ║`);
console.log("╚══════════════════════════════════════════════════════════╝\n");

let totalFixed = 0;

for (const patch of PATCHES) {
  const fullPath = path.join(PAGES, patch.file);
  console.log(`── ${patch.id} (${patch.file})`);

  if (!fs.existsSync(fullPath)) {
    console.log(`   ✗ File not found: ${fullPath}\n`);
    continue;
  }

  let src      = fs.readFileSync(fullPath, "utf8");
  const orig   = src;
  const steps  = [];

  // Step 1: Remove inline styles
  const styleResult = removeInlineStyles(src);
  if (styleResult.removed) {
    src = styleResult.src;
    steps.push(`Removed ${styleResult.count} inline <style> block(s)`);
  } else {
    steps.push("No inline <style> blocks to remove");
  }

  // Step 2: Inject CSS import
  const importResult = injectImport(src, patch.import);
  if (importResult.injected) {
    src = importResult.src;
    steps.push(`Injected: ${patch.import}`);
  } else {
    steps.push(`Import already present: ${patch.import}`);
  }

  // Step 3: Inject wrapper class
  const classResult = applyWrapperClass(src, patch.wrapperPattern, patch.wrapperReplace);
  if (classResult.notFound) {
    steps.push(`WARN: Wrapper class "hub" not found — manual fix required`);
  } else if (classResult.applied) {
    src = classResult.src;
    steps.push(`Applied modifier class: ${patch.wrapperReplace}`);
  } else {
    steps.push(`Modifier class already present or not applicable`);
  }

  // Stats
  const diff = diffSummary(orig, src);
  steps.push(`Lines: ${diff.originalLines} → ${diff.patchedLines} (${diff.delta >= 0 ? "+" : ""}${diff.delta})`);

  steps.forEach(s => console.log(`   ${s.startsWith("WARN") ? "⚠" : "✓"} ${s}`));

  if (src === orig) {
    console.log("   ✓ No changes needed\n");
    continue;
  }

  if (APPLY) {
    if (BACKUP) {
      fs.writeFileSync(fullPath + ".bak", orig, "utf8");
      console.log(`   ✎ Backup created: ${patch.file}.bak`);
    }
    fs.writeFileSync(fullPath, src, "utf8");
    console.log(`   ✎ Written: ${fullPath}`);
    totalFixed++;
  } else {
    console.log("   → DRY-RUN: Add --apply to write changes");
  }

  console.log();
}

console.log("── Result ──────────────────────────────────────────────────");
if (APPLY) {
  console.log(`   ${totalFixed} file(s) patched`);
} else {
  console.log(`   Dry-run complete. Run with --apply to write.`);
}
console.log();
