-- Check if the tip from the recent payment was updated
-- Tip ID from event: 4f312418-1842-4185-a936-18b220fe4a35

SELECT 
  tip_id,
  booking_id,
  amount,
  status,
  stripe_payment_intent_id,
  stripe_transaction_id,
  created_at,
  updated_at,
  CASE 
    WHEN status = 'completed' THEN '✅ Webhook worked!'
    WHEN status = 'pending' AND stripe_payment_intent_id IS NULL THEN '⏳ Waiting for webhook...'
    WHEN status = 'pending' AND stripe_payment_intent_id IS NOT NULL THEN '⚠️ Payment received but status not updated'
    ELSE '❓ Unknown status'
  END AS status_message
FROM tips
WHERE tip_id = '4f312418-1842-4185-a936-18b220fe4a35';
