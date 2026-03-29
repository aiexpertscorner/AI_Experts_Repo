# pack-config.ps1
# Pakt config en data files (geen grote JSON build files)
# Run: powershell -ExecutionPolicy Bypass -File pack-config.ps1

$root = $PSScriptRoot
$out  = Join-Path $root "source-pack-config.zip"

$files = @(
  "astro.config.mjs",
  "package.json",
  "tsconfig.json",
  "tailwind.config.mjs",
  ".gitignore",
  ".env.example",
  "public\_redirects",
  "public\site.webmanifest",
  "src\data\homeConfig.ts",
  "src\data\insightsConfig.ts",
  "src\data\categoryIcons.ts"
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
Write-Host "Klaar: source-pack-config.zip ($($existing.Count) files)"
Write-Host "Upload dit bestand naar Claude."
