# Environment Variable Validation Utility

A reusable TypeScript/Next.js environment variable validation system using Zod for runtime type checking and validation.

## Features

- ✅ Runtime environment variable validation
- ✅ Fail-fast behavior in production
- ✅ TypeScript type safety
- ✅ Comprehensive error reporting
- ✅ Development-friendly warnings
- ✅ Support for optional and required variables

## Installation

```bash
pnpm add zod
```

## Usage

### 1. Copy the files to your project
```
utils/
├── env-validator/
│   ├── env.ts
│   ├── types.ts
│   └── README.md
```

### 2. Import in your layout or app entry point
```typescript
import '@/utils/env-validator/env';
```

### 3. Use the validated environment variables
```typescript
import { env } from '@/utils/env-validator/env';

// Access validated environment variables
const apiUrl = env.NEXT_PUBLIC_API_URL;
const isProduction = env.NODE_ENV === 'production';
```

## Configuration

Edit `env.ts` to match your project's environment variables:

```typescript
const envSchema = z.object({
  // Required variables
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_API_URL: z.string().url(),
  
  // Optional variables
  DATABASE_URL: z.string().url().optional(),
  API_KEY: z.string().optional(),
});
```

## Environment Variables Supported

### Core Next.js Variables
- `NODE_ENV` - Environment (development/production/test)
- `NEXT_PUBLIC_APP_URL` - Public application URL
- `NEXT_PUBLIC_ENABLE_BUG_REPORTING` - Enable bug reporting features

### Database & Auth
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

### API Keys
- `OPENAI_API_KEY` - OpenAI API key
- `GOOGLE_GENERATIVE_AI_API_KEY` - Google AI API key

### Email Services
- `RESEND_API_KEY` - Resend email service API key
- `RESEND_FROM_EMAIL` - Default from email address

### Error Tracking
- `SENTRY_DSN` - Sentry DSN for error tracking
- `SENTRY_AUTH_TOKEN` - Sentry authentication token

### Authentication
- `NEXTAUTH_SECRET` - NextAuth.js secret
- `NEXTAUTH_URL` - NextAuth.js URL

## Error Handling

### Development Mode
- Shows warnings for invalid environment variables
- Continues running with detailed error information
- Provides helpful validation error messages

### Production Mode
- Fails fast and exits if required variables are missing/invalid
- Prevents application startup with invalid configuration
- Logs detailed error information for debugging

## Examples

### Adding Custom Variables
```typescript
const envSchema = z.object({
  // Your custom variables
  CUSTOM_API_ENDPOINT: z.string().url(),
  MAX_UPLOAD_SIZE: z.string().transform(Number).pipe(z.number().positive()),
  FEATURE_FLAGS: z.string().transform((val) => val.split(',')).optional(),
});
```

### Conditional Validation
```typescript
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  DATABASE_URL: z.string().url().optional(),
}).refine((data) => {
  if (data.NODE_ENV === 'production') {
    return !!data.DATABASE_URL;
  }
  return true;
}, {
  message: "DATABASE_URL is required in production",
});
```

## TypeScript Support

Full TypeScript support with generated types:

```typescript
import type { Env } from '@/utils/env-validator/env';

function useApiConfig() {
  const config: Env = env;
  return {
    url: config.NEXT_PUBLIC_API_URL,
    isDebug: config.NODE_ENV === 'development',
  };
}
```

## Best Practices

1. **Always validate environment variables** at startup
2. **Use descriptive names** for environment variables
3. **Provide sensible defaults** where appropriate
4. **Document required variables** in your README
5. **Use different .env files** for different environments
6. **Never commit sensitive values** to version control

## Integration Examples

### Next.js App Router
```typescript
// app/layout.tsx
import '@/utils/env-validator/env';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
```

### Express.js
```typescript
// server.ts
import '@/utils/env-validator/env';
import express from 'express';

const app = express();
// Your app setup here
```

### Vite/React
```typescript
// main.tsx
import '@/utils/env-validator/env';
import React from 'react';
import ReactDOM from 'react-dom/client';

// Your app setup here
```

## License

MIT - Feel free to use this utility in your projects!
