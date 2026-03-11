import type { APIRoute } from 'astro';
import toolPaths from '@/data/build/tool-paths.json';
import categoryPaths from '@/data/build/category-paths.json';
import comparePairs from '@/data/build/compare-pairs.json';

export const GET: APIRoute = () => {
  const base = 'https://aiexpertscorner.com';
  const urls: { loc: string; priority: string; changefreq: string }[] = [
    { loc: base, priority: '1.0', changefreq: 'daily' },
    { loc: `${base}/ai-tools`, priority: '0.9', changefreq: 'daily' },
    { loc: `${base}/vs`, priority: '0.7', changefreq: 'weekly' },
    { loc: `${base}/best`, priority: '0.7', changefreq: 'weekly' },
  ];
  (categoryPaths as string[]).filter(Boolean).forEach(s => urls.push({ loc: `${base}/ai-tools/category/${s}`, priority: '0.8', changefreq: 'weekly' }));
  (toolPaths as string[]).filter(Boolean).slice(0, 50000).forEach(s => urls.push({ loc: `${base}/ai-tools/${s}`, priority: '0.6', changefreq: 'monthly' }));
  (comparePairs as any[]).forEach(p => urls.push({ loc: `${base}/vs/${p.slug}`, priority: '0.5', changefreq: 'monthly' }));

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u.loc}</loc><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>`;

  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
};
