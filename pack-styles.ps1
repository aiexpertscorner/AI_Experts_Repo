# pack-styles.ps1
# Pakt alle CSS/style files
# Run: powershell -ExecutionPolicy Bypass -File pack-styles.ps1

$root = $PSScriptRoot
$out  = Join-Path $root "source-pack-styles.zip"

$files = @(
  "src\styles\tokens.css",
  "src\styles\base.css",
  "src\styles\layout.css",
  "src\styles\components.css",
  "src\styles\home.css",
  "src\styles\pages.css",
  "src\styles\taxonomy.css",
  "src\styles\tool-detail.css",
  "src\styles\hub-listings.css",
  "src\styles\dimension-page.css",
  "src\styles\tools-index.css",
  "src\styles\trust-pages.css",
  "src\styles\hub.css",
  "src\styles\insights.css"
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
Write-Host "Klaar: source-pack-styles.zip ($($existing.Count) files)"
Write-Host "Upload dit bestand naar Claude."
