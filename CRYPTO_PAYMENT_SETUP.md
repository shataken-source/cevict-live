# Cryptocurrency Payment Integration - BTC & ETH

## ✅ Implementation Complete

### Features Implemented

1. **Coinbase Commerce Integration**
   - Bitcoin (BTC) payments
   - Ethereum (ETH) payments
   - Automatic address generation
   - Real-time payment monitoring
   - Webhook support for instant confirmations

2. **API Endpoints**
   - `/api/payments/crypto/create-charge` - Create payment request
   - `/api/payments/crypto/status` - Check payment status
   - `/api/payments/crypto/webhook` - Handle payment confirmations

3. **Database Schema**
   - `crypto_payments` table for tracking all crypto transactions
   - Stores charge IDs, addresses, amounts, status
   - Links to users and plans

4. **Payment Form Enhancement**
   - Added BTC and ETH payment buttons
   - Real-time payment status polling
   - QR code and address display
   - Hosted payment page option

## Setup Instructions

### 1. Coinbase Commerce Account

1. Sign up at https://commerce.coinbase.com
2. Create an API key in Settings → API Keys
3. Set up webhook endpoint (see below)

### 2. Environment Variables

Add to `.env.local`:

```bash
# Coinbase Commerce API
COINBASE_COMMERCE_API_KEY=your_api_key_here
COINBASE_COMMERCE_WEBHOOK_SECRET=your_webhook_secret_here
```

### 3. Database Migration

Run the migration to create the crypto_payments table:

```bash
# If using Supabase CLI
supabase migration up

# Or run the SQL file directly in Supabase dashboard
# File: supabase/migrations/20250127_crypto_payments.sql
```

### 4. Webhook Configuration

1. Go to Coinbase Commerce Dashboard → Settings → Webhooks
2. Add webhook URL: `https://yourdomain.com/api/payments/crypto/webhook`
3. Copy the webhook secret to `COINBASE_COMMERCE_WEBHOOK_SECRET`

### 5. Testing

**Test Mode:**
- Coinbase Commerce has a test mode
- Use test API keys for development
- Test payments use testnet (not real crypto)

**Production:**
- Switch to production API keys
- Real BTC/ETH payments will be processed
- Payments are confirmed on blockchain

## How It Works

1. **User selects crypto payment** (BTC or ETH)
2. **System creates charge** via Coinbase Commerce API
3. **User receives payment address** and amount
4. **User sends crypto** to the address
5. **Coinbase monitors blockchain** for payment
6. **Webhook confirms payment** when detected
7. **System grants access** to user

## Payment Flow

```
User → Select Crypto → Create Charge → Get Address
  ↓
Send Crypto → Blockchain → Coinbase Detects
  ↓
Webhook → Update Status → Grant Access
```

## Benefits

- ✅ **Free** - No transaction fees (only network fees)
- ✅ **Global** - Works worldwide
- ✅ **Fast** - BTC: ~10 min, ETH: ~2 min confirmations
- ✅ **Secure** - Non-custodial, direct blockchain payments
- ✅ **Privacy** - No credit card required
- ✅ **Low Fees** - Only network transaction fees

## Fees

- **Coinbase Commerce**: Free (0% fees)
- **Network Fees**: Paid by user (varies by network)
  - Bitcoin: ~$1-5 per transaction
  - Ethereum: ~$0.50-5 per transaction (depends on gas)

## Security

- ✅ Webhook signature verification
- ✅ HTTPS only in production
- ✅ Database encryption
- ✅ Payment expiration (30 minutes)
- ✅ Unique addresses per transaction

## Support

- **Coinbase Commerce Docs**: https://commerce.coinbase.com/docs
- **API Reference**: https://commerce.coinbase.com/docs/api
- **Status Page**: https://status.commerce.coinbase.com

## Next Steps

1. Set up Coinbase Commerce account
2. Add API keys to environment variables
3. Run database migration
4. Configure webhook endpoint
5. Test with test mode
6. Switch to production when ready

