# WhereToVacation.com

A modern, full-featured luxury vacation rental platform built with React, TypeScript, Tailwind CSS, and Supabase.

## Features

- **Property Listings**: Browse luxury waterfront vacation rentals with advanced search and filtering
- **User Authentication**: Secure login and registration with Supabase Auth
- **Booking System**: Complete booking flow with date selection and guest management
- **Payment Processing**: Integrated Stripe payment processing for secure transactions
- **User Dashboard**: Manage bookings, view payment history, and track booking status
- **Property Details**: Rich property pages with image galleries, amenities, and reviews
- **Responsive Design**: Beautiful, mobile-first design with Tailwind CSS
- **Real-time Updates**: Live booking status and payment confirmations

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **Payments**: Stripe
- **Routing**: React Router v6
- **State Management**: React Context API
- **Forms**: React Hook Form with Zod validation

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Stripe account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/wheretovacation.git
cd wheretovacation
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:5173](http://localhost:5173) in your browser

## Project Structure

```
src/
├── components/        # Reusable UI components
│   ├── ui/           # shadcn/ui base components
│   ├── Hero.tsx      # Hero section
│   ├── Navigation.tsx # Main navigation
│   ├── PropertyCard.tsx
│   ├── BookingModal.tsx
│   └── ...
├── contexts/         # React Context providers
├── data/            # Sample data and constants
├── hooks/           # Custom React hooks
├── lib/             # Utility functions and configs
├── pages/           # Page components
├── types/           # TypeScript type definitions
└── main.tsx         # Application entry point
```

## Deployment

Build for production:
```bash
npm run build
```

The build output will be in the `dist/` directory, ready for deployment to any static hosting service.

## License

MIT

## Contact

For questions or support, visit [WhereToVacation.com](https://wheretovacation.com)
