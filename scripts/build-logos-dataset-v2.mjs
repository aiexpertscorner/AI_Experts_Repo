#!/usr/bin/env node
/**
 * AI Experts Corner — build-logos-dataset-v2.mjs
 * ------------------------------------------------------------
 * Builds a robust logos dataset from existing tool JSONs.
 *
 * OUTPUTS
 * - src/data/build/logos.json
 * - src/data/build/logos-ok.json
 * - src/data/build/logos-missing.json
 * - src/data/build/logos-verification-report.json
 *
 * FEATURES
 * - Smart field extraction from multiple possible tool shapes
 * - Tool + company logo generation
 * - Primary logo selection strategy
 * - Explicit logo preservation when present
 * - logo.dev support using publishable key
 * - clearbit fallback URL generation (reference/fallback only)
 * - Verification pass against live logo URLs
 * - Incremental mode support
 * - Chunked write support for large datasets
 * - Rich stats and reporting
 *
 * USAGE
 *   node scripts/build-logos-dataset-v2.mjs
 *
 * OPTIONAL ENV
 *   LOGO_DEV_TOKEN=pk_VOBQxwm0QXqiHNHd5ILfSQ
 *   LOGO_PROVIDER=logo_dev
 *   INPUT=src/data/build/tool-page-data.json
 *   OUTPUT=src/data/build/logos.json
 *   VERIFY_ALL=false
 *   VERIFY_SAMPLE=500
 *   CONCURRENCY=20
 *   BATCH_SIZE=2500
 *   INCREMENTAL=false
 *   FORCE_REBUILD=false
 *   PREFER_EXISTING_EXPLICIT_LOGOS=true
 *   REQUEST_404_ON_MISS=false
 *   LOGO_SIZE=128
 *   LOGO_FORMAT=png
 *   THEME=dark
 */

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();

const CONFIG = {
  input: process.env.INPUT || "",
  output: process.env.OUTPUT || "src/data/build/logos.json",
  okOutput: process.env.OK_OUTPUT || "src/data/build/logos-ok.json",
  missingOutput: process.env.MISSING_OUTPUT || "src/data/build/logos-missing.json",
  reportOutput: process.env.REPORT_OUTPUT || "src/data/build/logos-verification-report.json",

  provider: (process.env.LOGO_PROVIDER || "logo_dev").toLowerCase(),
  logoDevToken: process.env.LOGO_DEV_TOKEN || "",

  verifyAll: String(process.env.VERIFY_ALL || "false").toLowerCase() === "true",
  verifySample: Number(process.env.VERIFY_SAMPLE || 500),
  concurrency: Number(process.env.CONCURRENCY || 20),
  verifyTimeoutMs: Number(process.env.VERIFY_TIMEOUT_MS || 8000),

  batchSize: Number(process.env.BATCH_SIZE || 2500),
  incremental: String(process.env.INCREMENTAL || "false").toLowerCase() === "true",
  forceRebuild: String(process.env.FORCE_REBUILD || "false").toLowerCase() === "true",
  preferExistingExplicitLogos:
    String(process.env.PREFER_EXISTING_EXPLICIT_LOGOS || "true").toLowerCase() === "true",

  request404OnMiss:
    String(process.env.REQUEST_404_ON_MISS || "false").toLowerCase() === "true",

  logoSize: Number(process.env.LOGO_SIZE || 128),
  logoFormat: (process.env.LOGO_FORMAT || "png").toLowerCase(),
  theme: (process.env.THEME || "light").toLowerCase(),
};

const INPUT_CANDIDATES = [
  CONFIG.input,
  "src/data/build/tool-page-data.json",
  "src/data/build/tool-map.json",
  "src/data/build/tool-enrichment-result.json",
  "src/data/tools_source.json",
].filter(Boolean);

function log(...args) {
  console.log("[logos-v2]", ...args);
}

function nowIso() {
  return new Date().toISOString();
}

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function cleanString(v) {
  return isNonEmptyString(v) ? v.trim() : "";
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (isNonEmptyString(value)) return value.trim();
  }
  return "";
}

function toBool(value) {
  return Boolean(value);
}

async function fileExists(filePath) {
  try {
    await fs.access(path.join(ROOT, filePath));
    return true;
  } catch {
    return false;
  }
}

async function ensureDirForFile(filePath) {
  await fs.mkdir(path.dirname(path.join(ROOT, filePath)), { recursive: true });
}

function safeJsonParse(raw, filePath) {
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Invalid JSON in ${filePath}: ${err.message}`);
  }
}

async function readJsonIfExists(filePath) {
  if (!(await fileExists(filePath))) return null;
  const raw = await fs.readFile(path.join(ROOT, filePath), "utf8");
  return safeJsonParse(raw, filePath);
}

async function writeJson(filePath, data) {
  await ensureDirForFile(filePath);
  await fs.writeFile(path.join(ROOT, filePath), JSON.stringify(data, null, 2), "utf8");
}

async function loadFirstAvailableJson() {
  for (const rel of INPUT_CANDIDATES) {
    if (!rel) continue;
    if (await fileExists(rel)) {
      const raw = await fs.readFile(path.join(ROOT, rel), "utf8");
      const data = safeJsonParse(raw, rel);
      log(`Using input: ${rel}`);
      return { rel, data };
    }
  }
  throw new Error(
    `No input JSON found.\nChecked:\n- ${INPUT_CANDIDATES.join("\n- ")}`
  );
}

function toArrayFromUnknown(data) {
  if (Array.isArray(data)) return data;

  if (data && typeof data === "object") {
    if (Array.isArray(data.tools)) return data.tools;
    if (Array.isArray(data.items)) return data.items;
    if (Array.isArray(data.records)) return data.records;

    const values = Object.values(data);
    if (values.length && values.every(v => v && typeof v === "object")) {
      return values;
    }
  }

  throw new Error("Unsupported JSON shape. Expected array or object map.");
}

function normalizeUrl(input) {
  const raw = cleanString(input);
  if (!raw) return "";

  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    const u = new URL(candidate);
    if (!u.hostname) return "";
    u.hash = "";
    return u.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function extractDomain(input) {
  const raw = cleanString(input);
  if (!raw) return "";

  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return u.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    const simplified = raw
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split("/")[0]
      .trim()
      .toLowerCase();

    if (/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(simplified)) return simplified;
    return "";
  }
}

function domainToUrl(domain) {
  const d = cleanString(domain).replace(/^www\./i, "").toLowerCase();
  return d ? `https://${d}` : "";
}

function titleCase(s) {
  return cleanString(s)
    .split(/[\s_\-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeSlug(input) {
  return cleanString(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function inferCompanyNameFromDomain(domain) {
  const base = cleanString(domain).split(".")[0];
  return base ? titleCase(base) : "";
}

function scoreConfidence(parts) {
  return Math.max(0, Math.min(1, Number(parts)));
}

function maybeToolNameFromFields(tool) {
  return firstNonEmpty(
    tool.name,
    tool.tool_name,
    tool.title,
    tool.handle,
    tool.slug,
    tool.brand_name_normalized
  );
}

function maybeToolUrlFromFields(tool) {
  return firstNonEmpty(
    tool.url,
    tool.website_url,
    tool.website,
    tool.site_url,
    tool.final_url,
    tool.canonical_url,
    tool.product_url,
    tool.link,
    tool.href
  );
}

function maybeToolLogoFromFields(tool) {
  return firstNonEmpty(
    tool.logo_url,
    tool.logo,
    tool.icon_url,
    tool.image_url,
    tool.image,
    tool.favicon_url
  );
}

function maybeCompanyNameFromFields(tool) {
  return firstNonEmpty(
    tool.company_name,
    tool.companyName,
    tool.brand_name,
    tool.brandName,
    tool.brand,
    tool.organization,
    tool.organization_name,
    tool.org_name,
    tool.vendor,
    tool.publisher,
    tool.owner_name,
    tool.developer
  );
}

function maybeCompanyUrlFromFields(tool) {
  return firstNonEmpty(
    tool.company_url,
    tool.companyUrl,
    tool.brand_url,
    tool.brandUrl,
    tool.organization_url,
    tool.org_url,
    tool.vendor_url,
    tool.owner_url
  );
}

function maybeCompanyLogoFromFields(tool) {
  return firstNonEmpty(
    tool.company_logo,
    tool.companyLogo,
    tool.brand_logo,
    tool.brandLogo
  );
}

function maybeTickerFromFields(tool) {
  return firstNonEmpty(
    tool.ticker,
    tool.stock_ticker,
    tool.symbol
  );
}

function maybeCryptoSymbolFromFields(tool) {
  return firstNonEmpty(
    tool.crypto_symbol,
    tool.coin_symbol,
    tool.token_symbol
  );
}

function maybeIsinFromFields(tool) {
  return firstNonEmpty(tool.isin);
}

function logoDevDomainUrl(domain) {
  if (!domain || !CONFIG.logoDevToken) return "";
  const params = new URLSearchParams({
    token: CONFIG.logoDevToken,
    size: String(CONFIG.logoSize),
    format: CONFIG.logoFormat,
    theme: CONFIG.theme,
  });
  if (CONFIG.request404OnMiss) params.set("fallback", "404");
  return `https://img.logo.dev/${encodeURIComponent(domain)}?${params.toString()}`;
}

function logoDevTickerUrl(ticker) {
  if (!ticker || !CONFIG.logoDevToken) return "";
  const params = new URLSearchParams({
    token: CONFIG.logoDevToken,
    size: String(CONFIG.logoSize),
    format: CONFIG.logoFormat,
    theme: CONFIG.theme,
  });
  if (CONFIG.request404OnMiss) params.set("fallback", "404");
  return `https://img.logo.dev/ticker/${encodeURIComponent(ticker)}?${params.toString()}`;
}

function logoDevCryptoUrl(symbol) {
  if (!symbol || !CONFIG.logoDevToken) return "";
  const params = new URLSearchParams({
    token: CONFIG.logoDevToken,
    size: String(CONFIG.logoSize),
    format: CONFIG.logoFormat,
    theme: CONFIG.theme,
  });
  if (CONFIG.request404OnMiss) params.set("fallback", "404");
  return `https://img.logo.dev/crypto/${encodeURIComponent(symbol)}?${params.toString()}`;
}

function logoDevIsinUrl(isin) {
  if (!isin || !CONFIG.logoDevToken) return "";
  const params = new URLSearchParams({
    token: CONFIG.logoDevToken,
    size: String(CONFIG.logoSize),
    format: CONFIG.logoFormat,
    theme: CONFIG.theme,
  });
  if (CONFIG.request404OnMiss) params.set("fallback", "404");
  return `https://img.logo.dev/isin/${encodeURIComponent(isin)}?${params.toString()}`;
}

function clearbitUrl(domain) {
  if (!domain) return "";
  return `https://logo.clearbit.com/${encodeURIComponent(domain)}?size=${CONFIG.logoSize}`;
}

function chooseBestLogoCandidate({
  explicitLogo,
  domain,
  ticker,
  cryptoSymbol,
  isin,
}) {
  const candidates = [];

  if (CONFIG.preferExistingExplicitLogos && explicitLogo) {
    candidates.push({
      url: normalizeUrl(explicitLogo),
      source: "explicit",
      status: explicitLogo ? "explicit" : "missing",
    });
  }

  if (domain && CONFIG.logoDevToken) {
    candidates.push({
      url: logoDevDomainUrl(domain),
      source: "logo_dev_domain",
      status: "generated",
    });
  }

  if (ticker && CONFIG.logoDevToken) {
    candidates.push({
      url: logoDevTickerUrl(ticker),
      source: "logo_dev_ticker",
      status: "generated",
    });
  }

  if (cryptoSymbol && CONFIG.logoDevToken) {
    candidates.push({
      url: logoDevCryptoUrl(cryptoSymbol),
      source: "logo_dev_crypto",
      status: "generated",
    });
  }

  if (isin && CONFIG.logoDevToken) {
    candidates.push({
      url: logoDevIsinUrl(isin),
      source: "logo_dev_isin",
      status: "generated",
    });
  }

  if (domain) {
    candidates.push({
      url: clearbitUrl(domain),
      source: "clearbit_fallback",
      status: "fallback",
    });
  }

  const primary = candidates.find(c => c.url) || {
    url: "",
    source: "missing",
    status: "missing",
  };

  return {
    primary,
    candidates: candidates.filter(c => c.url),
  };
}

function buildStableId(tool, toolName, toolUrl, toolDomain, index) {
  return firstNonEmpty(
    tool.id,
    tool.handle,
    tool.slug,
    normalizeSlug(toolName),
    normalizeSlug(toolDomain),
    normalizeSlug(toolUrl),
    `tool-${index + 1}`
  );
}

function inferDomainSource(rawToolUrl, toolDomain, explicitDomain) {
  if (explicitDomain) return "explicit";
  if (rawToolUrl && toolDomain) return "url";
  if (toolDomain) return "inferred";
  return "missing";
}

function normalizeRecord(tool, index) {
  const toolName = maybeToolNameFromFields(tool) || `Tool ${index + 1}`;

  const rawToolUrl = maybeToolUrlFromFields(tool);
  const toolUrl = normalizeUrl(rawToolUrl);
  const explicitToolDomain = firstNonEmpty(tool.logo_domain, tool.domain, tool.tool_domain);
  const toolDomain = extractDomain(explicitToolDomain) || extractDomain(toolUrl || rawToolUrl);

  const rawToolLogo = maybeToolLogoFromFields(tool);
  const rawCompanyName = maybeCompanyNameFromFields(tool);
  const rawCompanyUrl = maybeCompanyUrlFromFields(tool);
  const rawCompanyLogo = maybeCompanyLogoFromFields(tool);

  const companyUrl = normalizeUrl(rawCompanyUrl);
  const companyDomain = extractDomain(companyUrl) || toolDomain;
  const companyName =
    rawCompanyName ||
    inferCompanyNameFromDomain(companyDomain) ||
    inferCompanyNameFromDomain(toolDomain) ||
    toolName;

  const ticker = maybeTickerFromFields(tool);
  const cryptoSymbol = maybeCryptoSymbolFromFields(tool);
  const isin = maybeIsinFromFields(tool);

  const toolLogoSelection = chooseBestLogoCandidate({
    explicitLogo: rawToolLogo,
    domain: toolDomain,
    ticker,
    cryptoSymbol,
    isin,
  });

  const companyLogoSelection = chooseBestLogoCandidate({
    explicitLogo: rawCompanyLogo,
    domain: companyDomain,
    ticker: "",
    cryptoSymbol: "",
    isin: "",
  });

  let companyMatchConfidence = 0.3;
  if (rawCompanyName && rawCompanyUrl) companyMatchConfidence = 0.95;
  else if (rawCompanyName && companyDomain) companyMatchConfidence = 0.85;
  else if (companyDomain && toolDomain && companyDomain === toolDomain) companyMatchConfidence = 0.72;
  else if (companyDomain) companyMatchConfidence = 0.6;

  return {
    id: buildStableId(tool, toolName, toolUrl, toolDomain, index),
    slug: firstNonEmpty(tool.slug, tool.handle, normalizeSlug(toolName)),

    tool_name: toolName,
    tool_url: toolUrl || domainToUrl(toolDomain),
    tool_domain: toolDomain,
    domain_source: inferDomainSource(rawToolUrl, toolDomain, explicitToolDomain),

    company_name: companyName,
    company_url: companyUrl || domainToUrl(companyDomain),
    company_domain: companyDomain,
    company_match_confidence: scoreConfidence(companyMatchConfidence),

    ticker: cleanString(ticker),
    crypto_symbol: cleanString(cryptoSymbol),
    isin: cleanString(isin),

    tool_logo: toolLogoSelection.primary.url,
    tool_logo_source: toolLogoSelection.primary.source,
    tool_logo_status: toolLogoSelection.primary.status,
    tool_logo_candidates: toolLogoSelection.candidates,

    company_logo: companyLogoSelection.primary.url,
    company_logo_source: companyLogoSelection.primary.source,
    company_logo_status: companyLogoSelection.primary.status,
    company_logo_candidates: companyLogoSelection.candidates,

    source_flags: {
      had_explicit_tool_logo: toBool(rawToolLogo),
      had_explicit_company_logo: toBool(rawCompanyLogo),
      had_explicit_company_name: toBool(rawCompanyName),
      had_explicit_company_url: toBool(rawCompanyUrl),
    },
  };
}

function scoreRecordQuality(record) {
  let score = 0;
  if (record.tool_name) score += 1;
  if (record.tool_url) score += 1;
  if (record.tool_domain) score += 1;
  if (record.tool_logo) score += 1;
  if (record.company_name) score += 1;
  if (record.company_url) score += 1;
  if (record.company_domain) score += 1;
  if (record.company_logo) score += 1;
  if (record.source_flags?.had_explicit_tool_logo) score += 1;
  if (record.source_flags?.had_explicit_company_name) score += 1;
  return score;
}

function dedupeRecords(records) {
  const map = new Map();

  for (const record of records) {
    const key =
      record.id ||
      record.slug ||
      record.tool_url ||
      record.tool_domain ||
      record.tool_name;

    const prev = map.get(key);
    if (!prev || scoreRecordQuality(record) > scoreRecordQuality(prev)) {
      map.set(key, record);
    }
  }

  return [...map.values()];
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      method: "GET",
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent": "ai-experts-corner-logos-v2/1.0",
        "accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function verifyOne(url) {
  if (!url) {
    return {
      ok: false,
      status: 0,
      contentType: "",
      finalUrl: "",
      reason: "empty_url",
    };
  }

  try {
    const res = await fetchWithTimeout(url, CONFIG.verifyTimeoutMs);
    const contentType = (res.headers.get("content-type") || "").toLowerCase();

    const looksLikeImage =
      contentType.startsWith("image/") ||
      contentType.includes("svg") ||
      contentType.includes("octet-stream");

    return {
      ok: res.ok && looksLikeImage,
      status: res.status,
      contentType,
      finalUrl: res.url,
      reason: res.ok
        ? (looksLikeImage ? "image_ok" : "not_image")
        : "bad_status",
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      contentType: "",
      finalUrl: "",
      reason: err?.name === "AbortError" ? "timeout" : (err?.message || "fetch_error"),
    };
  }
}

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const current = nextIndex++;
      if (current >= items.length) return;
      results[current] = await mapper(items[current], current);
    }
  }

  await Promise.all(
    Array.from({ length: Math.max(1, limit) }, () => worker())
  );

  return results;
}

function buildVerificationTarget(records) {
  if (CONFIG.verifyAll) return records;
  return records.slice(0, Math.min(CONFIG.verifySample, records.length));
}

async function runVerification(records) {
  const target = buildVerificationTarget(records);

  log(`Starting verification for ${target.length} records...`);

  const verified = await mapLimit(target, CONFIG.concurrency, async (record, index) => {
    if ((index + 1) % 100 === 0) {
      log(`Verified ${index + 1}/${target.length}`);
    }

    const [toolCheck, companyCheck] = await Promise.all([
      verifyOne(record.tool_logo),
      verifyOne(record.company_logo),
    ]);

    return {
      ...record,
      verification: {
        tool_logo_ok: toolCheck.ok,
        tool_logo_status: toolCheck.status,
        tool_logo_type: toolCheck.contentType,
        tool_logo_final_url: toolCheck.finalUrl,
        tool_logo_reason: toolCheck.reason,

        company_logo_ok: companyCheck.ok,
        company_logo_status: companyCheck.status,
        company_logo_type: companyCheck.contentType,
        company_logo_final_url: companyCheck.finalUrl,
        company_logo_reason: companyCheck.reason,
      },
    };
  });

  const summary = {
    checked_records: verified.length,
    tool_logo_ok: verified.filter(v => v.verification?.tool_logo_ok).length,
    company_logo_ok: verified.filter(v => v.verification?.company_logo_ok).length,
  };

  summary.tool_logo_fail = summary.checked_records - summary.tool_logo_ok;
  summary.company_logo_fail = summary.checked_records - summary.company_logo_ok;
  summary.tool_logo_success_rate = summary.checked_records
    ? Number(((summary.tool_logo_ok / summary.checked_records) * 100).toFixed(2))
    : 0;
  summary.company_logo_success_rate = summary.checked_records
    ? Number(((summary.company_logo_ok / summary.checked_records) * 100).toFixed(2))
    : 0;

  return { verified, summary };
}

function indexByStableKey(records) {
  const map = new Map();
  for (const r of records) {
    const key = r.id || r.slug || r.tool_url || r.tool_domain || r.tool_name;
    map.set(key, r);
  }
  return map;
}

function mergeVerification(records, verifiedRecords) {
  const verificationMap = new Map();
  for (const v of verifiedRecords) {
    const key = v.id || v.slug || v.tool_url || v.tool_domain || v.tool_name;
    verificationMap.set(key, v.verification);
  }

  for (const record of records) {
    const key = record.id || record.slug || record.tool_url || record.tool_domain || record.tool_name;
    if (verificationMap.has(key)) {
      record.verification = verificationMap.get(key);

      if (record.verification.tool_logo_ok) {
        record.tool_logo_status = "verified_ok";
      } else if (record.tool_logo) {
        record.tool_logo_status = "verified_fail";
      }

      if (record.verification.company_logo_ok) {
        record.company_logo_status = "verified_ok";
      } else if (record.company_logo) {
        record.company_logo_status = "verified_fail";
      }
    }
  }

  return records;
}

function splitOkAndMissing(records) {
  const ok = [];
  const missing = [];

  for (const record of records) {
    const toolOkay = Boolean(record.tool_logo);
    const companyOkay = Boolean(record.company_logo);

    if (toolOkay || companyOkay) ok.push(record);
    else missing.push(record);
  }

  return { ok, missing };
}

function buildMeta({
  inputPath,
  records,
  verificationSummary,
  startedAt,
}) {
  const durationSec = Number(((Date.now() - startedAt) / 1000).toFixed(2));

  return {
    generated_at: nowIso(),
    input: inputPath,
    output: CONFIG.output,
    provider_primary: CONFIG.provider,
    used_logo_dev_token: Boolean(CONFIG.logoDevToken),
    total_records: records.length,
    duration_sec: durationSec,
    settings: {
      verify_all: CONFIG.verifyAll,
      verify_sample: CONFIG.verifySample,
      concurrency: CONFIG.concurrency,
      batch_size: CONFIG.batchSize,
      incremental: CONFIG.incremental,
      force_rebuild: CONFIG.forceRebuild,
      prefer_existing_explicit_logos: CONFIG.preferExistingExplicitLogos,
      request_404_on_miss: CONFIG.request404OnMiss,
      logo_size: CONFIG.logoSize,
      logo_format: CONFIG.logoFormat,
      theme: CONFIG.theme,
    },
    verification_summary: verificationSummary || null,
  };
}

function buildStats(records) {
  return {
    total: records.length,
    with_tool_domain: records.filter(r => r.tool_domain).length,
    with_tool_logo: records.filter(r => r.tool_logo).length,
    with_company_domain: records.filter(r => r.company_domain).length,
    with_company_logo: records.filter(r => r.company_logo).length,

    explicit_tool_logo_count: records.filter(r => r.tool_logo_source === "explicit").length,
    explicit_company_logo_count: records.filter(r => r.company_logo_source === "explicit").length,

    logo_dev_domain_tool_count: records.filter(r => r.tool_logo_source === "logo_dev_domain").length,
    logo_dev_ticker_tool_count: records.filter(r => r.tool_logo_source === "logo_dev_ticker").length,
    logo_dev_crypto_tool_count: records.filter(r => r.tool_logo_source === "logo_dev_crypto").length,
    logo_dev_isin_tool_count: records.filter(r => r.tool_logo_source === "logo_dev_isin").length,

    clearbit_tool_fallback_count: records.filter(r => r.tool_logo_source === "clearbit_fallback").length,
    clearbit_company_fallback_count: records.filter(r => r.company_logo_source === "clearbit_fallback").length,

    verified_ok_tool_count: records.filter(r => r.tool_logo_status === "verified_ok").length,
    verified_fail_tool_count: records.filter(r => r.tool_logo_status === "verified_fail").length,
    verified_ok_company_count: records.filter(r => r.company_logo_status === "verified_ok").length,
    verified_fail_company_count: records.filter(r => r.company_logo_status === "verified_fail").length,
  };
}

async function loadPreviousOutputMap() {
  if (!CONFIG.incremental || CONFIG.forceRebuild) return new Map();

  const existing = await readJsonIfExists(CONFIG.output);
  if (!existing) return new Map();

  const items = Array.isArray(existing?.items) ? existing.items : [];
  log(`Incremental mode: loaded ${items.length} existing logo records`);

  return indexByStableKey(items);
}

function recordNeedsRebuild(previous, next) {
  if (!previous) return true;

  const prevSignature = JSON.stringify({
    tool_name: previous.tool_name,
    tool_url: previous.tool_url,
    tool_domain: previous.tool_domain,
    company_name: previous.company_name,
    company_url: previous.company_url,
    company_domain: previous.company_domain,
    ticker: previous.ticker,
    crypto_symbol: previous.crypto_symbol,
    isin: previous.isin,
    source_flags: previous.source_flags,
  });

  const nextSignature = JSON.stringify({
    tool_name: next.tool_name,
    tool_url: next.tool_url,
    tool_domain: next.tool_domain,
    company_name: next.company_name,
    company_url: next.company_url,
    company_domain: next.company_domain,
    ticker: next.ticker,
    crypto_symbol: next.crypto_symbol,
    isin: next.isin,
    source_flags: next.source_flags,
  });

  return prevSignature !== nextSignature;
}

async function main() {
  const startedAt = Date.now();

  if (!CONFIG.logoDevToken) {
    log("Warning: LOGO_DEV_TOKEN is empty. logo.dev URLs will not be generated.");
  }

  const { rel: inputPath, data } = await loadFirstAvailableJson();
  const rawRecords = toArrayFromUnknown(data);

  log(`Loaded raw records: ${rawRecords.length}`);

  const previousMap = await loadPreviousOutputMap();

  const normalized = [];
  let reusedCount = 0;
  let rebuiltCount = 0;

  for (let i = 0; i < rawRecords.length; i++) {
    const nextRecord = normalizeRecord(rawRecords[i], i);
    const key =
      nextRecord.id ||
      nextRecord.slug ||
      nextRecord.tool_url ||
      nextRecord.tool_domain ||
      nextRecord.tool_name;

    const prevRecord = previousMap.get(key);

    if (!CONFIG.forceRebuild && !recordNeedsRebuild(prevRecord, nextRecord)) {
      normalized.push(prevRecord);
      reusedCount++;
    } else {
      normalized.push(nextRecord);
      rebuiltCount++;
    }
  }

  log(`Normalized: ${normalized.length}`);
  log(`Reused existing: ${reusedCount}`);
  log(`Rebuilt: ${rebuiltCount}`);

  const deduped = dedupeRecords(normalized);
  log(`Deduped: ${deduped.length}`);

  // Optional chunk processing marker for big datasets
  const chunks = chunkArray(deduped, CONFIG.batchSize);
  log(`Chunk count: ${chunks.length} (batch size ${CONFIG.batchSize})`);

  let finalRecords = deduped;

  const { verified, summary: verificationSummary } = await runVerification(finalRecords);
  finalRecords = mergeVerification(finalRecords, verified);

  const { ok, missing } = splitOkAndMissing(finalRecords);

  const meta = buildMeta({
    inputPath,
    records: finalRecords,
    verificationSummary,
    startedAt,
  });

  const stats = buildStats(finalRecords);

  const fullPayload = {
    meta,
    stats,
    items: finalRecords,
  };

  const okPayload = {
    meta,
    stats: buildStats(ok),
    items: ok,
  };

  const missingPayload = {
    meta,
    stats: buildStats(missing),
    items: missing,
  };

  const reportPayload = {
    meta,
    verification_summary: verificationSummary,
    checked_items: verified,
  };

  await writeJson(CONFIG.output, fullPayload);
  await writeJson(CONFIG.okOutput, okPayload);
  await writeJson(CONFIG.missingOutput, missingPayload);
  await writeJson(CONFIG.reportOutput, reportPayload);

  log(`Wrote: ${CONFIG.output}`);
  log(`Wrote: ${CONFIG.okOutput}`);
  log(`Wrote: ${CONFIG.missingOutput}`);
  log(`Wrote: ${CONFIG.reportOutput}`);

  console.log("\n=== LOGOS V2 SUMMARY ===");
  console.log(JSON.stringify(meta, null, 2));

  console.log("\n=== LOGOS V2 STATS ===");
  console.log(JSON.stringify(stats, null, 2));

  console.log("\n=== VERIFICATION SUMMARY ===");
  console.log(JSON.stringify(verificationSummary, null, 2));
}

main().catch((err) => {
  console.error("\n[logos-v2] FAILED");
  console.error(err?.stack || err?.message || err);
  process.exit(1);
});