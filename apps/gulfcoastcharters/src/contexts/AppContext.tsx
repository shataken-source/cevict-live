import React, { createContext, useContext, useState, useEffect } from 'react';

import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';


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
  contactPreferences: {
    email: boolean;
    phone: boolean;
  };
  customEmail?: string; // Custom @gulfcoastcharters.com email


  hasCustomEmail?: boolean; // Whether they purchased custom email
  useCustomEmail?: boolean; // Whether they want to use custom email for contact

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
  unavailableDates?: string[]; // Array of date strings in YYYY-MM-DD format


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
}

interface AppContextType {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  reviews: Review[];
  addReview: (charterId: string, reviewData: Omit<Review, 'id' | 'charterId' | 'date'>) => void;
  getReviewsByCharter: (charterId: string) => Review[];
  paidAds: PaidAd[];
  hasActivePaidAd: (type: 'hero' | 'sidebar' | 'featured') => boolean;
  charters: Charter[];
  addCharter: (charterData: Omit<Charter, 'id' | 'rating' | 'reviews' | 'imageUrl'>) => void;
  updateCharterAvailability: (charterId: string, unavailableDates: string[]) => void;
  captain: Captain | null;
  setCaptain: (captain: Captain | null) => void;
  bookings: Booking[];
  addBooking: (booking: Omit<Booking, 'id' | 'createdAt'>) => void;
  compareCharters: string[];
  addToCompare: (charterId: string) => void;
  removeFromCompare: (charterId: string) => void;
  clearCompare: () => void;
}



const defaultAppContext: AppContextType = {
  sidebarOpen: false,
  toggleSidebar: () => {},
  reviews: [],
  addReview: () => {},
  getReviewsByCharter: () => [],
  paidAds: [],
  hasActivePaidAd: () => false,
  charters: [],
  addCharter: () => {},
  updateCharterAvailability: () => {},
  captain: null,
  setCaptain: () => {},
  bookings: [],
  addBooking: () => {},
  compareCharters: [],
  addToCompare: () => {},
  removeFromCompare: () => {},
  clearCompare: () => {},
};


const AppContext = createContext<AppContextType>(defaultAppContext);

export const useAppContext = () => useContext(AppContext);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [paidAds, setPaidAds] = useState<PaidAd[]>([]);
  const [charters, setCharters] = useState<Charter[]>([]);
  const [captain, setCaptain] = useState<Captain | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [compareCharters, setCompareCharters] = useState<string[]>([]);

  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  const addReview = (charterId: string, reviewData: Omit<Review, 'id' | 'charterId' | 'date'>) => {
    const newReview: Review = {
      ...reviewData,
      id: uuidv4(),
      charterId,
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    };
    setReviews(prev => [newReview, ...prev]);
    toast.success('Review Submitted! Thank you for sharing your experience.');

  };

  const getReviewsByCharter = (charterId: string) => reviews.filter(r => r.charterId === charterId);

  const hasActivePaidAd = (type: 'hero' | 'sidebar' | 'featured') => 
    paidAds.some(ad => ad.type === type && ad.active);

  const addCharter = (charterData: Omit<Charter, 'id' | 'rating' | 'reviews' | 'imageUrl'>) => {
    const newCharter: Charter = {
      ...charterData,
      id: uuidv4(),
      rating: 4.5,
      reviews: 0,
      imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800',
      unavailableDates: [],
    };
    setCharters(prev => [newCharter, ...prev]);
    toast.success(`Charter Added! ${charterData.businessName} added.`);
  };

  const updateCharterAvailability = (charterId: string, unavailableDates: string[]) => {
    setCharters(prev => prev.map(c => c.id === charterId ? { ...c, unavailableDates } : c));
    toast.success('Availability Updated. Your calendar has been updated.');
  };

  const addBooking = (booking: Omit<Booking, 'id' | 'createdAt'>) => {
    const newBooking: Booking = { ...booking, id: uuidv4(), createdAt: new Date().toISOString() };
    setBookings(prev => [newBooking, ...prev]);
    toast.success('Booking Submitted! Your reservation request has been sent.');
  };

  const addToCompare = (charterId: string) => {
    if (compareCharters.includes(charterId)) {
      toast.error('Already Added. This charter is already in comparison');
      return;
    }
    if (compareCharters.length >= 4) {
      toast.error('Maximum Reached. You can compare up to 4 charters');
      return;
    }
    setCompareCharters(prev => [...prev, charterId]);
    toast.success('Added to Compare. Charter added to comparison');

  };

  const removeFromCompare = (charterId: string) => {
    setCompareCharters(prev => prev.filter(id => id !== charterId));
  };

  const clearCompare = () => {
    setCompareCharters([]);
  };

  return (
    <AppContext.Provider value={{
      sidebarOpen, toggleSidebar, reviews, addReview, getReviewsByCharter,
      paidAds, hasActivePaidAd, charters, addCharter, updateCharterAvailability,
      captain, setCaptain, bookings, addBooking,
      compareCharters, addToCompare, removeFromCompare, clearCompare,
    }}>
      {children}
    </AppContext.Provider>
  );
};
