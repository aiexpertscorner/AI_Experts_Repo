import fs from "fs";
import path from "path";

const root = process.cwd();

const CONFIG = {
  TOOLS_PATH: path.join(root, "src/data/tools_production.json"),
  STRUCTURE_REPORT_PATH: path.join(root, "src/data/build/structure-audit-report.json"),
  OUTPUT_PATH: path.join(root, "src/data/build/tools-audit-report.json"),

  PREVIEW_LIMIT: 25,
  PRIORITY_LIMIT: 100,
  CATEGORY_GAP_MIN_COUNT: 25,
  LOW_DISPLAY_SCORE_THRESHOLD: 25,
  LOW_QUALITY_SCORE_THRESHOLD: 45,
  LOW_CONTENT_DEPTH_THRESHOLD: 35,
  LOW_PROMPT_SCORE_THRESHOLD: 20,
  HIGH_PROMPT_SCORE_THRESHOLD: 55,
  HIGH_NEWS_SCORE_THRESHOLD: 45,
  HIGH_AFFILIATE_SCORE_THRESHOLD: 60,
  HOMEPAGE_SUSPICIOUS_MIN_SCORE: 55,
  BAD_NAME_MAX_WORDS: 10
};

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;

  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "").trim();

  if (!raw) return fallback;
  return JSON.parse(raw);
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function safeString(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function safeArray(value) {
  return Array.isArray(value)
    ? [...new Set(value.map((v) => String(v).trim()).filter(Boolean))]
    : [];
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

function wordCount(value = "") {
  return safeString(value).split(/\s+/).filter(Boolean).length;
}

function previewTool(tool) {
  return {
    handle: tool.handle,
    name: tool.name,
    cat: tool.cat,
    pricing: tool.pricing,
    visibility: tool.visibility,
    tool_status: tool.tool_status,
    partnerstack_match: !!tool.partnerstack_match,
    quality_score: tool.quality_score,
    display_score: tool.display_score,
    affiliate_priority_score: tool.affiliate_priority_score,
    prompt_library_score: tool.prompt_library_score,
    news_relevance_score: tool.news_relevance_score,
    editorial_priority_score: tool.editorial_priority_score,
    duplicate_group: tool.duplicate_group || "",
    canonical_handle: tool.canonical_handle || "",
    desc_length: safeString(tool.desc).length
  };
}

function topN(arr, n, scoreField) {
  return [...arr]
    .sort((a, b) => (b[scoreField] || 0) - (a[scoreField] || 0))
    .slice(0, n);
}

function countBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    map.set(key, (map.get(key) || 0) + 1);
  }
  return Object.fromEntries(
    [...map.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
  );
}

function groupBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

function hasBadNamePattern(name = "") {
  const n = safeString(name);

  const patterns = [
    /\bby\b/i,
    /\bpowered by\b/i,
    /\bwith\b/i,
    /\bfor\b/i,
    /\bapp\b/i,
    /\bopenai\b/i,
    /\banthropic\b/i
  ];

  return patterns.some((p) => p.test(n));
}

function hasUglySlug(slug = "") {
  const s = safeString(slug);
  return (
    s.length > 55 ||
    /--/.test(s) ||
    /\d$/.test(s) ||
    s.split("-").length > 8
  );
}

function normalizeBrandName(value = "") {
  return safeString(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\b(ai|app|tool|tools|platform|software|hq|io|inc|labs|lab|official)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function actionFromStructureReport(structureReport) {
  if (!structureReport?.results) return [];

  const missing = structureReport.results.filter((r) => r.type === "missing");
  const conflict = structureReport.results.filter((r) => r.type === "conflict");
  const extra = structureReport.results.filter((r) => r.type === "extra");
  const dirMissing = structureReport.results.filter((r) => r.type === "dir_missing");

  const nowTargets = [
    "scripts/audit-tools-production.mjs",
    "scripts/bootstrap-site.mjs",
    "src/data/build/comparison-map.json",
    "src/data/build/audience-map.json",
    "src/data/build/audience-paths.json",
    "src/data/build/industry-map.json",
    "src/data/build/industry-paths.json",
    "src/data/build/input-type-map.json",
    "src/data/build/input-type-paths.json",
    "src/data/build/output-type-map.json",
    "src/data/build/output-type-paths.json",
    "src/data/build/workflow-map.json",
    "src/data/build/workflow-paths.json",
    "src/data/build/complexity-map.json",
    "src/data/build/complexity-paths.json",
    "src/data/build/model-map.json",
    "src/data/build/model-paths.json",
    "src/data/build/best-pages.json",
    "src/data/build/best-page-paths.json",
    "src/data/build/internal-links-tools.json",
    "src/data/build/internal-links-categories.json",
    "src/data/build/internal-links-global.json"
  ];

  return [
    ...missing
      .filter((r) => nowTargets.includes(r.target))
      .map((r) => ({
        priority: "high",
        type: "missing-target",
        target: r.target,
        reason: r.reason
      })),
    ...conflict.map((r) => ({
      priority: "medium",
      type: "path-conflict",
      target: r.target,
      existing: r.existing,
      reason: r.reason
    })),
    ...extra
      .filter((r) =>
        [
          "src\\data\\homeconfix.ts",
          "src\\data\\tools_enriched.json",
          "src\\styles\\category-detail.css",
          "src\\styles\\tool-detail.css"
        ].includes(r.existing)
      )
      .map((r) => ({
        priority: "medium",
        type: "extra-file-review",
        existing: r.existing,
        reason: r.reason
      })),
    ...dirMissing.map((r) => ({
      priority: "low",
      type: "missing-directory",
      target: r.target,
      reason: r.reason
    }))
  ];
}

function main() {
  const tools = readJson(CONFIG.TOOLS_PATH);
  if (!Array.isArray(tools)) {
    throw new Error("tools_production.json must be an array.");
  }

  const structureReport = readJson(CONFIG.STRUCTURE_REPORT_PATH, null);

  const publicTools = tools.filter((t) => t.visibility === "public");
  const hiddenTools = tools.filter((t) => t.visibility === "hidden");
  const canonicalTools = tools.filter((t) => t.is_canonical !== false);
  const duplicateTools = tools.filter((t) => !!t.duplicate_group);
  const nonCanonicalDuplicates = tools.filter((t) => !!t.duplicate_group && t.is_canonical === false);
  const needsReview = tools.filter((t) => t.tool_status === "needs_review" || t.needs_manual_review === true);
  const thinTools = tools.filter((t) => t.tool_status === "thin");
  const deadTools = tools.filter((t) => t.tool_status === "dead");
  const invalidTools = tools.filter((t) => t.tool_status === "invalid");

  const fairHealth = tools.filter((t) => t.data_health === "fair");
  const poorHealth = tools.filter((t) => t.data_health === "poor");

  const suspiciousNames = tools.filter((t) => {
    const name = safeString(t.name);
    return (
      hasBadNamePattern(name) ||
      wordCount(name) > CONFIG.BAD_NAME_MAX_WORDS ||
      /\b\d+\b/.test(name) ||
      name.length > 60
    );
  });

  const uglySlugs = tools.filter((t) => hasUglySlug(t.slug || t.handle));

  const shortDescriptions = tools.filter((t) => safeString(t.desc).length < 90);
  const weakPublicRecords = publicTools.filter(
    (t) =>
      (t.quality_score || 0) < CONFIG.LOW_QUALITY_SCORE_THRESHOLD ||
      (t.content_depth_score || 0) < CONFIG.LOW_CONTENT_DEPTH_THRESHOLD ||
      safeString(t.desc).length < 90
  );

  const lowDisplayPublic = publicTools.filter((t) => (t.display_score || 0) < CONFIG.LOW_DISPLAY_SCORE_THRESHOLD);

  const hiddenButStrong = hiddenTools.filter(
    (t) =>
      (t.quality_score || 0) >= 55 &&
      (t.display_score || 0) >= 40 &&
      t.tool_status !== "dead" &&
      t.tool_status !== "invalid"
  );

  const partnerstackMatches = tools.filter((t) => t.partnerstack_match);
  const highAffiliateNoPartnerstack = publicTools.filter(
    (t) =>
      !t.partnerstack_match &&
      (t.affiliate_priority_score || 0) >= CONFIG.HIGH_AFFILIATE_SCORE_THRESHOLD &&
      ["Freemium", "Paid"].includes(safeString(t.pricing))
  );

  const promptWinners = publicTools.filter((t) => (t.prompt_library_score || 0) >= CONFIG.HIGH_PROMPT_SCORE_THRESHOLD);
  const newsWinners = publicTools.filter((t) => (t.news_relevance_score || 0) >= CONFIG.HIGH_NEWS_SCORE_THRESHOLD);

  const promptUnderserved = publicTools.filter(
    (t) =>
      (t.prompt_library_score || 0) < CONFIG.LOW_PROMPT_SCORE_THRESHOLD &&
      ["Writing & Content", "SEO & Marketing", "Video Generation", "Chatbots & LLMs"].includes(safeString(t.cat))
  );

  const homepageSuspicious = publicTools.filter(
    (t) =>
      (t.homepage_priority_score || 0) >= CONFIG.HOMEPAGE_SUSPICIOUS_MIN_SCORE &&
      (
        hasBadNamePattern(t.name) ||
        hasUglySlug(t.slug || t.handle) ||
        safeString(t.desc).length < 70
      )
  );

  const duplicateGroups = groupBy(
    duplicateTools.filter((t) => t.duplicate_group),
    (t) => t.duplicate_group
  );

  const duplicateGroupPreview = [...duplicateGroups.entries()]
    .map(([group, items]) => ({
      duplicate_group: group,
      count: items.length,
      canonical_handle: items.find((x) => x.is_canonical !== false)?.handle || "",
      members: items.slice(0, 8).map((x) => ({
        handle: x.handle,
        name: x.name,
        is_canonical: x.is_canonical !== false,
        visibility: x.visibility,
        quality_score: x.quality_score,
        display_score: x.display_score
      }))
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, CONFIG.PREVIEW_LIMIT);

  const categoryCounts = countBy(publicTools, (t) => safeString(t.cat, "Uncategorized"));
  const pricingCounts = countBy(publicTools, (t) => safeString(t.pricing, "Unknown"));
  const statusCounts = countBy(tools, (t) => safeString(t.tool_status, "unknown"));

  const categoryMap = groupBy(publicTools, (t) => safeString(t.cat, "Uncategorized"));
  const categoryInsights = [...categoryMap.entries()]
    .map(([cat, items]) => {
      const avgDisplay =
        Math.round(items.reduce((sum, t) => sum + (t.display_score || 0), 0) / Math.max(1, items.length));
      const avgAffiliate =
        Math.round(items.reduce((sum, t) => sum + (t.affiliate_priority_score || 0), 0) / Math.max(1, items.length));
      const avgPrompt =
        Math.round(items.reduce((sum, t) => sum + (t.prompt_library_score || 0), 0) / Math.max(1, items.length));
      const avgNews =
        Math.round(items.reduce((sum, t) => sum + (t.news_relevance_score || 0), 0) / Math.max(1, items.length));

      return {
        category: cat,
        count: items.length,
        avg_display_score: avgDisplay,
        avg_affiliate_priority_score: avgAffiliate,
        avg_prompt_library_score: avgPrompt,
        avg_news_relevance_score: avgNews,
        public_count: items.length,
        top_examples: topN(items, 5, "display_score").map((t) => ({
          handle: t.handle,
          name: t.name,
          display_score: t.display_score
        }))
      };
    })
    .sort((a, b) => b.count - a.count);

  const categoryGaps = categoryInsights.filter(
    (c) =>
      c.count >= CONFIG.CATEGORY_GAP_MIN_COUNT &&
      (
        c.avg_affiliate_priority_score < 25 ||
        c.avg_prompt_library_score < 20 ||
        c.avg_news_relevance_score < 12
      )
  );

  const buildPriorities = [
    {
      priority: 1,
      area: "data-quality",
      action: "Review needs_review / duplicate / suspicious-name records before bootstrap",
      reason: `${needsReview.length} records need review; ${nonCanonicalDuplicates.length} duplicates hidden; suspicious naming can hurt SEO and conversion.`
    },
    {
      priority: 2,
      area: "affiliate",
      action: "Improve PartnerStack and monetization matching",
      reason: `${partnerstackMatches.length} PartnerStack matches is low relative to ${tools.length} tools and ${highAffiliateNoPartnerstack.length} public tools still show high affiliate potential without a match.`
    },
    {
      priority: 3,
      area: "prompt-library",
      action: "Build prompt pages from highest prompt winners first",
      reason: `${promptWinners.length} public tools have high prompt potential and can power a strong prompt library.`
    },
    {
      priority: 4,
      area: "news-editorial",
      action: "Build news/trending clusters from high news-relevance tools",
      reason: `${newsWinners.length} public tools have strong news relevance and can seed trends, launches, updates, and editorial pages.`
    },
    {
      priority: 5,
      area: "programmatic-pages",
      action: "Generate map/path files and internal-link files before page bootstrap",
      reason: "Missing build maps and internal-link files were flagged in structure audit and are required for scalable category, compare, audience, workflow, and best pages."
    }
  ];

  const recommendedFilesToMake = actionFromStructureReport(structureReport);

  const report = {
    generated_at: new Date().toISOString(),
    input_file: CONFIG.TOOLS_PATH,
    source_summary: {
      total_tools: tools.length,
      public_tools: publicTools.length,
      hidden_tools: hiddenTools.length,
      canonical_tools: canonicalTools.length,
      duplicate_tools: duplicateTools.length,
      non_canonical_duplicates: nonCanonicalDuplicates.length,
      partnerstack_matches: partnerstackMatches.length
    },

    audit_summary: {
      needs_review_tools: needsReview.length,
      thin_tools: thinTools.length,
      dead_tools: deadTools.length,
      invalid_tools: invalidTools.length,
      poor_data_health_tools: poorHealth.length,
      fair_data_health_tools: fairHealth.length,
      suspicious_names: suspiciousNames.length,
      ugly_slugs: uglySlugs.length,
      short_descriptions: shortDescriptions.length,
      weak_public_records: weakPublicRecords.length,
      low_display_public_records: lowDisplayPublic.length,
      hidden_but_strong_records: hiddenButStrong.length,
      high_affiliate_without_partnerstack: highAffiliateNoPartnerstack.length,
      prompt_winners: promptWinners.length,
      news_winners: newsWinners.length,
      prompt_underserved: promptUnderserved.length,
      homepage_suspicious: homepageSuspicious.length
    },

    distributions: {
      categories: categoryCounts,
      pricing: pricingCounts,
      tool_status: statusCounts
    },

    category_insights: categoryInsights,
    category_gaps: categoryGaps,

    findings: {
      top_duplicate_groups: duplicateGroupPreview,
      suspicious_names: suspiciousNames.slice(0, CONFIG.PRIORITY_LIMIT).map(previewTool),
      ugly_slugs: uglySlugs.slice(0, CONFIG.PRIORITY_LIMIT).map(previewTool),
      weak_public_records: weakPublicRecords.slice(0, CONFIG.PRIORITY_LIMIT).map(previewTool),
      hidden_but_strong_records: hiddenButStrong.slice(0, CONFIG.PRIORITY_LIMIT).map(previewTool),
      high_affiliate_without_partnerstack: highAffiliateNoPartnerstack
        .sort((a, b) => (b.affiliate_priority_score || 0) - (a.affiliate_priority_score || 0))
        .slice(0, CONFIG.PRIORITY_LIMIT)
        .map(previewTool),
      top_prompt_winners: topN(promptWinners, CONFIG.PREVIEW_LIMIT, "prompt_library_score").map(previewTool),
      top_news_winners: topN(newsWinners, CONFIG.PREVIEW_LIMIT, "news_relevance_score").map(previewTool),
      prompt_underserved: promptUnderserved
        .sort((a, b) => (b.display_score || 0) - (a.display_score || 0))
        .slice(0, CONFIG.PRIORITY_LIMIT)
        .map(previewTool),
      homepage_suspicious: homepageSuspicious
        .sort((a, b) => (b.homepage_priority_score || 0) - (a.homepage_priority_score || 0))
        .slice(0, CONFIG.PREVIEW_LIMIT)
        .map(previewTool)
    },

    build_priorities: buildPriorities,
    recommended_files_to_make: recommendedFilesToMake,

    exact_next_outputs_needed: [
      "src/data/build/comparison-map.json",
      "src/data/build/audience-map.json",
      "src/data/build/audience-paths.json",
      "src/data/build/industry-map.json",
      "src/data/build/industry-paths.json",
      "src/data/build/input-type-map.json",
      "src/data/build/input-type-paths.json",
      "src/data/build/output-type-map.json",
      "src/data/build/output-type-paths.json",
      "src/data/build/workflow-map.json",
      "src/data/build/workflow-paths.json",
      "src/data/build/complexity-map.json",
      "src/data/build/complexity-paths.json",
      "src/data/build/model-map.json",
      "src/data/build/model-paths.json",
      "src/data/build/best-pages.json",
      "src/data/build/best-page-paths.json",
      "src/data/build/internal-links-tools.json",
      "src/data/build/internal-links-categories.json",
      "src/data/build/internal-links-global.json"
    ]
  };

  writeJson(CONFIG.OUTPUT_PATH, report);

  console.log("");
  console.log("AI Experts Corner — Tools Production Audit");
  console.log("------------------------------------------");
  console.log(`Tools:                          ${tools.length}`);
  console.log(`Public tools:                   ${publicTools.length}`);
  console.log(`Needs review:                   ${needsReview.length}`);
  console.log(`Suspicious names:               ${suspiciousNames.length}`);
  console.log(`Ugly slugs:                     ${uglySlugs.length}`);
  console.log(`Weak public records:            ${weakPublicRecords.length}`);
  console.log(`Hidden but strong records:      ${hiddenButStrong.length}`);
  console.log(`High affiliate, no match:       ${highAffiliateNoPartnerstack.length}`);
  console.log(`Prompt winners:                 ${promptWinners.length}`);
  console.log(`News winners:                   ${newsWinners.length}`);
  console.log(`Prompt underserved:             ${promptUnderserved.length}`);
  console.log(`Homepage suspicious:            ${homepageSuspicious.length}`);
  console.log(`Report file:                    ${CONFIG.OUTPUT_PATH}`);
  console.log("------------------------------------------");
  console.log("");
}

main();