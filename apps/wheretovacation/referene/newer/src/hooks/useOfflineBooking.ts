import { useState, useEffect } from 'react';
import { backgroundSync } from '@/utils/backgroundSync';

export function useOfflineBooking() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Load pending bookings count
    loadPendingCount();

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  const loadPendingCount = async () => {
    try {
      const pending = await backgroundSync.getPendingBookings();
      setPendingCount(pending.length);
    } catch (error) {
      console.error('Failed to load pending bookings:', error);
    }
  };

  const createBooking = async (bookingData: Record<string, unknown>) => {
    if (isOnline) {
      // Online: send directly
      return await sendBooking(bookingData);
    } else {
      // Offline: queue for later
      await backgroundSync.addPendingBooking(bookingData);
      await loadPendingCount();
      return { success: true, offline: true };
    }
  };

  const sendBooking = async (data: Record<string, unknown>) => {
    const response = await fetch('/functions/v1/booking-manager', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await response.json();
  };

  return {
    isOnline,
    pendingCount,
    createBooking,
    refreshPending: loadPendingCount
  };
}
