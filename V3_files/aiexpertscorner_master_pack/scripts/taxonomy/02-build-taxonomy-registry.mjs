import { PATHS, ensureBaseDirs, parseCsv, writeJson, kebab } from "../lib/shared.mjs";

ensureBaseDirs();

const taxonomyRows = parseCsv(PATHS.taxonomyCsv);
const ruleRows = parseCsv(PATHS.pageRulesCsv);

const entities = taxonomyRows.filter((r) => r.row_type === "entity");
const summaries = taxonomyRows.filter((r) => r.row_type === "summary");

const registries = {
  main_hubs: [],
  categories: [],
  subcategories: [],
  microcategories: [],
  tags: [],
  capabilities: [],
  use_cases: [],
  industries: [],
  integrations: [],
  ai_models: [],
  workflows: [],
  automation_recipes: [],
  stacks: [],
  toolkits: [],
  playbooks: [],
  content_types: [],
  pricing_models: [],
  skill_levels: [],
  platforms: [],
  agent_types: []
};

const entityTypeMap = {
  main_hub: "main_hubs",
  category: "categories",
  subcategory: "subcategories",
  microcategory: "microcategories",
  tag: "tags",
  capability: "capabilities",
  use_case: "use_cases",
  industry: "industries",
  integration: "integrations",
  ai_model: "ai_models",
  workflow: "workflows",
  automation_recipe: "automation_recipes",
  stack: "stacks",
  toolkit: "toolkits",
  playbook: "playbooks",
  content_type: "content_types",
  pricing_model: "pricing_models",
  skill_level: "skill_levels",
  platform: "platforms",
  agent_type: "agent_types"
};

const bySlug = new Map();

for (const row of entities) {
  const item = {
    slug: row.slug || kebab(row.name),
    name: row.name,
    entity_type: row.entity_type,
    section: row.section || "",
    hub_level: row.hub_level || "",
    parent_slug: row.parent_slug || "",
    template_family: row.template_family || "",
    url_pattern: row.url_pattern || "",
    example_url: row.example_url || "",
    formula: row.formula || "",
    max_pages: Number(row.max_pages || 0),
    priority: row.priority || "",
    launch_phase: row.launch_phase || "",
    seo_value: row.seo_value || "",
    monetization_value: row.monetization_value || "",
    notes: row.notes || ""
  };

  bySlug.set(item.slug, item);
  const bucket = entityTypeMap[row.entity_type];
  if (bucket && registries[bucket]) registries[bucket].push(item);
}

const hierarchy = {};
for (const [slug, item] of bySlug.entries()) {
  hierarchy[slug] = { ...item, children: [] };
}
for (const [slug, item] of bySlug.entries()) {
  if (item.parent_slug && hierarchy[item.parent_slug]) {
    hierarchy[item.parent_slug].children.push(slug);
  }
}

const pageRules = ruleRows.map((row) => ({
  ...row,
  source_count: Number(row.source_count || 0),
  top_x: row.top_x ? Number(row.top_x) : null,
  max_pages: Number(row.max_pages || 0)
}));

writeJson(`${PATHS.taxonomyDir}/taxonomy-registries.json`, registries);
writeJson(`${PATHS.taxonomyDir}/taxonomy-hierarchy.json`, hierarchy);
writeJson(`${PATHS.taxonomyDir}/taxonomy-summaries.json`, summaries);
writeJson(`${PATHS.taxonomyDir}/page-rules.json`, pageRules);

console.log(`Built taxonomy registries from ${entities.length} entities and ${pageRules.length} page rules.`);
