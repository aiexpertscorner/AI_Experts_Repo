// src/pages/sitemap.xml.ts
import type { APIRoute } from "astro";

import toolPathsRaw   from "@/data/build/tool-paths.json";
import comparePairs   from "@/data/build/compare-pairs.json";
import bestPagesRaw   from "@/data/build/page-payloads/best-pages.json";
import bestClusterRaw from "@/data/build/page-payloads/best-cluster-pages.json";
import altPagesRaw    from "@/data/build/page-payloads/alternatives-pages.json";
import useCaseRaw     from "@/data/build/page-payloads/use-case-cluster-pages.json";
import subcatRaw      from "@/data/build/page-payloads/subcategory-pages.json";
import capabilityRaw  from "@/data/build/page-payloads/capability-pages.json";
import industryRaw    from "@/data/build/page-payloads/industry-pages.json";
import workflowRaw    from "@/data/build/page-payloads/workflow-pages-rich.json";
import integrationRaw from "@/data/build/page-payloads/integration-pages.json";
import tagPagesRaw    from "@/data/build/page-payloads/tag-pages.json";
import microcatRaw    from "@/data/build/page-payloads/microcategory-pages.json";

const BASE = "https://aiexpertscorner.com";
const NOW = new Date().toISOString().split("T")[0];

function u(loc: string, priority = "0.5", changefreq = "weekly") {
  return `  <url><loc>${BASE}${loc}</loc><lastmod>${NOW}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
}

function slugs(arr: any[]): string[] {
  return (arr as any[])
    .map((p: any) => p?.slug || p?.primary || (p?.route || "").split("/").pop())
    .filter(Boolean);
}

export const GET: APIRoute = () => {
  const urls: string[] = [];

  // Static pages
  urls.push(u("/", "1.0", "daily"));
  urls.push(u("/tools", "0.9", "daily"));
  urls.push(u("/compare", "0.8", "weekly"));
  urls.push(u("/alternatives", "0.8", "weekly"));
  urls.push(u("/best", "0.8", "weekly"));
  urls.push(u("/use-case", "0.8", "weekly"));
  urls.push(u("/subcategory", "0.7", "weekly"));
  urls.push(u("/capability", "0.7", "weekly"));
  urls.push(u("/industry", "0.7", "weekly"));
  urls.push(u("/workflow", "0.7", "weekly"));
  urls.push(u("/integration", "0.6", "weekly"));
  urls.push(u("/tag", "0.6", "weekly"));
  urls.push(u("/submit-tool", "0.4", "monthly"));

  // Tool pages
  for (const t of toolPathsRaw as any[]) {
    const s = t?.slug || t?.handle || t;
    if (s) urls.push(u(`/tools/${s}`, "0.8", "weekly"));
  }

  // Compare pages
  for (const p of comparePairs as any[]) {
    const a = p?.tool_a || p?.a;
    const b = p?.tool_b || p?.b;
    if (a && b) {
      const [sa, sb] = [a, b].sort();
      urls.push(u(`/compare/${sa}-vs-${sb}`, "0.7", "weekly"));
    }
  }

  // Alternatives
  for (const s of slugs(altPagesRaw as any[])) {
    urls.push(u(`/alternatives/${s}`, "0.7", "weekly"));
  }

  // Best-of
  for (const s of slugs(bestPagesRaw as any[])) {
    urls.push(u(`/best/${s}`, "0.7", "weekly"));
  }
  for (const s of slugs(bestClusterRaw as any[])) {
    urls.push(u(`/best/${s}`, "0.6", "weekly"));
  }

  // Use-case
  for (const s of slugs(useCaseRaw as any[])) {
    urls.push(u(`/use-case/${s}`, "0.7", "weekly"));
  }

  // Taxonomy
  for (const s of slugs(subcatRaw as any[])) {
    urls.push(u(`/subcategory/${s}`, "0.6", "weekly"));
  }
  for (const s of slugs(capabilityRaw as any[])) {
    urls.push(u(`/capability/${s}`, "0.6", "weekly"));
  }
  for (const s of slugs(industryRaw as any[])) {
    urls.push(u(`/industry/${s}`, "0.7", "weekly"));
  }
  for (const s of slugs(workflowRaw as any[])) {
    urls.push(u(`/workflow/${s}`, "0.7", "weekly"));
  }
  for (const s of slugs(integrationRaw as any[])) {
    urls.push(u(`/integration/${s}`, "0.6", "weekly"));
  }
  for (const s of slugs(tagPagesRaw as any[])) {
    urls.push(u(`/tag/${s}`, "0.5", "weekly"));
  }
  for (const s of slugs(microcatRaw as any[])) {
    urls.push(u(`/microcategory/${s}`, "0.5", "weekly"));
  }

  // Deduplicate
  const seen = new Set<string>();
  const deduped = urls.filter((entry) => {
    const loc = entry.match(/<loc>([^<]+)<\/loc>/)?.[1] || "";
    if (seen.has(loc)) return false;
    seen.add(loc);
    return true;
  });

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${deduped.join("\n")}
</urlset>`;

  return new Response(body, {
    headers: { "Content-Type": "application/xml" },
  });
};