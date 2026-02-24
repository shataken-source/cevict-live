import { Metadata } from 'next';

// Intent-driven metadata generation for SEO optimization
// Creates dynamic, search-intent aligned titles and descriptions

export interface SEOIntent {
  primary: 'best' | 'cheap' | 'family-friendly' | 'romantic' | 'adventure' | 'luxury';
  secondary?: 'warm' | 'cold' | 'beach' | 'mountain' | 'city' | 'cultural';
  timeframe?: 'january' | 'february' | 'march' | 'april' | 'may' | 'june' | 
              'july' | 'august' | 'september' | 'october' | 'november' | 'december' |
              'winter' | 'spring' | 'summer' | 'fall';
  audience?: 'solo' | 'couples' | 'families' | 'friends' | 'groups';
}

export interface DestinationSEOData {
  name: string;
  country: string;
  region?: string;
  knownFor: string[];
  bestMonths: number[];
  avgCost: number;
  activities: string[];
  weather: 'warm' | 'cold' | 'moderate';
}

// Intent-based title templates
const titleTemplates = {
  best: {
    primary: 'Best Places to {activity} in {location}',
    secondary: 'Top {location} Destinations for {activity}',
    longTail: 'Discover the Best {activity} Spots in {location} - {year}',
  },
  cheap: {
    primary: 'Cheap {activity} Vacations in {location}',
    secondary: 'Affordable {location} Trips for {activity}',
    longTail: 'Budget-Friendly {activity} in {location} - Save on Your {year} Trip',
  },
  'family-friendly': {
    primary: 'Family-Friendly {activity} in {location}',
    secondary: 'Best {location} for Families with Kids',
    longTail: 'Top Family {activity} Destinations in {location} - {year} Guide',
  },
  romantic: {
    primary: 'Romantic {activity} Getaways in {location}',
    secondary: 'Couples {activity} in {location}',
    longTail: 'Most Romantic {activity} Spots in {location} - Perfect for {year}',
  },
  adventure: {
    primary: 'Adventure {activity} in {location}',
    secondary: 'Thrilling {location} Adventures for {activity}',
    longTail: 'Ultimate {activity} Adventures in {location} - {year} Guide',
  },
  luxury: {
    primary: 'Luxury {activity} in {location}',
    secondary: 'Premium {location} Experiences for {activity}',
    longTail: 'High-End {activity} in {location} - Luxury {year} Guide',
  },
};

// Description templates
const descriptionTemplates = {
  best: 'Discover the best {activity} destinations in {location}. Hand-picked spots with perfect weather, top ratings, and unforgettable experiences for your {year} vacation.',
  cheap: 'Find affordable {activity} vacations in {location}. Budget-friendly options that don\'t compromise on quality. Save money on your {year} trip.',
  'family-friendly': 'Plan the perfect family {activity} vacation in {location}. Kid-friendly destinations, activities, and accommodations for memorable {year} trips.',
  romantic: 'Escape to romantic {activity} destinations in {location}. Intimate getaways, stunning views, and special experiences for couples in {year}.',
  adventure: 'Experience thrilling {activity} adventures in {location}. Adrenaline-pumping activities, expert guides, and unforgettable {year} expeditions.',
  luxury: 'Indulge in luxury {activity} experiences in {location}. Premium accommodations, exclusive activities, and world-class service for your {year} getaway.',
};

export function generateIntentMetadata(
  intent: SEOIntent,
  destination?: DestinationSEOData,
  activity?: string
): Metadata {
  const currentYear = new Date().getFullYear();
  const location = destination ? `${destination.name}, ${destination.country}` : 'Worldwide';
  const primaryActivity = activity || 'Vacation';
  
  // Select title template based on primary intent
  const titleTemplate = titleTemplates[intent.primary];
  const descTemplate = descriptionTemplates[intent.primary];

  // Build title with intent modifiers
  let title = titleTemplate.primary
    .replace('{activity}', primaryActivity)
    .replace('{location}', location)
    .replace('{year}', currentYear.toString());

  // Add secondary modifiers
  if (intent.secondary) {
    const modifier = getSecondaryModifier(intent.secondary);
    title = `${modifier} ${title}`;
  }

  // Add timeframe
  if (intent.timeframe) {
    const timeframeModifier = getTimeframeModifier(intent.timeframe);
    title = `${title} ${timeframeModifier}`;
  }

  // Build description
  let description = descTemplate
    .replace('{activity}', primaryActivity)
    .replace('{location}', location)
    .replace('{year}', currentYear.toString());

  // Add destination-specific details
  if (destination) {
    description += ` ${destination.knownFor.slice(0, 3).join(', ')}.`;
    
    if (intent.primary === 'cheap') {
      description += ` Average cost: $${destination.avgCost}/day.`;
    } else if (intent.primary === 'best') {
      description += ` Best months: ${destination.bestMonths.map(m => 
        new Date(2000, m - 1).toLocaleDateString('en', { month: 'short' })
      ).join(', ')}.`;
    }
  }

  // Generate keywords
  const keywords = generateKeywords(intent, destination, activity);

  // Build Open Graph metadata
  const ogTitle = title;
  const ogDescription = description;
  const ogImage = generateOGImage(intent, destination);

  return {
    title,
    description,
    keywords: keywords.join(', '),
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      type: 'website',
      url: generateCanonicalURL(intent, destination),
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description: ogDescription,
      images: [ogImage],
    },
    alternates: {
      canonical: generateCanonicalURL(intent, destination),
    },
  };
}

function getSecondaryModifier(secondary: string): string {
  const modifiers = {
    warm: 'Warm & Sunny',
    cold: 'Winter & Snow',
    beach: 'Beach & Coastal',
    mountain: 'Mountain & Alpine',
    city: 'Urban & City',
    cultural: 'Cultural & Historical',
  };
  return modifiers[secondary] || '';
}

function getTimeframeModifier(timeframe: string): string {
  const modifiers = {
    january: 'in January',
    february: 'in February',
    march: 'in March',
    april: 'in April',
    may: 'in May',
    june: 'in June',
    july: 'in July',
    august: 'in August',
    september: 'in September',
    october: 'in October',
    november: 'in November',
    december: 'in December',
    winter: 'This Winter',
    spring: 'This Spring',
    summer: 'This Summer',
    fall: 'This Fall',
  };
  return modifiers[timeframe] || '';
}

function generateKeywords(intent: SEOIntent, destination?: DestinationSEOData, activity?: string): string[] {
  const keywords: string[] = [];
  
  // Primary intent keywords
  keywords.push(intent.primary, `${intent.primary} ${activity || 'vacation'}`);
  
  // Secondary keywords
  if (intent.secondary) {
    keywords.push(intent.secondary, `${intent.secondary} ${activity || 'vacation'}`);
  }
  
  // Destination keywords
  if (destination) {
    keywords.push(
      destination.name,
      `${destination.name} vacation`,
      `${destination.name} ${activity || 'trip'}`,
      `${destination.name} tourism`,
      destination.country
    );
    
    // Activity keywords
    destination.activities.forEach(act => {
      keywords.push(`${act} ${destination.name}`, `${destination.name} ${act}`);
    });
  }
  
  // Audience keywords
  if (intent.audience) {
    keywords.push(`${intent.audience} vacation`, `${intent.audience} travel`);
  }
  
  // Time-based keywords
  if (intent.timeframe) {
    keywords.push(`${intent.timeframe} vacation`, `${intent.timeframe} travel`);
  }
  
  return keywords;
}

function generateCanonicalURL(intent: SEOIntent, destination?: DestinationSEOData): string {
  const baseUrl = 'https://wheretovacation.com';
  
  let path = '/search';
  
  // Build path based on intent
  if (intent.primary === 'best') {
    path = '/best-places-to-visit';
  } else if (intent.primary === 'cheap') {
    path = '/cheap-vacation-deals';
  } else if (intent.primary === 'family-friendly') {
    path = '/family-vacation-ideas';
  }
  
  // Add destination
  if (destination) {
    path += `/${destination.name.toLowerCase().replace(/\s+/g, '-')}`;
  }
  
  // Add timeframe
  if (intent.timeframe) {
    path += `/${intent.timeframe}`;
  }
  
  return `${baseUrl}${path}`;
}

function generateOGImage(intent: SEOIntent, destination?: DestinationSEOData): {
  url: string;
  width: number;
  height: number;
  alt: string;
} {
  const baseUrl = 'https://wheretovacation.com';
  
  // Generate dynamic OG image based on intent
  let imagePath = '/api/og/search';
  const params = new URLSearchParams();
  
  params.set('intent', intent.primary);
  if (destination) {
    params.set('destination', destination.name);
  }
  if (intent.secondary) {
    params.set('secondary', intent.secondary);
  }
  
  const imageUrl = `${baseUrl}${imagePath}?${params.toString()}`;
  
  return {
    url: imageUrl,
    width: 1200,
    height: 630,
    alt: `Best ${intent.primary} vacation destinations${destination ? ` in ${destination.name}` : ''}`,
  };
}

// Helper functions for common SEO patterns
export function generateSeasonalMetadata(month: number, destination?: DestinationSEOData): Metadata {
  const monthNames: ('january' | 'february' | 'march' | 'april' | 'may' | 'june' |
                     'july' | 'august' | 'september' | 'october' | 'november' | 'december')[] = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];
  
  return generateIntentMetadata(
    {
      primary: 'best',
      timeframe: monthNames[month - 1],
    },
    destination,
    'Vacation'
  );
}

export function generateBudgetMetadata(budget: 'low' | 'medium' | 'high', destination?: DestinationSEOData): Metadata {
  const intentMap = {
    low: 'cheap' as const,
    medium: 'best' as const,
    high: 'luxury' as const,
  };
  
  return generateIntentMetadata(
    { primary: intentMap[budget] },
    destination,
    'Vacation'
  );
}

export function generateActivityMetadata(activity: string, destination?: DestinationSEOData): Metadata {
  return generateIntentMetadata(
    { primary: 'best' },
    destination,
    activity
  );
}
