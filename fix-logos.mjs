/**
 * fix-logos.mjs
 * ─────────────────────────────────────────────────────────────────
 * Patcht alle resterende Clearbit en charAt(0) issues in één keer.
 *
 * Gebruik: node fix-logos.mjs
 * Optie:   node fix-logos.mjs --dry-run  (laat zien wat er verandert)
 * ─────────────────────────────────────────────────────────────────
 */

import fs   from "node:fs";
import path from "node:path";

const ROOT    = process.cwd();
const DRY_RUN = process.argv.includes("--dry-run");

if (DRY_RUN) console.log("\n⚠️  DRY-RUN — geen bestanden worden gewijzigd\n");

console.log("\n╔══════════════════════════════════════════════════════════╗");
console.log("║  fix-logos.mjs — Clearbit & charAt patcher              ║");
console.log("╚══════════════════════════════════════════════════════════╝\n");

let totalFixed = 0;

function patch(relPath, replacements) {
  const full = path.join(ROOT, relPath);
  if (!fs.existsSync(full)) {
    console.log(`  ⚠️  Niet gevonden: ${relPath}`);
    return;
  }

  let content = fs.readFileSync(full, "utf8");
  let changed = false;

  for (const { from, to, desc } of replacements) {
    if (typeof from === "string") {
      if (content.includes(from)) {
        content = content.replaceAll(from, to);
        console.log(`  ✅ ${relPath}\n     [${desc}]`);
        changed = true;
      }
    } else {
      // regex
      const before = content;
      content = content.replace(from, to);
      if (content !== before) {
        console.log(`  ✅ ${relPath}\n     [${desc}]`);
        changed = true;
      }
    }
  }

  if (changed) {
    if (!DRY_RUN) fs.writeFileSync(full, content, "utf8");
    totalFixed++;
  } else {
    console.log(`  ✓  ${relPath} — al correct`);
  }
}

// ══════════════════════════════════════════════════════════════════
// 1. TAXONOMY SLUG PAGES — identiek patroon in 8 bestanden
//    L44-45: enrichTool() functie met Clearbit fallback
// ══════════════════════════════════════════════════════════════════
console.log("\n── Taxonomy slug pages (Clearbit op L45) ────────────────────\n");

const TAXONOMY_CLEARBIT_FIX = {
  from: "(t.logo_domain ? `https://logo.clearbit.com/${t.logo_domain}?size=96` : null);",
  to:   "null;",
  desc: "Clearbit fallback verwijderd uit enrichTool()",
};

// Sommige pages gebruiken ?size=128, sommige ?size=96 — fix beide varianten
const CLEARBIT_PATTERNS = [
  {
    from: "(t.logo_domain ? `https://logo.clearbit.com/${t.logo_domain}?size=96` : null);",
    to:   "null;",
    desc: "Clearbit (?size=96) verwijderd",
  },
  {
    from: "(t.logo_domain ? `https://logo.clearbit.com/${t.logo_domain}?size=128` : null);",
    to:   "null;",
    desc: "Clearbit (?size=128) verwijderd",
  },
  {
    from: "(t.logo_domain ? `https://logo.clearbit.com/${t.logo_domain}?size=64` : null);",
    to:   "null;",
    desc: "Clearbit (?size=64) verwijderd",
  },
];

const TAXONOMY_PAGES = [
  "src/pages/capability/[slug].astro",
  "src/pages/industry/[slug].astro",
  "src/pages/integration/[slug].astro",
  "src/pages/microcategory/[slug].astro",
  "src/pages/subcategory/[slug].astro",
  "src/pages/tag/[slug].astro",
  "src/pages/workflow/[slug].astro",
];

for (const p of TAXONOMY_PAGES) {
  patch(p, CLEARBIT_PATTERNS);
}

// ══════════════════════════════════════════════════════════════════
// 2. best/[slug].astro — Clearbit in tool enrichment
// ══════════════════════════════════════════════════════════════════
console.log("\n── best/[slug].astro ────────────────────────────────────────\n");

patch("src/pages/best/[slug].astro", [
  {
    from: "logo_url: t.logo_url || logoMap[t.slug||t.handle] || (t.logo_domain?`https://logo.clearbit.com/${t.logo_domain}?size=96`:null),",
    to:   "logo_url: t.logo_url || logoMap[t.slug||t.handle] || null,",
    desc: "Clearbit fallback verwijderd",
  },
  {
    from: "logo_url: t.logo_url || logoMap[t.slug||t.handle] || (t.logo_domain?`https://logo.clearbit.com/${t.logo_domain}?size=128`:null),",
    to:   "logo_url: t.logo_url || logoMap[t.slug||t.handle] || null,",
    desc: "Clearbit fallback verwijderd",
  },
  // Regex fallback voor varianten
  {
    from: /logo_url: t\.logo_url \|\| logoMap\[t\.slug\|\|t\.handle\] \|\| \(t\.logo_domain\?`https:\/\/logo\.clearbit\.com\/\$\{t\.logo_domain\}\?size=\d+`:null\),/g,
    to:   "logo_url: t.logo_url || logoMap[t.slug||t.handle] || null,",
    desc: "Clearbit fallback verwijderd (regex)",
  },
]);

// ══════════════════════════════════════════════════════════════════
// 3. index.astro — Clearbit in featuredTools + compare cards
// ══════════════════════════════════════════════════════════════════
console.log("\n── index.astro ──────────────────────────────────────────────\n");

patch("src/pages/index.astro", [
  {
    from: "logo_url: logoMap[t.slug] || t.logo_url || (t.logo_domain ? `https://logo.clearbit.com/${t.logo_domain}?size=96` : null),",
    to:   "logo_url: logoMap[t.slug] || t.logo_url || null,",
    desc: "Clearbit uit featuredTools enrichment verwijderd",
  },
  {
    from: "logo_url: logoMap[t.slug] || t.logo_url || (t.logo_domain ? `https://logo.clearbit.com/${t.logo_domain}?size=128` : null),",
    to:   "logo_url: logoMap[t.slug] || t.logo_url || null,",
    desc: "Clearbit uit featuredTools enrichment verwijderd",
  },
  // Regex fallback voor alle varianten
  {
    from: /logo_url: logoMap\[t\.slug\] \|\| t\.logo_url \|\| \(t\.logo_domain \? `https:\/\/logo\.clearbit\.com\/\$\{t\.logo_domain\}\?size=\d+` : null\),/g,
    to:   "logo_url: logoMap[t.slug] || t.logo_url || null,",
    desc: "Clearbit uit featuredTools enrichment verwijderd (regex)",
  },
  // charAt in compare mini-cards (L190/192 — inline img tags met charAt fallback)
  {
    from: /\{logoA\?\s*<img[^>]+\/>\s*:\s*<span[^>]*>\{nameA\.charAt\(0\)\}<\/span>\}/g,
    to:   "{logoA ? <img src={logoA} alt=\"\" width=\"24\" height=\"24\" loading=\"lazy\" onerror=\"this.style.display='none'\" /> : <span class=\"cmp-card__init\">{nameA}</span>}",
    desc: "charAt(0) → volledige naam in compare cards",
  },
  {
    from: /\{logoB\?\s*<img[^>]+\/>\s*:\s*<span[^>]*>\{nameB\.charAt\(0\)\}<\/span>\}/g,
    to:   "{logoB ? <img src={logoB} alt=\"\" width=\"24\" height=\"24\" loading=\"lazy\" onerror=\"this.style.display='none'\" /> : <span class=\"cmp-card__init\">{nameB}</span>}",
    desc: "charAt(0) → volledige naam in compare cards",
  },
]);

// ══════════════════════════════════════════════════════════════════
// 4. tools/[slug].astro — Clearbit in hero + related tools + charAt
// ══════════════════════════════════════════════════════════════════
console.log("\n── tools/[slug].astro ───────────────────────────────────────\n");

patch("src/pages/tools/[slug].astro", [
  // Clearbit in hero logo (L53)
  {
    from: "|| (hero.logo_domain ? `https://logo.clearbit.com/${hero.logo_domain}?size=128` : null);",
    to:   "|| null;",
    desc: "Clearbit uit hero logo verwijderd",
  },
  // Clearbit in related/alt tools (L112)
  {
    from: /return a\?\.logo_url \|\| \(a\?\.logo_domain \? `https:\/\/logo\.clearbit\.com\/\$\{a\?\.logo_domain\}\?size=\d+` : ['"]{0,1}['"]{0,1}\);/g,
    to:   "return a?.logo_url || null;",
    desc: "Clearbit uit related tools logo verwijderd",
  },
  // charAt(0) in tool detail hero logo fallback (L170 + L173)
  {
    from: /<span class="td__logo-fb" style="display:none">\{name\.charAt\(0\)\}<\/span>/g,
    to:   "<span class=\"td__logo-fb\" style=\"display:none\">{name}</span>",
    desc: "charAt(0) → volledige naam in hero fallback (hidden)",
  },
  {
    from: /<span class="td__logo-fb">\{name\.charAt\(0\)\}<\/span>/g,
    to:   "<span class=\"td__logo-fb\">{name}</span>",
    desc: "charAt(0) → volledige naam in hero fallback",
  },
  // charAt(0) in alt tool initials (L421)
  {
    from: /\{an\.charAt\(0\)\}/g,
    to:   "{an}",
    desc: "charAt(0) → volledige naam in alt tool card",
  },
]);

// ══════════════════════════════════════════════════════════════════
// 5. AuthorityToolCard.astro — eigen logo logica vervangen
// ══════════════════════════════════════════════════════════════════
console.log("\n── AuthorityToolCard.astro ──────────────────────────────────\n");

patch("src/components/sections/AuthorityToolCard.astro", [
  // Clearbit in logoSrc
  {
    from: /const logoSrc\s*=\s*logo_url \|\| \(logo_domain \? `https:\/\/logo\.clearbit\.com\/\$\{logo_domain\}\?size=\d+` : null\);/g,
    to:   "const logoSrc = logo_url || null;",
    desc: "Clearbit vervangen door null",
  },
  // charAt fallback
  {
    from: /const fallbackChar\s*=\s*\(displayName \|\| ["']A["']\)\.charAt\(0\)\.toUpperCase\(\);/g,
    to:   "const fallbackChar = displayName || \"?\";",
    desc: "charAt(0) → volledige naam",
  },
  // Overal waar fallbackChar in een span staat
  {
    from: />\{fallbackChar\}</g,
    to:   "><span style=\"font-size:0.45em;line-height:1.2;text-align:center;padding:0 2px;word-break:break-word\">{fallbackChar}</span><",
    desc: "fallbackChar wrapped voor volledige naam weergave",
  },
]);

// ══════════════════════════════════════════════════════════════════
// 6. use-case/index.astro — charAt in tool logo fallback
// ══════════════════════════════════════════════════════════════════
console.log("\n── use-case/index.astro ─────────────────────────────────────\n");

patch("src/pages/use-case/index.astro", [
  {
    from: /: <span class="uc-card__logo-fb">\{\(tSlug\|\|"[?]"\)\.charAt\(0\)\.toUpperCase\(\)\}<\/span>;/g,
    to:   ": <span class=\"uc-card__logo-fb\">{tSlug || \"?\"}</span>;",
    desc: "charAt(0) → volledige slug als fallback",
  },
]);

// ══════════════════════════════════════════════════════════════════
// 7. ai-model/[slug].astro — Clearbit (heeft wel logo-map)
// ══════════════════════════════════════════════════════════════════
console.log("\n── ai-model/[slug].astro ────────────────────────────────────\n");

patch("src/pages/ai-model/[slug].astro", [
  {
    from: /logo_url: t\.logo_url \|\| logoMap\[t\.slug\|\|t\.handle\] \|\| \(t\.logo_domain\?`https:\/\/logo\.clearbit\.com\/\$\{t\.logo_domain\}\?size=\d+`:null\),/g,
    to:   "logo_url: t.logo_url || logoMap[t.slug||t.handle] || null,",
    desc: "Clearbit fallback verwijderd",
  },
]);

// ══════════════════════════════════════════════════════════════════
// SAMENVATTING
// ══════════════════════════════════════════════════════════════════
console.log(`\n${"═".repeat(60)}`);
console.log(`  ${DRY_RUN ? "DRY-RUN" : "KLAAR"} — ${totalFixed} bestanden gepatcht`);
console.log(`${"═".repeat(60)}\n`);

if (!DRY_RUN) {
  console.log("  Volgende stap: node logo-master.mjs --audit");
  console.log("  Dan:           npm run build:prod\n");
} else {
  console.log("  Draai zonder --dry-run om wijzigingen toe te passen.\n");
}
