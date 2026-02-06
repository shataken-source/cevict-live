# Create a valid Stripe checkout session that will actually work
# This creates a complete, valid session with all required parameters

$stripeSecretKey = "sk_test_51STl4Q0Wlw4N1ymuno7qsBVxPFZzdharV5Tnvo9UWQ2lvRffLiuObgQw4nWPMJFm7B4e4YiGkhhBlVoFn0FWnxI600VwIHxzOn"

Write-Host "Creating valid Stripe checkout session..." -ForegroundColor Cyan

# Generate test booking ID
$bookingId = "test-booking-$(Get-Date -Format 'yyyyMMddHHmmss')"
$bookingDate = (Get-Date).AddDays(7).ToString("yyyy-MM-dd")

# Create checkout session with all required parameters
$body = @(
    "mode=payment",
    "payment_method_types[]=card",
    "line_items[0][price_data][currency]=usd",
    "line_items[0][price_data][product_data][name]=Test Gulf Coast Charter Booking",
    "line_items[0][price_data][product_data][description]=Test booking to trigger Zapier automation",
    "line_items[0][price_data][unit_amount]=10000",
    "line_items[0][quantity]=1",
    "success_url=https://gulfcoastcharters.com/payment-success?session_id={CHECKOUT_SESSION_ID}",
    "cancel_url=https://gulfcoastcharters.com/payment-cancel",
    "customer_email=test@example.com",
    "metadata[bookingId]=$bookingId",
    "metadata[customerName]=Test Customer",
    "metadata[customerPhone]=+12025551234",
    "metadata[charterName]=Test Charter",
    "metadata[bookingDate]=$bookingDate",
    "metadata[bookingTime]=09:00",
    "expires_at=$(Get-Date).AddHours(24).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')"
) -join "&"

try {
    # Create checkout session
    $response = Invoke-WebRequest -Uri "https://api.stripe.com/v1/checkout/sessions" `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer $stripeSecretKey"
            "Content-Type" = "application/x-www-form-urlencoded"
        } `
        -Body $body
    
    $checkoutSession = $response.Content | ConvertFrom-Json
    
    Write-Host ""
    Write-Host "✅ Checkout Session Created Successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Session ID: $($checkoutSession.id)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Checkout URL:" -ForegroundColor Cyan
    Write-Host "$($checkoutSession.url)" -ForegroundColor White
    Write-Host ""
    Write-Host "Status: $($checkoutSession.status)" -ForegroundColor Yellow
    Write-Host "Payment Status: $($checkoutSession.payment_status)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Test Booking Details:" -ForegroundColor Magenta
    Write-Host "  Booking ID: $bookingId" -ForegroundColor White
    Write-Host "  Customer: Test Customer" -ForegroundColor White
    Write-Host "  Email: test@example.com" -ForegroundColor White
    Write-Host "  Amount: $100.00" -ForegroundColor White
    Write-Host ""
    Write-Host "👉 Open the URL above in your browser to complete the payment!" -ForegroundColor Green
    Write-Host "   Use test card: 4242 4242 4242 4242" -ForegroundColor Cyan
    
} catch {
    Write-Host ""
    Write-Host "❌ Error creating checkout session" -ForegroundColor Red
    $errorMsg = $_.Exception.Message
    Write-Host "Message: $errorMsg" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        try {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $responseBody = $reader.ReadToEnd()
            Write-Host ""
            Write-Host "Stripe API Response:" -ForegroundColor Yellow
            Write-Host $responseBody -ForegroundColor Red
        } catch {
            Write-Host "Could not read error response" -ForegroundColor Red
        }
    }
}
