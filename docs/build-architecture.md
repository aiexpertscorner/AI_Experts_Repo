Core source layer

src/data/tools_source.json

src/data/tools_production.json

Enrichment

scripts/enrich-tools-v6.mjs

Authority layer

scripts/build-authority-datasets.mjs

outputs:

global-top100.json

category-top10.json

authority-tool-map.json

tool-map.json

SEO dataset layer

scripts/build-seo-datasets.mjs

outputs:

tool-page-data.json

category-map.json

category-paths.json

compare-page-data.json

etc.

Render layer

Astro pages reading build JSON