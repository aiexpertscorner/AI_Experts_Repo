import fs from "fs";
import path from "path";

const root = process.cwd();
const INPUT_TOOLS = path.join(root, "src/data/tools_production.json");
const INPUT_MASTER = process.env.MASTER_TAXONOMY_PATH
  ? path.resolve(process.env.MASTER_TAXONOMY_PATH)
  : path.join(root, "src/data/build/aiexpertscorner_taxonomy_masterdataset.json");
const OUT_DIR = path.join(root, "src/data/build");
const OUT_DATA = path.join(OUT_DIR, "tools-master-mapped.json");
const OUT_REPORT = path.join(OUT_DIR, "master-taxonomy-mapping-report.json");

if (!fs.existsSync(INPUT_MASTER)) {
  throw new Error(
    `Master taxonomy file not found: ${INPUT_MASTER}\n` +
    `Expected file at: src/data/build/aiexpertscorner_taxonomy_masterdataset.json\n` +
    `Or set MASTER_TAXONOMY_PATH manually.`
  );
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing input file: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "").trim();
  return JSON.parse(raw);
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const str = JSON.stringify(data, null, 2);
  fs.writeFileSync(filePath, str, "utf8");
  const kb = (str.length / 1024).toFixed(1);
  console.log(` ✓ ${path.basename(filePath).padEnd(40)} ${kb} KB`);
}

function safeStr(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function safeArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((v) => safeStr(v)).filter(Boolean);
}

function unique(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function slugify(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function normalizeText(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value = "") {
  return unique(
    normalizeText(value)
      .split(" ")
      .map((t) => t.trim())
      .filter((t) => t && t.length > 1)
  );
}

function topEntries(map, limit = 100) {
  return [...map.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    })
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

function incrementMap(map, key) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + 1);
}

function countCoverage(records, field) {
  let count = 0;
  for (const record of records) {
    const value = record[field];
    if (Array.isArray(value)) {
      if (value.length > 0) count++;
    } else if (value && typeof value === "object") {
      if (Object.values(value).some(Boolean)) count++;
    } else if (value) {
      count++;
    }
  }
  return count;
}

function buildToolText(tool) {
  return [
    tool.name,
    tool.name_clean,
    tool.short,
    tool.desc,
    tool.cat,
    tool.pricing,
    ...(tool.tags || []),
    ...(tool.highlights || []),
    ...(tool.platforms || []),
    ...(tool.use_cases || []),
    ...(tool.prompt_use_cases || []),
    ...(tool.industries || []),
    ...(tool.workflow_stage || []),
    ...(tool.input_types || []),
    ...(tool.output_types || []),
    ...(tool.target_audience || []),
    ...(tool.feature_flags || []),
    ...(tool.search_intents || []),
    ...(tool.ai_model || []),
    ...(tool.best_for_queries || []),
    tool.primary_use_case,
    tool.content_cluster,
    tool.comparison_cluster,
    tool.seo_title,
    tool.seo_description,
  ]
    .map((v) => safeStr(v))
    .filter(Boolean)
    .join(" ");
}

function buildTokenSet(tool) {
  return new Set(tokenize(buildToolText(tool)));
}

function phraseInText(text, phrase) {
  const p = normalizeText(phrase);
  if (!p) return false;
  return text.includes(p);
}

function overlapScore(needle, toolTokenSet) {
  const parts = tokenize(needle);
  if (!parts.length) return 0;
  let matches = 0;
  for (const part of parts) {
    if (toolTokenSet.has(part)) matches++;
  }
  return matches / parts.length;
}

function buildMasterIndexes(master) {
  const categories = master.categories || [];
  const categoryList = [];
  const subcategoryList = [];
  const microcategoryList = [];

  for (const category of categories) {
    const cat = {
      slug: category.slug,
      name: category.name,
      description: safeStr(category.description),
      subcategories: [],
    };

    for (const sub of category.subcategories || []) {
      const subItem = {
        slug: sub.slug,
        name: sub.name,
        category_slug: category.slug,
        category_name: category.name,
        microcategories: [],
      };

      for (const microSlug of sub.microcategories || []) {
        const microName = microSlug
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");

        const microItem = {
          slug: microSlug,
          name: microName,
          subcategory_slug: sub.slug,
          subcategory_name: sub.name,
          category_slug: category.slug,
          category_name: category.name,
        };

        subItem.microcategories.push(microItem);
        microcategoryList.push(microItem);
      }

      cat.subcategories.push(subItem);
      subcategoryList.push(subItem);
    }

    categoryList.push(cat);
  }

  const facetLists = {
    capabilities: safeArray(master.capabilities),
    use_cases: safeArray(master.use_cases),
    industries: safeArray(master.industries),
    ai_models: safeArray(master.ai_models),
    integrations: safeArray(master.integrations),
    agent_types: safeArray(master.agent_types),
    platforms: safeArray(master.platforms),
    pricing_models: safeArray(master.pricing_models),
    skill_levels: safeArray(master.skill_levels),
    content_types: safeArray(master.content_types),
    tags: safeArray(master.tags),
    workflows: Array.isArray(master.workflows) ? master.workflows : [],
  };

  return {
    categories: categoryList,
    subcategories: subcategoryList,
    microcategories: microcategoryList,
    facets: facetLists,
  };
}

const LEGACY_CATEGORY_TO_MASTER = {
  "Writing & Content": "ai-writing",
  "Image Generation": "ai-image-generation",
  "Video Generation": "ai-video",
  "Audio & Music": "ai-audio-voice",
  "Coding & Dev": "ai-coding",
  Productivity: "ai-productivity",
  "SEO & Marketing": "ai-marketing",
  "Sales & CRM": "ai-sales",
  "Customer Service": "ai-customer-support",
  "Research & Education": "ai-research",
  "Design & UI": "ai-design",
  "Data & Analytics": "ai-data-analytics",
  "HR & Recruiting": "ai-business-operations",
  "Legal & Finance": "ai-business-operations",
  "Health & Wellness": "ai-business-operations",
  "AI Agents": "ai-automation-agents",
  "E-Commerce": "ai-marketing",
  "Social Media": "ai-marketing",
  Translation: "ai-audio-voice",
  "Photo Editing": "ai-image-generation",
  "3D & AR": "ai-design",
  "Chatbots & LLMs": "ai-automation-agents",
  "Other AI Tools": "",
};

function scoreCategory(category, tool, text, toolTokenSet) {
  let score = 0;
  const reasons = [];

  const legacyCat = safeStr(tool.cat);
  const mappedLegacy = LEGACY_CATEGORY_TO_MASTER[legacyCat] || "";

  if (mappedLegacy && mappedLegacy === category.slug) {
    score += 24;
    reasons.push(`legacy-category:${legacyCat}`);
  }

  if (phraseInText(text, category.name)) {
    score += 12;
    reasons.push(`category-name:${category.name}`);
  }

  if (phraseInText(text, category.slug.replace(/-/g, " "))) {
    score += 8;
    reasons.push(`category-slug:${category.slug}`);
  }

  const descOverlap = overlapScore(category.description, toolTokenSet);
  if (descOverlap >= 0.6) {
    score += 12;
    reasons.push("category-description-overlap:high");
  } else if (descOverlap >= 0.35) {
    score += 6;
    reasons.push("category-description-overlap:medium");
  }

  for (const sub of category.subcategories) {
    if (phraseInText(text, sub.name)) {
      score += 8;
      reasons.push(`subcategory-hit:${sub.slug}`);
    }
    if (phraseInText(text, sub.slug.replace(/-/g, " "))) {
      score += 6;
      reasons.push(`subcategory-slug-hit:${sub.slug}`);
    }
    for (const micro of sub.microcategories) {
      const microPhrase = micro.slug.replace(/-/g, " ");
      if (phraseInText(text, microPhrase)) {
        score += 7;
        reasons.push(`micro-hit:${micro.slug}`);
      }
    }
  }

  const outputs = safeArray(tool.output_types).map(slugify);
  const intents = safeArray(tool.search_intents).map(slugify);
  const industries = safeArray(tool.industries).map(slugify);

  if (category.slug === "ai-image-generation" && outputs.includes("image")) {
    score += 12;
    reasons.push("output:image");
  }
  if (category.slug === "ai-video" && outputs.includes("video")) {
    score += 12;
    reasons.push("output:video");
  }
  if (
    category.slug === "ai-audio-voice" &&
    (outputs.includes("audio-music") || outputs.includes("voiceover"))
  ) {
    score += 12;
    reasons.push("output:audio");
  }
  if (category.slug === "ai-coding" && outputs.includes("code")) {
    score += 14;
    reasons.push("output:code");
  }
  if (category.slug === "ai-productivity" && outputs.includes("summary")) {
    score += 8;
    reasons.push("output:summary");
  }
  if (category.slug === "ai-data-analytics" && outputs.includes("report-data")) {
    score += 12;
    reasons.push("output:report-data");
  }
  if (category.slug === "ai-automation-agents" && intents.includes("automate")) {
    score += 14;
    reasons.push("intent:automate");
  }
  if (category.slug === "ai-research" && intents.includes("summarize")) {
    score += 8;
    reasons.push("intent:summarize");
  }
  if (category.slug === "ai-marketing" && intents.includes("compare")) {
    score += 4;
    reasons.push("intent:compare");
  }
  if (category.slug === "ai-sales" && industries.includes("sales")) {
    score += 10;
    reasons.push("industry:sales");
  }
  if (
    category.slug === "ai-customer-support" &&
    industries.includes("customer-success")
  ) {
    score += 10;
    reasons.push("industry:customer-success");
  }
  if (
    category.slug === "ai-business-operations" &&
    (
      industries.includes("finance") ||
      industries.includes("legal") ||
      industries.includes("healthcare") ||
      industries.includes("hr-and-recruiting")
    )
  ) {
    score += 10;
    reasons.push("industry:ops");
  }

  return { score, reasons };
}

function scoreSubcategory(subcategory, tool, text, toolTokenSet, selectedCategorySlug) {
  if (subcategory.category_slug !== selectedCategorySlug) {
    return { score: 0, reasons: [] };
  }

  let score = 0;
  const reasons = [];

  if (phraseInText(text, subcategory.name)) {
    score += 14;
    reasons.push(`subcategory-name:${subcategory.name}`);
  }
  if (phraseInText(text, subcategory.slug.replace(/-/g, " "))) {
    score += 10;
    reasons.push(`subcategory-slug:${subcategory.slug}`);
  }

  const subOverlap = overlapScore(subcategory.name, toolTokenSet);
  if (subOverlap >= 0.75) {
    score += 8;
    reasons.push("subcategory-overlap:high");
  } else if (subOverlap >= 0.5) {
    score += 4;
    reasons.push("subcategory-overlap:medium");
  }

  const tags = safeArray(tool.tags).map(slugify);
  const useCases = safeArray(tool.use_cases).map(normalizeText);
  const primary = normalizeText(tool.primary_use_case || "");
  const slug = subcategory.slug;

  if (slug === "seo-tools" && (tags.includes("seo-and-keywords") || primary.includes("seo") || useCases.some((x) => x.includes("seo")))) {
    score += 16;
    reasons.push("rule:seo-tools");
  }
  if (slug === "social-media" && (tags.includes("social-media") || useCases.some((x) => x.includes("social media")))) {
    score += 16;
    reasons.push("rule:social-media");
  }
  if (slug === "email-marketing" && useCases.some((x) => x.includes("email"))) {
    score += 16;
    reasons.push("rule:email-marketing");
  }
  if (slug === "blog-writers" && useCases.some((x) => x.includes("blog") || x.includes("article"))) {
    score += 16;
    reasons.push("rule:blog-writers");
  }
  if (slug === "copywriting" && useCases.some((x) => x.includes("copy") || x.includes("ad campaign"))) {
    score += 16;
    reasons.push("rule:copywriting");
  }
  if (slug === "text-to-image" && safeArray(tool.output_types).map(slugify).includes("image")) {
    score += 16;
    reasons.push("rule:text-to-image");
  }
  if (slug === "image-editing" && (tags.includes("photo-editing") || useCases.some((x) => x.includes("edit") || x.includes("enhance photo")))) {
    score += 16;
    reasons.push("rule:image-editing");
  }
  if (slug === "text-to-video" && safeArray(tool.output_types).map(slugify).includes("video")) {
    score += 16;
    reasons.push("rule:text-to-video");
  }
  if (slug === "speech-to-text" && safeArray(tool.search_intents).map(slugify).includes("transcribe")) {
    score += 16;
    reasons.push("rule:speech-to-text");
  }
  if (slug === "music-generation" && safeArray(tool.output_types).map(slugify).includes("audio-music")) {
    score += 16;
    reasons.push("rule:music-generation");
  }
  if (slug === "code-completion" && safeArray(tool.output_types).map(slugify).includes("code")) {
    score += 16;
    reasons.push("rule:code-completion");
  }
  if (slug === "agent-builders" && safeArray(tool.search_intents).map(slugify).includes("automate")) {
    score += 16;
    reasons.push("rule:agent-builders");
  }
  if (slug === "no-code-automation" && safeArray(tool.feature_flags).map(slugify).includes("no-code")) {
    score += 16;
    reasons.push("rule:no-code-automation");
  }
  if (slug === "ai-search-engines" && safeArray(tool.search_intents).map(slugify).includes("chat")) {
    score += 8;
    reasons.push("rule:ai-search-engines");
  }
  if (slug === "document-analysis" && safeArray(tool.input_types).map(slugify).some((x) => ["document", "pdf"].includes(x))) {
    score += 16;
    reasons.push("rule:document-analysis");
  }
  if (slug === "presentation-tools" && safeArray(tool.output_types).map(slugify).includes("presentation")) {
    score += 16;
    reasons.push("rule:presentation-tools");
  }
  if (slug === "presentation-design" && safeArray(tool.output_types).map(slugify).includes("presentation")) {
    score += 14;
    reasons.push("rule:presentation-design");
  }

  return { score, reasons };
}

function scoreMicrocategory(micro, tool, text, toolTokenSet, selectedSubcategorySlug) {
  if (micro.subcategory_slug !== selectedSubcategorySlug) {
    return { score: 0, reasons: [] };
  }

  let score = 0;
  const reasons = [];
  const microPhrase = micro.slug.replace(/-/g, " ");

  if (phraseInText(text, microPhrase)) {
    score += 16;
    reasons.push(`micro-slug:${micro.slug}`);
  }

  const overlap = overlapScore(micro.slug.replace(/-/g, " "), toolTokenSet);
  if (overlap >= 0.8) {
    score += 10;
    reasons.push("micro-overlap:high");
  } else if (overlap >= 0.5) {
    score += 5;
    reasons.push("micro-overlap:medium");
  }

  const useCases = safeArray(tool.use_cases).map(normalizeText);
  const primary = normalizeText(tool.primary_use_case || "");
  const tags = safeArray(tool.tags).map(slugify);
  const slug = micro.slug;

  if (slug === "seo-blog-writers" && (primary.includes("seo") && (primary.includes("blog") || primary.includes("article")))) {
    score += 18;
    reasons.push("rule:seo-blog-writers");
  }
  if (slug === "affiliate-content-writers" && useCases.some((x) => x.includes("affiliate"))) {
    score += 18;
    reasons.push("rule:affiliate-content-writers");
  }
  if (slug === "ad-copy-generators" && useCases.some((x) => x.includes("ad campaign") || x.includes("ad copy"))) {
    score += 18;
    reasons.push("rule:ad-copy-generators");
  }
  if (slug === "linkedin-post-writers" && useCases.some((x) => x.includes("social media"))) {
    score += 12;
    reasons.push("rule:linkedin-post-writers");
  }
  if (slug === "instagram-caption-tools" && useCases.some((x) => x.includes("social media"))) {
    score += 12;
    reasons.push("rule:instagram-caption-tools");
  }
  if (slug === "keyword-optimized-writers" && primary.includes("seo")) {
    score += 18;
    reasons.push("rule:keyword-optimized-writers");
  }
  if (slug === "content-brief-generators" && primary.includes("seo")) {
    score += 12;
    reasons.push("rule:content-brief-generators");
  }
  if (slug === "paraphrasers" && useCases.some((x) => x.includes("rewrite") || x.includes("paraphrase"))) {
    score += 18;
    reasons.push("rule:paraphrasers");
  }
  if (slug === "grammar-enhancers" && useCases.some((x) => x.includes("grammar") || x.includes("edit"))) {
    score += 18;
    reasons.push("rule:grammar-enhancers");
  }
  if (slug === "text-to-image-generators" && safeArray(tool.output_types).map(slugify).includes("image")) {
    score += 18;
    reasons.push("rule:text-to-image-generators");
  }
  if (slug === "background-removal" && (tags.includes("photo-editing") || useCases.some((x) => x.includes("background")))) {
    score += 18;
    reasons.push("rule:background-removal");
  }
  if (slug === "image-upscalers" && useCases.some((x) => x.includes("upscale") || x.includes("enhance photo"))) {
    score += 18;
    reasons.push("rule:image-upscalers");
  }
  if (slug === "avatar-generators" && useCases.some((x) => x.includes("avatar"))) {
    score += 18;
    reasons.push("rule:avatar-generators");
  }
  if (slug === "logo-generators" && useCases.some((x) => x.includes("logo"))) {
    score += 18;
    reasons.push("rule:logo-generators");
  }
  if (slug === "product-photo-generators" && useCases.some((x) => x.includes("product"))) {
    score += 18;
    reasons.push("rule:product-photo-generators");
  }
  if (slug === "video-ad-generators" && useCases.some((x) => x.includes("video script") || x.includes("ad campaign"))) {
    score += 18;
    reasons.push("rule:video-ad-generators");
  }
  if (slug === "voice-cloning-tools" && useCases.some((x) => x.includes("voiceover") || x.includes("narration"))) {
    score += 18;
    reasons.push("rule:voice-cloning-tools");
  }
  if (slug === "transcription-tools" && safeArray(tool.search_intents).map(slugify).includes("transcribe")) {
    score += 18;
    reasons.push("rule:transcription-tools");
  }
  if (slug === "code-completion-tools" && safeArray(tool.output_types).map(slugify).includes("code")) {
    score += 18;
    reasons.push("rule:code-completion-tools");
  }
  if (slug === "bug-fixing-tools" && useCases.some((x) => x.includes("debug"))) {
    score += 18;
    reasons.push("rule:bug-fixing-tools");
  }
  if (slug === "article-summarizers" && safeArray(tool.search_intents).map(slugify).includes("summarize")) {
    score += 18;
    reasons.push("rule:article-summarizers");
  }
  if (slug === "note-summarizers" && safeArray(tool.output_types).map(slugify).includes("summary")) {
    score += 18;
    reasons.push("rule:note-summarizers");
  }
  if (slug === "workflow-builders" && safeArray(tool.search_intents).map(slugify).includes("automate")) {
    score += 18;
    reasons.push("rule:workflow-builders");
  }
  if (slug === "support-chatbots" && safeArray(tool.industries).map(slugify).includes("customer-success")) {
    score += 18;
    reasons.push("rule:support-chatbots");
  }

  return { score, reasons };
}

function pickBest(scoredItems, minimumScore = 1) {
  const sorted = [...scoredItems]
    .filter((item) => item.score >= minimumScore)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.slug.localeCompare(b.slug);
    });

  if (!sorted.length) {
    return { primary: null, candidates: [] };
  }

  const top = sorted[0];
  const second = sorted[1] || null;
  let confidence = "low";

  if (top.score >= 40) confidence = "high";
  else if (top.score >= 22) confidence = "medium";

  if (second && Math.abs(top.score - second.score) <= 3) {
    confidence = confidence === "high" ? "medium" : "low";
  }

  return {
    primary: {
      slug: top.slug,
      name: top.name,
      score: top.score,
      confidence,
      reasons: top.reasons,
    },
    candidates: sorted.slice(0, 5).map((item) => ({
      slug: item.slug,
      name: item.name,
      score: item.score,
    })),
  };
}

function mapFacetList(masterValues, toolValues, text, toolTokenSet, limit = 10) {
  const scored = [];

  for (const value of masterValues) {
    let score = 0;
    const reasons = [];

    if (phraseInText(text, value)) {
      score += 12;
      reasons.push("phrase");
    }

    const overlap = overlapScore(value, toolTokenSet);
    if (overlap >= 0.85) {
      score += 10;
      reasons.push("overlap-high");
    } else if (overlap >= 0.5) {
      score += 5;
      reasons.push("overlap-medium");
    }

    for (const tv of toolValues) {
      const tvNorm = normalizeText(tv);
      const mvNorm = normalizeText(value);
      if (tvNorm === mvNorm) {
        score += 16;
        reasons.push("exact-tool-field");
      } else if (tvNorm && mvNorm && (tvNorm.includes(mvNorm) || mvNorm.includes(tvNorm))) {
        score += 8;
        reasons.push("partial-tool-field");
      }
    }

    if (score > 0) {
      scored.push({ name: value, slug: slugify(value), score, reasons });
    }
  }

  return scored
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.slug.localeCompare(b.slug);
    })
    .slice(0, limit);
}

function mapWorkflows(masterWorkflows, text, toolTokenSet, tool) {
  const sourceValues = [
    ...safeArray(tool.use_cases),
    ...safeArray(tool.prompt_use_cases),
    ...safeArray(tool.workflow_stage),
    safeStr(tool.primary_use_case),
  ].filter(Boolean);

  return masterWorkflows
    .map((flow) => {
      let score = 0;
      const reasons = [];

      if (phraseInText(text, flow.name)) {
        score += 12;
        reasons.push("workflow-name");
      }
      if (phraseInText(text, flow.slug.replace(/-/g, " "))) {
        score += 10;
        reasons.push("workflow-slug");
      }

      const overlap = overlapScore(`${flow.name} ${flow.description || ""}`, toolTokenSet);
      if (overlap >= 0.6) {
        score += 10;
        reasons.push("workflow-overlap-high");
      } else if (overlap >= 0.35) {
        score += 5;
        reasons.push("workflow-overlap-medium");
      }

      for (const value of sourceValues) {
        const valueNorm = normalizeText(value);
        const flowNorm = normalizeText(`${flow.name} ${flow.description || ""}`);
        if (valueNorm && flowNorm && (flowNorm.includes(valueNorm) || valueNorm.includes(flowNorm))) {
          score += 8;
          reasons.push("workflow-source-match");
        }
      }

      return { name: flow.name, slug: flow.slug, score, reasons };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.slug.localeCompare(b.slug);
    })
    .slice(0, 8);
}

console.log("");
console.log("AIExpertsCorner — Map Tools To Master Taxonomy");
console.log("──────────────────────────────────────────────");

const tools = readJson(INPUT_TOOLS);
const master = readJson(INPUT_MASTER);

if (!Array.isArray(tools)) {
  throw new Error("tools_production.json must be an array");
}

const indexes = buildMasterIndexes(master);

console.log(`Tools loaded: ${tools.length}`);
console.log(`Master categories: ${indexes.categories.length}`);
console.log(`Master subcategories: ${indexes.subcategories.length}`);
console.log(`Master microcategories: ${indexes.microcategories.length}`);
console.log("");

const categoryCounts = new Map();
const subcategoryCounts = new Map();
const microcategoryCounts = new Map();
const lowConfidenceCounts = { category: 0, subcategory: 0, microcategory: 0 };

const mapped = tools.map((tool, idx) => {
  if ((idx + 1) % 2000 === 0 || idx + 1 === tools.length) {
    process.stdout.write(`\rMapping tools: ${idx + 1}/${tools.length}`);
  }

  const text = normalizeText(buildToolText(tool));
  const toolTokenSet = buildTokenSet(tool);

  const scoredCategories = indexes.categories.map((category) => {
    const result = scoreCategory(category, tool, text, toolTokenSet);
    return {
      slug: category.slug,
      name: category.name,
      score: result.score,
      reasons: result.reasons,
    };
  });

  const categoryPick = pickBest(scoredCategories, 1);
  const categoryPrimary = categoryPick.primary;

  let subcategoryPick = { primary: null, candidates: [] };
  let microcategoryPick = { primary: null, candidates: [] };

  if (categoryPrimary) {
    const scoredSubcategories = indexes.subcategories.map((sub) => {
      const result = scoreSubcategory(sub, tool, text, toolTokenSet, categoryPrimary.slug);
      return { slug: sub.slug, name: sub.name, score: result.score, reasons: result.reasons };
    });

    subcategoryPick = pickBest(scoredSubcategories, 1);

    if (subcategoryPick.primary) {
      const scoredMicrocategories = indexes.microcategories.map((micro) => {
        const result = scoreMicrocategory(micro, tool, text, toolTokenSet, subcategoryPick.primary.slug);
        return { slug: micro.slug, name: micro.name, score: result.score, reasons: result.reasons };
      });

      microcategoryPick = pickBest(scoredMicrocategories, 1);
    }
  }

  if (categoryPrimary) {
    incrementMap(categoryCounts, categoryPrimary.slug);
    if (categoryPrimary.confidence === "low") lowConfidenceCounts.category++;
  }
  if (subcategoryPick.primary) {
    incrementMap(subcategoryCounts, subcategoryPick.primary.slug);
    if (subcategoryPick.primary.confidence === "low") lowConfidenceCounts.subcategory++;
  }
  if (microcategoryPick.primary) {
    incrementMap(microcategoryCounts, microcategoryPick.primary.slug);
    if (microcategoryPick.primary.confidence === "low") lowConfidenceCounts.microcategory++;
  }

  const mappedCapabilities = mapFacetList(
    indexes.facets.capabilities,
    [
      ...safeArray(tool.tags),
      ...safeArray(tool.use_cases),
      ...safeArray(tool.prompt_use_cases),
      ...safeArray(tool.feature_flags),
      ...safeArray(tool.search_intents),
      ...safeArray(tool.output_types),
    ],
    text,
    toolTokenSet,
    12
  );

  const mappedUseCases = mapFacetList(
    indexes.facets.use_cases,
    [...safeArray(tool.use_cases), ...safeArray(tool.prompt_use_cases), safeStr(tool.primary_use_case)],
    text,
    toolTokenSet,
    12
  );

  const mappedIndustries = mapFacetList(indexes.facets.industries, safeArray(tool.industries), text, toolTokenSet, 8);
  const mappedAiModels = mapFacetList(indexes.facets.ai_models, safeArray(tool.ai_model), text, toolTokenSet, 8);
  const mappedPlatforms = mapFacetList(indexes.facets.platforms, safeArray(tool.platforms), text, toolTokenSet, 8);
  const mappedPricingModels = mapFacetList(indexes.facets.pricing_models, [safeStr(tool.pricing)], text, toolTokenSet, 5);
  const mappedSkillLevels = mapFacetList(indexes.facets.skill_levels, [safeStr(tool.complexity)], text, toolTokenSet, 5);
  const mappedContentTypes = mapFacetList(
    indexes.facets.content_types,
    [...safeArray(tool.output_types), ...safeArray(tool.input_types)],
    text,
    toolTokenSet,
    8
  );
  const mappedTags = mapFacetList(indexes.facets.tags, safeArray(tool.tags), text, toolTokenSet, 20);
  const mappedAgentTypes = mapFacetList(
    indexes.facets.agent_types,
    [...safeArray(tool.tags), ...safeArray(tool.use_cases), ...safeArray(tool.search_intents)],
    text,
    toolTokenSet,
    8
  );
  const mappedIntegrations = mapFacetList(
    indexes.facets.integrations,
    [...safeArray(tool.platforms), ...safeArray(tool.feature_flags), ...safeArray(tool.tags)],
    text,
    toolTokenSet,
    10
  );
  const mappedWorkflows = mapWorkflows(indexes.facets.workflows, text, toolTokenSet, tool);

  const masterTaxonomy = {
    category: categoryPrimary
      ? {
          slug: categoryPrimary.slug,
          name: categoryPrimary.name,
          confidence: categoryPrimary.confidence,
          score: categoryPrimary.score,
        }
      : null,
    subcategory: subcategoryPick.primary
      ? {
          slug: subcategoryPick.primary.slug,
          name: subcategoryPick.primary.name,
          confidence: subcategoryPick.primary.confidence,
          score: subcategoryPick.primary.score,
        }
      : null,
    microcategory: microcategoryPick.primary
      ? {
          slug: microcategoryPick.primary.slug,
          name: microcategoryPick.primary.name,
          confidence: microcategoryPick.primary.confidence,
          score: microcategoryPick.primary.score,
        }
      : null,
    candidate_categories: categoryPick.candidates,
    candidate_subcategories: subcategoryPick.candidates,
    candidate_microcategories: microcategoryPick.candidates,
  };

  return {
    ...tool,
    master_category: masterTaxonomy.category?.name || "",
    master_category_slug: masterTaxonomy.category?.slug || "",
    master_subcategory: masterTaxonomy.subcategory?.name || "",
    master_subcategory_slug: masterTaxonomy.subcategory?.slug || "",
    master_microcategory: masterTaxonomy.microcategory?.name || "",
    master_microcategory_slug: masterTaxonomy.microcategory?.slug || "",
    master_capabilities: mappedCapabilities.map((x) => ({ name: x.name, slug: x.slug })),
    master_use_cases: mappedUseCases.map((x) => ({ name: x.name, slug: x.slug })),
    master_industries: mappedIndustries.map((x) => ({ name: x.name, slug: x.slug })),
    master_ai_models: mappedAiModels.map((x) => ({ name: x.name, slug: x.slug })),
    master_integrations: mappedIntegrations.map((x) => ({ name: x.name, slug: x.slug })),
    master_agent_types: mappedAgentTypes.map((x) => ({ name: x.name, slug: x.slug })),
    master_platforms: mappedPlatforms.map((x) => ({ name: x.name, slug: x.slug })),
    master_pricing_models: mappedPricingModels.map((x) => ({ name: x.name, slug: x.slug })),
    master_skill_levels: mappedSkillLevels.map((x) => ({ name: x.name, slug: x.slug })),
    master_content_types: mappedContentTypes.map((x) => ({ name: x.name, slug: x.slug })),
    master_tags: mappedTags.map((x) => ({ name: x.name, slug: x.slug })),
    master_workflows: mappedWorkflows.map((x) => ({ name: x.name, slug: x.slug })),
    master_taxonomy: masterTaxonomy,
  };
});

process.stdout.write("\n");
writeJson(OUT_DATA, mapped);

const report = {
  generated_at: new Date().toISOString(),
  input_tools_file: "src/data/tools_production.json",
  input_master_file: INPUT_MASTER,
  output_file: "src/data/build/tools-master-mapped.json",
  total_tools: mapped.length,
  coverage: {
    master_category: countCoverage(mapped, "master_category"),
    master_subcategory: countCoverage(mapped, "master_subcategory"),
    master_microcategory: countCoverage(mapped, "master_microcategory"),
    master_capabilities: countCoverage(mapped, "master_capabilities"),
    master_use_cases: countCoverage(mapped, "master_use_cases"),
    master_industries: countCoverage(mapped, "master_industries"),
    master_ai_models: countCoverage(mapped, "master_ai_models"),
    master_integrations: countCoverage(mapped, "master_integrations"),
    master_agent_types: countCoverage(mapped, "master_agent_types"),
    master_platforms: countCoverage(mapped, "master_platforms"),
    master_pricing_models: countCoverage(mapped, "master_pricing_models"),
    master_skill_levels: countCoverage(mapped, "master_skill_levels"),
    master_content_types: countCoverage(mapped, "master_content_types"),
    master_tags: countCoverage(mapped, "master_tags"),
    master_workflows: countCoverage(mapped, "master_workflows"),
  },
  distinct_primary_counts: {
    categories: categoryCounts.size,
    subcategories: subcategoryCounts.size,
    microcategories: microcategoryCounts.size,
  },
  low_confidence_primary_counts: lowConfidenceCounts,
  top_primary_categories: topEntries(categoryCounts, 50),
  top_primary_subcategories: topEntries(subcategoryCounts, 80),
  top_primary_microcategories: topEntries(microcategoryCounts, 120),
  notes: [
    "This mapping layer is additive and does not yet replace existing build inputs.",
    "The master taxonomy is now treated as target taxonomy.",
    "Legacy cat/catSlug remain present for backward compatibility during migration.",
    "Next step is to update build-seo-datasets.mjs so category pages and future hubs can read master_category/master_subcategory/master_microcategory.",
  ],
};

writeJson(OUT_REPORT, report);

console.log("");
console.log("✅ Master taxonomy mapping complete");
console.log("──────────────────────────────────");
console.log(`Tools mapped: ${mapped.length}`);
console.log(`Primary categories: ${categoryCounts.size}`);
console.log(`Primary subcategories: ${subcategoryCounts.size}`);
console.log(`Primary microcategories: ${microcategoryCounts.size}`);
console.log(`Output dir: ${OUT_DIR}`);
console.log("");