/**
 * Booking Triggers
 * Triggers local activities bot when boats or rentals are booked
 * Makes activities available to Finn for suggestions in case of problems
 */

/**
 * Trigger activities bot when a booking is created
 * This ensures Finn can suggest local attractions if there are issues with the booking
 */
export async function triggerActivitiesOnBooking(bookingData: {
  type: 'boat' | 'rental';
  bookingId: string;
  location: string;
  date: string;
  guests?: number;
}): Promise<void> {
  try {
    const activitiesBotUrl = process.env.ACTIVITIES_BOT_URL || process.env.NEXT_PUBLIC_GCC_URL || 'http://localhost:3006';

    await fetch(`${activitiesBotUrl}/api/activities/trigger-bot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        trigger: 'booking_created',
        bookingId: bookingData.bookingId,
        bookingType: bookingData.type,
        location: bookingData.location,
        date: bookingData.date,
        guests: bookingData.guests,
        context: `New ${bookingData.type} booking created - ensure activities are available for Finn to suggest in case of issues`,
      }),
    });

    console.log(`✅ Triggered activities bot for booking: ${bookingData.bookingId}`);
  } catch (error) {
    console.error('Failed to trigger activities bot on booking:', error);
    // Don't fail the booking if trigger fails
  }
}

