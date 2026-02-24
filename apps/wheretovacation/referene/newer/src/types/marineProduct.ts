export interface MarineProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: 'safety' | 'fishing' | 'accessories' | 'navigation' | 'maintenance' | 'electronics';
  retailer: 'amazon' | 'boatus' | 'walmart' | 'temu';
  affiliateLink: string;
  fastShipping?: boolean;

  rating: number;
  reviewCount: number;
  inStock: boolean;
  featured?: boolean;
}

export interface ProductReview {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
  helpful: number;
}
