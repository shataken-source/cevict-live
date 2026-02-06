# Test Stripe Booking Script
# Creates a test checkout session and completes payment to trigger Zapier automation

$stripeSecretKey = "sk_test_51STl4Q0Wlw4N1ymuno7qsBVxPFZzdharV5Tnvo9UWQ2lvRffLiuObgQw4nWPMJFm7B4e4YiGkhhBlVoFn0FWnxI600VwIHxzOn"
$stripePublishableKey = "pk_test_51STl4Q0Wlw4N1ymu6u55CoT5RdRm06bWSAu2HE4SF5ntO9WunQZOoJlcU115cba9bOX3GXRG7iulbrecna8x0LBm00DlpJClyB"

Write-Host "Creating test Stripe checkout session..." -ForegroundColor Cyan

# Create a test checkout session
$checkoutBody = @{
    mode = "payment"
    payment_method_types = @("card")
    line_items = @(
        @{
            price_data = @{
                currency = "usd"
                product_data = @{
                    name = "Test Gulf Coast Charter Booking"
                    description = "Test booking to trigger Zapier automation"
                }
                unit_amount = 10000  # $100.00 in cents
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
} | ConvertTo-Json -Depth 10

try {
    # Create checkout session
    $checkoutResponse = Invoke-RestMethod -Uri "https://api.stripe.com/v1/checkout/sessions" `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer $stripeSecretKey"
            "Content-Type" = "application/x-www-form-urlencoded"
        } `
        -Body ($checkoutBody | ConvertTo-Json -Compress | ForEach-Object { $_ -replace '"', '\"' } | ForEach-Object { $_ -replace '\{', '{' } | ForEach-Object { $_ -replace '\}', '}' })

    Write-Host "Checkout session created!" -ForegroundColor Green
    Write-Host "Session ID: $($checkoutResponse.id)" -ForegroundColor Yellow
    Write-Host "URL: $($checkoutResponse.url)" -ForegroundColor Yellow
    
    # Now create a payment intent and complete it to simulate a successful payment
    Write-Host "`nCreating payment intent..." -ForegroundColor Cyan
    
    $paymentIntentBody = @{
        amount = 10000
        currency = "usd"
        payment_method_types = @("card")
        metadata = $checkoutBody.metadata
    } | ConvertTo-Json -Depth 10
    
    $paymentIntent = Invoke-RestMethod -Uri "https://api.stripe.com/v1/payment_intents" `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer $stripeSecretKey"
            "Content-Type" = "application/x-www-form-urlencoded"
        } `
        -Body ($paymentIntentBody | ConvertTo-Json -Compress)
    
    Write-Host "Payment Intent created: $($paymentIntent.id)" -ForegroundColor Green
    
    # Attach test card and confirm
    Write-Host "`nCompleting payment with test card..." -ForegroundColor Cyan
    
    $confirmBody = @{
        payment_method_data = @{
            type = "card"
            card = @{
                number = "4242424242424242"
                exp_month = 12
                exp_year = 2025
                cvc = "123"
            }
        }
    } | ConvertTo-Json -Depth 10
    
    # Use Stripe test mode to confirm payment
    $confirmedPayment = Invoke-RestMethod -Uri "https://api.stripe.com/v1/payment_intents/$($paymentIntent.id)/confirm" `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer $stripeSecretKey"
            "Content-Type" = "application/x-www-form-urlencoded"
        } `
        -Body "payment_method_data[type]=card&payment_method_data[card][number]=4242424242424242&payment_method_data[card][exp_month]=12&payment_method_data[card][exp_year]=2025&payment_method_data[card][cvc]=123"
    
    Write-Host "Payment completed!" -ForegroundColor Green
    Write-Host "Status: $($confirmedPayment.status)" -ForegroundColor Yellow
    Write-Host "`nThis should trigger your Zapier webhook!" -ForegroundColor Cyan
    
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.Exception.Response)" -ForegroundColor Red
}
