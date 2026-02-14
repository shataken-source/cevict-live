# Start Cochran AI (Cochran Bot) - use this for Task Scheduler or Startup folder
Set-Location $PSScriptRoot
if (-not $env:LOCAL_AGENT_DATA) {
  $env:LOCAL_AGENT_DATA = "C:\Cevict_Vault\local-agent"
}
if (-not (Test-Path "dist\index.js")) {
  Write-Host "Run pnpm build first."
  exit 1
}
node dist/index.js
