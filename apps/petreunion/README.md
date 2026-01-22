# 🐾 PetReunion - Lost Pet Recovery Platform

A free community-powered platform to help reunite lost pets with their families.

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- pnpm (or npm)
- Supabase account

### Installation

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set up environment variables:**
   ```bash
   # Use KeyVault to sync env vars
   cd ../..
   .\scripts\keyvault\sync-env.ps1 -AppPath .\apps\petreunion
   ```

3. **Run development server:**
   ```bash
   pnpm dev
   ```

4. **Open in browser:**
   ```
   http://localhost:3006
   ```

## 📁 Project Structure

```
apps/petreunion/
├── app/
│   ├── api/              # API routes
│   ├── search/           # Search page
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Home page
│   └── globals.css       # Global styles
├── components/           # React components
├── lib/                  # Utility functions
├── supabase/            # Database migrations
└── docs/                # Documentation
```

## 🎯 Features

- **Search Lost Pets** - Search database by breed, color, location, etc.
- **Report Lost Pet** - Report a missing pet with photos
- **Report Found Pet** - Report a found pet
- **Shelter Directory** - Find local animal shelters
- **Community Powered** - Free service for everyone

## 🔧 Configuration

### Environment Variables

Required:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

Optional:
- `SUPABASE_SERVICE_ROLE_KEY` - For admin operations

### Database Setup

1. Create the `lost_pets` table in Supabase
2. Run migrations from `supabase/migrations/`

## 📝 Development

```bash
# Development
pnpm dev

# Build
pnpm build

# Start production
pnpm start

# Lint
pnpm lint
```

## 🐛 Troubleshooting

**Database not configured:**
- Ensure `.env.local` has Supabase credentials
- Use KeyVault to sync: `.\scripts\keyvault\sync-env.ps1 -AppPath .\apps\petreunion`

**Port already in use:**
- Change port in `package.json` scripts (default: 3006)

## 📚 Documentation

See `docs/` folder for:
- Audit reports
- Marketing materials
- API documentation

## 🤝 Contributing

This is a free public service. Contributions welcome!

## 📄 License

Free for public use.
