#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Sell losing Kalshi positions to free up capital for auto-trading.
    Fetches all open positions, identifies losers (current value < cost basis),
    and places sell orders at market to exit them.
#>

param(
    [switch]$DryRun = $false,
    [double]$LossThresholdPct = 0  # Sell if current value is ANY % below cost (0 = sell all losers)
)

$ErrorActionPreference = 'Stop'

# ── Load credentials from KeyVault ────────────────────────────────────────────
$_vaultPath = if ($env:KEYVAULT_STORE_PATH) { $env:KEYVAULT_STORE_PATH } else { 'C:\Cevict_Vault\env-store.json' }
if (-not (Test-Path $_vaultPath)) {
    Write-Host "KeyVault store not found at $_vaultPath" -ForegroundColor Red
    exit 1
}
$_vault = Get-Content $_vaultPath -Raw | ConvertFrom-Json
$ApiKeyId = $_vault.secrets.KALSHI_API_KEY_ID
$PrivateKeyPem = $_vault.secrets.KALSHI_PRIVATE_KEY
$_baseFromVault = $_vault.secrets.KALSHI_BASE_URL
# Strip /trade-api/v2 suffix if present — we append paths ourselves
$BaseUrl = if ($_baseFromVault) { $_baseFromVault -replace '/trade-api/v2.*$', '' } else { 'https://api.elections.kalshi.com' }

if (-not $ApiKeyId) { Write-Host "KALSHI_API_KEY_ID missing from vault" -ForegroundColor Red; exit 1 }
if (-not $PrivateKeyPem) { Write-Host "KALSHI_PRIVATE_KEY missing from vault" -ForegroundColor Red; exit 1 }
Write-Host "Loaded credentials from vault (key: $($ApiKeyId.Substring(0,8))...)" -ForegroundColor DarkGray

# ── RSA-PSS signing using .NET (no openssl required) ─────────────────────────
function Get-KalshiSignature {
    param([string]$Method, [string]$Path)

    $timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds().ToString()
    $pathNoQuery = $Path.Split('?')[0]
    $message = "$timestamp$Method$pathNoQuery"
    $msgBytes = [System.Text.Encoding]::UTF8.GetBytes($message)

    # Strip PEM headers and decode base64 DER
    $pemBody = $PrivateKeyPem `
        -replace '-----BEGIN RSA PRIVATE KEY-----', '' `
        -replace '-----END RSA PRIVATE KEY-----', '' `
        -replace '\s', ''
    $derBytes = [Convert]::FromBase64String($pemBody)

    # Import RSA key from PKCS#1 DER
    $rsa = [System.Security.Cryptography.RSA]::Create()
    $rsa.ImportRSAPrivateKey($derBytes, [ref]$null)

    # Sign with RSA-PSS SHA256 (saltLength = digest = 32 bytes for SHA256)
    $sigBytes = $rsa.SignData(
        $msgBytes,
        [System.Security.Cryptography.HashAlgorithmName]::SHA256,
        [System.Security.Cryptography.RSASignaturePadding]::Pss
    )
    $rsa.Dispose()

    $sig = [Convert]::ToBase64String($sigBytes)
    return @{ Signature = $sig; Timestamp = $timestamp }
}

function Invoke-KalshiApi {
    param([string]$Method, [string]$Path, [hashtable]$Body = $null)

    $auth = Get-KalshiSignature -Method $Method -Path $Path
    $headers = @{
        'KALSHI-ACCESS-KEY'       = $ApiKeyId
        'KALSHI-ACCESS-SIGNATURE' = $auth.Signature
        'KALSHI-ACCESS-TIMESTAMP' = $auth.Timestamp
        'Content-Type'            = 'application/json'
    }

    $url = "$BaseUrl$Path"
    $params = @{ Uri = $url; Method = $Method; Headers = $headers; UseBasicParsing = $true }
    if ($Body) { $params.Body = ($Body | ConvertTo-Json -Compress) }

    $resp = Invoke-WebRequest @params
    return $resp.Content | ConvertFrom-Json
}

# ── 1. Get balance ────────────────────────────────────────────────────────────
Write-Host "`n🦞 Kalshi Sell-Losers Script" -ForegroundColor Cyan
Write-Host "Mode: $(if ($DryRun) { 'DRY RUN (no orders placed)' } else { 'LIVE' })" -ForegroundColor $(if ($DryRun) { 'Yellow' } else { 'Red' })

try {
    $balData = Invoke-KalshiApi -Method 'GET' -Path '/trade-api/v2/portfolio/balance'
    $balance = [math]::Round($balData.balance / 100, 2)
    Write-Host "Current balance: `$$balance" -ForegroundColor Green
}
catch {
    Write-Host "Failed to get balance: $_" -ForegroundColor Red
    $balance = 0
}

# ── 2. Get open positions ─────────────────────────────────────────────────────
Write-Host "`nFetching open positions..." -ForegroundColor Cyan
try {
    $posData = Invoke-KalshiApi -Method 'GET' -Path '/trade-api/v2/portfolio/positions?limit=200&settlement_status=unsettled'
    $positions = $posData.market_positions | Where-Object { $_.position -ne 0 }
    Write-Host "Found $($positions.Count) open positions" -ForegroundColor White
}
catch {
    Write-Host "Failed to fetch positions: $_" -ForegroundColor Red
    exit 1
}

if ($positions.Count -eq 0) {
    Write-Host "No open positions to sell." -ForegroundColor Yellow
    exit 0
}

# ── 3. Identify losers ────────────────────────────────────────────────────────
Write-Host "`n📊 Position Analysis:" -ForegroundColor Cyan
Write-Host ("{0,-30} {1,8} {2,10} {3,10} {4,10} {5,8}" -f "Ticker", "Qty", "Avg Cost", "Curr Val", "P&L", "Action")
Write-Host ("-" * 80)

$toSell = @()

foreach ($pos in $positions) {
    $ticker = $pos.ticker
    $qty = [math]::Abs($pos.position)
    $side = if ($pos.position -gt 0) { 'yes' } else { 'no' }

    # Cost basis: total_cost is in cents
    $totalCostCents = $pos.total_traded_cost
    $avgCostCents = if ($qty -gt 0) { $totalCostCents / $qty } else { 50 }

    # Current value: use resting_orders_count or market_exposure
    # Kalshi returns market_exposure in cents for the position value
    $currentValCents = if ($pos.market_exposure) { [math]::Abs($pos.market_exposure) } else { $avgCostCents * $qty }

    $pnlCents = $currentValCents - $totalCostCents
    $pnlDollar = [math]::Round($pnlCents / 100, 2)
    $avgCostD = [math]::Round($avgCostCents / 100, 2)
    $currValD = [math]::Round($currentValCents / 100, 2)

    $isLoser = $pnlCents -lt 0
    $color = if ($isLoser) { 'Red' } else { 'Green' }
    $action = if ($isLoser) { 'SELL' } else { 'HOLD' }

    Write-Host ("{0,-30} {1,8} {2,10:C} {3,10:C} {4,10:C} {5,8}" -f $ticker, $qty, $avgCostD, $currValD, $pnlDollar, $action) -ForegroundColor $color

    if ($isLoser) {
        $toSell += [PSCustomObject]@{
            Ticker  = $ticker
            Side    = $side
            Qty     = $qty
            PnL     = $pnlDollar
            CurrVal = $currValD
        }
    }
}

Write-Host "`nLosing positions to sell: $($toSell.Count)" -ForegroundColor $(if ($toSell.Count -gt 0) { 'Yellow' } else { 'Green' })

if ($toSell.Count -eq 0) {
    Write-Host "No losing positions found. Nothing to sell." -ForegroundColor Green
    exit 0
}

# ── 4. Sell losers ────────────────────────────────────────────────────────────
Write-Host "`n🔴 Selling losing positions..." -ForegroundColor Red
$sold = 0
$freed = 0.0

foreach ($pos in $toSell) {
    Write-Host "  Selling $($pos.Qty)x $($pos.Ticker) ($($pos.Side)) | P&L: `$$($pos.PnL)" -NoNewline

    if ($DryRun) {
        Write-Host " [DRY RUN - skipped]" -ForegroundColor Yellow
        continue
    }

    try {
        # Place a market sell order
        # On Kalshi, selling means placing a 'sell' action order
        $body = @{
            ticker = $pos.Ticker
            side   = $pos.Side
            action = 'sell'
            count  = [int]$pos.Qty
            type   = 'market'
        }

        $result = Invoke-KalshiApi -Method 'POST' -Path '/trade-api/v2/portfolio/orders' -Body $body
        Write-Host " ✅ Order placed: $($result.order.order_id)" -ForegroundColor Green
        $sold++
        $freed += $pos.CurrVal
        Start-Sleep -Milliseconds 600  # Rate limit: stay under 10 req/sec
    }
    catch {
        $errMsg = $_.ToString()
        Write-Host " ❌ Failed: $errMsg" -ForegroundColor Red
    }
}

# ── 5. Summary ────────────────────────────────────────────────────────────────
Write-Host "`n✅ Done." -ForegroundColor Green
Write-Host "Sold: $sold / $($toSell.Count) positions"
Write-Host "Capital freed: ~`$$([math]::Round($freed, 2))"
Write-Host "This capital will be available for the `$5 max auto-trader."
