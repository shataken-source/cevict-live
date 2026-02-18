Import-Module 'C:\cevict-live\scripts\keyvault\KeyVault.psm1' -Force
Sync-KeyVaultEnvFromManifest -AppPath 'C:\cevict-live\apps\progno' -IncludeMissingOptional
Write-Output "env.local synced"
