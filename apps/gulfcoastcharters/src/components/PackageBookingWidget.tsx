/**
 * Package Booking Widget
 * Simple component to book rental + boat together
 * This is the easiest implementation - just a form that creates a unified booking
 */

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface PackageBookingWidgetProps {
  onSuccess?: (bookingId: string) => void;
  onCancel?: () => void;
}

export default function PackageBookingWidget({ onSuccess, onCancel }: PackageBookingWidgetProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // WTV data
  const [wtvPropertyId, setWtvPropertyId] = useState('');
  const [wtvCheckIn, setWtvCheckIn] = useState('');
  const [wtvCheckOut, setWtvCheckOut] = useState('');
  const [wtvGuests, setWtvGuests] = useState(2);
  const [wtvTotal, setWtvTotal] = useState(0);
  
  // GCC data
  const [gccVesselId, setGccVesselId] = useState('');
  const [gccTripDate, setGccTripDate] = useState('');
  const [gccPassengers, setGccPassengers] = useState(2);
  const [gccTotal, setGccTotal] = useState(0);
  
  const [discountPercent, setDiscountPercent] = useState(15);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Please log in to create a package booking');
        return;
      }

      const response = await fetch('/api/unified-bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          bookingData: {
            booking_type: 'package',
            wtv_data: {
              property_id: wtvPropertyId || undefined,
              check_in: wtvCheckIn || undefined,
              check_out: wtvCheckOut || undefined,
              guests: wtvGuests,
              total: wtvTotal,
            },
            gcc_data: {
              vessel_id: gccVesselId || undefined,
              trip_date: gccTripDate || undefined,
              passengers: gccPassengers,
              total: gccTotal,
            },
            package_discount_percent: discountPercent,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess?.(data.booking.id);
      } else {
        setError(data.error || 'Failed to create package booking');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    const subtotal = wtvTotal + gccTotal;
    const discount = subtotal * (discountPercent / 100);
    return subtotal - discount;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Book Package Deal</h2>
      <p className="text-gray-600 mb-6">
        Book both vacation rental and boat charter together and save {discountPercent}%!
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* WTV Section */}
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-lg mb-3">Vacation Rental (WTV)</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Property ID</label>
              <input
                type="text"
                value={wtvPropertyId}
                onChange={(e) => setWtvPropertyId(e.target.value)}
                className="w-full border rounded px-3 py-2"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Check In</label>
              <input
                type="date"
                value={wtvCheckIn}
                onChange={(e) => setWtvCheckIn(e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Check Out</label>
              <input
                type="date"
                value={wtvCheckOut}
                onChange={(e) => setWtvCheckOut(e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Guests</label>
              <input
                type="number"
                value={wtvGuests}
                onChange={(e) => setWtvGuests(parseInt(e.target.value) || 2)}
                min="1"
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Total ($)</label>
              <input
                type="number"
                value={wtvTotal}
                onChange={(e) => setWtvTotal(parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* GCC Section */}
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-lg mb-3">Boat Charter (GCC)</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Vessel ID</label>
              <input
                type="text"
                value={gccVesselId}
                onChange={(e) => setGccVesselId(e.target.value)}
                className="w-full border rounded px-3 py-2"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Trip Date</label>
              <input
                type="datetime-local"
                value={gccTripDate}
                onChange={(e) => setGccTripDate(e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Passengers</label>
              <input
                type="number"
                value={gccPassengers}
                onChange={(e) => setGccPassengers(parseInt(e.target.value) || 2)}
                min="1"
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Total ($)</label>
              <input
                type="number"
                value={gccTotal}
                onChange={(e) => setGccTotal(parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* Package Discount */}
        <div className="border rounded-lg p-4 bg-blue-50">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Package Discount (%)
          </label>
          <input
            type="number"
            value={discountPercent}
            onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
            min="0"
            max="50"
            step="1"
            className="w-full border rounded px-3 py-2"
          />
        </div>

        {/* Total */}
        <div className="border-t pt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600">WTV Subtotal:</span>
            <span className="font-semibold">${wtvTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600">GCC Subtotal:</span>
            <span className="font-semibold">${gccTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600">Subtotal:</span>
            <span className="font-semibold">${(wtvTotal + gccTotal).toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center mb-2 text-green-600">
            <span>Package Discount ({discountPercent}%):</span>
            <span className="font-semibold">
              -${((wtvTotal + gccTotal) * (discountPercent / 100)).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center text-xl font-bold border-t pt-2 mt-2">
            <span>Total:</span>
            <span className="text-blue-600">${calculateTotal().toFixed(2)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading || (wtvTotal === 0 && gccTotal === 0)}
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {loading ? 'Creating Package Booking...' : 'Create Package Booking'}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
