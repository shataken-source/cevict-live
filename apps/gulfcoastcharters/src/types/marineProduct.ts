export type MarineProductCategory =
  | "safety"
  | "navigation"
  | "fishing"
  | "accessories"
  | "electronics"
  | "maintenance";

export type MarineProductRetailer = "amazon" | "walmart" | "boatus" | "temu";

export interface MarineProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: MarineProductCategory;
  retailer: MarineProductRetailer;
  affiliateLink: string;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  featured?: boolean;
  fastShipping?: boolean;
}

