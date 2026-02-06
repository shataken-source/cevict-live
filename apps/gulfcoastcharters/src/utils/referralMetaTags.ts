/**
 * Referral Meta Tags Utility
 * 
 * Generates Open Graph and Twitter Card meta tags for referral links
 * Optimizes social sharing with rich previews
 */

export interface ReferralMetaTags {
  title: string;
  description: string;
  image: string;
  url: string;
  type: string;
  siteName: string;
  twitterCard: string;
  twitterSite: string;
}

/**
 * Generate referral meta tags
 */
export function generateReferralMetaTags(
  referralCode: string,
  userName: string = 'A friend'
): ReferralMetaTags {
  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : 'https://gulfcoastcharters.com';
  
  const shareUrl = `${baseUrl}?ref=${referralCode}`;
  const title = `${userName} invited you to Gulf Coast Charters!`;
  const description = `Get $10 off your first fishing charter booking. Use code: ${referralCode}`;
  const image = `${baseUrl}/og-referral.jpg`; // Should be 1200x630px

  return {
    title,
    description,
    image,
    url: shareUrl,
    type: 'website',
    siteName: 'Gulf Coast Charters',
    twitterCard: 'summary_large_image',
    twitterSite: '@GulfCharters',
  };
}

/**
 * Generate structured data (JSON-LD) for SEO
 */
export function generateReferralStructuredData(referralCode: string) {
  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : 'https://gulfcoastcharters.com';

  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Gulf Coast Charters Referral',
    description: `Get $10 off your first fishing charter booking with code: ${referralCode}`,
    url: `${baseUrl}?ref=${referralCode}`,
    image: `${baseUrl}/og-referral.jpg`,
    offers: {
      '@type': 'Offer',
      price: '10.00',
      priceCurrency: 'USD',
      description: 'Discount on first booking',
    },
  };
}

/**
 * Inject meta tags into document head
 */
export function injectReferralMetaTags(metaTags: ReferralMetaTags) {
  if (typeof document === 'undefined') return;

  // Remove existing referral meta tags
  const existingTags = document.querySelectorAll('meta[data-referral-meta]');
  existingTags.forEach(tag => tag.remove());

  // Create and inject new meta tags
  const tags = [
    { property: 'og:title', content: metaTags.title },
    { property: 'og:description', content: metaTags.description },
    { property: 'og:image', content: metaTags.image },
    { property: 'og:url', content: metaTags.url },
    { property: 'og:type', content: metaTags.type },
    { property: 'og:site_name', content: metaTags.siteName },
    { name: 'twitter:card', content: metaTags.twitterCard },
    { name: 'twitter:site', content: metaTags.twitterSite },
    { name: 'twitter:title', content: metaTags.title },
    { name: 'twitter:description', content: metaTags.description },
    { name: 'twitter:image', content: metaTags.image },
  ];

  tags.forEach(({ property, name, content }) => {
    const meta = document.createElement('meta');
    if (property) {
      meta.setAttribute('property', property);
    }
    if (name) {
      meta.setAttribute('name', name);
    }
    meta.setAttribute('content', content);
    meta.setAttribute('data-referral-meta', 'true');
    document.head.appendChild(meta);
  });
}

/**
 * Inject structured data into document
 */
export function injectReferralStructuredData(referralCode: string) {
  if (typeof document === 'undefined') return;

  // Remove existing structured data
  const existingScript = document.querySelector('script[data-referral-structured-data]');
  if (existingScript) {
    existingScript.remove();
  }

  // Create and inject new structured data
  const structuredData = generateReferralStructuredData(referralCode);
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(structuredData);
  script.setAttribute('data-referral-structured-data', 'true');
  document.head.appendChild(script);
}
