#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Query Kalshi for all open bets: unsettled positions and resting (open) orders.
    Uses Key Vault for KALSHI_API_KEY_ID and KALSHI_PRIVATE_KEY.
#>

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
$BaseUrl = if ($_baseFromVault) { $_baseFromVault -replace '/trade-api/v2.*$', '' } else { 'https://api.elections.kalshi.com' }

if (-not $ApiKeyId) { Write-Host "KALSHI_API_KEY_ID missing from vault" -ForegroundColor Red; exit 1 }
if (-not $PrivateKeyPem) { Write-Host "KALSHI_PRIVATE_KEY missing from vault" -ForegroundColor Red; exit 1 }

function Get-KalshiSignature {
    param([string]$Method, [string]$Path)
    $timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds().ToString()
    $pathNoQuery = $Path.Split('?')[0]
    $message = "$timestamp$Method$pathNoQuery"
    $msgBytes = [System.Text.Encoding]::UTF8.GetBytes($message)
    $pemBody = $PrivateKeyPem `
        -replace '-----BEGIN RSA PRIVATE KEY-----', '' `
        -replace '-----END RSA PRIVATE KEY-----', '' `
        -replace '\s', ''
    $derBytes = [Convert]::FromBase64String($pemBody)
    $rsa = [System.Security.Cryptography.RSA]::Create()
    $rsa.ImportRSAPrivateKey($derBytes, [ref]$null)
    $sigBytes = $rsa.SignData($msgBytes, [System.Security.Cryptography.HashAlgorithmName]::SHA256, [System.Security.Cryptography.RSASignaturePadding]::Pss)
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

Write-Host "`n📋 Kalshi open bets (positions + resting orders)" -ForegroundColor Cyan

# Balance
try {
    $balData = Invoke-KalshiApi -Method 'GET' -Path '/trade-api/v2/portfolio/balance'
    $balance = [math]::Round($balData.balance / 100, 2)
    Write-Host "Balance: `$$balance" -ForegroundColor Green
} catch {
    Write-Host "Balance failed: $_" -ForegroundColor Red
    exit 1
}

# 1. Unsettled positions (open positions = open bets)
Write-Host "`n─── OPEN POSITIONS (unsettled) ───" -ForegroundColor Yellow
try {
    $posData = Invoke-KalshiApi -Method 'GET' -Path '/trade-api/v2/portfolio/positions?limit=200&settlement_status=unsettled'
    $positions = $posData.market_positions | Where-Object { $_.position -ne 0 }
} catch {
    Write-Host "Failed to fetch positions: $_" -ForegroundColor Red
    $positions = @()
}

if (-not $positions -or $positions.Count -eq 0) {
    Write-Host "  None" -ForegroundColor Gray
} else {
    Write-Host ("  {0,-42} {1,8} {2,10} {3,12}" -f "Ticker", "Position", "Cost (¢)", "Exposure (¢)")
    Write-Host "  " + ("-" * 76)
    foreach ($p in $positions) {
        $qty = $p.position
        $cost = if ($p.total_traded_cost) { $p.total_traded_cost } else { 0 }
        $exp = if ($p.market_exposure) { [math]::Abs($p.market_exposure) } else { $cost }
        Write-Host ("  {0,-42} {1,8} {2,10} {3,12}" -f $p.ticker, $qty, $cost, $exp)
    }
    Write-Host "  Total: $($positions.Count) position(s)" -ForegroundColor White

    # ── Picks table: Team picked, Odds, Date, Opponent (fetch market titles) ───
    Write-Host "`n─── PICKS (team picked, odds, date, opponent) ───" -ForegroundColor Yellow
    $pathPat = [regex]'(\d{2}[A-Z]{3}\d{2})'
    $rows = [System.Collections.Generic.List[object]]::new()
    foreach ($p in $positions) {
        $ticker = $p.ticker
        $pos = $p.position
        $cost = if ($p.total_traded_cost) { [int]$p.total_traded_cost } else { 0 }
        $qty = [math]::Abs($pos)
        $avgCents = if ($qty -gt 0) { [math]::Round($cost / $qty) } else { 0 }
        $dateStr = "—"
        if ($pathPat.Match($ticker).Success) {
            $dm = $pathPat.Match($ticker).Groups[1].Value
            try {
                $yr = [int]$dm.Substring($dm.Length - 2)
                $y2k = if ($yr -ge 0 -and $yr -le 50) { 2000 + $yr } else { 1900 + $yr }
                $d = [DateTime]::ParseExact($dm.Substring(0, 5) + $y2k.ToString().Substring(2), "ddMMMyy", [System.Globalization.CultureInfo]::InvariantCulture)
                $dateStr = $d.ToString("yyyy-MM-dd")
            } catch { }
        }
        $yesSuffix = $null
        if ($ticker -match '-([A-Z0-9]+)$') { $yesSuffix = $Matches[1] }
        $title = ""
        try {
            $mkt = Invoke-KalshiApi -Method 'GET' -Path "/trade-api/v2/markets/$ticker"
            $title = (if ($mkt.market) { $mkt.market.title } elseif ($mkt.title) { $mkt.title } else { $ticker }) -replace '\s+', ' '
            Start-Sleep -Milliseconds 220
        } catch { $title = $ticker }
        $teamPick = "—"
        $opponent = "—"
        if ($title -match '(.+?)\s+vs\.?\s+(.+?)\s*(winner|\?|$)') {
            $team1 = $Matches[1].Trim()
            $team2 = $Matches[2].Trim()
            $yesIsFirst = $title.ToLower().StartsWith($team1.ToLower()) -or ($yesSuffix -and $team1 -match [regex]::Escape($yesSuffix))
            if ($pos -gt 0) {
                $teamPick = if ($yesIsFirst) { $team1 } else { $team2 }
                $opponent = if ($yesIsFirst) { $team2 } else { $team1 }
            } else {
                $teamPick = if ($yesIsFirst) { $team2 } else { $team1 }
                $opponent = if ($yesIsFirst) { $team1 } else { $team2 }
            }
        } elseif ($title -and $title -ne $ticker) {
            $teamPick = $title.Substring(0, [Math]::Min(35, $title.Length))
        } else {
            $teamPick = if ($pos -gt 0) { "YES:$yesSuffix" } else { "NO (not $yesSuffix)" }
        }
        $oddsStr = if ($avgCents -gt 0) { "${avgCents}¢" } else { "—" }
        $rows.Add([PSCustomObject]@{ Date = $dateStr; Pick = $teamPick; Opponent = $opponent; Odds = $oddsStr; Contracts = $pos })
    }
    Write-Host ("  {0,-12} {1,-28} {2,-28} {3,6} {4,6}" -f "Date", "Pick", "Opponent", "Odds", "Qty")
    Write-Host "  " + ("-" * 86)
    foreach ($r in $rows) {
        $pickShort = if ($r.Pick.Length -gt 26) { $r.Pick.Substring(0, 25) + "…" } else { $r.Pick }
        $oppShort = if ($r.Opponent.Length -gt 26) { $r.Opponent.Substring(0, 25) + "…" } else { $r.Opponent }
        Write-Host ("  {0,-12} {1,-28} {2,-28} {3,6} {4,6}" -f $r.Date, $pickShort, $oppShort, $r.Odds, $r.Contracts)
    }
}

# 2. Resting orders (open limit orders not yet filled)
Write-Host "`n─── RESTING ORDERS (open orders) ───" -ForegroundColor Yellow
try {
    $ordersData = Invoke-KalshiApi -Method 'GET' -Path '/trade-api/v2/portfolio/orders?status=resting&limit=200'
    $orders = if ($ordersData.orders) { @($ordersData.orders) } else { @() }
} catch {
    Write-Host "  Failed to fetch orders: $_" -ForegroundColor Red
    $orders = @()
}

if (-not $orders -or $orders.Count -eq 0) {
    Write-Host "  None" -ForegroundColor Gray
} else {
    Write-Host ("  {0,-42} {1,6} {2,8} {3,8} {4,12}" -f "Ticker", "Side", "Count", "Price¢", "Order ID")
    Write-Host "  " + ("-" * 82)
    foreach ($o in $orders) {
        $ticker = $o.ticker
        $side = $o.side
        $count = $o.count
        $price = if ($o.yes_price) { $o.yes_price } else { $o.no_price }
        $oid = if ($o.order_id) { $o.order_id.Substring(0, [Math]::Min(12, $o.order_id.Length)) + "..." } else { "" }
        Write-Host ("  {0,-42} {1,6} {2,8} {3,8} {4,12}" -f $ticker, $side, $count, $price, $oid)
    }
    Write-Host "  Total: $($orders.Count) resting order(s)" -ForegroundColor White
}

Write-Host ""
