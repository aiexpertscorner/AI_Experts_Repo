# pack-pages.ps1
# Pakt alle Astro page templates
# Run: powershell -ExecutionPolicy Bypass -File pack-pages.ps1

$root = $PSScriptRoot
$out  = Join-Path $root "source-pack-pages.zip"

$files = @(
  "src\pages\index.astro",
  "src\pages\tools\index.astro",
  "src\pages\tools\[slug].astro",
  "src\pages\tools\category\[slug].astro",
  "src\pages\tools\pricing\[slug].astro",
  "src\pages\tools\industry\[slug].astro",
  "src\pages\tools\feature\[slug].astro",
  "src\pages\tools\tag\[slug].astro",
  "src\pages\tools\tool-type\[slug].astro",
  "src\pages\compare\index.astro",
  "src\pages\compare\[slug].astro",
  "src\pages\alternatives\index.astro",
  "src\pages\alternatives\[slug].astro",
  "src\pages\best\index.astro",
  "src\pages\best\[slug].astro",
  "src\pages\use-case\index.astro",
  "src\pages\use-case\[slug].astro",
  "src\pages\industry\index.astro",
  "src\pages\industry\[slug].astro",
  "src\pages\capability\index.astro",
  "src\pages\capability\[slug].astro",
  "src\pages\workflow\index.astro",
  "src\pages\workflow\[slug].astro",
  "src\pages\subcategory\index.astro",
  "src\pages\subcategory\[slug].astro",
  "src\pages\microcategory\index.astro",
  "src\pages\microcategory\[slug].astro",
  "src\pages\integration\index.astro",
  "src\pages\integration\[slug].astro",
  "src\pages\tag\index.astro",
  "src\pages\tag\[slug].astro",
  "src\pages\about\index.astro",
  "src\pages\contact\index.astro",
  "src\pages\privacy\index.astro",
  "src\pages\terms\index.astro",
  "src\pages\submit-tool\index.astro",
  "src\pages\sitemap.xml.ts",
  "src\pages\robots.txt.ts"
)

$existing = $files | Where-Object { Test-Path (Join-Path $root $_) }
$missing  = $files | Where-Object { -not (Test-Path (Join-Path $root $_)) }

if ($missing) {
  Write-Host "Niet gevonden (overgeslagen):"
  $missing | ForEach-Object { Write-Host "  - $_" }
}

if (Test-Path $out) { Remove-Item $out -Force }
Compress-Archive -Path ($existing | ForEach-Object { Join-Path $root $_ }) -DestinationPath $out -Force

Write-Host ""
Write-Host "Klaar: source-pack-pages.zip ($($existing.Count) files)"
Write-Host "Upload dit bestand naar Claude."
