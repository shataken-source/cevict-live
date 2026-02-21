# Fix incorrect @/app/lib/ imports to correct @/lib/ paths

$files = Get-ChildItem -Path "app\api" -Recurse -Filter "*.ts" -File

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $original = $content
    
    # Fix @/app/lib/ to @/lib/
    $content = $content -replace "@/app/lib/", "@/lib/"
    
    if ($content -ne $original) {
        Set-Content $file.FullName $content -NoNewline
        Write-Host "Fixed: $($file.FullName)"
    }
}

Write-Host "`nDone! Fixed @/app/lib/ to @/lib/ imports."
