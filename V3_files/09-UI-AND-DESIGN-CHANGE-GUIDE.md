# UI and Design Change Guide

If you want to change design / UI / UX later without touching pipelines:

## Change only these areas
- src/components/ui/
- src/components/layout/
- src/components/cards/
- src/components/sections/
- src/styles/base/
- src/styles/layout/
- src/styles/components/
- src/styles/pages/

## Usually do NOT change for pure design work
- scripts/*
- src/data/enriched/*
- src/data/build/*
- taxonomy files
- lib logic unless structure really changes

## Practical workflow
1. Keep datasets stable
2. Change component markup if needed
3. Change component CSS
4. Change page CSS only for page layout changes
5. Rebuild and inspect visually
