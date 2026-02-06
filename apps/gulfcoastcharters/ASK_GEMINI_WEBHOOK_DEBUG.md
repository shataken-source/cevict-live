# Questions for Gemini: Webhook Not Processing Events

## Context
- **Issue:** Stripe webhook events show 200 OK in Stripe Dashboard, but:
  - No processing logs appear in Supabase Edge Function logs (only startup/shutdown)
  - Tips remain `pending` in database
  - Function code has debug logging but nothing appears

- **Setup:**
  - Supabase Edge Function: `stripe-webhook`
  - JWT verification: OFF
  - Webhook secret: Configured
  - Events: `checkout.session.completed` is selected (19 events total)
  - Stripe Dashboard shows: 200 OK responses

- **Function Code:**
  - Uses `serve()` from Deno
  - Has extensive `console.log()` statements
  - Returns 200 OK with `{ received: true }`
  - Handles `checkout.session.completed` events

## Questions for Gemini

### Question 1: Missing Logs Despite 200 OK
**Why would a Supabase Edge Function return 200 OK to Stripe but show no processing logs in Supabase Dashboard?**

- Stripe Dashboard shows webhook events with 200 OK status
- Supabase logs only show "function started" and "booted" messages
- No `console.log()` output appears, even though code has extensive logging
- Function code includes: `console.log('=== WEBHOOK REQUEST RECEIVED ===')` at the very start

**Possible causes to investigate:**
- Is there a difference between the deployed function code and local code?
- Could the function be hitting an early return before logging?
- Are Deno `console.log()` statements buffered or delayed in Supabase Edge Functions?
- Could there be a routing issue where requests aren't reaching the handler?

### Question 2: Function Code Deployment
**How can I verify the deployed Supabase Edge Function code matches my local code?**

- Local file: `apps/gulfcoastcharters/supabase/functions/stripe-webhook/index.ts`
- Has debug logging added
- Deployed via Supabase Dashboard (copy/paste method)
- How to confirm the deployed version has the latest code?

**What to check:**
- Is there a way to view the deployed function code in Supabase Dashboard?
- Should I use Supabase CLI to deploy instead of Dashboard?
- Could there be a caching issue with the deployed function?

### Question 3: Deno serve() and Request Handling
**In a Deno Edge Function using `serve()`, what could cause the handler to return 200 OK without executing the main code?**

```typescript
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  console.log('=== WEBHOOK REQUEST RECEIVED ==='); // This never appears
  
  try {
    // ... webhook processing code
  } catch (error) {
    // ... error handling
  }
});
```

**Questions:**
- Could CORS preflight be intercepting all requests?
- Is there a way to verify the request method and URL in Supabase logs?
- Could the function be returning early due to missing headers or body?

### Question 4: Webhook Signature Verification
**If Stripe webhook signature verification fails silently, would it still return 200 OK?**

- Function code verifies signature using `stripeClient.webhooks.constructEvent()`
- If verification fails, it should throw an error and return 400
- But Stripe shows 200 OK, suggesting verification passes
- However, no logs appear after signature verification

**What to check:**
- Could signature verification be passing but event processing failing silently?
- Is there a way to add logging before signature verification?
- Could the function be using a different code path that doesn't log?

### Question 5: Supabase Edge Function Logging
**How does logging work in Supabase Edge Functions? Are there delays or filtering?**

- Added `console.log()` statements throughout the function
- No logs appear in Supabase Dashboard → Functions → Logs
- Only see "function started" and "booted" messages

**Questions:**
- Are `console.log()` statements buffered or delayed?
- Is there a log level filter that might hide INFO logs?
- Should I use `console.error()` instead of `console.log()`?
- Are there any Supabase-specific logging requirements?

### Question 6: Alternative Debugging Methods
**What are the best ways to debug a Supabase Edge Function that's not logging?**

- Function returns 200 OK but doesn't process events
- No logs appear despite extensive logging code
- Need to verify function is actually executing

**Suggestions needed:**
- Should I add a database write at the very start of the function to verify execution?
- Can I use Supabase Edge Function invocations/metrics to see if function is being called?
- Is there a way to test the function directly from Supabase Dashboard?
- Should I check function "Invocations" tab instead of "Logs" tab?

### Question 7: Stripe Webhook Event Structure
**Could the webhook be receiving events but the event structure is different than expected?**

- Code expects: `event.type === 'checkout.session.completed'`
- Code expects: `event.data.object.metadata.type === 'tip'`
- Stripe Dashboard shows event was delivered successfully

**What to verify:**
- Is the event structure in the webhook payload exactly as expected?
- Could metadata be nested differently?
- Should I log the entire event object to see its structure?

### Question 8: Function Execution Environment
**Are there any Supabase Edge Function environment differences that could cause silent failures?**

- Function works locally (presumably)
- Function deployed to Supabase
- Returns 200 OK but doesn't process

**Environment questions:**
- Are environment variables (secrets) loaded correctly?
- Could there be a timeout issue causing early termination?
- Is there a memory or execution limit being hit?
- Could the function be using a different Deno version than expected?

---

## Summary for Gemini

**The core mystery:** A Supabase Edge Function is returning 200 OK to Stripe webhooks, but:
1. No processing logs appear (only startup/shutdown)
2. Database updates don't happen
3. Extensive debug logging doesn't show up

**What we need:**
- Why logs aren't appearing despite 200 OK responses
- How to verify the deployed function code matches local code
- Best debugging strategies for Supabase Edge Functions
- Whether there's a silent failure or early return happening

**Key files:**
- Function code: `apps/gulfcoastcharters/supabase/functions/stripe-webhook/index.ts`
- Has debug logging added but logs don't appear
- Function uses Deno `serve()` pattern
- Handles Stripe webhook signature verification

Please help diagnose why the function appears to execute (200 OK) but doesn't log or process events.
