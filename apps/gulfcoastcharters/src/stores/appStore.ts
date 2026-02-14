import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from '@/components/ui/use-toast';

export interface Review {
  id: string;
  charterId: string;
  customerName: string;
  email: string;
  rating: number;
  tripType?: string;
  comment: string;
  date: string;
}

export interface Charter {
  id: string;
  businessName: string;
  boatName: string;
  captainName: string;
  captainEmail: string;
  captainPhone: string;
  contactPreferences: { email: boolean; phone: boolean };
  customEmail?: string;
  hasCustomEmail?: boolean;
  useCustomEmail?: boolean;
  location: string;
  city: string;
  boatType: string;
  boatLength: number;
  maxPassengers?: number;
  priceHalfDay?: number;
  priceFullDay?: number;
  phone?: string;
  email?: string;
  website?: string;
  description?: string;
  rating: number;
  reviews: number;
  imageUrl: string;
  unavailableDates?: string[];
}

export interface Captain {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
}

export interface Booking {
  id: string;
  charterId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
}

export interface PaidAd {
  id: string;
  type: 'hero' | 'sidebar' | 'featured';
  businessName: string;
  startDate: string;
  endDate: string;
  active: boolean;
  businessId?: string;
  cost?: number;
}

interface AppState {
  sidebarOpen: boolean;
  reviews: Review[];
  paidAds: PaidAd[];
  charters: Charter[];
  captain: Captain | null;
  bookings: Booking[];
  compareCharters: string[];
  toggleSidebar: () => void;
  addReview: (charterId: string, reviewData: Omit<Review, 'id' | 'charterId' | 'date'>) => void;
  getReviewsByCharter: (charterId: string) => Review[];
  hasActivePaidAd: (type: 'hero' | 'sidebar' | 'featured') => boolean;
  addCharter: (charterData: any) => void;
  updateCharterAvailability: (charterId: string, unavailableDates: string[]) => void;
  setCaptain: (captain: Captain | null) => void;
  addBooking: (booking: Omit<Booking, 'id' | 'createdAt'>) => void;
  addToCompare: (charterId: string) => void;
  removeFromCompare: (charterId: string) => void;
  clearCompare: () => void;
}

let listeners: Array<() => void> = [];
let state: Omit<AppState, 'toggleSidebar' | 'addReview' | 'getReviewsByCharter' | 'hasActivePaidAd' | 'addCharter' | 'updateCharterAvailability' | 'setCaptain' | 'addBooking' | 'addToCompare' | 'removeFromCompare' | 'clearCompare'> = {
  sidebarOpen: false,
  reviews: [],
  paidAds: [],
  charters: [],
  captain: null,
  bookings: [],
  compareCharters: [],
};

try {
  const stored = localStorage.getItem('app-storage');
  if (stored) state = JSON.parse(stored).state || state;
} catch (error) {
  console.error('Failed to load app state from localStorage:', error);
}


const setState = (newState: Partial<typeof state>) => {
  state = { ...state, ...newState };
  try {
    localStorage.setItem('app-storage', JSON.stringify({ state }));
  } catch (error) {
    console.error('Failed to save app state to localStorage:', error);
  }
  listeners.forEach(l => l());
};

export const useAppStore = <T>(selector: (state: AppState) => T): T => {
  const [, forceUpdate] = useState({});
  
  useEffect(() => {
    const listener = () => forceUpdate({});
    listeners.push(listener);
    return () => { listeners = listeners.filter(l => l !== listener); };
  }, []);
  
  const fullState: AppState = {
    ...state,
    toggleSidebar: () => setState({ sidebarOpen: !state.sidebarOpen }),
    addReview: (charterId, reviewData) => {
      const newReview: Review = {
        ...reviewData,
        id: uuidv4(),
        charterId,
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      };
      setState({ reviews: [newReview, ...state.reviews] });
      toast({ title: 'Review Submitted!', description: 'Thank you for sharing your experience.' });
    },
    getReviewsByCharter: (charterId) => state.reviews.filter(r => r.charterId === charterId),
    hasActivePaidAd: (type) => state.paidAds.some(ad => ad.type === type && ad.active),
    addCharter: (charterData: any) => {
      const newCharter: Charter = {
        id: charterData.id || uuidv4(),
        businessName: charterData.businessName,
        boatName: charterData.boatName,
        captainName: charterData.captainName,
        captainEmail: charterData.captainEmail,
        captainPhone: charterData.captainPhone,
        contactPreferences: charterData.contactPreferences || { email: true, phone: true },
        location: charterData.location,
        city: charterData.city,
        boatType: charterData.boatType,
        boatLength: charterData.boatLength,
        maxPassengers: charterData.maxPassengers,
        priceHalfDay: charterData.priceHalfDay,
        priceFullDay: charterData.priceFullDay,
        rating: charterData.rating || 0,
        reviews: charterData.reviewCount || 0,
        imageUrl: charterData.image || charterData.imageUrl || 'https://d64gsuwffb70l.cloudfront.net/6918960e54362d714f32b6fc_1763224699486_cabce3b8.webp',
        unavailableDates: charterData.unavailableDates || [],
      };
      setState({ charters: [newCharter, ...state.charters] });
      toast({ title: 'Charter Added!', description: `${charterData.businessName} added.` });
    },
    updateCharterAvailability: (charterId, unavailableDates) => {
      setState({ charters: state.charters.map(c => c.id === charterId ? { ...c, unavailableDates } : c) });
      toast({ title: 'Availability Updated' });
    },
    setCaptain: (captain) => setState({ captain }),
    addBooking: (booking) => {
      const newBooking: Booking = { ...booking, id: uuidv4(), createdAt: new Date().toISOString() };
      setState({ bookings: [newBooking, ...state.bookings] });
      toast({ title: 'Booking Submitted!' });
    },
    addToCompare: (charterId) => {
      if (state.compareCharters.includes(charterId)) {
        toast({ title: 'Already Added' });
        return;
      }
      if (state.compareCharters.length >= 4) {
        toast({ title: 'Maximum Reached' });
        return;
      }
      setState({ compareCharters: [...state.compareCharters, charterId] });
      toast({ title: 'Added to Compare' });
    },
    removeFromCompare: (charterId) => setState({ compareCharters: state.compareCharters.filter(id => id !== charterId) }),
    clearCompare: () => setState({ compareCharters: [] }),
  };
  
  return selector(fullState);
};
