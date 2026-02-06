/**
 * Enhanced Booking Calendar Component
 * Integrates with real-time availability API, supports time slots, holds, and waitlist
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Clock, Users, DollarSign, Lock, AlertCircle, Calendar as CalendarIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AvailabilitySlot {
  availability_id: string;
  date: string;
  time_slot: 'morning' | 'afternoon' | 'full_day' | 'custom' | 'overnight';
  start_time: string | null;
  end_time: string | null;
  status: 'available' | 'booked' | 'blocked' | 'pending' | 'hold';
  max_passengers: number | null;
  current_passengers: number;
  price: number | null;
  notes: string | null;
}

interface BookingHold {
  hold_id: string;
  expires_at: string;
}

interface WaitlistInfo {
  position: number;
  total: number;
}

interface BookingCalendarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  charter?: any;
  captainId?: string;
  onDateRangeSelect?: (start: Date, end: Date) => void;
  onTimeSlotSelect?: (date: Date, timeSlot: AvailabilitySlot) => void;
  unavailableDates?: Date[];
  onUnavailableDatesChange?: (dates: Date[]) => void;
  isManagementMode?: boolean;
}

export default function BookingCalendar({
  open,
  onOpenChange,
  charter,
  captainId,
  onDateRangeSelect,
  onTimeSlotSelect,
  unavailableDates = [],
  onUnavailableDatesChange,
  isManagementMode = false,
}: BookingCalendarProps) {
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<AvailabilitySlot | null>(null);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeHold, setActiveHold] = useState<BookingHold | null>(null);
  const [waitlistInfo, setWaitlistInfo] = useState<WaitlistInfo | null>(null);
  const [selectedUnavailable, setSelectedUnavailable] = useState<Date[]>(unavailableDates);

  // Get captain ID from charter or prop
  const effectiveCaptainId = captainId || charter?.captain_id || charter?.captains?.id;

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      setUser(authUser ?? null);
    });

    if (open && effectiveCaptainId) {
      // Load availability for current month when dialog opens
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      loadAvailability(startOfMonth, endOfMonth);
    }
  }, [open, effectiveCaptainId]);

  useEffect(() => {
    if (selectedDate && effectiveCaptainId && !isManagementMode) {
      loadDateAvailability(selectedDate);
      checkActiveHold(selectedDate);
      checkWaitlist(selectedDate);
    }
  }, [selectedDate, effectiveCaptainId, isManagementMode]);

  const loadAvailability = async (startDate: Date, endDate: Date) => {
    if (!effectiveCaptainId) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/calendar/availability?captainId=${effectiveCaptainId}&startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`
      );

      if (!response.ok) {
        throw new Error('Failed to load availability');
      }

      const data = await response.json();
      setAvailability(data.availability || []);
    } catch (error: any) {
      console.error('Error loading availability:', error);
      toast.error('Failed to load calendar availability');
    } finally {
      setLoading(false);
    }
  };

  const loadDateAvailability = async (date: Date) => {
    if (!effectiveCaptainId) return;

    const dateStr = date.toISOString().split('T')[0];
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    try {
      const response = await fetch(
        `/api/calendar/availability?captainId=${effectiveCaptainId}&startDate=${startOfDay.toISOString().split('T')[0]}&endDate=${endOfDay.toISOString().split('T')[0]}`
      );

      if (!response.ok) {
        throw new Error('Failed to load date availability');
      }

      const data = await response.json();
      const dateSlots = (data.availability || []).filter(
        (slot: AvailabilitySlot) => slot.date === dateStr
      );
      setAvailability(dateSlots);
    } catch (error: any) {
      console.error('Error loading date availability:', error);
    }
  };

  const checkActiveHold = async (date: Date) => {
    if (!user || !effectiveCaptainId) return;

    try {
      // Check if user has an active hold for this date
      const dateStr = date.toISOString().split('T')[0];
      const dateSlots = availability.filter((slot) => slot.date === dateStr && slot.status === 'hold');
      
      if (dateSlots.length > 0) {
        // Try to get hold details (would need a GET endpoint for holds)
        // For now, we'll just show that a hold exists
        setActiveHold({
          hold_id: 'active',
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        });
      } else {
        setActiveHold(null);
      }
    } catch (error) {
      console.error('Error checking hold:', error);
    }
  };

  const checkWaitlist = async (date: Date) => {
    if (!effectiveCaptainId) return;

    try {
      const dateStr = date.toISOString().split('T')[0];
      const response = await fetch(
        `/api/calendar/waitlist?captainId=${effectiveCaptainId}&date=${dateStr}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.waitlist && data.waitlist.length > 0) {
          setWaitlistInfo({
            position: data.waitlist.length,
            total: data.waitlist.length,
          });
        } else {
          setWaitlistInfo(null);
        }
      }
    } catch (error) {
      console.error('Error checking waitlist:', error);
    }
  };

  const createHold = async (slot: AvailabilitySlot) => {
    if (!user) {
      toast.error('Please log in to continue');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/calendar/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          availabilityId: slot.availability_id,
          bookingData: {
            date: slot.date,
            timeSlot: slot.time_slot,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create hold');
      }

      const data = await response.json();
      setActiveHold(data.hold);
      toast.success('Time slot held for 15 minutes');
      
      // Reload availability
      if (selectedDate) {
        loadDateAvailability(selectedDate);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create hold');
    } finally {
      setLoading(false);
    }
  };

  const joinWaitlist = async (date: Date) => {
    if (!user) {
      toast.error('Please log in to join waitlist');
      return;
    }

    if (!effectiveCaptainId) {
      toast.error('Captain information not available');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/calendar/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          captainId: effectiveCaptainId,
          desiredDate: date.toISOString().split('T')[0],
          tripType: charter?.trip_type || 'fishing',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to join waitlist');
      }

      const data = await response.json();
      toast.success(`Added to waitlist (Position: ${data.waitlistEntry.position})`);
      checkWaitlist(date);
    } catch (error: any) {
      toast.error(error.message || 'Failed to join waitlist');
    } finally {
      setLoading(false);
    }
  };

  const getDateAvailability = (date: Date): AvailabilitySlot[] => {
    const dateStr = date.toISOString().split('T')[0];
    return availability.filter((slot) => slot.date === dateStr);
  };

  const isDateAvailable = (date: Date): boolean => {
    if (isManagementMode) return true;
    
    const slots = getDateAvailability(date);
    if (slots.length === 0) return false;
    
    return slots.some((slot) => slot.status === 'available');
  };

  const isDateFullyBooked = (date: Date): boolean => {
    const slots = getDateAvailability(date);
    if (slots.length === 0) return false;
    
    return slots.every((slot) => slot.status === 'booked' || slot.status === 'blocked');
  };

  const isDateBlocked = (date: Date): boolean => {
    if (isManagementMode) {
      return selectedUnavailable.some((d) => d.toDateString() === date.toDateString());
    }
    
    const slots = getDateAvailability(date);
    return slots.some((slot) => slot.status === 'blocked');
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    if (isManagementMode) {
      // Toggle unavailable dates
      const isAlreadyUnavailable = selectedUnavailable.some(
        (d) => d.toDateString() === date.toDateString()
      );
      let newDates;
      if (isAlreadyUnavailable) {
        newDates = selectedUnavailable.filter((d) => d.toDateString() !== date.toDateString());
      } else {
        newDates = [...selectedUnavailable, date];
      }
      setSelectedUnavailable(newDates);
    } else {
      // Booking mode - select date and show time slots
      setSelectedDate(date);
      setStartDate(date);
      setEndDate(undefined);
    }
  };

  const handleTimeSlotSelect = (slot: AvailabilitySlot) => {
    if (slot.status !== 'available') {
      toast.error('This time slot is not available');
      return;
    }

    setSelectedTimeSlot(slot);
    
    if (onTimeSlotSelect && selectedDate) {
      onTimeSlotSelect(selectedDate, slot);
    }
  };

  const handleSave = async () => {
    if (isManagementMode && onUnavailableDatesChange) {
      // Save blocked dates
      onUnavailableDatesChange(selectedUnavailable);
      onOpenChange(false);
    } else if (selectedDate && selectedTimeSlot) {
      // Create hold and proceed with booking
      await createHold(selectedTimeSlot);
      if (onTimeSlotSelect) {
        onTimeSlotSelect(selectedDate, selectedTimeSlot);
      }
    } else if (startDate && endDate && onDateRangeSelect) {
      // Date range selection (legacy mode)
      onDateRangeSelect(startDate, endDate);
      onOpenChange(false);
    }
  };

  const getTimeSlotLabel = (slot: AvailabilitySlot): string => {
    if (slot.time_slot === 'custom' && slot.start_time && slot.end_time) {
      return `${slot.start_time} - ${slot.end_time}`;
    }
    
    const labels: Record<string, string> = {
      morning: 'Morning (6 AM - 12 PM)',
      afternoon: 'Afternoon (12 PM - 6 PM)',
      full_day: 'Full Day (6 AM - 6 PM)',
      overnight: 'Overnight (6 PM - 6 AM)',
      custom: 'Custom Time',
    };
    
    return labels[slot.time_slot] || slot.time_slot;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      available: 'default',
      booked: 'destructive',
      blocked: 'outline',
      hold: 'secondary',
      pending: 'secondary',
    };

    return (
      <Badge variant={variants[status] || 'outline'} className="text-xs">
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            {isManagementMode ? 'Manage Availability' : 'Select Booking Date & Time'}
          </DialogTitle>
          <DialogDescription>
            {isManagementMode 
              ? 'Block dates, set availability, and manage time slots for this charter.'
              : 'Choose your preferred date and time slot for your fishing trip.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Calendar */}
            <div>
              <Calendar
                mode="single"
                selected={isManagementMode ? undefined : selectedDate || startDate}
                onSelect={handleDateSelect}
                disabled={(date) => {
                  if (date < new Date(new Date().setHours(0, 0, 0, 0))) return true;
                  if (isManagementMode) return false;
                  return isDateBlocked(date) || (!isDateAvailable(date) && !isDateFullyBooked(date));
                }}
                className="rounded-md border"
                modifiers={{
                  available: (date) => isDateAvailable(date),
                  booked: (date) => isDateFullyBooked(date),
                  blocked: (date) => isDateBlocked(date),
                }}
                modifiersStyles={{
                  available: { backgroundColor: '#dcfce7', color: '#166534' },
                  booked: { backgroundColor: '#fee2e2', color: '#991b1b' },
                  blocked: { backgroundColor: '#f3f4f6', textDecoration: 'line-through' },
                }}
              />

              {/* Legend */}
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-100 border border-green-300 rounded" />
                  <span>Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-100 border border-red-300 rounded" />
                  <span>Fully Booked</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded line-through" />
                  <span>Blocked/Unavailable</span>
                </div>
              </div>
            </div>

            {/* Time Slots & Details */}
            <div className="space-y-4">
              {isManagementMode ? (
                <div className="text-sm text-gray-600">
                  <p className="mb-2">Click dates to mark as unavailable (blocked).</p>
                  <p>Click again to make available.</p>
                  <p className="mt-4 font-semibold">Selected blocked dates: {selectedUnavailable.length}</p>
                </div>
              ) : selectedDate ? (
                <div>
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Time Slots for {selectedDate.toLocaleDateString()}
                  </h3>

                  {loading ? (
                    <div className="text-center py-8 text-gray-500">Loading availability...</div>
                  ) : availability.length === 0 ? (
                    <div className="space-y-4">
                      <div className="p-4 border rounded-lg bg-yellow-50">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                          <div>
                            <p className="font-semibold text-yellow-900">No availability set</p>
                            <p className="text-sm text-yellow-700 mt-1">
                              This date doesn't have any time slots configured.
                            </p>
                          </div>
                        </div>
                      </div>

                      {isDateFullyBooked(selectedDate) && (
                        <Button
                          onClick={() => joinWaitlist(selectedDate)}
                          className="w-full"
                          variant="outline"
                        >
                          Join Waitlist
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {availability.map((slot) => (
                        <div
                          key={slot.availability_id}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            slot.status === 'available'
                              ? 'border-green-300 bg-green-50 hover:bg-green-100'
                              : slot.status === 'hold'
                              ? 'border-blue-300 bg-blue-50'
                              : 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                          }`}
                          onClick={() => handleTimeSlotSelect(slot)}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <div className="font-semibold flex items-center gap-2">
                                {getTimeSlotLabel(slot)}
                                {slot.status === 'available' && (
                                  <Badge variant="default" className="text-xs">Available</Badge>
                                )}
                              </div>
                              <div className="text-sm text-gray-600 mt-1 space-y-1">
                                {slot.max_passengers && (
                                  <div className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {slot.current_passengers}/{slot.max_passengers} passengers
                                  </div>
                                )}
                                {slot.price && (
                                  <div className="flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" />
                                    ${slot.price.toFixed(2)}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div>{getStatusBadge(slot.status)}</div>
                          </div>

                          {slot.status === 'hold' && activeHold && (
                            <div className="mt-2 text-xs text-blue-700 flex items-center gap-1">
                              <Lock className="h-3 w-3" />
                              Held until {new Date(activeHold.expires_at).toLocaleTimeString()}
                            </div>
                          )}

                          {slot.notes && (
                            <p className="text-xs text-gray-500 mt-2">{slot.notes}</p>
                          )}
                        </div>
                      ))}

                      {isDateFullyBooked(selectedDate) && (
                        <Button
                          onClick={() => joinWaitlist(selectedDate)}
                          className="w-full mt-4"
                          variant="outline"
                        >
                          Join Waitlist
                          {waitlistInfo && ` (${waitlistInfo.total} waiting)`}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Select a date to view available time slots
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {isManagementMode ? (
              <Button onClick={handleSave} disabled={loading}>
                Save Availability
              </Button>
            ) : selectedTimeSlot ? (
              <Button onClick={handleSave} disabled={loading}>
                Continue with Booking
              </Button>
            ) : startDate && endDate ? (
              <Button onClick={handleSave} disabled={loading}>
                Confirm Booking
              </Button>
            ) : (
              <Button disabled>Select Date & Time</Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
