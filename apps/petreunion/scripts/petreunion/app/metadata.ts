import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PetReunion.org - Find Your Lost Pet Fast | AI-Powered Pet Recovery',
  description: 'Lost your dog or cat? PetReunion uses AI to help reunite you with your missing pet. Free search alerts, 24/7 tracking, and community support. 85% success rate.',
  keywords: 'lost pet, find lost dog, missing cat, pet recovery, lost pet finder, reunite with pet, pet alert, missing pet search',
  openGraph: {
    title: 'PetReunion - Find Your Lost Pet Fast',
    description: 'AI-powered pet recovery service with 85% success rate. Free alerts and community support.',
    url: 'https://petreunion.org',
    siteName: 'PetReunion',
    images: [
      {
        url: 'https://petreunion.org/og-image.jpg',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PetReunion - Find Your Lost Pet Fast',
    description: 'AI-powered pet recovery with 85% success rate',
    images: ['https://petreunion.org/og-image.jpg'],
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
