import { PATHS, ensureBaseDirs, readJson } from "../lib/shared.mjs";
import fs from "node:fs";

ensureBaseDirs();

const tools = readJson(PATHS.enrichedTools, []);
const registries = readJson(`${PATHS.taxonomyDir}/taxonomy-registries.json`, {});
const pageRules = readJson(`${PATHS.taxonomyDir}/page-rules.json`, []);
const compareMap = readJson(`${PATHS.graphsDir}/compare-map.json`, {});
const alternativesMap = readJson(`${PATHS.graphsDir}/alternatives-map.json`, {});

const phase = process.env.BUILD_PHASE || "phase_1";

function allowPhase(rulePhase) {
  if (!rulePhase) return true;
  if (phase === "phase_1") return rulePhase === "phase_1";
  if (phase === "phase_2") return ["phase_1", "phase_2"].includes(rulePhase);
  return true;
}

const manifest = [];

function add(item) {
  manifest.push(item);
}

for (const tool of tools) {
  if (tool.build_eligibility === "eligible") {
    add({
      type: "tool_detail",
      slug: `/tools/${tool.slug}`,
      entity_slug: tool.slug,
      priority: "P0",
      index: (tool.content_readiness_score || 0) >= 55
    });
  }
}

for (const rule of pageRules.filter((r) => allowPhase(r.launch_phase))) {
  const addRegistryPages = (bucket, prefix, type) => {
    for (const item of registries[bucket] || []) {
      add({
        type,
        slug: rule.slug_pattern
          .replace("[category]", item.slug)
          .replace("[subcategory]", item.slug)
          .replace("[microcategory]", item.slug)
          .replace("[slug]", item.slug),
        entity_slug: item.slug,
        priority: rule.priority,
        index: rule.indexation_recommendation !== "noindex"
      });
    }
  };

  if (rule.template_family === "category_page") addRegistryPages("categories", "/tools", "category_page");
  if (rule.template_family === "tag_page") addRegistryPages("tags", "/tag", "tag_page");
  if (rule.template_family === "capability_page") addRegistryPages("capabilities", "/capability", "capability_page");
  if (rule.template_family === "use_case_page") addRegistryPages("use_cases", "/use-case", "use_case_page");
  if (rule.template_family === "industry_page") addRegistryPages("industries", "/industry", "industry_page");
  if (rule.template_family === "integration_page") addRegistryPages("integrations", "/integrations", "integration_page");
  if (rule.template_family === "ai_model_page") addRegistryPages("ai_models", "/models", "ai_model_page");
  if (rule.template_family === "workflow_page") addRegistryPages("workflows", "/workflows", "workflow_page");
  if (rule.template_family === "automation_recipe_page") addRegistryPages("automation_recipes", "/automation", "automation_recipe_page");
  if (rule.template_family === "stack_page") addRegistryPages("stacks", "/ai-stacks", "stack_page");
  if (rule.template_family === "agent_type_page") addRegistryPages("agent_types", "/agents", "agent_type_page");
  if (rule.template_family === "toolkit_page") addRegistryPages("toolkits", "/toolkits", "toolkit_page");
  if (rule.template_family === "playbook_page") addRegistryPages("playbooks", "/playbooks", "playbook_page");
  if (rule.template_family === "pricing_model_page") addRegistryPages("pricing_models", "/pricing", "pricing_model_page");
  if (rule.template_family === "skill_level_page") addRegistryPages("skill_levels", "/skill-level", "skill_level_page");
}

const categoriesBySlug = Object.fromEntries((registries.categories || []).map((x) => [x.slug, x]));
const subcategoriesBySlug = Object.fromEntries((registries.subcategories || []).map((x) => [x.slug, x]));
const microcategoriesBySlug = Object.fromEntries((registries.microcategories || []).map((x) => [x.slug, x]));

for (const item of registries.subcategories || []) {
  const parent = categoriesBySlug[item.parent_slug];
  if (!parent) continue;
  add({
    type: "subcategory_page",
    slug: `/tools/${parent.slug}/${item.slug}`,
    entity_slug: item.slug,
    priority: item.priority || "P0",
    index: true
  });
}

for (const item of registries.microcategories || []) {
  const sub = subcategoriesBySlug[item.parent_slug];
  const cat = sub ? categoriesBySlug[sub.parent_slug] : null;
  if (!sub || !cat) continue;
  add({
    type: "microcategory_page",
    slug: `/tools/${cat.slug}/${sub.slug}/${item.slug}`,
    entity_slug: item.slug,
    priority: item.priority || "P0",
    index: true
  });
}

for (const [toolSlug, related] of Object.entries(compareMap)) {
  for (const otherSlug of related.slice(0, 5)) {
    const ordered = [toolSlug, otherSlug].sort();
    add({
      type: "compare_page",
      slug: `/compare/${ordered[0]}-vs-${ordered[1]}`,
      entity_slug: `${ordered[0]}__${ordered[1]}`,
      priority: "P1",
      index: true
    });
  }
}

for (const [toolSlug, items] of Object.entries(alternativesMap)) {
  if ((items || []).length >= 3) {
    add({
      type: "alternatives_page",
      slug: `/alternatives/${toolSlug}`,
      entity_slug: toolSlug,
      priority: "P1",
      index: true
    });
  }
}

const deduped = Object.values(manifest.reduce((acc, item) => {
  acc[item.slug] = item;
  return acc;
}, {}));

fs.mkdirSync(PATHS.buildDir, { recursive: true });
fs.writeFileSync(`${PATHS.buildDir}/page-manifest.json`, JSON.stringify(deduped, null, 2) + "\n", "utf8");
console.log(`Built page manifest with ${deduped.length} pages.`);
