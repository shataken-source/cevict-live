Import-Module 'C:\cevict-live\scripts\keyvault\KeyVault.psm1' -Force
# Keys are stored in C:\Cevict_Vault\env-store.json — do not hardcode values here
# To update a key: & 'C:\cevict-live\scripts\keyvault\set-secret.ps1' -Name 'KEY_NAME' -Value 'value'
Write-Output "Vault: ODDS_API_KEY_2 = $(( Get-KeyVaultSecret -Name 'ODDS_API_KEY_2' ).Substring(0,8))..."
Write-Output "Vault: BETSTACK_API_KEY = $(( Get-KeyVaultSecret -Name 'BETSTACK_API_KEY' ).Substring(0,8))..."
Write-Output "Vault: SPORTS_BLAZE_API_KEY = $(( Get-KeyVaultSecret -Name 'SPORTS_BLAZE_API_KEY' ).Substring(0,8))..."
