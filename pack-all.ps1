# pack-all.ps1
# Pakt ALLES behalve grote data files en node_modules
# Run: powershell -ExecutionPolicy Bypass -File pack-all.ps1
# Tip: gebruik dit als je een volledig overzicht wilt geven

$root    = $PSScriptRoot
$out     = Join-Path $root "source-pack-all.zip"
$exclude = @(
  "node_modules", "dist", ".astro", ".git",
  "src\data\build"   # grote JSON bestanden overslaan
)

function Get-SourceFiles($dir) {
  Get-ChildItem -Path $dir -Recurse -File |
    Where-Object {
      $rel = $_.FullName.Substring($root.Length + 1)
      $skip = $false
      foreach ($ex in $exclude) {
        if ($rel.StartsWith($ex)) { $skip = $true; break }
      }
      -not $skip
    } |
    Where-Object { $_.Extension -in @(".astro",".ts",".mjs",".js",".css",".json",".txt",".md",".ps1",".xml") }
}

$allFiles = Get-SourceFiles $root

if (Test-Path $out) { Remove-Item $out -Force }
$allFiles | ForEach-Object { $_.FullName } |
  Compress-Archive -DestinationPath $out -Force

Write-Host ""
Write-Host "Klaar: source-pack-all.zip ($($allFiles.Count) files)"
Write-Host "Upload dit bestand naar Claude."
