// Compatibility hooks for components still using old context API
import { useAppStore } from '@/stores/appStore';
import { useUserStore } from '@/stores/userStore';
import { useI18nStore } from '@/stores/i18nStore';

export const useAppContext = () => ({
  sidebarOpen: useAppStore(s => s.sidebarOpen),
  toggleSidebar: useAppStore(s => s.toggleSidebar),
  reviews: useAppStore(s => s.reviews),
  addReview: useAppStore(s => s.addReview),
  getReviewsByCharter: useAppStore(s => s.getReviewsByCharter),
  paidAds: useAppStore(s => s.paidAds),
  hasActivePaidAd: useAppStore(s => s.hasActivePaidAd),
  charters: useAppStore(s => s.charters),
  addCharter: useAppStore(s => s.addCharter),
  updateCharterAvailability: useAppStore(s => s.updateCharterAvailability),
  captain: useAppStore(s => s.captain),
  setCaptain: useAppStore(s => s.setCaptain),
  bookings: useAppStore(s => s.bookings),
  addBooking: useAppStore(s => s.addBooking),
  compareCharters: useAppStore(s => s.compareCharters),
  addToCompare: useAppStore(s => s.addToCompare),
  removeFromCompare: useAppStore(s => s.removeFromCompare),
  clearCompare: useAppStore(s => s.clearCompare),
});

export const useUser = () => ({
  user: useUserStore(s => s.user),
  isAuthenticated: useUserStore(s => s.isAuthenticated),
  login: useUserStore(s => s.login),
  logout: useUserStore(s => s.logout),
});

export const useI18n = () => ({
  language: useI18nStore(s => s.language),
  setLanguage: useI18nStore(s => s.setLanguage),
  t: useI18nStore(s => s.t),
});
