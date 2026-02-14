export interface Message {
  id: string;
  booking_id?: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface PricingRule {
  id: string;
  property_id: string;
  rule_type: 'seasonal' | 'weekend' | 'special_event' | 'last_minute';
  start_date?: string;
  end_date?: string;
  day_of_week?: number;
  price_modifier: number;
  min_nights?: number;
  created_at: string;
}

export interface BlockedDate {
  id: string;
  property_id: string;
  start_date: string;
  end_date: string;
  reason?: string;
  created_at: string;
}

export interface PropertyAnalytics {
  id: string;
  property_id: string;
  date: string;
  views: number;
  bookings: number;
  revenue: number;
  occupancy_rate: number;
}
