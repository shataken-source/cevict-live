-- Crypto Payments Table
-- Stores cryptocurrency payment records from Coinbase Commerce

CREATE TABLE IF NOT EXISTS crypto_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    charge_id TEXT UNIQUE NOT NULL, -- Coinbase Commerce charge ID
    code TEXT UNIQUE NOT NULL, -- Charge code for user-facing reference
    user_id UUID, -- Optional: link to user if authenticated
    plan_id TEXT, -- Plan/product ID
    amount_usd DECIMAL(10, 2) NOT NULL,
    amount_crypto DECIMAL(18, 8) NOT NULL, -- Supports up to 8 decimal places for crypto
    currency TEXT NOT NULL CHECK (currency IN ('BTC', 'ETH')),
    address TEXT NOT NULL, -- Crypto address to send payment to
    status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'PENDING', 'COMPLETED', 'EXPIRED', 'FAILED')),
    hosted_url TEXT, -- Coinbase Commerce hosted payment page URL
    transaction_id TEXT, -- Blockchain transaction ID (set when confirmed)
    expires_at TIMESTAMP WITH TIME ZONE,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_crypto_payments_user_id ON crypto_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_payments_charge_id ON crypto_payments(charge_id);
CREATE INDEX IF NOT EXISTS idx_crypto_payments_status ON crypto_payments(status);
CREATE INDEX IF NOT EXISTS idx_crypto_payments_created_at ON crypto_payments(created_at DESC);

-- RLS Policies
ALTER TABLE crypto_payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own payments
CREATE POLICY "Users can view their own crypto payments" ON crypto_payments
    FOR SELECT USING (auth.uid() = user_id);

-- Service role can do everything (for API/webhooks)
-- Note: Service role bypasses RLS by default, so no policy needed

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_crypto_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_crypto_payments_updated_at
    BEFORE UPDATE ON crypto_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_crypto_payments_updated_at();

