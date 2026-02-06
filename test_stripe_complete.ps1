# Complete Stripe Test Payment to Trigger Zapier Webhook
# Creates payment method, payment intent, and completes payment

$stripeSecretKey = "sk_test_51STl4Q0Wlw4N1ymuno7qsBVxPFZzdharV5Tnvo9UWQ2lvRffLiuObgQw4nWPMJFm7B4e4YiGkhhBlVoFn0FWnxI600VwIHxzOn"

Write-Host "Creating complete test payment flow..." -ForegroundColor Cyan

# Generate test booking ID
$bookingId = "test-booking-$(Get-Date -Format 'yyyyMMddHHmmss')"
$bookingDate = (Get-Date).AddDays(7).ToString("yyyy-MM-dd")

try {
    # Step 1: Create Payment Method
    Write-Host "Creating payment method..." -ForegroundColor Cyan
    $pmBody = @(
        "type=card",
        "card[number]=4242424242424242",
        "card[exp_month]=12",
        "card[exp_year]=2025",
        "card[cvc]=123"
    ) -join "&"
    
    $paymentMethod = Invoke-RestMethod -Uri "https://api.stripe.com/v1/payment_methods" `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer $stripeSecretKey"
            "Content-Type" = "application/x-www-form-urlencoded"
        } `
        -Body $pmBody
    
    Write-Host "Payment Method Created: $($paymentMethod.id)" -ForegroundColor Green
    
    # Step 2: Create Payment Intent
    Write-Host "Creating payment intent..." -ForegroundColor Cyan
    $piBody = @(
        "amount=10000",
        "currency=usd",
        "payment_method_types[]=card",
        "payment_method=$($paymentMethod.id)",
        "confirm=true",
        "return_url=https://gulfcoastcharters.com/payment-success",
        "metadata[bookingId]=$bookingId",
        "metadata[customerName]=Test Customer",
        "metadata[customerPhone]=+12025551234",
        "metadata[charterName]=Test Charter",
        "metadata[bookingDate]=$bookingDate",
        "metadata[bookingTime]=09:00"
    ) -join "&"
    
    $paymentIntent = Invoke-RestMethod -Uri "https://api.stripe.com/v1/payment_intents" `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer $stripeSecretKey"
            "Content-Type" = "application/x-www-form-urlencoded"
        } `
        -Body $piBody
    
    Write-Host ""
    Write-Host "Payment Intent Created and Confirmed!" -ForegroundColor Green
    Write-Host "Payment Intent ID: $($paymentIntent.id)" -ForegroundColor Yellow
    Write-Host "Status: $($paymentIntent.status)" -ForegroundColor Yellow
    
    # Step 3: Create Checkout Session to match (for webhook)
    Write-Host ""
    Write-Host "Creating checkout session for webhook..." -ForegroundColor Cyan
    
    $sessionBody = @(
        "mode=payment",
        "payment_intent=$($paymentIntent.id)",
        "success_url=https://gulfcoastcharters.com/payment-success?session_id={CHECKOUT_SESSION_ID}",
        "cancel_url=https://gulfcoastcharters.com/payment-cancel",
        "customer_email=test@example.com",
        "metadata[bookingId]=$bookingId",
        "metadata[customerName]=Test Customer",
        "metadata[customerPhone]=+12025551234",
        "metadata[charterName]=Test Charter",
        "metadata[bookingDate]=$bookingDate",
        "metadata[bookingTime]=09:00"
    ) -join "&"
    
    $checkoutSession = Invoke-RestMethod -Uri "https://api.stripe.com/v1/checkout/sessions" `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer $stripeSecretKey"
            "Content-Type" = "application/x-www-form-urlencoded"
        } `
        -Body $sessionBody
    
    Write-Host ""
    Write-Host "Checkout Session Created: $($checkoutSession.id)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Payment Details:" -ForegroundColor Magenta
    Write-Host "  Payment Intent ID: $($paymentIntent.id)" -ForegroundColor White
    Write-Host "  Checkout Session ID: $($checkoutSession.id)" -ForegroundColor White
    Write-Host "  Booking ID: $bookingId" -ForegroundColor White
    Write-Host "  Customer: Test Customer" -ForegroundColor White
    Write-Host "  Email: test@example.com" -ForegroundColor White
    Write-Host "  Amount: 100.00 USD" -ForegroundColor White
    Write-Host "  Status: $($paymentIntent.status)" -ForegroundColor White
    Write-Host ""
    Write-Host "This payment is complete and should trigger your Zapier webhook!" -ForegroundColor Cyan
    Write-Host "Check your Zapier dashboard for the triggered Zap." -ForegroundColor Cyan
    
} catch {
    Write-Host ""
    Write-Host "Error occurred" -ForegroundColor Red
    $errorMsg = $_.Exception.Message
    Write-Host "Message: $errorMsg" -ForegroundColor Red
    if ($_.Exception.Response) {
        try {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $responseBody = $reader.ReadToEnd()
            Write-Host "Response: $responseBody" -ForegroundColor Red
        } catch {
            Write-Host "Could not read error response" -ForegroundColor Red
        }
    }
}
