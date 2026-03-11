# AI Experts Corner — First-time setup
# Run from E:\2026_AI_EXPERT\

Write-Host "Setting up AI Experts Corner..." -ForegroundColor Cyan

# Install dependencies
npm install

# Create build output directory
New-Item -ItemType Directory -Force -Path "src/data/build" | Out-Null

Write-Host ""
Write-Host "Done! Next steps:" -ForegroundColor Green
Write-Host "  1. Run datasets:  npm run datasets"
Write-Host "  2. Start dev:     npm run dev"
Write-Host "  3. Full pipeline: npm run pipeline"
