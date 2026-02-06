# Create and complete a Stripe Payment Intent to trigger Zapier webhook
# This simulates a completed checkout session

$stripeSecretKey = "sk_test_51STl4Q0Wlw4N1ymuno7qsBVxPFZzdharV5Tnvo9UWQ2lvRffLiuObgQw4nWPMJFm7B4e4YiGkhhBlVoFn0FWnxI600VwIHxzOn"

Write-Host "Creating test payment intent with booking metadata..." -ForegroundColor Cyan

# Generate test booking ID
$bookingId = "test-booking-$(Get-Date -Format 'yyyyMMddHHmmss')"
$bookingDate = (Get-Date).AddDays(7).ToString("yyyy-MM-dd")

# Step 1: Create Payment Intent
$piBody = @(
    "amount=10000",
    "currency=usd",
    "payment_method_types[]=card",
    "metadata[bookingId]=$bookingId",
    "metadata[customerName]=Test Customer",
    "metadata[customerPhone]=+12025551234",
    "metadata[charterName]=Test Charter",
    "metadata[bookingDate]=$bookingDate",
    "metadata[bookingTime]=09:00"
) -join "&"

try {
    # Create payment intent
    $paymentIntent = Invoke-RestMethod -Uri "https://api.stripe.com/v1/payment_intents" `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer $stripeSecretKey"
            "Content-Type" = "application/x-www-form-urlencoded"
        } `
        -Body $piBody

    Write-Host ""
    Write-Host "Payment Intent Created: $($paymentIntent.id)" -ForegroundColor Green
    
    # Step 2: Attach test card and confirm
    Write-Host "Completing payment with test card 4242 4242 4242 4242..." -ForegroundColor Cyan
    
    $confirmBody = @(
        "payment_method_data[type]=card",
        "payment_method_data[card][number]=4242424242424242",
        "payment_method_data[card][exp_month]=12",
        "payment_method_data[card][exp_year]=2025",
        "payment_method_data[card][cvc]=123",
        "return_url=https://gulfcoastcharters.com/payment-success"
    ) -join "&"
    
    $confirmedPayment = Invoke-RestMethod -Uri "https://api.stripe.com/v1/payment_intents/$($paymentIntent.id)/confirm" `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer $stripeSecretKey"
            "Content-Type" = "application/x-www-form-urlencoded"
        } `
        -Body $confirmBody

    Write-Host ""
    Write-Host "Payment Completed!" -ForegroundColor Green
    Write-Host "Status: $($confirmedPayment.status)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "This should trigger your Zapier webhook for checkout.session.completed!" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Payment Details:" -ForegroundColor Magenta
    Write-Host "  Payment Intent ID: $($confirmedPayment.id)" -ForegroundColor White
    Write-Host "  Booking ID: $bookingId" -ForegroundColor White
    Write-Host "  Customer: Test Customer" -ForegroundColor White
    Write-Host "  Amount: 100.00 USD" -ForegroundColor White
    Write-Host "  Status: $($confirmedPayment.status)" -ForegroundColor White
    
    # Note: To trigger checkout.session.completed, we need to create a checkout session
    # and mark it as completed. Let's do that now.
    Write-Host ""
    Write-Host "Creating checkout session to match payment intent..." -ForegroundColor Cyan
    
    $sessionBody = @(
        "mode=payment",
        "payment_intent=$($confirmedPayment.id)",
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
    Write-Host "The payment is complete and should trigger Zapier!" -ForegroundColor Green
    Write-Host "Check your Zapier dashboard for the triggered webhook." -ForegroundColor Cyan
    
} catch {
    Write-Host ""
    Write-Host "Error occurred" -ForegroundColor Red
    $errorMsg = $_.Exception.Message
    Write-Host "Message: $errorMsg" -ForegroundColor Red
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}
