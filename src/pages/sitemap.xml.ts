// src/pages/sitemap.xml.ts
// Gefaseerde sitemap — prioriteit op hoogwaardige pages
// Cloudflare bouwt dit als statisch bestand

import type { APIRoute } from "astro";
import toolSlugs    from "@/data/build/tool-slugs.json";
import comparePaths from "@/data/build/compare-paths.json";
import catPaths     from "@/data/build/category-paths.json";
import bestPaths    from "@/data/build/best-paths.json";
import altPaths     from "@/data/build/alt-paths.json";
import industryP    from "@/data/build/industry-paths.json";
import featureP     from "@/data/build/feature-paths.json";
import tagP         from "@/data/build/tag-paths.json";

const BASE = "https://www.aiexpertscorner.com";
const NOW  = new Date().toISOString().slice(0, 10);

function url(loc: string, priority: number, freq: string) {
  return `  <url>
    <loc>${BASE}${loc}</loc>
    <lastmod>${NOW}</lastmod>
    <changefreq>${freq}</changefreq>
    <priority>${priority.toFixed(1)}</priority>
  </url>`;
}

export const GET: APIRoute = () => {
  const urls: string[] = [];

  // ── FASE 1: Statische high-value pages ──────────────────────
  urls.push(url("/",              1.0, "daily"));
  urls.push(url("/tools",         0.9, "daily"));
  urls.push(url("/compare",       0.9, "daily"));
  urls.push(url("/best",          0.9, "daily"));
  urls.push(url("/alternatives",  0.9, "daily"));
  urls.push(url("/use-case",      0.8, "weekly"));
  urls.push(url("/industry",      0.8, "weekly"));
  urls.push(url("/about",         0.5, "monthly"));
  urls.push(url("/contact",       0.5, "monthly"));
  urls.push(url("/privacy",       0.4, "monthly"));
  urls.push(url("/terms",         0.4, "monthly"));
  urls.push(url("/submit-tool",   0.6, "monthly"));

  // ── FASE 1: Categories (23 pages, hoge prioriteit) ──────────
  for (const slug of catPaths as string[]) {
    urls.push(url(`/tools/category/${slug}`, 0.85, "weekly"));
  }

  // ── FASE 2: Best-of pages (hoog commercieel intent) ─────────
  for (const slug of bestPaths as string[]) {
    urls.push(url(`/best/${slug}`, 0.75, "weekly"));
  }

  // ── FASE 2: Industry + Feature dimension pages ───────────────
  for (const slug of industryP as string[]) {
    urls.push(url(`/tools/industry/${slug}`, 0.65, "weekly"));
    urls.push(url(`/industry/${slug}`,       0.65, "weekly"));
  }
  for (const slug of featureP as string[]) {
    urls.push(url(`/tools/feature/${slug}`, 0.60, "weekly"));
  }

  // ── FASE 3: Top 5000 tool pages (display_score volgorde) ─────
  // Tool-slugs zijn al gesorteerd op display_score
  for (const slug of (toolSlugs as string[]).slice(0, 5000)) {
    urls.push(url(`/tools/${slug}`, 0.70, "monthly"));
  }
  // Daarna rest met lagere prioriteit
  for (const slug of (toolSlugs as string[]).slice(5000)) {
    urls.push(url(`/tools/${slug}`, 0.50, "monthly"));
  }

  // ── FASE 3: Compare pages (top 2000) ────────────────────────
  for (const slug of (comparePaths as string[]).slice(0, 2000)) {
    urls.push(url(`/compare/${slug}`, 0.60, "monthly"));
  }
  for (const slug of (comparePaths as string[]).slice(2000)) {
    urls.push(url(`/compare/${slug}`, 0.45, "monthly"));
  }

  // ── FASE 4: Alternatives pages ───────────────────────────────
  for (const slug of altPaths as string[]) {
    urls.push(url(`/alternatives/${slug}`, 0.60, "monthly"));
  }

  // ── FASE 4: Tag pages ────────────────────────────────────────
  for (const slug of tagP as string[]) {
    urls.push(url(`/tools/tag/${slug}`, 0.55, "weekly"));
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml" },
  });
};