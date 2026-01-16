export const structuredData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "PetReunion",
  "url": "https://petreunion.org",
  "logo": "https://petreunion.org/logo.png",
  "description": "AI-powered pet recovery service helping reunite lost pets with their families",
  "foundingDate": "2024",
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "Customer Service",
    "email": "support@petreunion.org",
    "availableLanguage": "English"
  },
  "sameAs": [
    "https://facebook.com/petreunion",
    "https://twitter.com/petreunion",
    "https://instagram.com/petreunion"
  ],
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://petreunion.org/search?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
};
