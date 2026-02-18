Import-Module 'C:\cevict-live\scripts\keyvault\KeyVault.psm1' -Force
Set-KeyVaultSecret -Name 'ODDS_API_KEY_2' -Value 'dea4f9f87fe7a2e3642523ee51d398d9'
Set-KeyVaultSecret -Name 'BETSTACK_API_KEY' -Value '68059a48f052f3f6cb3687a67fc03f3cce36f1c896810cf46f23f380802a6d49'
Set-KeyVaultSecret -Name 'SPORTS_BLAZE_API_KEY' -Value 'sbf556ejht8g2wvxf3bbeby'
Write-Output "Vault: ODDS_API_KEY_2 = $(( Get-KeyVaultSecret -Name 'ODDS_API_KEY_2' ).Substring(0,8))..."
Write-Output "Vault: BETSTACK_API_KEY = $(( Get-KeyVaultSecret -Name 'BETSTACK_API_KEY' ).Substring(0,8))..."
Write-Output "Vault: SPORTS_BLAZE_API_KEY = $(( Get-KeyVaultSecret -Name 'SPORTS_BLAZE_API_KEY' ).Substring(0,8))..."
