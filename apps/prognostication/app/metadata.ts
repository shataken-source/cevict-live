import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Prognostication.com - AI Kalshi Prediction Market Picks | Expert Analysis',
  description: 'Get AI-powered Kalshi prediction market picks with 65%+ accuracy. Expert analysis on Politics, Economics, Weather, Entertainment & more. Beat the prediction markets with data-driven intelligence.',
  keywords: 'Kalshi picks, prediction market tips, election betting, Fed rate predictions, weather betting, Oscar predictions, crypto predictions, AI market analysis, event contracts',
  openGraph: {
    title: 'Prognostication - AI Kalshi Prediction Market Intelligence',
    description: 'AI-powered prediction market picks for Kalshi. Politics, Economics, Weather, Entertainment & more.',
    url: 'https://prognostication.com',
    siteName: 'Prognostication',
    images: [
      {
        url: 'https://prognostication.com/og-image-kalshi.jpg',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Prognostication - AI Kalshi Prediction Market Picks',
    description: 'AI-powered prediction market intelligence for Kalshi',
    images: ['https://prognostication.com/og-image-kalshi.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
};
