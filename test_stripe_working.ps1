# Create a working Stripe checkout session
# Simplified approach with correct formatting

$stripeSecretKey = "sk_test_51STl4Q0Wlw4N1ymuno7qsBVxPFZzdharV5Tnvo9UWQ2lvRffLiuObgQw4nWPMJFm7B4e4YiGkhhBlVoFn0FWnxI600VwIHxzOn"

Write-Host "Creating Stripe checkout session..." -ForegroundColor Cyan

# Generate test booking ID
$bookingId = "test-booking-$(Get-Date -Format 'yyyyMMddHHmmss')"
$bookingDate = (Get-Date).AddDays(7).ToString("yyyy-MM-dd")

# Build form data properly
$formData = @{
    "mode" = "payment"
    "payment_method_types[]" = "card"
    "line_items[0][price_data][currency]" = "usd"
    "line_items[0][price_data][product_data][name]" = "Test Gulf Coast Charter Booking"
    "line_items[0][price_data][unit_amount]" = "10000"
    "line_items[0][quantity]" = "1"
    "success_url" = "https://gulfcoastcharters.com/payment-success?session_id={CHECKOUT_SESSION_ID}"
    "cancel_url" = "https://gulfcoastcharters.com/payment-cancel"
    "customer_email" = "test@example.com"
    "metadata[bookingId]" = $bookingId
    "metadata[customerName]" = "Test Customer"
    "metadata[customerPhone]" = "+12025551234"
    "metadata[charterName]" = "Test Charter"
    "metadata[bookingDate]" = $bookingDate
    "metadata[bookingTime]" = "09:00"
}

# Convert to form-encoded string (simple approach)
$bodyParts = @()
foreach ($key in $formData.Keys) {
    $value = $formData[$key]
    # Simple URL encoding for special characters
    $encodedValue = $value -replace ' ', '%20' -replace '\+', '%2B' -replace '&', '%26' -replace '=', '%3D'
    $bodyParts += "$key=$encodedValue"
}
$body = $bodyParts -join "&"

try {
    # Create checkout session
    $response = Invoke-RestMethod -Uri "https://api.stripe.com/v1/checkout/sessions" `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer $stripeSecretKey"
            "Content-Type" = "application/x-www-form-urlencoded"
        } `
        -Body $body
    
    Write-Host ""
    Write-Host "✅ Checkout Session Created!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Session ID: $($response.id)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Checkout URL:" -ForegroundColor Cyan
    Write-Host "$($response.url)" -ForegroundColor White
    Write-Host ""
    Write-Host "Status: $($response.status)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Test Details:" -ForegroundColor Magenta
    Write-Host "  Booking ID: $bookingId" -ForegroundColor White
    Write-Host "  Customer: Test Customer" -ForegroundColor White
    Write-Host "  Email: test@example.com" -ForegroundColor White
    Write-Host "  Amount: $100.00" -ForegroundColor White
    Write-Host ""
    Write-Host "👉 Copy the URL above and open it in your browser!" -ForegroundColor Green
    Write-Host "   Use test card: 4242 4242 4242 4242" -ForegroundColor Cyan
    
} catch {
    Write-Host ""
    Write-Host "❌ Error occurred" -ForegroundColor Red
    Write-Host "Message: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.ErrorDetails) {
        Write-Host ""
        Write-Host "Error Details:" -ForegroundColor Yellow
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
    
    if ($_.Exception.Response) {
        try {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $responseBody = $reader.ReadToEnd()
            Write-Host ""
            Write-Host "API Response:" -ForegroundColor Yellow
            Write-Host $responseBody -ForegroundColor Red
        } catch {
            # Ignore
        }
    }
}
