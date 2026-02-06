# Simple Stripe Test Payment Script
# Creates a completed checkout session to trigger Zapier webhook

$stripeSecretKey = "sk_test_51STl4Q0Wlw4N1ymuno7qsBVxPFZzdharV5Tnvo9UWQ2lvRffLiuObgQw4nWPMJFm7B4e4YiGkhhBlVoFn0FWnxI600VwIHxzOn"

Write-Host "Creating test Stripe checkout session..." -ForegroundColor Cyan

# Generate test booking ID
$bookingId = "test-booking-$(Get-Date -Format 'yyyyMMddHHmmss')"
$bookingDate = (Get-Date).AddDays(7).ToString("yyyy-MM-dd")

# Create form-encoded body for checkout session
$body = @(
    "mode=payment",
    "payment_method_types[]=card",
    "line_items[0][price_data][currency]=usd",
    "line_items[0][price_data][product_data][name]=Test Gulf Coast Charter Booking",
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
    "metadata[bookingTime]=09:00"
) -join "&"

try {
    # Create checkout session
    $checkoutSession = Invoke-RestMethod -Uri "https://api.stripe.com/v1/checkout/sessions" `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer $stripeSecretKey"
            "Content-Type" = "application/x-www-form-urlencoded"
        } `
        -Body $body

    Write-Host ""
    Write-Host "Checkout Session Created!" -ForegroundColor Green
    Write-Host "Session ID: $($checkoutSession.id)" -ForegroundColor Yellow
    Write-Host "URL: $($checkoutSession.url)" -ForegroundColor Yellow
    
    # Get payment intent ID
    $paymentIntentId = $checkoutSession.payment_intent
    
    if ($paymentIntentId) {
        Write-Host ""
        Write-Host "Completing payment with test card..." -ForegroundColor Cyan
        
        # Confirm payment with test card
        $confirmBody = "payment_method_data[type]=card&payment_method_data[card][number]=4242424242424242&payment_method_data[card][exp_month]=12&payment_method_data[card][exp_year]=2025&payment_method_data[card][cvc]=123"
        
        $confirmedPayment = Invoke-RestMethod -Uri "https://api.stripe.com/v1/payment_intents/$paymentIntentId/confirm" `
            -Method POST `
            -Headers @{
                "Authorization" = "Bearer $stripeSecretKey"
                "Content-Type" = "application/x-www-form-urlencoded"
            } `
            -Body $confirmBody

        Write-Host ""
        Write-Host "Payment Completed!" -ForegroundColor Green
        Write-Host "Payment Intent Status: $($confirmedPayment.status)" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "This should trigger your Zapier webhook!" -ForegroundColor Cyan
        
        Write-Host ""
        Write-Host "Session Details:" -ForegroundColor Magenta
        Write-Host "  Booking ID: $bookingId" -ForegroundColor White
        Write-Host "  Customer: Test Customer" -ForegroundColor White
        Write-Host "  Email: test@example.com" -ForegroundColor White
        Write-Host "  Amount: 100.00" -ForegroundColor White
        Write-Host "  Session ID: $($checkoutSession.id)" -ForegroundColor White
        
    } else {
        Write-Host ""
        Write-Host "No payment intent found. Visit the checkout URL to complete payment:" -ForegroundColor Yellow
        Write-Host "$($checkoutSession.url)" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host ""
    Write-Host "Error occurred" -ForegroundColor Red
    $errorMsg = $_.Exception.Message
    Write-Host "Message: $errorMsg" -ForegroundColor Red
}
