# Get sync summary from log file
$log = Get-ChildItem 'C:\gccnewest' -Filter 'sync-log-*.csv' | Sort-Object LastWriteTime -Descending | Select-Object -First 1

if ($log) {
    $data = Import-Csv $log.FullName
    
    Write-Host "`n========================================" -ForegroundColor Magenta
    Write-Host "SYNC SUMMARY REPORT" -ForegroundColor Magenta
    Write-Host "========================================`n" -ForegroundColor Magenta
    
    Write-Host "Total files processed: $($data.Count)" -ForegroundColor White
    
    $only1 = ($data | Where-Object { $_.Status -like '*ONLY in cevict-live*' }).Count
    $only2 = ($data | Where-Object { $_.Status -like '*ONLY in charter-booking-platform*' }).Count
    $only3 = ($data | Where-Object { $_.Status -like '*ONLY in cevict-monorepo*' }).Count
    $newest = ($data | Where-Object { $_.Status -like '*NEWEST*' }).Count
    
    Write-Host "`nFiles only in cevict-live: $only1" -ForegroundColor Cyan
    Write-Host "Files only in charter-booking-platform: $only2" -ForegroundColor Cyan
    Write-Host "Files only in cevict-monorepo: $only3" -ForegroundColor Cyan
    Write-Host "Files in multiple locations (newest selected): $newest" -ForegroundColor Yellow
    
    Write-Host "`nLog file: $($log.FullName)" -ForegroundColor Gray
    Write-Host "Destination: C:\gccnewest" -ForegroundColor Green
} else {
    Write-Host "No sync log found!" -ForegroundColor Red
}
