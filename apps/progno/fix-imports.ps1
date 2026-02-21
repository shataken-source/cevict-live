# Fix all relative lib imports to use absolute @/ imports for Vercel builds

$files = @(
    "app\api\picks\today\route.ts",
    "app\api\progno\analyze-game\route.ts",
    "app\api\progno\elite-analyze\eliteanalyzeroute.ts",
    "app\api\progno\elite-analyze\route.ts",
    "app\api\sentiment\calculate\route.ts",
    "app\api\cron\daily-predictions\route.ts",
    "app\api\narrative\calculate\route.ts",
    "app\api\progno\learn\route.ts",
    "app\api\progno\predict\route.ts",
    "app\api\test\claude-effect\route.ts",
    "app\api\admin\reports\route.ts",
    "app\api\backtest\route.ts",
    "app\api\csi\calculate\route.ts",
    "app\api\iai\calculate\route.ts",
    "app\api\progno\weekly-learning\route.ts"
)

foreach ($file in $files) {
    $path = Join-Path $PSScriptRoot $file
    if (Test-Path $path) {
        $content = Get-Content $path -Raw
        # Replace ../../../lib/ with @/app/lib/
        $content = $content -replace "from '\.\./\.\./\.\./lib/", "from '@/app/lib/"
        $content = $content -replace 'from "\.\./\.\./\.\./lib/', 'from "@/app/lib/'
        # Replace ../../../../lib/ with @/app/lib/
        $content = $content -replace "from '\.\./\.\./\.\./\.\./lib/", "from '@/app/lib/"
        $content = $content -replace 'from "\.\./\.\./\.\./\.\./lib/', 'from "@/app/lib/'
        Set-Content $path $content -NoNewline
        Write-Host "Fixed: $file"
    }
}

Write-Host "`nDone! Fixed all relative lib imports to absolute @/ imports."
