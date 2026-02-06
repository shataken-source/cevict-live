# Update Supabase Environment Variables in All .env.local Files
# This script standardizes Supabase configuration across all apps
#
# Usage:
#   .\scripts\update-supabase-env-vars.ps1
#   .\scripts\update-supabase-env-vars.ps1 -DryRun
#   .\scripts\update-supabase-env-vars.ps1 -AnonKey "full-key-here"

param(
    [string]$RootPath = "C:\cevict-live",
    [switch]$DryRun = $false,
    [string]$SupabaseUrl = "https://nqkbqtiramecvmmpaxzk.supabase.co",
    [string]$ServiceRoleKey = "",
    [string]$AnonKey = ""
)

# New Supabase configuration values
$NEW_SUPABASE_URL = $SupabaseUrl

Write-Host "=== Update Supabase Environment Variables ===" -ForegroundColor Cyan
Write-Host ""

# If ServiceRoleKey not provided, prompt user
if ([string]::IsNullOrWhiteSpace($ServiceRoleKey)) {
    Write-Host "⚠️  Service role key not provided. Please provide the FULL service role key." -ForegroundColor Yellow
    Write-Host "   Get it from: Supabase Dashboard > Settings > API" -ForegroundColor Gray
    Write-Host "   - Legacy JWT: 'Legacy anon, service_role API keys' tab > service_role secret" -ForegroundColor Gray
    Write-Host "   - New format: 'Publishable and secret API keys' tab > Secret keys" -ForegroundColor Gray
    Write-Host "   Or run: .\scripts\update-supabase-env-vars.ps1 -ServiceRoleKey 'your-full-key-here'" -ForegroundColor Cyan
    Write-Host ""
    $prompt = Read-Host "Enter full SUPABASE_SERVICE_ROLE_KEY (or press Enter to skip)"
    if ([string]::IsNullOrWhiteSpace($prompt)) {
        Write-Host "❌ Service role key is required. Exiting." -ForegroundColor Red
        exit 1
    }
    $NEW_SERVICE_ROLE_KEY = $prompt.Trim().Trim('"').Trim("'")
} else {
    $NEW_SERVICE_ROLE_KEY = $ServiceRoleKey.Trim().Trim('"').Trim("'")
}

# If AnonKey not provided, prompt user
if ([string]::IsNullOrWhiteSpace($AnonKey)) {
    Write-Host "⚠️  Anon key not provided. Please provide the FULL anon key." -ForegroundColor Yellow
    Write-Host "   Get it from: Supabase Dashboard > Settings > API" -ForegroundColor Gray
    Write-Host "   - Legacy JWT: 'Legacy anon, service_role API keys' tab" -ForegroundColor Gray
    Write-Host "   - New format: 'Publishable and secret API keys' tab" -ForegroundColor Gray
    Write-Host "   Or run: .\scripts\update-supabase-env-vars.ps1 -AnonKey 'your-full-key-here'" -ForegroundColor Cyan
    Write-Host ""
    $prompt = Read-Host "Enter full NEXT_PUBLIC_SUPABASE_ANON_KEY (or press Enter to skip)"
    if ([string]::IsNullOrWhiteSpace($prompt)) {
        Write-Host "❌ Anon key is required. Exiting." -ForegroundColor Red
        exit 1
    }
    $NEW_ANON_KEY = $prompt.Trim().Trim('"').Trim("'")
} else {
    $NEW_ANON_KEY = $AnonKey.Trim().Trim('"').Trim("'")
}

# Validate keys and detect format
$serviceKeyFormat = "unknown"
$anonKeyFormat = "unknown"

if ($NEW_SERVICE_ROLE_KEY.StartsWith("sb_secret_")) {
    $serviceKeyFormat = "new (sb_secret_)"
} elseif ($NEW_SERVICE_ROLE_KEY.StartsWith("eyJ")) {
    $serviceKeyFormat = "legacy JWT"
    if ($NEW_SERVICE_ROLE_KEY.Length -lt 200) {
        Write-Host "⚠️  Warning: Legacy JWT service role key seems too short (should be 200+ chars)" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  Warning: Service role key format unrecognized (expected sb_secret_* or eyJ...)" -ForegroundColor Yellow
}

if ($NEW_ANON_KEY.StartsWith("sb_publishable_")) {
    $anonKeyFormat = "new (sb_publishable_)"
} elseif ($NEW_ANON_KEY.StartsWith("eyJ")) {
    $anonKeyFormat = "legacy JWT"
    if ($NEW_ANON_KEY.Length -lt 200) {
        Write-Host "⚠️  Warning: Legacy JWT anon key seems too short (should be 200+ chars)" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  Warning: Anon key format unrecognized (expected sb_publishable_* or eyJ...)" -ForegroundColor Yellow
}

Write-Host "📋 Key formats detected:" -ForegroundColor Cyan
Write-Host "   Service Role: $serviceKeyFormat" -ForegroundColor Gray
Write-Host "   Anon Key: $anonKeyFormat" -ForegroundColor Gray
Write-Host ""

if ($DryRun) {
    Write-Host "🔍 DRY RUN MODE - No files will be modified" -ForegroundColor Yellow
    Write-Host ""
}

# Find all .env.local files
$envFiles = Get-ChildItem -Path $RootPath -Filter ".env.local" -Recurse -File -ErrorAction SilentlyContinue

if ($envFiles.Count -eq 0) {
    Write-Host "❌ No .env.local files found in $RootPath" -ForegroundColor Red
    exit 1
}

Write-Host "📁 Found $($envFiles.Count) .env.local file(s):" -ForegroundColor Green
$envFiles | ForEach-Object { Write-Host "   - $($_.FullName.Replace($RootPath, '.'))" -ForegroundColor Gray }
Write-Host ""

$updatedCount = 0
$skippedCount = 0

foreach ($file in $envFiles) {
    Write-Host "📝 Processing: $($file.FullName.Replace($RootPath, '.'))" -ForegroundColor Cyan
    
    try {
        $content = Get-Content -Path $file.FullName -Raw -ErrorAction Stop
        $originalContent = $content
        $modified = $false
        
        # Pattern to match Supabase URL (with or without quotes, with or without NEXT_PUBLIC_ prefix)
        $urlPatterns = @(
            'NEXT_PUBLIC_SUPABASE_URL\s*=\s*["'']?[^`r`n]*["'']?',
            'SUPABASE_URL\s*=\s*["'']?[^`r`n]*["'']?'
        )
        
        # Pattern to match Service Role Key (with or without quotes)
        $serviceKeyPatterns = @(
            'SUPABASE_SERVICE_ROLE_KEY\s*=\s*["'']?[^`r`n]*["'']?',
            'SUPABASE_SERVICE_KEY\s*=\s*["'']?[^`r`n]*["'']?'
        )
        
        # Pattern to match Anon Key (with or without quotes, with or without NEXT_PUBLIC_ prefix)
        $anonKeyPatterns = @(
            'NEXT_PUBLIC_SUPABASE_ANON_KEY\s*=\s*["'']?[^`r`n]*["'']?',
            'SUPABASE_ANON_KEY\s*=\s*["'']?[^`r`n]*["'']?',
            'NEXT_PUBLIC_SUPABASE_KEY\s*=\s*["'']?[^`r`n]*["'']?'
        )
        
        # Update NEXT_PUBLIC_SUPABASE_URL
        $urlUpdated = $false
        foreach ($pattern in $urlPatterns) {
            if ($content -match $pattern) {
                $oldValue = $matches[0]
                $newValue = "NEXT_PUBLIC_SUPABASE_URL=$NEW_SUPABASE_URL"
                $content = $content -replace [regex]::Escape($oldValue), $newValue
                Write-Host "   ✅ Updated: NEXT_PUBLIC_SUPABASE_URL" -ForegroundColor Green
                $modified = $true
                $urlUpdated = $true
                break
            }
        }
        
        # Add if missing
        if (-not $urlUpdated -and $content -notmatch 'NEXT_PUBLIC_SUPABASE_URL\s*=') {
            $content += "`nNEXT_PUBLIC_SUPABASE_URL=$NEW_SUPABASE_URL"
            Write-Host "   ➕ Added: NEXT_PUBLIC_SUPABASE_URL" -ForegroundColor Yellow
            $modified = $true
        }
        
        # Update SUPABASE_SERVICE_ROLE_KEY
        $serviceKeyUpdated = $false
        foreach ($pattern in $serviceKeyPatterns) {
            if ($content -match $pattern) {
                $oldValue = $matches[0]
                $newValue = "SUPABASE_SERVICE_ROLE_KEY=$NEW_SERVICE_ROLE_KEY"
                $content = $content -replace [regex]::Escape($oldValue), $newValue
                Write-Host "   ✅ Updated: SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Green
                $modified = $true
                $serviceKeyUpdated = $true
                break
            }
        }
        
        # Add if missing
        if (-not $serviceKeyUpdated -and $content -notmatch 'SUPABASE_SERVICE_ROLE_KEY\s*=') {
            $content += "`nSUPABASE_SERVICE_ROLE_KEY=$NEW_SERVICE_ROLE_KEY"
            Write-Host "   ➕ Added: SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Yellow
            $modified = $true
        }
        
        # Update NEXT_PUBLIC_SUPABASE_ANON_KEY
        $anonKeyUpdated = $false
        foreach ($pattern in $anonKeyPatterns) {
            if ($content -match $pattern) {
                $oldValue = $matches[0]
                $newValue = "NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEW_ANON_KEY"
                $content = $content -replace [regex]::Escape($oldValue), $newValue
                Write-Host "   ✅ Updated: NEXT_PUBLIC_SUPABASE_ANON_KEY" -ForegroundColor Green
                $modified = $true
                $anonKeyUpdated = $true
                break
            }
        }
        
        # Add if missing
        if (-not $anonKeyUpdated -and $content -notmatch 'NEXT_PUBLIC_SUPABASE_ANON_KEY\s*=') {
            $content += "`nNEXT_PUBLIC_SUPABASE_ANON_KEY=$NEW_ANON_KEY"
            Write-Host "   ➕ Added: NEXT_PUBLIC_SUPABASE_ANON_KEY" -ForegroundColor Yellow
            $modified = $true
        }
        
        # Remove old SUPABASE_KEY if it exists (legacy/unused)
        if ($content -match '(?m)^SUPABASE_KEY\s*=') {
            $content = $content -replace '(?m)^SUPABASE_KEY\s*=.*$', ''
            Write-Host "   🗑️  Removed: SUPABASE_KEY (legacy)" -ForegroundColor Gray
            $modified = $true
        }
        
        # Write changes if modified
        if ($modified) {
            if (-not $DryRun) {
                # Normalize line endings and ensure trailing newline
                $content = $content -replace "`r`n", "`n" -replace "`r", "`n"
                $content = $content.TrimEnd() + "`n"
                Set-Content -Path $file.FullName -Value $content -NoNewline
                Write-Host "   💾 Saved changes" -ForegroundColor Green
            } else {
                Write-Host "   🔍 Would save changes (dry run)" -ForegroundColor Yellow
            }
            $updatedCount++
        } else {
            Write-Host "   ⏭️  No changes needed" -ForegroundColor Gray
            $skippedCount++
        }
        
    } catch {
        Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host ""
}

Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "📁 Files processed: $($envFiles.Count)" -ForegroundColor White
Write-Host "✅ Files updated: $updatedCount" -ForegroundColor Green
Write-Host "⏭️  Files skipped: $skippedCount" -ForegroundColor Gray

if ($DryRun) {
    Write-Host ""
    Write-Host "💡 Run without -DryRun to apply changes:" -ForegroundColor Yellow
    Write-Host "   .\scripts\update-supabase-env-vars.ps1" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "✅ All Supabase environment variables updated!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Updated values:" -ForegroundColor Cyan
    Write-Host "   NEXT_PUBLIC_SUPABASE_URL=$NEW_SUPABASE_URL" -ForegroundColor Gray
    Write-Host "   SUPABASE_SERVICE_ROLE_KEY=$($NEW_SERVICE_ROLE_KEY.Substring(0, 30))..." -ForegroundColor Gray
    Write-Host "   NEXT_PUBLIC_SUPABASE_ANON_KEY=$($NEW_ANON_KEY.Substring(0, 30))..." -ForegroundColor Gray
}
