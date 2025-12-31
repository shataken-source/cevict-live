export const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Prognostication",
  "url": "https://prognostication.com",
  "applicationCategory": "SportsApplication",
  "description": "AI-powered sports betting prediction platform with expert picks and live odds",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.7",
    "ratingCount": "1250",
    "bestRating": "5"
  },
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://prognostication.com/search?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
};
