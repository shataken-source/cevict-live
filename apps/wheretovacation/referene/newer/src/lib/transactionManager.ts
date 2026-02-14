// Transaction management with rollback for booking failures
import { supabase } from './supabase';

export class TransactionManager {
  private operations: Array<() => Promise<void>> = [];
  private rollbacks: Array<() => Promise<void>> = [];

  async execute<T>(
    operation: () => Promise<T>,
    rollback: () => Promise<void>
  ): Promise<T> {
    try {
      const result = await operation();
      this.rollbacks.push(rollback);
      return result;
    } catch (error) {
      await this.rollbackAll();
      throw error;
    }
  }

  async rollbackAll(): Promise<void> {
    for (const rollback of this.rollbacks.reverse()) {
      try {
        await rollback();
      } catch (error) {
        console.error('Rollback failed:', error);
      }
    }
    this.rollbacks = [];
  }

  clear(): void {
    this.rollbacks = [];
  }
}

// Optimistic locking for concurrent bookings
export async function optimisticBooking(
  captainId: string,
  date: string,
  bookingData: Record<string, unknown>
): Promise<unknown> {
  const transaction = new TransactionManager();


  try {
    // 1. Check availability with version lock
    const { data: availability } = await supabase
      .from('captain_availability')
      .select('*, version')
      .eq('captain_id', captainId)
      .eq('date', date)
      .single();

    if (!availability?.is_available) {
      throw new Error('Date not available');
    }

    // 2. Create booking
    const { data: booking, error: bookingError } = await transaction.execute(
      () => supabase.from('bookings').insert(bookingData).select().single(),
      async () => {
        await supabase.from('bookings').delete().eq('id', bookingData.id);
      }
    );

    if (bookingError) throw bookingError;

    // 3. Update availability with version check
    const { error: updateError } = await transaction.execute(
      () => supabase
        .from('captain_availability')
        .update({ is_available: false, version: availability.version + 1 })
        .eq('captain_id', captainId)
        .eq('date', date)
        .eq('version', availability.version),
      async () => {
        await supabase
          .from('captain_availability')
          .update({ is_available: true, version: availability.version })
          .eq('captain_id', captainId)
          .eq('date', date);
      }
    );

    if (updateError) throw new Error('Booking conflict - date taken');

    transaction.clear();
    return booking;
  } catch (error) {
    await transaction.rollbackAll();
    throw error;
  }
}
