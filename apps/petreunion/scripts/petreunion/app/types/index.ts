export interface Pet {
  id: string;
  pet_name?: string;
  name?: string; // Alias for pet_name
  photo_url?: string;
  imageUrl?: string; // Alias for photo_url
  breed?: string;
  location_city?: string;
  location_state?: string;
  location?: string; // Combined location
  dateLost?: string;
  last_seen_date?: string;
  status?: 'lost' | 'found' | 'reunited';
  pet_type?: string;
  color?: string;
  description?: string;
  contactInfo?: string;
  created_at?: string;
  createdAt?: string; // Alias for created_at
  updatedAt?: string;
}

export interface Stats {
  total: number;
  found: number;
  active: number;
}

export interface ActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  buttonText: string;
  href: string;
  features: string[];
  buttonVariant?: 'default' | 'outline' | 'ghost';
}
