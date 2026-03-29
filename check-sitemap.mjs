// check-sitemap.mjs
// Run: node check-sitemap.mjs
import fs from "node:fs";

const slugs = JSON.parse(fs.readFileSync("./src/data/build/tool-slugs.json", "utf8"));

// Check voor ongeldige XML karakters
const bad = slugs.filter(s => /[&<>'"]/g.test(s));
console.log("Slugs met ongeldige XML chars:", bad.length);
bad.slice(0, 30).forEach((s, i) => console.log(i + 1, s));

// Check ook op niet-ASCII karakters
const nonAscii = slugs.filter(s => /[^\x00-\x7F]/.test(s));
console.log("\nSlugs met non-ASCII chars:", nonAscii.length);
nonAscii.slice(0, 10).forEach((s, i) => console.log(i + 1, s));

// Toon totaal
console.log("\nTotaal slugs:", slugs.length);
