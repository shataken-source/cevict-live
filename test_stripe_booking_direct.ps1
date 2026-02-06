# Direct Stripe Test Payment Script
# Creates a completed checkout session to trigger Zapier webhook

$stripeSecretKey = "sk_test_51STl4Q0Wlw4N1ymuno7qsBVxPFZzdharV5Tnvo9UWQ2lvRffLiuObgQw4nWPMJFm7B4e4YiGkhhBlVoFn0FWnxI600VwIHxzOn"

Write-Host "Creating test Stripe checkout session with metadata..." -ForegroundColor Cyan

# Step 1: Create checkout session
$checkoutParams = @{
    mode = "payment"
    payment_method_types = "card"
    line_items = @(
        @{
            price_data = @{
                currency = "usd"
                product_data = @{
                    name = "Test Gulf Coast Charter Booking"
                }
                unit_amount = 10000
            }
            quantity = 1
        }
    )
    success_url = "https://gulfcoastcharters.com/payment-success?session_id={CHECKOUT_SESSION_ID}"
    cancel_url = "https://gulfcoastcharters.com/payment-cancel"
    customer_email = "test@example.com"
    metadata = @{
        bookingId = "test-booking-$(Get-Date -Format 'yyyyMMddHHmmss')"
        customerName = "Test Customer"
        customerPhone = "+12025551234"
        charterName = "Test Charter"
        bookingDate = (Get-Date).AddDays(7).ToString("yyyy-MM-dd")
        bookingTime = "09:00"
    }
}

# Convert to form-encoded format for Stripe API
$formData = @()
$formData += "mode=payment"
$formData += "payment_method_types[]=card"
$formData += "line_items[0][price_data][currency]=usd"
$formData += "line_items[0][price_data][product_data][name]=Test Gulf Coast Charter Booking"
$formData += "line_items[0][price_data][unit_amount]=10000"
$formData += "line_items[0][quantity]=1"
$formData += "success_url=https://gulfcoastcharters.com/payment-success?session_id={CHECKOUT_SESSION_ID}"
$formData += "cancel_url=https://gulfcoastcharters.com/payment-cancel"
$formData += "customer_email=test@example.com"
$formData += "metadata[bookingId]=test-booking-$(Get-Date -Format 'yyyyMMddHHmmss')"
$formData += "metadata[customerName]=Test Customer"
$formData += "metadata[customerPhone]=+12025551234"
$formData += "metadata[charterName]=Test Charter"
$formData += "metadata[bookingDate]=$(Get-Date).AddDays(7).ToString('yyyy-MM-dd')"
$formData += "metadata[bookingTime]=09:00"

$body = $formData -join "&"

try {
    $checkoutSession = Invoke-RestMethod -Uri "https://api.stripe.com/v1/checkout/sessions" `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer $stripeSecretKey"
            "Content-Type" = "application/x-www-form-urlencoded"
        } `
        -Body $body

    Write-Host "`n✅ Checkout Session Created!" -ForegroundColor Green
    Write-Host "Session ID: $($checkoutSession.id)" -ForegroundColor Yellow
    Write-Host "URL: $($checkoutSession.url)" -ForegroundColor Yellow
    Write-Host "`nNow completing payment..." -ForegroundColor Cyan

    # Step 2: Create payment intent from session
    $paymentIntentId = $checkoutSession.payment_intent
    
    if ($paymentIntentId) {
        # Step 3: Confirm payment with test card
        $confirmBody = "payment_method_data[type]=card&payment_method_data[card][number]=4242424242424242&payment_method_data[card][exp_month]=12&payment_method_data[card][exp_year]=2025&payment_method_data[card][cvc]=123&return_url=https://gulfcoastcharters.com/payment-success"
        
        $confirmedPayment = Invoke-RestMethod -Uri "https://api.stripe.com/v1/payment_intents/$paymentIntentId/confirm" `
            -Method POST `
            -Headers @{
                "Authorization" = "Bearer $stripeSecretKey"
                "Content-Type" = "application/x-www-form-urlencoded"
            } `
            -Body $confirmBody

        Write-Host "`n✅ Payment Completed!" -ForegroundColor Green
        Write-Host "Payment Intent Status: $($confirmedPayment.status)" -ForegroundColor Yellow
        Write-Host "`n📧 This should trigger your Zapier webhook!" -ForegroundColor Cyan
        Write-Host "Check your Zapier dashboard for the triggered Zap." -ForegroundColor Cyan
        
        Write-Host "`nSession Details:" -ForegroundColor Magenta
        Write-Host "  Booking ID: $($checkoutSession.metadata.bookingId)" -ForegroundColor White
        Write-Host "  Customer: $($checkoutSession.metadata.customerName)" -ForegroundColor White
        Write-Host "  Email: $($checkoutSession.customer_email)" -ForegroundColor White
        Write-Host "  Amount: $($checkoutSession.amount_total / 100)" -ForegroundColor White
        
    } else {
        Write-Host "`n⚠️  No payment intent found. Session created but payment needs to be completed manually." -ForegroundColor Yellow
        Write-Host "Visit: $($checkoutSession.url)" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "`n❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}
