'use client';

import React from 'react';

interface LocalBusinessSchema {
  name: string;
  description: string;
  url: string;
  telephone: string;
  address: {
    streetAddress: string;
    addressLocality: string;
    addressRegion: string;
    postalCode: string;
    addressCountry: string;
  };
  geo: {
    latitude: string;
    longitude: string;
  };
  openingHours: string[];
  priceRange: string;
  paymentAccepted: string[];
  servesCuisine?: string[];
  category: string;
}

interface ArticleSchema {
  headline: string;
  description: string;
  author: {
    name: string;
    url: string;
  };
  publisher: {
    name: string;
    logo: {
      url: string;
      width: number;
      height: number;
    };
  };
  datePublished: string;
  dateModified: string;
  mainEntityOfPage: {
    '@type': string;
    '@id': string;
  };
  image: {
    '@type': string;
    url: string;
    width: number;
    height: number;
  };
}

interface TouristAttractionSchema {
  name: string;
  description: string;
  url: string;
  address: {
    streetAddress: string;
    addressLocality: string;
    addressRegion: string;
    postalCode: string;
    addressCountry: string;
  };
  geo: {
    latitude: string;
    longitude: string;
  };
  photo: {
    '@type': string;
    url: string;
    width: number;
    height: number;
  };
  isAccessibleForFree: boolean;
  publicAccess: boolean;
}

interface ReviewSchema {
  itemReviewed: {
    '@type': string;
    name: string;
  };
  reviewRating: {
    '@type': string;
    ratingValue: string;
    bestRating: string;
  };
  author: {
    '@type': string;
    name: string;
  };
  datePublished: string;
  reviewBody: string;
}

export function LocalBusinessSchema({ business }: { business: LocalBusinessSchema }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: business.name,
    description: business.description,
    url: business.url,
    telephone: business.telephone,
    address: {
      '@type': 'PostalAddress',
      ...business.address
    },
    geo: {
      '@type': 'GeoCoordinates',
      ...business.geo
    },
    openingHours: business.openingHours,
    priceRange: business.priceRange,
    paymentAccepted: business.paymentAccepted,
    servesCuisine: business.servesCuisine,
    category: business.category,
    '@id': `${business.url}#localbusiness`,
    sameAs: [
      'https://www.facebook.com/gulfcoastcharters',
      'https://www.instagram.com/gulfcoastcharters',
      'https://twitter.com/gulfcoastcharters'
    ]
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema, null, 2) }}
    />
  );
}

export function ArticleSchema({ article }: { article: ArticleSchema }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.headline,
    description: article.description,
    author: {
      '@type': 'Person',
      ...article.author
    },
    publisher: {
      '@type': 'Organization',
      ...article.publisher
    },
    datePublished: article.datePublished,
    dateModified: article.dateModified,
    mainEntityOfPage: article.mainEntityOfPage,
    image: {
      '@type': 'ImageObject',
      ...article.image
    },
    '@id': `${article.mainEntityOfPage['@id']}#article`,
    articleSection: 'Travel',
    wordCount: 1500,
    keywords: 'Gulf Coast, vacation, travel, Alabama, Florida, beaches, fishing',
    inLanguage: 'en-US'
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema, null, 2) }}
    />
  );
}

export function TouristAttractionSchema({ attraction }: { attraction: TouristAttractionSchema }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'TouristAttraction',
    name: attraction.name,
    description: attraction.description,
    url: attraction.url,
    address: {
      '@type': 'PostalAddress',
      ...attraction.address
    },
    geo: {
      '@type': 'GeoCoordinates',
      ...attraction.geo
    },
    photo: {
      '@type': 'ImageObject',
      ...attraction.photo
    },
    isAccessibleForFree: attraction.isAccessibleForFree,
    publicAccess: attraction.publicAccess,
    '@id': `${attraction.url}#touristattraction`,
    additionalProperty: [
      {
        '@type': 'PropertyValue',
        name: 'Best Time to Visit',
        value: 'March - May, September - November'
      },
      {
        '@type': 'PropertyValue',
        name: 'Activities',
        value: 'Beach, Fishing, Water Sports, Dining'
      },
      {
        '@type': 'PropertyValue',
        name: 'Average Temperature',
        value: '70-85°F'
      }
    ]
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema, null, 2) }}
    />
  );
}

export function ReviewSchema({ review }: { review: ReviewSchema }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Review',
    itemReviewed: {
      '@type': review.itemReviewed['@type'],
      name: review.itemReviewed.name
    },
    reviewRating: {
      '@type': 'Rating',
      ...review.reviewRating
    },
    author: {
      '@type': review.author['@type'],
      name: review.author.name
    },
    datePublished: review.datePublished,
    reviewBody: review.reviewBody,
    '@id': `#review-${Date.now()}`
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema, null, 2) }}
    />
  );
}

// Organization Schema for both sites
export function OrganizationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'WhereToVacation',
    url: 'https://wheretovacation.com',
    logo: {
      '@type': 'ImageObject',
      url: 'https://wheretovacation.com/logo.png',
      width: 512,
      height: 512
    },
    description: 'Your complete guide to Gulf Coast vacations, destinations, and charter fishing experiences.',
    sameAs: [
      'https://www.facebook.com/wheretovacation',
      'https://www.instagram.com/wheretovacation',
      'https://twitter.com/wheretovacation',
      'https://www.pinterest.com/wheretovacation'
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '(251) 555-0123',
      contactType: 'customer service',
      availableLanguage: ['English']
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Gulf Shores',
      addressRegion: 'AL',
      postalCode: '36542',
      addressCountry: 'US'
    },
    '@id': 'https://wheretovacation.com#organization'
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema, null, 2) }}
    />
  );
}

// Website Schema
export function WebsiteSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'WhereToVacation',
    url: 'https://wheretovacation.com',
    description: 'Plan your perfect Gulf Coast vacation with destination guides, charter bookings, and travel tips.',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://wheretovacation.com/search?q={search_term_string}',
      'query-input': 'required name=search_term_string'
    },
    publisher: {
      '@type': 'Organization',
      name: 'WhereToVacation',
      url: 'https://wheretovacation.com'
    },
    '@id': 'https://wheretovacation.com#website'
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema, null, 2) }}
    />
  );
}

// BreadcrumbList Schema
export function BreadcrumbSchema({ breadcrumbs }: { 
  breadcrumbs: Array<{ name: string; url: string }> 
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((breadcrumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: breadcrumb.name,
      item: breadcrumb.url
    }))
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema, null, 2) }}
    />
  );
}

// FAQ Schema for common questions
export function FAQSchema({ faqs }: { 
  faqs: Array<{ question: string; answer: string }> 
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema, null, 2) }}
    />
  );
}

// Sample data for GulfCoastCharters.com
export const gulfCoastChartersBusiness: LocalBusinessSchema = {
  name: 'Gulf Coast Charters',
  description: 'Professional charter fishing service offering inshore and offshore fishing trips in the Alabama Gulf Coast. USCG licensed captain with 15+ years experience.',
  url: 'https://gulfcoastcharters.com',
  telephone: '(251) 555-0123',
  address: {
    streetAddress: '26389 Canal Rd',
    addressLocality: 'Orange Beach',
    addressRegion: 'AL',
    postalCode: '36561',
    addressCountry: 'US'
  },
  geo: {
    latitude: '30.2744',
    longitude: '-87.5719'
  },
  openingHours: [
    'Mo-Su 05:00-20:00'
  ],
  priceRange: '$600-1800',
  paymentAccepted: ['Cash', 'Credit Card', 'PayPal'],
  category: 'Fishing Charter Service'
};

// Sample data for WhereToVacation.com articles
export const sampleArticle: ArticleSchema = {
  headline: 'Complete Guide to Orange Beach, Alabama: Your Perfect Gulf Coast Vacation',
  description: 'Discover everything you need to know about visiting Orange Beach, Alabama - from sugar-white sand beaches to world-class fishing charters.',
  author: {
    name: 'WhereToVacation Team',
    url: 'https://wheretovacation.com/about'
  },
  publisher: {
    name: 'WhereToVacation',
    logo: {
      url: 'https://wheretovacation.com/logo.png',
      width: 512,
      height: 512
    }
  },
  datePublished: '2024-01-15',
  dateModified: '2024-01-20',
  mainEntityOfPage: {
    '@type': 'WebPage',
    '@id': 'https://wheretovacation.com/destination/orange-beach-al'
  },
  image: {
    '@type': 'ImageObject',
    url: 'https://wheretovacation.com/images/orange-beach-al.webp',
    width: 1200,
    height: 800
  }
};

// Sample FAQ data
export const sampleFAQs = [
  {
    question: 'What is the best time to visit the Gulf Coast?',
    answer: 'The best time to visit the Gulf Coast is during the spring (March-May) and fall (September-November) when temperatures are pleasant and crowds are smaller.'
  },
  {
    question: 'Do I need a fishing license for charter trips?',
    answer: 'No, fishing licenses are typically included in charter trips. Your captain will have the necessary commercial licenses that cover all passengers.'
  },
  {
    question: 'What should I bring on a charter fishing trip?',
    answer: 'Bring sunscreen, hat, sunglasses, camera, seasickness medication (if needed), and any personal food or drinks. Bait, tackle, and fishing licenses are provided.'
  }
];
