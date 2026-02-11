# Move .md files into apps/<app>/docs (or repo docs/ for repo-wide).
# Creates docs folders as needed. Skips README.md in app root and repo root.
# Writes DOCS_MOVED.md at repo root.

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$moved = @()  # [ { From, To } ]

# ---- Root .md -> app mapping (filename -> app folder name under apps/)
$rootToApp = @{
    "ZAPIER_BOOKING_CONFIRMATION_ANSWERS.md" = "gulfcoastcharters"
    "ZAPIER_BOOKING_CONFIRMATION_SETUP_COMPLETE.md" = "gulfcoastcharters"
    "ZAPIER_BOOKINGS_TABLE_SCHEMA.md" = "gulfcoastcharters"
    "ZAPIER_FIELD_BY_FIELD_GUIDE.md" = "gulfcoastcharters"
    "ZAPIER_READY_TO_USE_SCHEMA.md" = "gulfcoastcharters"
    "ZAPIER_SCHEMA_RESPONSE.md" = "gulfcoastcharters"
    "ZAPIER_WEATHER_ALERT_SETUP.md" = "gulfcoastcharters"
    "SUPABASE_SCHEMA_FOR_ZAPIER.md" = "gulfcoastcharters"
    "WEATHER_ALERT_IMPLEMENTATION_COMPLETE.md" = "gulfcoastcharters"
    "WEATHER_ALERT_DEPLOYMENT.md" = "gulfcoastcharters"
    "WEATHER_ALERT_AUTOMATION_IMPLEMENTATION.md" = "gulfcoastcharters"
    "RUN_THIS_IN_SUPABASE.md" = "gulfcoastcharters"
    "TEST_PAYMENT_INSTRUCTIONS.md" = "gulfcoastcharters"
    "PASTE_TO_ZAPIER_AI.md" = "gulfcoastcharters"
    "AUDIT_GCC_AND_WHERETOVACATION.md" = "gulfcoastcharters"
    "PRAXIS_AND_MONITOR_MARKETING_PLAN.md" = "praxis"
    "PRAXIS_AND_MONITOR_ADS_AND_BANNERS.md" = "praxis"
    "PRAXIS_AND_MONITOR_READY_FOR_USERS.md" = "praxis"
    "TEST_PLAN_LAUNCHPAD_MONITOR_PRAXIS.md" = "praxis"
    "PRAXIS-AUDIT-EXTRACT.md" = "praxis"
    "PROGNO-PROGNOSTICATION-KALSHI-FOR-DUMMIES.md" = "progno"
    "LEAGUES_AND_KEYWORDS_MASTER_LIST.md" = "progno"
    "KALSHI_SANDBOX_ANALYSIS.md" = "alpha-hunter"
    "POLYMARKET_EXPLORE.md" = "alpha-hunter"
    "FORGE_COPY_GUIDE.md" = "forge"
    "FORGE_DISCOVERY_FEB8_2026.md" = "forge"
    "TV-IPTV-VIEWER-IDEA.md" = "IPTVviewer"
    "WHISPERWATCH_CALMCAST_RESEARCH.md" = "calmcast"
    "AUSPICIO_APP_CREATION_FLOW.md" = "forge"
    "FISHY_FILES_REFERENCE.md" = "cevict-ai"
    "CEVICT_AI_COMMERCIAL_PLAN.md" = "cevict-ai"
    "ADSENSE_VERIFICATION_SETUP.md" = "gulfcoastcharters"
    "API_INVESTIGATION_2026.md" = "cevict-ai"
    "DEPLOYMENT_SUCCESS.md" = "gulfcoastcharters"
    "ALL_5_FEATURES_COMPLETE_FEB8_2026.md" = "forge"
    "AUTONOMOUS_SESSION_COMPLETE_FEB8_2026.md" = "forge"
    "AUTONOMOUS_SESSION_FEB8_2026.md" = "forge"
    "AUTONOMOUS_EXPLORATION_SUGGESTIONS.md" = "cevict-ai"
    "AUTONOMOUS_SUGGESTIONS_AUDIT.md" = "cevict-ai"
    "NEW_MIGRATIONS_READY_TO_RUN.md" = "cevict-ai"
    "DEEP_EXPLORATION_SESSION_FEB7.md" = "cevict-ai"
    "DEEP_AUDIT_2026.md" = "cevict-ai"
    "DEEP_AUDIT_COMPLETE.md" = "cevict-ai"
    "AGENT_HANDOVER.md" = "cevict-ai"
    "AGENT_MEMORY_RESTORE.md" = "cevict-ai"
    "AGENT-BACKGROUND-AUTOMATION-IDEA.md" = "cevict-ai"
    "session_handover.md" = "cevict-ai"
    "EMPIRE_PORT_MAP.md" = "cevict-ai"
    "TODAY_WORK_LIST.md" = "cevict-ai"
    "WELCOME_BACK.md" = "cevict-ai"
    "CODE_SOURCES_AND_BACKUPS.md" = "cevict-ai"
    "DATABASE_RECOVERY_SUMMARY.md" = "cevict-ai"
    "ENV-KEYS-QUICK-REFERENCE.md" = "cevict-ai"
    "ENV-KEYS-SUPABASE-SECTION.md" = "cevict-ai"
    "MEMORY_REFRESH_README.md" = "cevict-ai"
    "CEVICT_EMPIRE_KNOWLEDGE.md" = "cevict-ai"
    "AUTOMATION_AI_ANALYSIS.md" = "cevict-ai"
    "AUTOMATION_AI_COMMAND.md" = "cevict-ai"
}

# Ensure repo-level docs for any root .md we don't assign to an app
$repoDocs = Join-Path $repoRoot "docs"
if (-not (Test-Path $repoDocs)) { New-Item -ItemType Directory -Path $repoDocs -Force | Out-Null }

# Create docs in each app that we'll use
$appsWithDocs = $rootToApp.Values | Select-Object -Unique
foreach ($a in $appsWithDocs) {
    $d = Join-Path (Join-Path (Join-Path $repoRoot "apps") $a) "docs"
    if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d -Force | Out-Null }
}

# 1) Move root .md (except README.md) to app/docs or repo docs
Get-ChildItem -Path $repoRoot -Filter "*.md" -File | ForEach-Object {
    $name = $_.Name
    if ($name -eq "README.md") { return }
    $from = $_.FullName
    $rel = $_.FullName.Replace("$repoRoot\", "")
    if ($rootToApp.ContainsKey($name)) {
        $app = $rootToApp[$name]
        $toDir = Join-Path (Join-Path (Join-Path $repoRoot "apps") $app) "docs"
        if (-not (Test-Path $toDir)) { New-Item -ItemType Directory -Path $toDir -Force | Out-Null }
        $to = Join-Path $toDir $name
        if (Test-Path $to) { Remove-Item $to -Force }
        Move-Item -Path $from -Destination $to -Force
        $moved += [pscustomobject]@{ From = $rel; To = "apps/$app/docs/$name" }
    } else {
        $to = Join-Path $repoDocs $name
        if (Test-Path $to) { Remove-Item $to -Force }
        Move-Item -Path $from -Destination $to -Force
        $moved += [pscustomobject]@{ From = $rel; To = "docs/$name" }
    }
}

# 2) Per-app: move all .md (except README.md in app root) into app/docs
$appsDir = Join-Path $repoRoot "apps"
Get-ChildItem -Path $appsDir -Directory | ForEach-Object {
    $appName = $_.Name
    $appPath = $_.FullName
    $docsPath = Join-Path $appPath "docs"
    if (-not (Test-Path $docsPath)) { New-Item -ItemType Directory -Path $docsPath -Force | Out-Null }

    $skipNames = @("daily_brief.md", "MOLTBOOK_CHECK_LATEST.md")  # Generated; keep in app root for 6h run / Cursor rule
    Get-ChildItem -Path $appPath -Filter "*.md" -Recurse -File | Where-Object {
        $_.FullName -notmatch "\\node_modules\\" -and
        $_.FullName -notmatch "\\.next\\" -and
        $_.FullName -notmatch "\\dist\\" -and
        $_.FullName -notmatch "\\docs\\" -and
        ($skipNames -notcontains $_.Name)
    } | ForEach-Object {
        $full = $_.FullName
        $relFromApp = $full.Replace("$appPath\", "")
        $dirRel = [System.IO.Path]::GetDirectoryName($relFromApp)
        $fileName = $_.Name
        # Skip README.md only at app root (apps/X/README.md)
        if ($dirRel -eq "" -and $fileName -eq "README.md") { return }

        $targetSubdir = $dirRel
        if ($targetSubdir -eq "") { $targetSubdir = "." }
        $targetDir = Join-Path $docsPath $targetSubdir
        if (-not (Test-Path $targetDir)) { New-Item -ItemType Directory -Path $targetDir -Force | Out-Null }
        $to = Join-Path $targetDir $fileName
        $relFromRepo = $full.Replace("$repoRoot\", "").Replace("\", "/")
        $toRel = "apps/$appName/docs/$relFromApp".Replace("\", "/")
        if ($full -ne $to -and (Test-Path $full)) {
            if (Test-Path $to) { Remove-Item $to -Force }
            Move-Item -Path $full -Destination $to -Force
            $moved += [pscustomobject]@{ From = $relFromRepo; To = $toRel }
        }
    }
}

# 3) Scripts: move scripts/*.md into repo docs/scripts (or leave; user said "app they go with" - scripts aren't an app, so put in repo docs)
$scriptsDir = Join-Path $repoRoot "scripts"
$scriptsDocs = Join-Path $repoDocs "scripts"
if (Test-Path $scriptsDir) {
    Get-ChildItem -Path $scriptsDir -Filter "*.md" -Recurse -File | ForEach-Object {
        $full = $_.FullName
        if ($full -match "\\keyvault\\") {
            $sub = "keyvault"
        } else {
            $sub = "."
        }
        $targetDir = Join-Path $scriptsDocs $sub
        if (-not (Test-Path $targetDir)) { New-Item -ItemType Directory -Path $targetDir -Force | Out-Null }
        $to = Join-Path $targetDir $_.Name
        $relFromRepo = $full.Replace("$repoRoot\", "").Replace("\", "/")
        $toRel = "docs/scripts/$sub/$($_.Name)".Replace("/./", "/")
        if ($full -ne $to -and (Test-Path $full)) {
            if (Test-Path $to) { Remove-Item $to -Force }
            Move-Item -Path $full -Destination $to -Force
            $moved += [pscustomobject]@{ From = $relFromRepo; To = $toRel }
        }
    }
}

# 4) Write DOCS_MOVED.md at repo root
$mdPath = Join-Path $repoRoot "DOCS_MOVED.md"
$sb = [System.Text.StringBuilder]::new()
[void]$sb.AppendLine("# Documentation move manifest")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("All `.md` files were moved into the `docs` folder of the app they belong to (or into repo `docs/` for repo-wide docs). App root `README.md` files were left in place.")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("| From | To |")
[void]$sb.AppendLine("|------|-----|")
foreach ($m in $moved) {
    [void]$sb.AppendLine("| $($m.From) | $($m.To) |")
}
[void]$sb.AppendLine("")
[void]$sb.AppendLine("Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
Set-Content -Path $mdPath -Value $sb.ToString() -Encoding UTF8
Write-Host "Moved $($moved.Count) files. Manifest: $mdPath"
$moved.Count
