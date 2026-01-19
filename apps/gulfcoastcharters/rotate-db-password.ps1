# Supabase Database Password Rotation Assistant
# Project: rdbuwyefbgnbuhmjrizo
# Purpose: Semi-automated password rotation with safety checks

param(
    [Parameter(Mandatory=$false)]
    [string]$NewPassword,
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBackup
)

$ErrorActionPreference = "Stop"
$RepoPath = "c:\gcc\cevict-app\cevict-monorepo"

# Colors for output
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Write-Header {
    param([string]$Title)
    Write-Host ""
    Write-ColorOutput ("=" * 70) "Cyan"
    Write-ColorOutput " $Title" "Yellow"
    Write-ColorOutput ("=" * 70) "Cyan"
}

function Write-Step {
    param([string]$Step)
    Write-ColorOutput "`n▶ $Step" "Green"
}

function Write-Success {
    param([string]$Message)
    Write-ColorOutput "  ✓ $Message" "Green"
}

function Write-Warning {
    param([string]$Message)
    Write-ColorOutput "  ⚠ $Message" "Yellow"
}

function Write-Error-Custom {
    param([string]$Message)
    Write-ColorOutput "  ✗ $Message" "Red"
}

# Check if we're in the correct directory
if (-not (Test-Path $RepoPath)) {
    Write-Error-Custom "Repository not found at: $RepoPath"
    Write-ColorOutput "Please update the `$RepoPath variable in this script." "Yellow"
    exit 1
}

Set-Location $RepoPath

Write-Header "🔐 SUPABASE DATABASE PASSWORD ROTATION ASSISTANT"
Write-ColorOutput "Project: rdbuwyefbgnbuhmjrizo" "Cyan"
Write-ColorOutput "Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" "Cyan"

if ($DryRun) {
    Write-Warning "DRY RUN MODE - No changes will be made"
}

# Step 1: Inventory Check
Write-Header "STEP 1: INVENTORY CHECK"
Write-Step "Scanning for database connection strings..."

$EnvFiles = Get-ChildItem -Path . -Recurse -Filter ".env*" -File | Where-Object {
    $_.FullName -notmatch "node_modules|\.next|dist|build|\.git" -and
    $_.Name -notmatch "\.backup$"
}

Write-Success "Found $($EnvFiles.Count) environment files:"
foreach ($File in $EnvFiles) {
    $RelativePath = $File.FullName.Replace($RepoPath, "").TrimStart("\")
    Write-ColorOutput "    - $RelativePath" "Gray"
}

# Check for database connection strings in env files
Write-Step "Checking for existing database connections..."

$ConnectionsFound = @()
foreach ($File in $EnvFiles) {
    $Content = Get-Content $File.FullName -Raw -ErrorAction SilentlyContinue
    if ($Content -match "(DATABASE_URL|SUPABASE_DB_URL|DIRECT_URL|POSTGRES_URL)\s*=\s*[`"']?postgresql") {
        $ConnectionsFound += [PSCustomObject]@{
            File = $File.FullName.Replace($RepoPath, "").TrimStart("\")
            FullPath = $File.FullName
        }
    }
}

if ($ConnectionsFound.Count -eq 0) {
    Write-Warning "No database connection strings found in .env files"
    Write-ColorOutput "  This might be normal if connections are configured elsewhere" "Gray"
} else {
    Write-Success "Found database connections in $($ConnectionsFound.Count) file(s):"
    foreach ($Conn in $ConnectionsFound) {
        Write-ColorOutput "    - $($Conn.File)" "Gray"
    }
}

# Step 2: Backup
if (-not $SkipBackup) {
    Write-Header "STEP 2: BACKUP ENVIRONMENT FILES"
    Write-Step "Creating backups..."
    
    $BackupCount = 0
    foreach ($File in $EnvFiles) {
        $BackupPath = "$($File.FullName).backup"
        if (-not $DryRun) {
            Copy-Item $File.FullName -Destination $BackupPath -Force
            $BackupCount++
        }
        Write-Success "Backed up: $($File.Name)"
    }
    
    if (-not $DryRun) {
        Write-Success "Created $BackupCount backup files"
    }
} else {
    Write-Warning "Skipping backup (--SkipBackup flag used)"
}

# Step 3: Connection String Format
Write-Header "STEP 3: CONNECTION STRING FORMAT"
Write-ColorOutput @"

Recommended Connection String (Transaction Pooler):
  postgresql://postgres.rdbuwyefbgnbuhmjrizo:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres

Key Points:
  ✓ Uses Transaction Pooler (port 6543)
  ✓ IPv4 compatible
  ✓ Best for serverless/short-lived connections
  ✓ Username: postgres.rdbuwyefbgnbuhmjrizo

"@ "White"

# Step 4: Password Input
Write-Header "STEP 4: NEW PASSWORD"

if (-not $NewPassword) {
    Write-ColorOutput "To rotate the password:" "Yellow"
    Write-ColorOutput "  1. Go to: https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo/settings/database" "White"
    Write-ColorOutput "  2. Click 'Reset database password'" "White"
    Write-ColorOutput "  3. Copy the new password" "White"
    Write-ColorOutput "  4. Run this script with: -NewPassword 'your-new-password'" "White"
    Write-Host ""
    
    $NewPassword = Read-Host "Enter new password (or press Enter to exit)"
    if ([string]::IsNullOrWhiteSpace($NewPassword)) {
        Write-ColorOutput "`nExiting without changes." "Yellow"
        exit 0
    }
}

# URL encode special characters in password
function Get-UrlEncodedPassword {
    param([string]$Password)
    
    $SpecialChars = @{
        '@' = '%40'
        '!' = '%21'
        '#' = '%23'
        '$' = '%24'
        '%' = '%25'
        '^' = '%5E'
        '&' = '%26'
        '*' = '%2A'
        '(' = '%28'
        ')' = '%29'
        '=' = '%3D'
        '+' = '%2B'
        ' ' = '%20'
    }
    
    $EncodedPassword = $Password
    foreach ($Char in $SpecialChars.Keys) {
        if ($Password.Contains($Char)) {
            $EncodedPassword = $EncodedPassword.Replace($Char, $SpecialChars[$Char])
            Write-Warning "Password contains '$Char' - URL encoded to $($SpecialChars[$Char])"
        }
    }
    
    return $EncodedPassword
}

$EncodedPassword = Get-UrlEncodedPassword -Password $NewPassword
$NewConnectionString = "postgresql://postgres.rdbuwyefbgnbuhmjrizo:$EncodedPassword@aws-0-us-west-1.pooler.supabase.com:6543/postgres"

Write-Success "New connection string prepared"

# Step 5: Update Environment Files
Write-Header "STEP 5: UPDATE ENVIRONMENT FILES"

if ($ConnectionsFound.Count -eq 0) {
    Write-Warning "No .env files with database connections found"
    Write-ColorOutput "You may need to manually create/update:" "Yellow"
    Write-ColorOutput "  - .env.local" "Gray"
    Write-ColorOutput "  - apps/gateway/.env.local" "Gray"
} else {
    Write-Step "Updating connection strings in environment files..."
    
    foreach ($Conn in $ConnectionsFound) {
        $Content = Get-Content $Conn.FullPath -Raw
        $Updated = $false
        
        # Update DATABASE_URL
        if ($Content -match "DATABASE_URL\s*=\s*[`"']?postgresql[^`"`'\r\n]*[`"']?") {
            $Content = $Content -replace "(DATABASE_URL\s*=\s*)[`"']?postgresql[^`"`'\r\n]*[`"']?", "`$1`"$NewConnectionString`""
            $Updated = $true
            Write-Success "Updated DATABASE_URL in $($Conn.File)"
        }
        
        # Update SUPABASE_DB_URL
        if ($Content -match "SUPABASE_DB_URL\s*=\s*[`"']?postgresql[^`"`'\r\n]*[`"']?") {
            $Content = $Content -replace "(SUPABASE_DB_URL\s*=\s*)[`"']?postgresql[^`"`'\r\n]*[`"']?", "`$1`"$NewConnectionString`""
            $Updated = $true
            Write-Success "Updated SUPABASE_DB_URL in $($Conn.File)"
        }
        
        # Update DIRECT_URL
        if ($Content -match "DIRECT_URL\s*=\s*[`"']?postgresql[^`"`'\r\n]*[`"']?") {
            $Content = $Content -replace "(DIRECT_URL\s*=\s*)[`"']?postgresql[^`"`'\r\n]*[`"']?", "`$1`"$NewConnectionString`""
            $Updated = $true
            Write-Success "Updated DIRECT_URL in $($Conn.File)"
        }
        
        # Update POSTGRES_URL
        if ($Content -match "POSTGRES_URL\s*=\s*[`"']?postgresql[^`"`'\r\n]*[`"']?") {
            $Content = $Content -replace "(POSTGRES_URL\s*=\s*)[`"']?postgresql[^`"`'\r\n]*[`"']?", "`$1`"$NewConnectionString`""
            $Updated = $true
            Write-Success "Updated POSTGRES_URL in $($Conn.File)"
        }
        
        if ($Updated -and -not $DryRun) {
            Set-Content -Path $Conn.FullPath -Value $Content -NoNewline
        }
    }
}

# Step 6: Verification
Write-Header "STEP 6: VERIFICATION"

if ($DryRun) {
    Write-Warning "Dry run mode - skipping verification"
} else {
    Write-Step "Testing database connection..."
    
    # Check if test script exists
    if (Test-Path "test-db-connection.js") {
        Write-ColorOutput "  Running: node test-db-connection.js" "Gray"
        
        try {
            $TestOutput = & node test-db-connection.js 2>&1
            Write-Host $TestOutput
            
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Database connection test PASSED"
            } else {
                Write-Error-Custom "Database connection test FAILED"
                Write-ColorOutput "  Please check the output above for details" "Yellow"
            }
        } catch {
            Write-Warning "Could not run test-db-connection.js"
            Write-ColorOutput "  Error: $($_.Exception.Message)" "Gray"
        }
    } else {
        Write-Warning "test-db-connection.js not found"
        Write-ColorOutput "  Download it from the provided files and place it in the repo root" "Gray"
    }
}

# Step 7: Next Steps
Write-Header "STEP 7: NEXT STEPS"

Write-ColorOutput @"

✓ Environment files have been updated

Manual Steps Required:

1. UPDATE VERCEL (if applicable):
   - Go to: https://vercel.com
   - Project Settings > Environment Variables
   - Update: DATABASE_URL and/or SUPABASE_DB_URL
   - Value: $NewConnectionString

2. RESTART SERVICES:
   PowerShell 1:  cd apps\gateway && npm run dev
   PowerShell 2:  cd apps\cevict && npm run dev
   PowerShell 3:  cd apps\petreunion && npm run dev

3. VALIDATE:
   - Test: curl http://localhost:3000/health
   - Test: curl http://localhost:3000/health/jobs
   - Check: All services start without errors

4. ROLLBACK (if needed):
   Get-ChildItem -Recurse -Filter .env*.backup | ForEach-Object {
       Copy-Item `$_.FullName -Destination `$_.FullName.Replace('.backup', '') -Force
   }

5. CLEANUP (after 24-48 hours):
   Get-ChildItem -Recurse -Filter .env*.backup | Remove-Item

"@ "White"

Write-Header "🎉 ROTATION ASSISTANT COMPLETE"

if ($DryRun) {
    Write-Warning "This was a DRY RUN - no actual changes were made"
    Write-ColorOutput "Run without -DryRun flag to apply changes" "Yellow"
}

Write-ColorOutput "`nFor detailed instructions, see: password-rotation-plan.md" "Cyan"
Write-ColorOutput "For quick reference, see: quick-reference.md" "Cyan"
Write-Host ""
