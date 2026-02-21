# Revert @/lib/ back to @/app/lib/ since that's the correct path

$files = Get-ChildItem -Path "app\api" -Recurse -Filter "*.ts" -File

foreach ($file in $files) {
    try {
        $content = Get-Content $file.FullName -Raw -ErrorAction Stop
        $original = $content
        
        # Revert @/lib/ to @/app/lib/
        $content = $content -replace "from '@/lib/", "from '@/app/lib/"
        $content = $content -replace 'from "@/lib/', 'from "@/app/lib/'
        
        if ($content -ne $original) {
            Set-Content $file.FullName $content -NoNewline
            Write-Host "Fixed: $($file.Name)"
        }
    } catch {
        Write-Host "Skipped: $($file.Name) - $($_.Exception.Message)"
    }
}

Write-Host "`nDone! Reverted @/lib/ to @/app/lib/ imports."
