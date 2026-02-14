# Post-commit hook: send commit info to Cochran AI so "why" is linked to "what".
# Install: in each repo run:
#   echo "powershell -File C:\cevict-live\scripts\local-agent-git-post-commit.ps1" > .git/hooks/post-commit
#   icacls .git/hooks/post-commit /grant Everyone:RX
# Requires: Cochran AI running on port 3847 (apps/local-agent).

$ErrorActionPreference = 'Stop'
$port = if ($env:LOCAL_AGENT_PORT) { $env:LOCAL_AGENT_PORT } else { '3847' }
$base = "http://localhost:$port"

# Git sets GIT_DIR and we're in repo root when hook runs
$commitHash = git rev-parse HEAD 2>$null
$commitMsg = git log -1 --pretty=%B 2>$null
$repoRoot = git rev-parse --show-toplevel 2>$null

if (-not $commitHash -or -not $commitMsg) { exit 0 }

$body = @{
  id          = "git_${commitHash.Substring(0, 12)}_$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())"
  startedAt   = (Get-Date).ToUniversalTime().ToString('o')
  endedAt     = (Get-Date).ToUniversalTime().ToString('o')
  type        = 'git'
  summary     = $commitMsg
  gitCommitHash = $commitHash
  gitCommitMessage = $commitMsg
  userQuery   = "git commit: $($commitMsg.Split([Environment]::NewLine)[0])"
  actions     = @()
  phase       = 'feature'
  tags        = @('git', 'commit')
} | ConvertTo-Json -Compress

try {
  Invoke-RestMethod -Uri "$base/session" -Method Post -Body $body -ContentType 'application/json' -TimeoutSec 3
} catch {
  # Agent may be stopped; don't fail the commit
  Write-Warning "Cochran AI (port $port) not reachable: $_"
}
exit 0
