import type { APIRoute } from 'astro';
export const GET: APIRoute = () => new Response(
`User-agent: *
Allow: /
Disallow: /api/
Sitemap: https://aiexpertscorner.com/sitemap.xml
`, { headers: { 'Content-Type': 'text/plain' } });
