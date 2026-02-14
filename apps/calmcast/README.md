# CalmCast - Enhanced Audio Regulation API

CalmCast is an API-first audio regulation service with enterprise-grade security, caching, and multi-format support.

## 🆕 Recent Improvements

### 1. **Input Validation & Sanitization**
- Comprehensive Zod schemas for all API endpoints
- Detailed error messages with validation feedback
- Type-safe request handling with automatic coercion

### 2. **Smart Caching System**
- Redis-powered caching for generated audio and plans
- 2-hour TTL for audio files, 30-minute TTL for plans
- Cache key includes format and quality parameters
- Graceful fallback when Redis is unavailable

### 3. **API Authentication & Rate Limiting**
- API key-based authentication system
- Configurable rate limits per API key
- IP-based rate limiting for anonymous requests
- JWT tokens for session management

### 4. **Structured Logging & Monitoring**
- Winston-based structured logging
- Request tracking with unique IDs
- Performance monitoring and metrics
- Error tracking with stack traces

### 5. **Multi-Format Audio Support**
- Support for WAV, MP3, AAC, OGG formats
- Quality options (low, medium, high)
- Streaming and download modes
- Bandwidth optimization (85-90% compression)

## API Endpoints

### GET /api/calmcast/presets
List all available presets or get a specific preset.

**Query Parameters:**
- `id` (optional): Get specific preset by ID

**Authentication:** Optional
**Rate Limit:** 10 requests/hour (anonymous), 1000 requests/hour (authenticated)

### POST /api/calmcast/generate
Generate a calmcast plan without audio.

**Request Body:**
```json
{
  "target": "dogs|cats|horses|wildlife|babies|humans",
  "mode": "sleep|anxiety|storm|travel|focus",
  "durationMinutes": 30,
  "intensity": 1|2|3,
  "vetLock": true
}
```

**Response:**
```json
{
  "success": true,
  "plan": { ... },
  "vetLock": { "enabled": true },
  "cached": false
}
```

### GET|POST /api/calmcast/render-wav
Generate and download/stream audio files.

**Query Parameters (GET) / Request Body (POST):**
```json
{
  "target": "dogs",
  "mode": "storm",
  "durationMinutes": 5,
  "intensity": 2,
  "vetLock": true,
  "format": "wav|mp3|aac|ogg",
  "quality": "low|medium|high",
  "stream": false,
  "sampleRate": 44100,
  "amplitude": 0.15
}
```

**Response Headers:**
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Rate limit reset timestamp
- `X-Audio-Format`: Audio format used
- `X-Cached`: Whether response was from cache
- `X-Audio-Duration`: Duration in minutes

## Authentication

### API Keys
- **Test Key:** `ck_test_1234567890abcdef` (100 requests/hour)
- **Production Key:** `ck_prod_abcdef1234567890` (1000 requests/hour)

### Usage Methods
1. **Authorization Header:**
   ```
   Authorization: Bearer ck_test_1234567890abcdef
   ```

2. **Query Parameter:**
   ```
   ?apiKey=ck_test_1234567890abcdef
   ```

## Audio Formats

### Supported Formats
- **WAV:** Uncompressed, highest quality
- **MP3:** Best compatibility, ~90% compression
- **AAC:** Better quality than MP3 at same bitrate
- **OGG:** Open source, good compression

### Quality Settings
- **Low:** 64 kbps (fastest, smallest)
- **Medium:** 128 kbps (balanced)
- **High:** 256 kbps (best quality)

### Streaming vs Download
- `stream=true`: Inline playback in browser
- `stream=false` (default): Download as attachment

## Environment Configuration

Create `.env.local` based on `.env.example`:

```env
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key
LOG_LEVEL=info
NODE_ENV=development
```

## Performance Features

### Caching Strategy
- **Audio Files:** Cached for 2 hours
- **Generation Plans:** Cached for 30 minutes
- **Cache Keys:** Include format, quality, and parameters
- **Fallback:** Graceful degradation when Redis unavailable

### Rate Limiting
- **Anonymous:** 10 requests/hour (IP-based)
- **API Keys:** Configurable per key
- **Audio Generation:** Lower limits (more expensive)
- **Headers:** Rate limit info in response headers

### Monitoring
- **Request IDs:** Unique tracking per request
- **Performance Metrics:** Duration and size tracking
- **Error Logging:** Structured error reports
- **Cache Hit Rates:** Monitoring cache effectiveness

## Examples

### Basic WAV Generation
```bash
curl "http://localhost:3005/api/calmcast/render-wav?target=dogs&mode=storm&durationMinutes=1"
```

### MP3 with Streaming
```bash
curl "http://localhost:3005/api/calmcast/render-wav?target=cats&mode=sleep&durationMinutes=5&format=mp3&stream=true" \
  -H "Authorization: Bearer ck_test_1234567890abcdef"
```

### High-Quality AAC
```bash
curl -X POST "http://localhost:3005/api/calmcast/render-wav" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ck_prod_abcdef1234567890" \
  -d '{
    "target": "horses",
    "mode": "anxiety",
    "durationMinutes": 3,
    "format": "aac",
    "quality": "high"
  }'
```

## Development

### Installation
```bash
npm install
```

### Start Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
npm start
```

## Dependencies

- **Validation:** Zod schemas
- **Caching:** Redis client
- **Authentication:** JWT, bcryptjs
- **Audio:** FFmpeg, fluent-ffmpeg
- **Rate Limiting:** rate-limiter-flexible
- **Logging:** Winston
- **UUID:** Unique request identifiers

## Security Features

- Input sanitization and validation
- API key authentication
- Rate limiting per client
- Request size limits
- Error message sanitization
- Secure headers configuration

## Monitoring & Debugging

Check the logs directory:
- `logs/combined.log`: All log entries
- `logs/error.log`: Error-only logs

Log entries include:
- Request ID for tracking
- API key (sanitized)
- IP address
- Performance metrics
- Error details and stack traces
