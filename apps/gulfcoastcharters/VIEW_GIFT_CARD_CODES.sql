-- View gift card codes (most recent first)

SELECT 
  certificate_id,
  code,
  recipient_name,
  recipient_email,
  amount,
  status,
  stripe_payment_intent_id,
  purchased_at,
  created_at
FROM gift_certificates
ORDER BY created_at DESC
LIMIT 10;

-- Or view just the most recent one
SELECT 
  code,
  recipient_name,
  recipient_email,
  amount,
  status,
  message,
  purchased_at
FROM gift_certificates
ORDER BY created_at DESC
LIMIT 1;
