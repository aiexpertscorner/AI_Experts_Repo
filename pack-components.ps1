# pack-components.ps1
# Pakt alle component en style files in een zip
# Run: powershell -ExecutionPolicy Bypass -File pack-components.ps1

$root = $PSScriptRoot
$out  = Join-Path $root "source-pack-components.zip"

$files = @(
  "src\components\cards\ToolCard.astro",
  "src\components\cards\ToolRow.astro",
  "src\components\cards\CategoryCard.astro",
  "src\components\cards\TopicCard.astro",
  "src\components\cards\AuthorityToolCard.astro",
  "src\components\ui\ToolLogo.astro",
  "src\components\ui\Badge.astro",
  "src\components\ui\Breadcrumb.astro",
  "src\components\ui\SectionHeader.astro",
  "src\components\ui\EmptyState.astro",
  "src\components\site\Header.astro",
  "src\components\site\Footer.astro",
  "src\components\sections\FlagshipToolsSection.astro",
  "src\components\sections\FeaturedToolsSection.astro",
  "src\components\sections\FeaturedToolsRail.astro",
  "src\components\sections\BestOfSection.astro",
  "src\components\sections\HubNavSection.astro",
  "src\layouts\BaseLayout.astro"
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
Write-Host "Klaar: source-pack-components.zip ($($existing.Count) files)"
Write-Host "Upload dit bestand naar Claude."
