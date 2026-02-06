-- Check if tips were updated after webhook started working
-- The payment_intent.succeeded event at 7:47 PM should have updated the tip

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
WHERE tip_id = '4f312418-1842-4185-a936-18b220fe4a35'
   OR updated_at > '2026-01-25 19:40:00'  -- After webhook started working
ORDER BY updated_at DESC;
