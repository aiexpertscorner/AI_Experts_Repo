import { PATHS, ensureBaseDirs, readJson, writeJson, overallEntityScore, toArray } from "../lib/shared.mjs";

ensureBaseDirs();

const tools = readJson(PATHS.enrichedTools, []).filter((tool) => tool.build_eligibility === "eligible");

function setOverlap(a = [], b = []) {
  const A = new Set(a || []);
  const B = new Set(b || []);
  let n = 0;
  for (const x of A) if (B.has(x)) n++;
  return n;
}

function relationScore(a, b) {
  return (
    (a.category && a.category === b.category ? 6 : 0) +
    (a.subcategory && a.subcategory === b.subcategory ? 7 : 0) +
    (a.microcategory && a.microcategory === b.microcategory ? 8 : 0) +
    setOverlap(a.use_cases, b.use_cases) * 3 +
    setOverlap(a.capabilities, b.capabilities) * 3 +
    setOverlap(a.integrations, b.integrations) * 1 +
    Math.round(overallEntityScore(b) / 40)
  );
}

const relatedMap = {};
const compareMap = {};
const alternativesMap = {};
const entityLeaders = {
  categories: {},
  subcategories: {},
  microcategories: {},
  use_cases: {},
  capabilities: {},
  industries: {},
  integrations: {},
  ai_models: {}
};

function pushLeader(bucket, key, tool) {
  if (!key) return;
  if (!bucket[key]) bucket[key] = [];
  bucket[key].push(tool);
}

for (const tool of tools) {
  const candidates = tools
    .filter((other) => other.slug !== tool.slug)
    .map((other) => ({
      slug: other.slug,
      score: relationScore(tool, other)
    }))
    .filter((x) => x.score >= 4)
    .sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug));

  relatedMap[tool.slug] = candidates.slice(0, 12).map((x) => x.slug);
  compareMap[tool.slug] = candidates.filter((x) => x.score >= 10).slice(0, 8).map((x) => x.slug);
  alternativesMap[tool.slug] = candidates.filter((x) => x.score >= 8).slice(0, 10).map((x) => x.slug);

  pushLeader(entityLeaders.categories, tool.category, tool);
  pushLeader(entityLeaders.subcategories, tool.subcategory, tool);
  pushLeader(entityLeaders.microcategories, tool.microcategory, tool);
  for (const x of toArray(tool.use_cases)) pushLeader(entityLeaders.use_cases, x, tool);
  for (const x of toArray(tool.capabilities)) pushLeader(entityLeaders.capabilities, x, tool);
  for (const x of toArray(tool.industries)) pushLeader(entityLeaders.industries, x, tool);
  for (const x of toArray(tool.integrations)) pushLeader(entityLeaders.integrations, x, tool);
  for (const x of toArray(tool.ai_models)) pushLeader(entityLeaders.ai_models, x, tool);
}

for (const bucketName of Object.keys(entityLeaders)) {
  for (const slug of Object.keys(entityLeaders[bucketName])) {
    entityLeaders[bucketName][slug] = entityLeaders[bucketName][slug]
      .sort((a, b) => overallEntityScore(b) - overallEntityScore(a))
      .slice(0, 24)
      .map((tool) => tool.slug);
  }
}

writeJson(`${PATHS.graphsDir}/related-tools.json`, relatedMap);
writeJson(`${PATHS.graphsDir}/compare-map.json`, compareMap);
writeJson(`${PATHS.graphsDir}/alternatives-map.json`, alternativesMap);
writeJson(`${PATHS.graphsDir}/entity-leaders.json`, entityLeaders);
console.log(`Built graph layer for ${tools.length} eligible tools.`);
