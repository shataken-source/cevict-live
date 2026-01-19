import type { MarineProduct } from "@/types/marineProduct";

function withAmazonTag(url: string): string {
  const tag = process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG;
  if (!tag) return url;
  try {
    const u = new URL(url);
    // Keep existing tag if present; otherwise set.
    if (!u.searchParams.get("tag")) u.searchParams.set("tag", tag);
    return u.toString();
  } catch {
    return url;
  }
}

export const marineProducts: MarineProduct[] = [
  {
    id: "life-jacket",
    name: "Adult Coast Guard Approved Life Jacket",
    description: "Comfortable, adjustable PFD for charter and inshore trips.",
    price: 29.99,
    image: "/placeholder.svg",
    category: "safety",
    retailer: "amazon",
    affiliateLink: withAmazonTag("https://www.amazon.com/s?k=coast+guard+life+jacket"),
    rating: 4.6,
    reviewCount: 32000,
    inStock: true,
    featured: true,
    fastShipping: true,
  },
  {
    id: "dry-bag",
    name: "Waterproof Dry Bag (20L)",
    description: "Keep phones, wallets, and keys dry on the water.",
    price: 17.99,
    image: "/placeholder.svg",
    category: "accessories",
    retailer: "amazon",
    affiliateLink: withAmazonTag("https://www.amazon.com/s?k=waterproof+dry+bag+20l"),
    rating: 4.7,
    reviewCount: 18000,
    inStock: true,
    fastShipping: true,
  },
  {
    id: "handheld-vhf",
    name: "Handheld Marine VHF Radio",
    description: "Reliable backup comms for offshore and nearshore safety.",
    price: 89.99,
    image: "/placeholder.svg",
    category: "electronics",
    retailer: "amazon",
    affiliateLink: withAmazonTag("https://www.amazon.com/s?k=handheld+marine+vhf+radio"),
    rating: 4.5,
    reviewCount: 4200,
    inStock: true,
  },
  {
    id: "fish-grips",
    name: "Fish Lip Gripper + Scale",
    description: "Safer handling and quick weigh-ins at the dock.",
    price: 14.99,
    image: "/placeholder.svg",
    category: "fishing",
    retailer: "amazon",
    affiliateLink: withAmazonTag("https://www.amazon.com/s?k=fish+grip+scale"),
    rating: 4.4,
    reviewCount: 9100,
    inStock: true,
  },
];

