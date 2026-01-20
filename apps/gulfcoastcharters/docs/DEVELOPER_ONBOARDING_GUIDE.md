# Developer Onboarding System Guide

## Overview

Gulf Coast Charters includes a comprehensive interactive onboarding system to help new developers get up and running quickly. The system includes automated setup validation, guided code tours, video tutorials, and an AI-powered troubleshooting assistant.

## Quick Start

### 1. Run Automated Setup

```bash
npm run setup
```

This command will:
- ✅ Check Node.js version (requires v18+)
- ✅ Install dependencies if needed
- ✅ Create .env file from .env.example
- ✅ Display next steps and useful commands

### 2. Configure Environment

Edit `.env` with your Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Get these from: https://app.supabase.com/project/_/settings/api

### 3. Start Development Server

```bash
npm run dev
```

### 4. Access Developer Onboarding

Open your browser to:
```
http://localhost:5173/developer-onboarding
```

## Onboarding Features

### 🚀 Setup Wizard

Interactive wizard that validates your development environment:

- **Environment Variables**: Checks all required API keys and secrets
- **Database Connection**: Tests Supabase connectivity
- **API Gateway**: Validates AI service access
- **Stripe Integration**: Verifies payment system configuration
- **Sample Data**: Generates test data for development

**Edge Function**: `setup-validator`
- Validates environment configuration
- Provides specific recommendations for missing items
- Tests external service connectivity

### 📚 Code Tour

Guided walkthrough of the codebase structure:

- **Project Structure**: Overview of folder organization
- **Component Architecture**: How components are structured
- **Supabase Integration**: Database and auth patterns
- **Edge Functions**: Serverless function examples
- **Interactive Examples**: Code snippets you can copy

### 🎥 Video Tutorials

Categorized library of video tutorials:

- **Getting Started**: Environment setup and first steps
- **Components**: Creating reusable React components
- **Database**: Working with Supabase queries
- **Backend**: Building edge functions
- **Authentication**: User login and session management
- **Deployment**: Deploying to production

### 💬 Troubleshooting Chatbot

AI-powered assistant for solving development issues:

- **Natural Language**: Ask questions in plain English
- **Code Examples**: Get specific code solutions
- **Common Errors**: Database of known issues
- **Step-by-Step**: Guided debugging assistance

**Powered by**: `fishy-ai-assistant` edge function with developer context

## Common Setup Issues

### Issue: "Dependencies not installed"

**Solution**:
```bash
npm install
```

### Issue: ".env file not found"

**Solution**:
```bash
cp .env.example .env
# Then edit .env with your credentials
```

### Issue: "Database connection failed"

**Solution**:
1. Verify VITE_SUPABASE_URL in .env
2. Verify VITE_SUPABASE_ANON_KEY in .env
3. Check Supabase project is active
4. Visit: https://app.supabase.com/project/_/settings/api

### Issue: "Edge function not found"

**Solution**:
Edge functions are deployed to Supabase, not in this repo.
Check deployment status at:
https://app.supabase.com/project/_/functions

### Issue: "CORS error calling edge function"

**Solution**:
Ensure edge function includes CORS headers:
```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
```

## Development Workflow

### 1. Create New Component

```bash
# Component file
touch src/components/MyComponent.tsx
```

```typescript
/**
 * MyComponent
 * Brief description of what this component does
 * 
 * @component
 */

import { Card } from '@/components/ui/card';

export default function MyComponent() {
  return (
    <Card>
      {/* Your content */}
    </Card>
  );
}
```

### 2. Create New Page

```bash
# Page file
touch src/pages/MyPage.tsx
```

Add route in `src/App.tsx`:
```typescript
const MyPage = lazy(() => import("./pages/MyPage"));

// In Routes:
<Route path="/my-page" element={<MyPage />} />
```

### 3. Create Edge Function

Edge functions are created via Supabase dashboard or CLI.
See: https://supabase.com/docs/guides/functions

### 4. Query Database

```typescript
import { supabase } from '@/lib/supabase';

// Select data
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('column', 'value');

// Insert data
const { data, error } = await supabase
  .from('table_name')
  .insert({ column: 'value' });
```

## Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview production build

# Code Quality
npm run lint             # Run ESLint

# Setup
npm run setup            # Run onboarding setup
```

## Project Structure

```
gulf-coast-charters/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # shadcn/ui components
│   │   ├── admin/          # Admin-specific components
│   │   ├── onboarding/     # Developer onboarding components
│   │   └── ...
│   ├── pages/              # Route pages
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Core utilities
│   ├── contexts/           # React contexts
│   ├── stores/             # State management
│   ├── utils/              # Helper functions
│   └── types/              # TypeScript types
├── scripts/                # Build and setup scripts
├── public/                 # Static assets
└── supabase/              # Database migrations
```

## Key Files

- **src/App.tsx**: Main app with routing (DO NOT MODIFY)
- **src/pages/Index.tsx**: Wrapper for main layout
- **src/components/AppLayout.tsx**: Main content area (MODIFY THIS)
- **src/lib/supabase.ts**: Supabase client configuration
- **package.json**: Dependencies and scripts
- **.env**: Environment variables (local only, not in git)

## Resources

### Documentation
- **Developer Resources**: [DEVELOPER_RESOURCES.md](./DEVELOPER_RESOURCES.md)
- **Deployment Guide**: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **README**: [README.md](./README.md)

### External Resources
- **React**: https://react.dev
- **TypeScript**: https://www.typescriptlang.org/docs
- **Vite**: https://vitejs.dev/guide
- **Supabase**: https://supabase.com/docs
- **shadcn/ui**: https://ui.shadcn.com
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Lucide Icons**: https://lucide.dev

## Getting Help

1. **Use the Troubleshooting Chatbot**: Visit `/developer-onboarding` and click "Get Help"
2. **Check Documentation**: Review guides in the project root
3. **Supabase Dashboard**: https://app.supabase.com
4. **Community Discord**: (if available)

## Next Steps

After completing onboarding:

1. ✅ Explore the codebase with the Code Tour
2. ✅ Watch relevant video tutorials
3. ✅ Try creating a simple component
4. ✅ Make a test database query
5. ✅ Review existing components for patterns
6. ✅ Start building your feature!

## Contributing

When adding new features:
- Follow existing code patterns
- Add comprehensive comments and JSDoc
- Update relevant documentation
- Test thoroughly before committing
- Use TypeScript for type safety

---

**Welcome to the team! Happy coding! 🚀**