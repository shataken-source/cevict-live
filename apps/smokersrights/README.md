# SmokersRights

Navigate smoking and vaping laws across the United States with confidence. Your comprehensive utility for civil liberties and harm reduction.

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm or pnpm
- Supabase account

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   # Use KeyVault to sync env vars
   cd ../..
   .\scripts\keyvault\sync-env.ps1 -AppPath .\apps\smokersrights
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   ```
   http://localhost:3010
   ```

## 📁 Project Structure

```
apps/smokersrights/
├── app/
│   ├── api/              # API routes
│   ├── search/           # Law search page
│   ├── compare/          # State comparison page
│   ├── shop/             # Marketplace page
│   ├── legal/            # State law pages
│   ├── map/              # Interactive map
│   ├── admin/            # Admin dashboard
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Home page
│   └── globals.css       # Global styles
├── components/            # React components
├── lib/                  # Utility functions
│   ├── legislation-tracker.ts
│   └── bot/              # Bot services
├── supabase/            # Database migrations
└── docs/                # Documentation
```

## 🎯 Features

- **Law Explorer** - Search and filter laws by state and category
- **Compare States** - Side-by-side comparison of laws
- **Interactive Map** - Visual state-by-state view
- **Marketplace** - Affiliate products (Safe Haven Marketplace)
- **50 States Covered** - Comprehensive coverage
- **400+ Laws Tracked** - Always updated
- **Admin Dashboard** - Manage products and laws

## 🔧 Configuration

### Environment Variables

Required:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

Optional:
- `SUPABASE_SERVICE_ROLE_KEY` - For admin operations
- `STRIPE_SECRET_KEY` - Payment processing
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe public key
- `GOOGLE_CUSTOM_SEARCH_API_KEY` - Product search
- `GOOGLE_CUSTOM_SEARCH_ENGINE_ID` - Search engine ID
- `KILO_API_KEY` - Crypto payments
- `ADMIN_PASSWORD` - Admin authentication

### Database Setup

1. Create the `laws` and `products` tables in Supabase
2. Run migrations from `supabase/migrations/`

## 📝 Development

```bash
# Development
npm run dev

# Build
npm run build

# Start production
npm run start

# Lint
npm run lint
```

## 🗺️ Covered States

Southeast focus: AL, FL, GA, LA, MS, NC, SC, TN, VA, KY, AR, WV  
All 50 states supported.

## 🛒 Marketplace

The Safe Haven Marketplace features:
- Affiliate products (CBD, vapes, papers, nicotine)
- Sponsor products (highlighted)
- FTC-compliant disclosures
- Age verification (21+)

## 📚 Documentation

See `docs/` folder for:
- API documentation
- Deployment guides
- Compliance notes

## 🤝 Contributing

This platform advocates for smokers' rights and harm reduction.

## 📄 License

Free for public use.
