import fs from "fs";
import path from "path";

const root = process.cwd();

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, files);
    else if (/\.(astro|css|ts)$/.test(entry.name)) files.push(abs);
  }
  return files;
}

const targets = [
  path.join(root, "src/components"),
  path.join(root, "src/pages"),
  path.join(root, "src/styles"),
  path.join(root, "src/data"),
];

const files = targets.flatMap((dir) => walk(dir));

const checks = [
  { name: "literal_rank", regex: /#\{rank\}/g },
  { name: "literal_template_src", regex: /src="\{.*?\}"/g },
  { name: "inline_style_attr", regex: /\bstyle=/g },
  { name: "markdown_code_fence", regex: /```/g },
  { name: "dangerous_set_html", regex: /set:html=/g },
  { name: "clearbit_logo", regex: /logo\.clearbit\.com/g },
];

const hits = [];

for (const abs of files) {
  const rel = path.relative(root, abs);
  const content = fs.readFileSync(abs, "utf8");

  for (const check of checks) {
    const matches = [...content.matchAll(check.regex)];
    if (matches.length) {
      hits.push({
        file: rel,
        check: check.name,
        count: matches.length,
      });
    }
  }
}

const out = {
  generated_at: new Date().toISOString(),
  total_files_scanned: files.length,
  hits,
};

const outPath = path.join(root, "src/data/build/render-bugs-audit.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");

console.log("\nRender Bugs Audit");
console.log("=================");
console.log(`Files scanned: ${files.length}`);
console.log(`Hit groups: ${hits.length}`);
console.log(`Saved: ${outPath}\n`);

for (const hit of hits) {
  console.log(`- ${hit.check.padEnd(22)} ${hit.count.toString().padStart(3)}  ${hit.file}`);
}
console.log("");