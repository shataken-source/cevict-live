export const en = {
  common: {
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
    apply: 'Apply Filters',
    viewDetails: 'View Details',
    error: 'Something went wrong.',
  },
  hero: {
    title: 'Find Your Perfect Vacation Rental',
    tagline: 'Beach houses, condos, and charters along the Gulf Coast.',
    exploreProperties: 'Explore Properties',
    listYourProperty: 'List Your Property',
  },
  booking: {
    confirm: 'Booking confirmed',
    total: 'Total',
    checkIn: 'Check-in',
    checkOut: 'Check-out',
    nights: 'nights',
    description: "Your vacation rental booking has been confirmed. You'll receive a confirmation email shortly.",
    viewMoreRentals: 'View More Rentals',
    backToHome: 'Back to Home',
  },
  currency: {
    usd: 'USD',
    eur: 'EUR',
    gbp: 'GBP',
    mxn: 'MXN',
    brl: 'BRL',
  },
  finn: {
    greeting: "Hi! I'm Finn, your personal vacation concierge! 🏖️ I can help you plan your entire Gulf Coast vacation - from rentals to activities to charters. What would you like to do today?",
    placeholder: 'Ask Finn anything...',
    openLabel: 'Chat with Finn',
  },
  fishy: {
    greeting: "Ahoy! I'm Fishy, your AI guide for Where To Vacation. How can I help you plan your perfect trip? 🏖️",
    placeholder: 'Type your question...',
    openLabel: 'Chat with Fishy',
  },
} as const

// Widen literal string values to `string` so translation files can use different text
type DeepStringify<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepStringify<T[K]>
}

export type EnKeys = DeepStringify<typeof en>
