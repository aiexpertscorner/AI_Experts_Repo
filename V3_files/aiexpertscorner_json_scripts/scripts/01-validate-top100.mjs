import path from "node:path";
import {
  loadContext,
  writeJson,
  getAllowedMap,
  toArray,
  isFilled,
  toolCompleteness,
  deriveReadiness,
  kebab,
} from "./00-shared.mjs";

const ctx = loadContext();
const outDir = path.join(ctx.outputDir, "validation");
const allowed = getAllowedMap(ctx.allowedValues);

const issuesByTool = [];
const summary = {
  tool_count: ctx.tools.length,
  missing_required_fields: 0,
  enum_violations: 0,
  slug_mismatches: 0,
  duplicate_slugs: 0,
  invalid_urls: 0,
  type_warnings: 0,
};

const slugMap = new Map();

for (const tool of ctx.tools) {
  const toolIssues = [];
  const completeness = toolCompleteness(tool, ctx.fieldDefinitions);
  const readiness = deriveReadiness(tool, ctx.fieldDefinitions);

  for (const field of completeness.missingP0) {
    toolIssues.push({ type: "missing_required", field });
    summary.missing_required_fields += 1;
  }

  const expectedSlug = kebab(tool.slug || tool.display_name || tool.name);
  if (tool.slug !== expectedSlug) {
    toolIssues.push({ type: "slug_mismatch", field: "slug", expected: expectedSlug, actual: tool.slug });
    summary.slug_mismatches += 1;
  }

  if (tool.slug) slugMap.set(tool.slug, (slugMap.get(tool.slug) || 0) + 1);

  const urlFields = ["homepage_url", "app_url", "docs_url", "signup_url", "pricing_url", "logo_url", "icon_url"];
  for (const field of urlFields) {
    const value = tool[field];
    if (!value) continue;
    try {
      new URL(value);
    } catch {
      toolIssues.push({ type: "invalid_url", field, value });
      summary.invalid_urls += 1;
    }
  }

  const enumChecks = [
    ["category", "categories"],
    ["subcategory", "subcategories"],
    ["microcategory", "microcategories"],
    ["pricing_model", "pricing_models"],
    ["pricing_models", "pricing_models"],
    ["platforms", "platforms"],
    ["skill_levels", "skill_levels"],
    ["ai_type", "ai_type"],
    ["funding_stage", "funding_stage"],
    ["public_private_status", "public_private_status"],
    ["ownership_type", "ownership_type"],
    ["company_size_range", "company_size_range"],
    ["workflow_complexity", "workflow_complexity"],
    ["serp_intents", "serp_intents"],
    ["data_health", "data_health"],
    ["stack_role", "stack_role"],
    ["roles", "roles"],
    ["personas", "personas"],
    ["departments", "departments"],
    ["capabilities", "common_capabilities"],
    ["use_cases", "common_use_cases"],
    ["industries", "common_industries"],
    ["integrations", "common_integrations"],
    ["content_types", "common_content_types"],
  ];

  for (const [field, registryKey] of enumChecks) {
    const registry = allowed[registryKey];
    if (!registry || registry.size === 0) continue;
    for (const value of toArray(tool[field])) {
      if (!registry.has(value)) {
        toolIssues.push({ type: "enum_violation", field, value, registry: registryKey });
        summary.enum_violations += 1;
      }
    }
  }

  for (const [field, def] of Object.entries(ctx.fieldDefinitions.fields || {})) {
    const value = tool[field];
    if (!isFilled(value)) continue;
    if (def.type === "array" && !Array.isArray(value)) {
      toolIssues.push({ type: "type_warning", field, expected: "array", actual: typeof value });
      summary.type_warnings += 1;
    }
    if (def.type === "boolean" && typeof value !== "boolean") {
      toolIssues.push({ type: "type_warning", field, expected: "boolean", actual: typeof value });
      summary.type_warnings += 1;
    }
  }

  issuesByTool.push({
    id: tool.id,
    slug: tool.slug,
    name: tool.display_name || tool.name,
    completeness,
    readiness,
    issue_count: toolIssues.length,
    issues: toolIssues,
  });
}

const duplicateSlugs = [];
for (const [slug, count] of slugMap.entries()) {
  if (count > 1) {
    duplicateSlugs.push({ slug, count });
    summary.duplicate_slugs += 1;
  }
}

issuesByTool.sort((a, b) => b.issue_count - a.issue_count || a.slug.localeCompare(b.slug));

writeJson(path.join(outDir, "validation-summary.json"), summary);
writeJson(path.join(outDir, "validation-by-tool.json"), issuesByTool);
writeJson(path.join(outDir, "duplicate-slugs.json"), duplicateSlugs);

console.log(`Validated ${ctx.tools.length} tools.`);
console.log(`Output: ${outDir}`);
