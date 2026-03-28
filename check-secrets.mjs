#!/usr/bin/env node
// check-secrets.mjs
// Run from Astro repo root: node check-secrets.mjs

import fs   from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const G = "\x1b[32m", Y = "\x1b[33m", R = "\x1b[31m", X = "\x1b[0m", W = "\x1b[1m", D = "\x1b[2m";

const SECRET_PATTERNS = [
  { name: "OpenAI API key",      regex: /sk-[a-zA-Z0-9]{20,}/g,                                                 severity: "CRITICAL" },
  { name: "OpenAI project key",  regex: /sk-proj-[a-zA-Z0-9\-_]{20,}/g,                                         severity: "CRITICAL" },
  { name: "Anthropic API key",   regex: /sk-ant-[a-zA-Z0-9\-_]{20,}/g,                                          severity: "CRITICAL" },
  { name: "Bearer token",        regex: /Bearer\s+[a-zA-Z0-9\-_\.]{20,}/g,                                      severity: "HIGH"     },
  { name: "Private key header",  regex: /-----BEGIN [A-Z ]+PRIVATE KEY-----/g,                                   severity: "CRITICAL" },
  { name: "Stripe secret",       regex: /sk_live_[a-zA-Z0-9]{20,}/g,                                            severity: "CRITICAL" },
  { name: "Stripe test",         regex: /sk_test_[a-zA-Z0-9]{20,}/g,                                            severity: "HIGH"     },
  { name: "GitHub token",        regex: /gh[pousr]_[a-zA-Z0-9]{20,}/g,                                          severity: "CRITICAL" },
  { name: "AWS access key",      regex: /AKIA[A-Z0-9]{16}/g,                                                     severity: "CRITICAL" },
  { name: "Inline env secret",   regex: /(?:API_KEY|SECRET|TOKEN|PASSWORD)\s*=\s*['"]?[a-zA-Z0-9\-_\.]{16,}/gi, severity: "HIGH"     },
];

const LOW_RISK = [
  { name: "logo.dev token in URL", regex: /token=pk_[a-zA-Z0-9]{20,}/g, severity: "INFO" },
];

const SAFE = [
  /process\.env\.[A-Z_]+/,
  /import\.meta\.env\.[A-Z_]+/,
  /your_key_here/,
  /your_token_here/,
  /pk_your_token_here/,
  /sk-ant-your/,
  /sk-your/,
];

const SCAN_EXTS = new Set([".astro", ".ts", ".tsx", ".mjs", ".js", ".env", ".example"]);
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", ".astro"]);

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) yield* walk(full);
    } else {
      const ext = path.extname(e.name).toLowerCase();
      if (SCAN_EXTS.has(ext)) {
        yield full;
      } else if (ext === ".json" && fs.statSync(full).size < 500 * 1024) {
        yield full;
      }
    }
  }
}

function safe(match, line) {
  return SAFE.some(p => p.test(match) || p.test(line));
}

console.log("\n" + W + "AIExpertsCorner — Secret Scanner" + X);
console.log(D + "Scanning: " + ROOT + X + "\n");

const findings = [];
let count = 0;

for (const file of walk(ROOT)) {
  let txt;
  try { txt = fs.readFileSync(file, "utf8"); } catch { continue; }
  count++;
  const lines = txt.split("\n");

  for (const pat of [...SECRET_PATTERNS, ...LOW_RISK]) {
    pat.regex.lastIndex = 0;
    let m;
    while ((m = pat.regex.exec(txt)) !== null) {
      const lineNum = txt.slice(0, m.index).split("\n").length;
      const line    = lines[lineNum - 1] || "";
      if (safe(m[0], line)) continue;
      const t = line.trim();
      if ((t.startsWith("//") || t.startsWith("#") || t.startsWith("*")) && pat.severity !== "CRITICAL") continue;
      findings.push({
        file:     path.relative(ROOT, file),
        line:     lineNum,
        pattern:  pat.name,
        severity: pat.severity,
        match:    m[0].slice(0, 40),
        context:  t.slice(0, 80),
      });
    }
  }
}

const critical = findings.filter(f => f.severity === "CRITICAL");
const high     = findings.filter(f => f.severity === "HIGH");
const info     = findings.filter(f => f.severity === "INFO");

console.log("Scanned: " + count + " files\n");

if (critical.length === 0 && high.length === 0) {
  console.log(G + W + "✓ No critical secrets found" + X);
} else {
  console.log(R + W + "SECRETS FOUND — DO NOT PUSH" + X + "\n");
}

if (critical.length > 0) {
  console.log(R + W + "CRITICAL (" + critical.length + "):" + X);
  for (const f of critical) {
    console.log("  " + R + "✗" + X + " " + f.file + ":" + f.line + "  [" + f.pattern + "]");
    console.log("    " + D + f.context + X + "\n");
  }
}

if (high.length > 0) {
  console.log(Y + W + "HIGH (" + high.length + "):" + X);
  for (const f of high) {
    console.log("  " + Y + "⚠" + X + " " + f.file + ":" + f.line + "  [" + f.pattern + "]");
    console.log("    " + D + f.context + X);
  }
  console.log();
}

if (info.length > 0) {
  console.log(D + "INFO (" + info.length + ") — low risk:" + X);
  const files = [...new Set(info.map(f => f.file))];
  for (const file of files.slice(0, 5)) {
    const n = info.filter(f => f.file === file).length;
    console.log("  " + D + "→ " + file + " (" + n + "×)" + X);
  }
  if (files.length > 5) console.log("  " + D + "  ... and " + (files.length - 5) + " more" + X);
  console.log("\n  " + D + "logo.dev token in URLs = public-facing, low risk" + X + "\n");
}

console.log("─".repeat(50));
if (critical.length > 0 || high.length > 0) {
  console.log(R + "STOP — fix secrets before pushing." + X);
  console.log("  1. Remove hardcoded keys from source files");
  console.log("  2. Move to .env (gitignored)");
  console.log("  3. Use import.meta.env.YOUR_KEY in Astro\n");
  process.exit(1);
} else {
  console.log(G + "✓ Safe to push." + X);
  if (info.length > 0) console.log("  " + D + "(Review INFO items above)" + X);
  console.log();
}
