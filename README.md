# AIExpertsCorner.com

AI tools directory — 19,000+ tools, Astro.js 4, Cloudflare Pages. Aaa 2803 0924 

## Quick Start

```powershell
npm install
npm run datasets    # Generate all JSON datasets from tools_production.json
npm run dev         # Start dev server at localhost:4321
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run datasets` | Rebuild all JSON datasets |
| `npm run enrich` | Re-enrich tools (skip HTTP) |
| `npm run pipeline` | Enrich → datasets → ready to build |

## Data Files

- `src/data/tools_production.json` — enriched tool data (19k+ tools)
- `src/data/build/` — generated JSON (gitignored)
- `public/logos/` — brand logos

## Structure

```
src/
  pages/          Astro routes
  components/     Site, cards, sections
  layouts/        BaseLayout
  styles/         CSS design system
  data/           Config + build output
scripts/
  enrich-tools-v6.mjs       Tool enrichment
  build-seo-datasets.mjs    Dataset generation (v3)
```
