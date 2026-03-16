import path from "node:path";
import {
  loadContext,
  writeJson,
  toArray,
  toolCompleteness,
  deriveReadiness,
  deriveScore,
  valueCount,
} from "./00-shared.mjs";

const ctx = loadContext();
const outDir = path.join(ctx.outputDir, "reports");

const groupStats = new Map();
for (const [field, def] of Object.entries(ctx.fieldDefinitions.fields || {})) {
  if (!groupStats.has(def.group)) {
    groupStats.set(def.group, { group: def.group, field_count: 0, filled_count: 0, fill_rate: 0 });
  }
  groupStats.get(def.group).field_count += 1;
}

const toolsReport = ctx.tools.map((tool) => {
  const completeness = toolCompleteness(tool, ctx.fieldDefinitions);
  const readiness = deriveReadiness(tool, ctx.fieldDefinitions);
  const score = deriveScore(tool);
  const priorityScore = Math.round(
    score * 0.35 +
    completeness.score * 0.35 +
    Math.min(toArray(tool.compare_candidates).length * 5, 15) +
    Math.min(toArray(tool.alternatives).length * 2, 10) +
    Math.min(toArray(tool.use_cases).length * 2, 10) +
    (tool.free_trial ? 5 : 0) +
    (tool.freemium ? 5 : 0)
  );

  for (const [field, def] of Object.entries(ctx.fieldDefinitions.fields || {})) {
    const group = groupStats.get(def.group);
    if (tool[field] != null && (!(Array.isArray(tool[field])) || tool[field].length > 0) && tool[field] !== "") {
      group.filled_count += 1;
    }
  }

  return {
    id: tool.id,
    slug: tool.slug,
    name: tool.display_name || tool.name,
    completeness_score: completeness.score,
    quality_score: score,
    enrichment_priority_score: Math.min(priorityScore, 100),
    build_state: readiness.build_state,
    missing_required_count: completeness.missingP0.length,
    missing_required_fields: completeness.missingP0,
    missing_recommended_fields: completeness.missingP1,
    compare_candidates_count: toArray(tool.compare_candidates).length,
    alternatives_count: toArray(tool.alternatives).length,
    use_cases_count: toArray(tool.use_cases).length,
    capabilities_count: toArray(tool.capabilities).length,
    integrations_count: toArray(tool.integrations).length,
  };
});

for (const item of groupStats.values()) {
  const denominator = ctx.tools.length * item.field_count;
  item.fill_rate = denominator ? Math.round((item.filled_count / denominator) * 1000) / 10 : 0;
}

const readinessBuckets = valueCount(toolsReport.map((x) => x.build_state));
const fieldCoverage = Object.entries(ctx.fieldDefinitions.fields || {}).map(([field, def]) => {
  let filled = 0;
  for (const tool of ctx.tools) {
    const value = tool[field];
    if (value != null && (!(Array.isArray(value)) || value.length > 0) && value !== "") filled += 1;
  }
  return {
    field,
    group: def.group,
    priority: def.priority,
    fill_rate: Math.round((filled / ctx.tools.length) * 1000) / 10,
    filled_count: filled,
    empty_count: ctx.tools.length - filled,
  };
}).sort((a, b) => a.fill_rate - b.fill_rate || a.field.localeCompare(b.field));

toolsReport.sort((a, b) => b.enrichment_priority_score - a.enrichment_priority_score || a.slug.localeCompare(b.slug));

writeJson(path.join(outDir, "tool-enrichment-priority-report.json"), toolsReport);
writeJson(path.join(outDir, "field-coverage-report.json"), fieldCoverage);
writeJson(path.join(outDir, "group-coverage-report.json"), [...groupStats.values()].sort((a, b) => a.fill_rate - b.fill_rate));
writeJson(path.join(outDir, "readiness-summary.json"), Object.fromEntries(readinessBuckets.entries()));

console.log(`Built reports for ${ctx.tools.length} tools.`);
console.log(`Output: ${outDir}`);
