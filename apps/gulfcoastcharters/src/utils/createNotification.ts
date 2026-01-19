import { supabase } from '@/lib/supabase';

interface CreateNotificationParams {
  userId: string;
  type: 'booking' | 'message' | 'review' | 'system' | 'payment';
  title: string;
  message: string;
  link?: string;
  data?: Record<string, unknown>;

}

export async function createNotification(params: CreateNotificationParams) {
  try {
    const { data, error } = await supabase.functions.invoke('notification-manager', {
      body: {
        action: 'create',
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link,
        data: params.data
      }
    });

    if (error) {
      console.error('Error creating notification:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error creating notification:', error);
    return { success: false, error };
  }
}

// Predefined notification templates
export const NotificationTemplates = {
  bookingConfirmed: (bookingId: string, charterName: string) => ({
    type: 'booking' as const,
    title: 'Booking Confirmed',
    message: `Your booking for ${charterName} has been confirmed!`,
    link: `/bookings/${bookingId}`,
    data: { bookingId }
  }),

  newMessage: (senderId: string, senderName: string) => ({
    type: 'message' as const,
    title: 'New Message',
    message: `You have a new message from ${senderName}`,
    link: '/messages',
    data: { senderId }
  }),

  newReview: (reviewId: string, rating: number) => ({
    type: 'review' as const,
    title: 'New Review',
    message: `You received a ${rating}-star review`,
    link: `/reviews/${reviewId}`,
    data: { reviewId, rating }
  }),

  paymentReceived: (amount: number, bookingId: string) => ({
    type: 'payment' as const,
    title: 'Payment Received',
    message: `Payment of $${amount} received`,
    link: `/bookings/${bookingId}`,
    data: { amount, bookingId }
  }),

  systemAlert: (message: string) => ({
    type: 'system' as const,
    title: 'System Alert',
    message,
    data: {}
  })
};
