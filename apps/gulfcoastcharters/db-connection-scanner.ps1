# Database Connection String Scanner
# Purpose: Find all database connection usage in cevict-monorepo
# Run from: c:\gcc\cevict-app\cevict-monorepo

$RepoPath = "c:\gcc\cevict-app\cevict-monorepo"
$OutputFile = "db-connection-inventory.txt"

# Patterns to search for
$SearchPatterns = @(
    "DATABASE_URL",
    "SUPABASE_DB_URL",
    "POSTGRES_URL",
    "DIRECT_URL",
    "PRISMA_DATABASE_URL",
    "postgresql://",
    "postgres://",
    "pooler.supabase.com",
    "db.rdbuwyefbgnbuhmjrizo.supabase.co",
    "sb-"
)

# File extensions to search
$FileExtensions = @("*.env*", "*.js", "*.ts", "*.tsx", "*.json", "*.yml", "*.yaml", "*.prisma")

# Directories to exclude
$ExcludeDirs = @("node_modules", ".next", "dist", "build", ".git")

Write-Host "🔍 Scanning repository for database connection strings..." -ForegroundColor Cyan
Write-Host "Repository: $RepoPath" -ForegroundColor Gray
Write-Host ""

# Initialize results
$Results = @()

# Function to check if path should be excluded
function Should-Exclude {
    param($Path)
    foreach ($ExcludeDir in $ExcludeDirs) {
        if ($Path -like "*\$ExcludeDir\*") {
            return $true
        }
    }
    return $false
}

# Search for files
foreach ($Extension in $FileExtensions) {
    $Files = Get-ChildItem -Path $RepoPath -Recurse -Filter $Extension -ErrorAction SilentlyContinue
    
    foreach ($File in $Files) {
        if (Should-Exclude $File.FullName) {
            continue
        }
        
        try {
            $Content = Get-Content $File.FullName -Raw -ErrorAction Stop
            $LineNumber = 0
            
            foreach ($Line in (Get-Content $File.FullName -ErrorAction Stop)) {
                $LineNumber++
                
                foreach ($Pattern in $SearchPatterns) {
                    if ($Line -match [regex]::Escape($Pattern)) {
                        $RelativePath = $File.FullName.Replace($RepoPath, "").TrimStart("\")
                        
                        # Determine app/service
                        $AppService = "unknown"
                        if ($RelativePath -match "apps[/\\]gateway") { $AppService = "gateway" }
                        elseif ($RelativePath -match "apps[/\\]cevict") { $AppService = "cevict" }
                        elseif ($RelativePath -match "apps[/\\]petreunion") { $AppService = "petreunion" }
                        elseif ($RelativePath -match "packages") { $AppService = "shared-package" }
                        elseif ($RelativePath -match "^\.env") { $AppService = "root" }
                        
                        $Results += [PSCustomObject]@{
                            File = $RelativePath
                            Line = $LineNumber
                            Pattern = $Pattern
                            AppService = $AppService
                            Content = $Line.Trim()
                        }
                        
                        Write-Host "✓ Found in: $RelativePath (line $LineNumber)" -ForegroundColor Green
                        break
                    }
                }
            }
        }
        catch {
            # Skip files that can't be read
        }
    }
}

Write-Host ""
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "Total matches found: $($Results.Count)" -ForegroundColor Yellow
Write-Host ""

# Group by app/service
$GroupedResults = $Results | Group-Object -Property AppService
foreach ($Group in $GroupedResults) {
    Write-Host "  $($Group.Name): $($Group.Count) reference(s)" -ForegroundColor White
}

# Export detailed results
$Results | Export-Csv -Path $OutputFile -NoTypeInformation -Encoding UTF8
Write-Host ""
Write-Host "💾 Detailed results saved to: $OutputFile" -ForegroundColor Cyan

# Create a summary report
$ReportFile = "db-connection-report.md"
$Report = @"
# Database Connection Inventory Report
Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Repository: $RepoPath

## Summary
Total connection string references: $($Results.Count)

## By Application/Service
$($GroupedResults | ForEach-Object { "- **$($_.Name)**: $($_.Count) reference(s)" } | Out-String)

## Detailed Findings

$($Results | ForEach-Object { @"
### $($_.File)
- **Line**: $($_.Line)
- **Pattern**: $($_.Pattern)
- **App/Service**: $($_.AppService)
- **Content**: ``$($_.Content)``

"@ } | Out-String)

## Next Steps
1. Review each reference to determine if it uses DB password vs API keys
2. Identify which are dev vs production
3. Determine where each variable is loaded from
4. Create rotation plan

"@

$Report | Out-File -FilePath $ReportFile -Encoding UTF8
Write-Host "📄 Summary report saved to: $ReportFile" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Scan complete!" -ForegroundColor Green
