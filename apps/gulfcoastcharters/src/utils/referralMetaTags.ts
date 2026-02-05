// Utility to generate Open Graph meta tags for referral links
export function generateReferralMetaTags(referralCode: string, userName: string = 'A friend') {
  const shareUrl = `${window.location.origin}?ref=${referralCode}`;
  const title = `${userName} invited you to Gulf Coast Charters!`;
  const description = `Get $10 off your first fishing charter booking with code ${referralCode}. Join thousands of anglers finding their perfect charter.`;
  const image = `${window.location.origin}/og-referral.jpg`;

  return {
    title,
    description,
    image,
    url: shareUrl,
    type: 'website',
    siteName: 'Gulf Coast Charters',
    imageWidth: '1200',
    imageHeight: '630'
  };
}

// Generate structured data for referral links
export function generateReferralStructuredData(referralCode: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Gulf Coast Charters Referral",
    "description": "Join Gulf Coast Charters and get $10 off your first booking",
    "url": `${window.location.origin}?ref=${referralCode}`,
    "offers": {
      "@type": "Offer",
      "price": "10",
      "priceCurrency": "USD",
      "description": "Discount on first charter booking"
    }
  };
}
