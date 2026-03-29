// fix-sitemap-slugs.mjs
// Verwijdert non-ASCII slugs uit tool-slugs.json
// Run: node fix-sitemap-slugs.mjs

import fs from "node:fs";

const path  = "./src/data/build/tool-slugs.json";
const slugs = JSON.parse(fs.readFileSync(path, "utf8"));

const before = slugs.length;
const clean  = slugs.filter(s => /^[\x00-\x7F]+$/.test(s));
const removed = slugs.filter(s => !/^[\x00-\x7F]+$/.test(s));

console.log("Voor:     ", before);
console.log("Na:       ", clean.length);
console.log("Verwijderd:", removed.length);
removed.forEach(s => console.log("  -", s));

fs.writeFileSync(path, JSON.stringify(clean), "utf8");
console.log("\n✓ tool-slugs.json bijgewerkt");
