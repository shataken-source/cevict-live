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

# ── Credentials ──────────────────────────────────────────────────────────────
$ApiKeyId = "508d2642-a92d-42a4-93f4-2c60e8259004"
$BaseUrl = "https://api.elections.kalshi.com"
$PrivateKeyPem = @"
-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA4L+eyXXYKskvZvQOS9dQeuh308eXvatvNhnLJxjLOO8yJ19H
dT3qimXUae5aSAdd0AD4wlcuIcxQnTi8FkM70OqXjHeiczDZMgDfumElzy0AHTbY
LgOPWmWWK7IPEzUyc/7Fo8XyLRMo+fo3TY4YcYNwDCr4onMpQNNAxy7o/jrFE/Vt
+LOhJwZjb7bX9TIJ8biMWXpDMoee/e6MfPoUD9FKm8Q5zIXgE5hNfCUnEU9enPaa
6r/m4CUE2TY8NULsVhjPQ7gQ8ByKo4Xk5JfjIo27AgeDXI8ydCRAaTuf+paLaQo5
nC/Cc7wRsYoQLl7Ukb/xmaBI+C0awkZXL0/EdwIDAQABAoIBAAL8BLv35a5OidnM
BcqTzH83LITLADhq598xxhscYV4qEISgBQGODm2vXGg8yABcKtYEO3DOct6RpGui
qwqT3vuC9Q7sV+1TlgCdBapO5CzVTxtZITXZD0ETUWvDMtDlInKmQt5OJWrvvJ78
QFoikJIlURkqHMMKj8Fou4M16pskFM5zOKMP3VwITPJumwucY9AqRBw3elIxCuec
gfTeCVuiHZWAK6DXhtSlruzod5UxtRAq+fYubwTx4S/5dZ2poNteClMaMmDgzJB2
q+BCNC1Fy7EZ2dj4DoA2eYMQ2oROag83zTOR7sfabCl6SHSF8q95zFAtl3PaGD+h
EbLfzZkCgYEA/DQ7z/LF4fEoEFWgAP2qCFtjDEk6SSSVPJbadPr9Os0/a13oCH8Y
GBXF7HhIJNxgoM3n3Ch28of4/5AGKnylMv4zyV55EhSYA2Zio/fLfnbLH2195Qvb
HjQRhieePnMZjTAJ07d88asd3jnpeZyJHUnCcnURASlI3sUNXMQ+ns8CgYEA5CGZ
DYdtZBiEsMTvvtapJ9t75dwfmLdeGTZ/6obGiDyDarVCn/LtsNwlwKLVNGeImles
PfXLSc/BfsLWShLlr6MjyAusU9wK4BbFUOu76qJ33f1H0gzZHlHSEf7BT/IV6uHY
mMO5Zh9Y5hkggwIhnb7ZBq3hz6AvYsCtydd0KdkCgYBtYCHIb1sOP83GN7wqcdg5
w5hTDbbvXaQzIKEhNnB3/edRIuqsNKI4X8j0Yr227rQhSOsS+aGMURfVjZp+9ouW
b9P5srUC+Fdssgx5W8+uysoQmSWOHfQrRx2KdsgUAUrFhl3cqajQDgvoAmmUyiRU
xVZE2SxEuqjVo9PFtX4K1QKBgQDW0QxeQPgxGSVZjxhyi5Adh//TIsRd+c0R0NAC
94ZbIyBcivKByy8nKyYhjzNUdWmcbJI0hg83IfsCclV2yvSdvvEinltXXAyhls+W
s2PwPazBzI6krJSGiGVXrJw7u6oH00MyFpuuHjaH9YE32/nroJqcP4AzEpOMWgNL
3SX1gQKBgFNP+49qG987882PX9K7asEt3/r6MtVeO1EsfQlTtfZ8aZcC3+vuCS2C
W2mXSHnEhtAcoNzlVoGuLqjDs+nhN2LRJU7N+8cyFnawSCxy5dXOrqpwA2B9rLph
V/hOHuB0BXLgfP/HKxxiqtC6LdqU4VIJ+6QPDJS3CHaA1bpZSDy0
-----END RSA PRIVATE KEY-----
"@

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
