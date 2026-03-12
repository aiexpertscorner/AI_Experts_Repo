# Cloudflare Pages — Build Configuration Guide
**AIExpertsCorner.com · Updated March 2026**

---

## Build Command (Cloudflare Dashboard → Settings → Builds)

```
node --max-old-space-size=3072 node_modules/.bin/astro build
```

> **Waarom:** Astro's static build houdt alle gegenereerde pagina's tijdelijk in V8-geheugen.
> Met 10.000+ tool-pagina's is 512MB (de default) onvoldoende. 3 GB lost dit op.

---

## Environment Variables (Cloudflare Dashboard → Settings → Environment Variables)

Voeg deze toe onder **Production** (en optioneel Preview):

| Variable              | Production value | Preview value | Uitleg |
|-----------------------|-----------------|---------------|--------|
| `TOOL_PAGE_LIMIT`     | `10000`         | `1000`        | Hoeveel tool-detailpagina's worden gegenereerd |
| `COMPARE_PAGE_LIMIT`  | `5000`          | `500`         | Hoeveel VS-vergelijkingspagina's |
| `ALT_PAGE_LIMIT`      | `10000`         | `1000`        | Hoeveel alternatieven-pagina's |
| `NODE_OPTIONS`        | `--max-old-space-size=3072` | `--max-old-space-size=1024` | Node.js heap size |

> **Opschalen naar 15.000+ tool-pagina's:** verander `TOOL_PAGE_LIMIT` naar `15000`.
> Boven 15.000 is een Cloudflare Pro/Business plan aanbevolen (meer build-resources).

---

## Framework Preset

Stel in als: **Astro**

Cloudflare detecteert dit automatisch als het project correct is opgezet.

---

## Build & Deploy Settings

```
Framework preset:     Astro
Build command:        node --max-old-space-size=3072 node_modules/.bin/astro build
Build output dir:     dist
Root directory:       /  (leeg laten)
Node.js version:      20.x (LTS)
```

---

## Geheugengebruik schatting per TOOL_PAGE_LIMIT

| TOOL_PAGE_LIMIT | tool-page-data.json | Astro build memory | Geschatte buildtijd |
|----------------|--------------------|--------------------|---------------------|
| 3,000          | ~3 MB              | ~200 MB            | ~2 min |
| 5,000          | ~5 MB              | ~280 MB            | ~3 min |
| 10,000         | ~10 MB             | ~450 MB            | ~6 min |
| 15,000         | ~15 MB             | ~650 MB            | ~9 min |
| 19,088 (full)  | ~19 MB             | ~800 MB            | ~12 min |

> Cloudflare free tier heeft een build-timeout van 20 minuten.
> 19,088 past comfortabel binnen die limiet als NODE_OPTIONS correct staat.

---

## Lokaal builden met verhoogde limiet

```powershell
# Windows PowerShell — medium build (10k tools)
$env:TOOL_PAGE_LIMIT="10000"; $env:COMPARE_PAGE_LIMIT="5000"; npm run datasets
npm run build

# Of via shortcut scripts:
npm run datasets:medium    # datasets met 10k limiet
npm run datasets:full      # datasets met alle 19k tools
npm run pipeline:medium    # inject + datasets:medium + authority
npm run pipeline:full      # inject + datasets:full + authority
```

```bash
# macOS / Linux / WSL — full build
npm run datasets:full
npm run build
```

---

## Sitemap

De sitemap bevat ALLE tool-handles (zelfs als de pagina niet gegenereerd is via TOOL_PAGE_LIMIT).
Dit geeft Google een indexeringssignaal voor alle tools, ook al zijn de pagina's nog niet live.

URL: `https://aiexpertscorner.com/sitemap.xml`
Registreer in Google Search Console.

---

## Stapsgewijs opschalen (aanbevolen plan)

1. **Nu:** TOOL_PAGE_LIMIT=5000 (veilig, snelle build, test alles)
2. **Week 2:** TOOL_PAGE_LIMIT=10000 (dubbele coverage)
3. **Week 4:** TOOL_PAGE_LIMIT=15000 (als builds stabiel zijn)
4. **Later:** TOOL_PAGE_LIMIT=19088 (volledig zodra resources het toestaan)
