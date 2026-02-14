export interface Location {
  id: string;
  name: string;
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  description?: string;
  image_url?: string;
  region?: string;
}

export interface Property {
  id: string;
  location_id: string;
  owner_id: string;
  title: string;
  description: string;
  property_type: string;
  bedrooms: number;
  bathrooms: number;
  max_guests: number;
  price_per_night: number;
  cleaning_fee: number;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  latitude: number;
  longitude: number;
  amenities: string[];
  images: string[];
  is_active: boolean;
  featured: boolean;
  rating: number;
  review_count: number;
  created_at: string;
  location?: Location;
}

export interface Booking {
  id: string;
  property_id: string;
  user_id: string;
  check_in: string;
  check_out: string;
  guests: number;
  total_price: number;
  status: string;
  payment_status?: string;
  payment_intent_id?: string;
  amount_paid?: number;
  currency?: string;
  payment_method?: string;
  payment_date?: string;
  special_requests?: string;
  property?: Property;
}


export interface Review {
  id: string;
  property_id: string;
  user_id: string;
  rating: number;
  comment: string;
  created_at: string;
  user_profile?: UserProfile;
}

export interface UserProfile {
  id: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  bio?: string;
  is_host: boolean;
  is_admin: boolean;
}
