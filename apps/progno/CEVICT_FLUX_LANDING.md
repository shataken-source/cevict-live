# Cevict Flux v2.0
## The Statistical Engine for High-Conviction Sports Intelligence

Cevict Flux is a developer-first API delivering deep-market analytics, Monte Carlo simulation pathing, and arbitrage discovery for the 2025 sports landscape. Built for those who demand institutional-grade data integrity.

---

## Core Modules

| Module | Feature | Capability |
|--------|---------|------------|
| **SimEngine** | Monte Carlo | 100k+ iterations on-demand via background job queues (BullMQ) |
| **ArbOptic** | Arbitrage Detection | Real-time cross-book discrepancy monitoring (>2% alerts) with input slop protection |
| **BlazeStream** | 2025 Data | Native integration with the SportsBlaze 2025 season engine |
| **VaultGuard** | Security | HMAC-signed performance tracking and Zod-sanitized inputs |
| **Claude Effect** | AI Enhancement | 7-dimensional probability framework (Sentiment, Narrative, IAI, CSI, NIG, TRD, EPD) |
| **ConsentGate** | Legal Compliance | Alabama-compliant consent tracking with 30-day expiry |

---

## Developer Quickstart

### Install the Cevict Flux Client

```bash
npm install @cevict/flux-sdk
```

### TypeScript Example

```typescript
import { FluxClient } from '@cevict/flux-sdk';

const flux = new FluxClient({
  apiKey: process.env.CEVICT_FLUX_KEY,
  requireConsent: true
});

// Trigger a high-conviction simulation
const { jobId } = await flux.simulate({
  gameId: '2025-bama-vs-georgia',
  iterations: 50000,
  winProbability: 0.58
});

console.log(`Simulation queued: ${jobId}`);

// Check simulation status
const status = await flux.getSimulationStatus(jobId);
console.log(`Progress: ${status.progress}%`);
```

### cURL Example

```bash
# Get a prediction with Claude Effect
curl -X GET "https://progno.cevict.com/api/progno/v2?action=prediction&gameId=nfl-chiefs-bills-2025-01-15&includeClaudeEffect=true" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "X-Progno-Consent: 2025-01-15T10:00:00Z"

# Run async simulation
curl -X POST "https://progno.cevict.com/api/progno/v2?action=simulate" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "X-Progno-Consent: 2025-01-15T10:00:00Z" \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "nfl-chiefs-bills-2025-01-15",
    "iterations": 50000,
    "async": true
  }'
```

---

## Why Cevict Flux?

### 🛡️ Legal Shielding
Built-in dynamic disclaimers and consent-header requirements tailored for the 2025 Alabama regulatory environment. Every API response includes Alabama-specific legal notices.

### ⚡ Performance-First
Asynchronous job processing (BullMQ) ensures your UI never hangs while the engine grinds the numbers. Simulations run in background workers with progress tracking.

### 📊 Audit-Ready
Every prediction is logged with a unique HMAC hash, allowing for full "back-testing" and auditability by high-stakes legal firms. PII is anonymized using SHA-256 hashing.

### 🔐 Security-First
- **API Key Scoping**: 12 permission scopes (predictions:read, simulations:write, etc.)
- **Rate Limiting**: Tiered limits (Free: 100/hr, Pro: 1k/hr, Elite: 5k/hr, Enterprise: 10k/hr)
- **Input Validation**: Zod schemas prevent DoS attacks and invalid data
- **HMAC Signing**: All performance data is cryptographically signed

### 🎯 Intelligence Features
- **Claude Effect**: 7-dimensional AI-powered prediction enhancement
- **Correlation Detection**: Parlay analyzer detects correlated legs and adjusts probability
- **Input Slop Protection**: Arbitrage detector accounts for rounding errors and stale data
- **Health Monitoring**: Real-time provider health checks with response time tracking

---

## API Endpoints

### Health & System
- `GET /api/progno/v2?action=health` - System health check
- `GET /api/progno/v2?action=info` - API information and capabilities

### Games & Odds
- `GET /api/progno/v2?action=games&sport=nfl&date=2025-01-15` - Get upcoming games
- `GET /api/progno/v2?action=odds&gameId=...` - Get current odds

### Predictions
- `GET /api/progno/v2?action=prediction&gameId=...&includeClaudeEffect=true` - Get single prediction
- `POST /api/progno/v2?action=predict` - Create prediction
- `GET /api/progno/v2?action=predictions&sport=nfl&limit=50` - Get multiple predictions

### Simulations (SimEngine)
- `POST /api/progno/v2?action=simulate` - Queue async simulation (returns jobId)
- `GET /api/progno/v2?action=simulation-status&jobId=...` - Check simulation status
- `GET /api/progno/v2?action=simulation&gameId=...&iterations=10000` - Run sync simulation

### Arbitrage (ArbOptic)
- `GET /api/progno/v2?action=arbitrage&sport=nfl&minProfit=0.5` - Find arbitrage opportunities

### Parlays
- `POST /api/progno/v2?action=parlay` - Analyze parlay with correlation detection
- `POST /api/progno/v2?action=teaser` - Analyze teaser bet

### Claude Effect
- `GET /api/progno/v2?action=claude-effect&gameId=...` - Get 7-dimensional analysis

### Performance & Tracking
- `GET /api/progno/v2?action=leaderboard&period=7d` - Get performance stats
- `POST /api/progno/v2?action=track-bet` - Track placed bet (HMAC-signed)

### Bankroll Management
- `POST /api/progno/v2?action=bankroll` - Optimize bankroll allocation

---

## Authentication & Consent

### API Key Authentication
All requests require an API key in the `Authorization` header:
```
Authorization: Bearer YOUR_API_KEY
```

### Consent Header (Required)
All requests (except health/info) require a consent timestamp:
```
X-Progno-Consent: 2025-01-15T10:00:00Z
```

Consent expires after 30 days. Use the Gatekeeper component to obtain consent.

### API Key Tiers & Scopes

| Tier | Requests/Hour | Burst Limit | Scopes |
|------|---------------|-------------|--------|
| **Free** | 100 | 10 | predictions:read, games:read, odds:read |
| **Pro** | 1,000 | 50 | + predictions:write, simulations:read, arbitrage:read, parlays:read |
| **Elite** | 5,000 | 200 | + simulations:write, parlays:write, performance:read, claude-effect:read |
| **Enterprise** | 10,000 | 500 | * (all scopes) |

---

## Response Format

All responses follow this structure:

```json
{
  "success": true,
  "data": { ... },
  "disclaimer": "CEVICT FLUX v2.0: FOR ENTERTAINMENT & INFORMATIONAL PURPOSES ONLY...",
  "meta": {
    "timestamp": "2025-01-15T10:00:00Z",
    "version": "2.0.0",
    "requestId": "req_1234567890_abc123",
    "cached": false
  }
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "code": "CONSENT_REQUIRED",
    "message": "Legal consent acknowledgment is required to use this API."
  },
  "meta": {
    "timestamp": "2025-01-15T10:00:00Z",
    "version": "2.0.0",
    "requestId": "req_1234567890_abc123",
    "consent": {
      "required": true,
      "expired": false,
      "daysRemaining": 25,
      "requiresRenewal": false
    }
  }
}
```

---

## Legal & Compliance

### Alabama State Disclosures
Under the Alabama Data Breach Notification Act, we maintain rigorous encryption (AES-256) for all API keys and historical logs. As a 2025 Alabama-based entity, we store all "Skill-Based Analytics" data on secure, localized servers.

### Privacy Policy Highlights
1. **Data Minimization & AI Usage**: We do not train global models on your private strategy data
2. **Anonymized Performance Tracking**: All data is salted and hashed - we track logic, not persons
3. **No Automated Decision-Making**: Cevict Flux is a Decision Support System (DSS), not an Automated Decision System
4. **Alabama State Compliance**: Full compliance with 2025 Alabama regulations

### Consent Management
- Consent expires after 30 days
- Consent must be renewed via the Gatekeeper component
- All consent records are stored in Supabase with full audit trail

---

## Rate Limits & Quotas

Rate limits are enforced per API key tier. When exceeded, you'll receive a `429 Too Many Requests` response:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Tier: pro. Reset at: 2025-01-15T11:00:00Z"
  },
  "meta": {
    "rateLimit": {
      "remaining": 0,
      "resetAt": "2025-01-15T11:00:00Z",
      "tier": "pro"
    }
  }
}
```

Response headers include:
- `X-RateLimit-Remaining`: Number of requests remaining
- `X-RateLimit-Reset`: Timestamp when limit resets
- `Retry-After`: Seconds until retry is allowed

---

## Testing

### Postman Collection
Import `cevict_flux_v2_postman.json` into Postman to test all endpoints.

### Environment Variables
Set up a Postman Environment with:
- `base_url`: `https://progno.cevict.com`
- `api_key`: Your API key
- `consent_timestamp`: ISO timestamp of your consent (valid for 30 days)

---

## Support & Documentation

- **API Documentation**: See `API-DOCUMENTATION.md`
- **Postman Collection**: `cevict_flux_v2_postman.json`
- **Legal Disclaimers**: See `app/lib/legal-service.ts`
- **Security Audit**: All endpoints include HMAC signing and PII anonymization

---

## Pre-Flight Security Checklist

Before production deployment:

- [ ] Rotate all SportsBlaze API keys & use Environment Variables
- [ ] Ensure Redis is password-protected (for BullMQ)
- [ ] Add the "Dead-Man Switch" to the SimulationEngine (TTL < 30s) ✅
- [ ] Add Cevict-Flux-Consent header requirement to /arbitrage ✅
- [ ] Confirm OddsService has a 5-second cache to prevent "Rate Limit Hell" ✅

---

**Cevict Flux v2.0** - Built with conviction. Powered by intelligence.

