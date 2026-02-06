# Cevict AI Gateway

**Enterprise AI Platform Gateway** - Unified access point for all Cevict AI projects.

## 🌐 Architecture

```
                    ┌─────────────────────────────┐
                    │       cevict.ai             │
                    │    (Gateway Portal)         │
                    └─────────────┬───────────────┘
                                  │
           ┌──────────────────────┼──────────────────────┐
           │                      │                      │
    ┌──────▼──────┐       ┌──────▼──────┐       ┌──────▼──────┐
    │   PROGNO    │       │ Orchestrator │       │  Massager   │
    │  (Sports)   │       │(Multi-Agent) │       │   (Data)    │
    └─────────────┘       └──────────────┘       └─────────────┘
```

## 🚀 Environments

### Production (`cevict.ai`)
- Full security headers (CSP, HSTS, XSS protection)
- Rate limiting: 100 requests/min
- Logging level: `info`
- Debug mode: disabled

### Test (`test.cevict.ai`)
- Relaxed security for development
- Rate limiting: 500 requests/min
- Logging level: `debug`
- Debug mode: enabled

## 📁 Project Structure

```
apps/cevict-ai/
├── app/
│   ├── layout.tsx          # Root layout with fonts
│   ├── globals.css         # Tailwind + custom styles
│   ├── page.tsx            # Gateway homepage
│   ├── admin/page.tsx      # Admin dashboard
│   ├── status/page.tsx     # System status page
│   └── api/
│       ├── health/route.ts # Health check endpoint
│       ├── projects/route.ts
│       └── proxy/[...path]/route.ts
├── lib/
│   ├── config.ts           # Environment configuration
│   └── security.ts         # Security utilities
├── environments/
│   ├── production.env      # Production settings
│   └── test.env            # Test settings
└── vercel.json             # Vercel deployment config
```

## 🔐 Security Features

- **Rate Limiting**: Per-IP request throttling
- **CORS Validation**: Environment-specific origin checking
- **CSP Headers**: Content Security Policy in production
- **API Key Validation**: Tiered access control
- **Audit Logging**: Complete request logging
- **Input Sanitization**: XSS protection

## 🛠️ Development

```bash
# Install dependencies
pnpm install

# Development (default: test environment)
pnpm dev

# Development with test environment
pnpm dev:test

# Build for production
pnpm build

# Start production server
pnpm start
```

## 📡 API Endpoints

### Health Check
```bash
GET /api/health
```

### List Projects
```bash
GET /api/projects
```

### Proxy to AI Projects
```bash
GET /api/proxy/progno/picks/today
GET /api/proxy/orchestrator/tasks
POST /api/proxy/massager/calculate
```

## 🌍 Domain Configuration

### Vercel DNS Setup

1. **Production** (`cevict.ai`)
   - Type: A Record
   - Value: Vercel IP

2. **Test** (`test.cevict.ai`)
   - Type: CNAME
   - Value: `cname.vercel-dns.com`

3. **Project Subdomains**
   - `progno.cevict.ai`
   - `orchestrator.cevict.ai`
   - `massager.cevict.ai`
   - `claude.cevict.ai`

## 📊 Monitoring

The status page at `/status` provides:
- Real-time service health
- Latency metrics
- 90-day uptime history
- Per-service operational status

## 🔑 Environment Variables

Copy `.env.local.example` to `.env.local` and configure:

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXTAUTH_SECRET=

# Optional
SENTRY_DSN=
ANALYTICS_ID=
```

## 📜 License

© 2025 Cevict LLC. All rights reserved.

