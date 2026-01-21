/**
 * Affiliate Products Data
 * Sample affiliate products for the Safe Haven Marketplace
 * These should be populated into the products table
 */

export interface AffiliateProduct {
  name: string;
  description: string;
  price: string;
  category: string;
  link: string;
  sponsor?: boolean;
  commission?: string;
  image_url?: string;
}

/**
 * Sample affiliate products for smokers/vapers
 * Categories: CBD, Vapes, Papers, Nicotine, Accessories
 */
export const SAMPLE_AFFILIATE_PRODUCTS: AffiliateProduct[] = [
  // CBD Products
  {
    name: 'Premium CBD Oil Tincture',
    description: 'Full-spectrum CBD oil for relaxation and wellness. Lab-tested, THC-free options available.',
    price: '$29.99',
    category: 'CBD',
    link: 'https://example-cbd.com/product/tincture',
    commission: '10% commission',
    sponsor: false,
  },
  {
    name: 'CBD Gummies - Mixed Berry',
    description: 'Delicious CBD gummies with 25mg CBD per serving. Natural flavors, vegan-friendly.',
    price: '$39.99',
    category: 'CBD',
    link: 'https://example-cbd.com/product/gummies',
    commission: '12% commission',
    sponsor: true,
  },
  {
    name: 'CBD Topical Cream',
    description: 'Soothing CBD cream for targeted relief. Infused with menthol and essential oils.',
    price: '$24.99',
    category: 'CBD',
    link: 'https://example-cbd.com/product/cream',
    commission: '8% commission',
    sponsor: false,
  },

  // Vape Products
  {
    name: 'Premium Vape Pen Starter Kit',
    description: 'Complete vape starter kit with battery, charger, and premium e-liquid. Perfect for beginners.',
    price: '$49.99',
    category: 'Vapes',
    link: 'https://example-vape.com/product/starter-kit',
    commission: '15% commission',
    sponsor: false,
  },
  {
    name: 'Refillable Vape Pods (5-pack)',
    description: 'High-quality refillable pods compatible with most vape pens. Leak-proof design.',
    price: '$19.99',
    category: 'Vapes',
    link: 'https://example-vape.com/product/pods',
    commission: '12% commission',
    sponsor: false,
  },
  {
    name: 'Premium E-Liquid - Tobacco Flavor',
    description: 'Smooth tobacco-flavored e-liquid. Available in multiple nicotine strengths. 30ml bottle.',
    price: '$14.99',
    category: 'Vapes',
    link: 'https://example-vape.com/product/e-liquid-tobacco',
    commission: '10% commission',
    sponsor: true,
  },
  {
    name: 'Disposable Vape - Fruit Medley',
    description: 'Convenient disposable vape with 5000 puffs. Pre-filled with delicious fruit flavors.',
    price: '$12.99',
    category: 'Vapes',
    link: 'https://example-vape.com/product/disposable',
    commission: '8% commission',
    sponsor: false,
  },

  // Rolling Papers & Accessories
  {
    name: 'Organic Hemp Rolling Papers (50 sheets)',
    description: 'Premium organic hemp rolling papers. Slow-burning, unbleached, and eco-friendly.',
    price: '$4.99',
    category: 'Papers',
    link: 'https://example-smoke.com/product/hemp-papers',
    commission: '5% commission',
    sponsor: false,
  },
  {
    name: 'Raw Classic Rolling Papers (32 pack)',
    description: 'The original Raw papers. Unrefined, unbleached, and made with natural gum.',
    price: '$3.99',
    category: 'Papers',
    link: 'https://example-smoke.com/product/raw-papers',
    commission: '5% commission',
    sponsor: false,
  },
  {
    name: 'Premium Rolling Tray Set',
    description: 'Complete rolling tray set with compartments, grinder, and accessories. Perfect gift.',
    price: '$29.99',
    category: 'Accessories',
    link: 'https://example-smoke.com/product/rolling-tray',
    commission: '10% commission',
    sponsor: false,
  },
  {
    name: 'Electric Herb Grinder',
    description: 'Automatic electric grinder with multiple grind settings. USB rechargeable.',
    price: '$34.99',
    category: 'Accessories',
    link: 'https://example-smoke.com/product/electric-grinder',
    commission: '12% commission',
    sponsor: true,
  },

  // Nicotine Products
  {
    name: 'Nicotine Pouches - Mint (20 pouches)',
    description: 'Discrete nicotine pouches. Tobacco-free, no spitting required. Fresh mint flavor.',
    price: '$6.99',
    category: 'Nicotine',
    link: 'https://example-nicotine.com/product/pouches-mint',
    commission: '8% commission',
    sponsor: false,
  },
  {
    name: 'Nicotine Gum - 4mg (100 pieces)',
    description: 'Nicotine replacement therapy gum. Helps manage cravings. Multiple flavors available.',
    price: '$24.99',
    category: 'Nicotine',
    link: 'https://example-nicotine.com/product/gum',
    commission: '6% commission',
    sponsor: false,
  },
  {
    name: 'Nicotine Lozenges - Cherry (81 lozenges)',
    description: 'Long-lasting nicotine lozenges. Cherry flavor, 4mg nicotine per lozenge.',
    price: '$19.99',
    category: 'Nicotine',
    link: 'https://example-nicotine.com/product/lozenges',
    commission: '6% commission',
    sponsor: false,
  },

  // Storage & Organization
  {
    name: 'Airtight Storage Container Set',
    description: 'Set of 3 airtight containers for storage. UV-resistant, smell-proof design.',
    price: '$18.99',
    category: 'Accessories',
    link: 'https://example-smoke.com/product/storage',
    commission: '10% commission',
    sponsor: false,
  },
  {
    name: 'Portable Ashtray - Keychain',
    description: 'Compact, leak-proof portable ashtray. Attaches to keys or belt. Perfect for travel.',
    price: '$9.99',
    category: 'Accessories',
    link: 'https://example-smoke.com/product/portable-ashtray',
    commission: '8% commission',
    sponsor: false,
  },
  {
    name: 'Lighter Case - Leather',
    description: 'Premium leather lighter case with belt clip. Protects and organizes your lighter.',
    price: '$12.99',
    category: 'Accessories',
    link: 'https://example-smoke.com/product/lighter-case',
    commission: '7% commission',
    sponsor: false,
  },
];

/**
 * Get products by category
 */
export function getProductsByCategory(category: string): AffiliateProduct[] {
  if (category === 'all') {
    return SAMPLE_AFFILIATE_PRODUCTS;
  }
  return SAMPLE_AFFILIATE_PRODUCTS.filter(p => p.category.toLowerCase() === category.toLowerCase());
}

/**
 * Get sponsor products
 */
export function getSponsorProducts(): AffiliateProduct[] {
  return SAMPLE_AFFILIATE_PRODUCTS.filter(p => p.sponsor);
}
