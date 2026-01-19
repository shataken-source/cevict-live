/**
 * Email Notifications Utility
 * 
 * Handles sending transactional emails for booking lifecycle events.
 * Uses Mailjet email service via Supabase Edge Functions.
 * 
 * Email Types:
 * - Booking confirmation
 * - Booking reminders (24h, 1h before)
 * - Booking cancellations with refund info
 * - Booking updates (time/date changes)
 * 
 * Email Service:
 * @see https://www.mailjet.com/docs/ - Mailjet API documentation
 * @see https://dev.mailjet.com/ - Mailjet developer portal
 * @see supabase/functions/mailjet-email-service/index.ts - Edge function
 * 
 * Email Templates:
 * @see src/components/email-templates/ - Multilingual HTML templates
 */

import { supabase } from '@/lib/supabase';
import { BookingConfirmationEmail } from '@/components/email-templates/BookingConfirmationEmail';
import { BookingReminderEmail } from '@/components/email-templates/BookingReminderEmail';

/**
 * Booking data structure for email notifications
 */
interface BookingData {
  customerName: string;
  customerEmail: string;
  bookingId: string;
  charterName: string;
  date: string;
  time: string;
  duration?: string;
  totalPrice?: string;
  captainName: string;
  captainEmail?: string;
  location: string;
  captainPhone?: string;
}

/**
 * Send booking confirmation email to customer
 * Includes booking details, captain info, and calendar link
 * 
 * @param booking - Booking details
 * @returns Promise with email send result
 */
export const sendBookingConfirmation = async (booking: BookingData) => {
  const htmlContent = BookingConfirmationEmail({
    userName: booking.customerName,
    captainName: booking.captainName,
    date: booking.date,
    time: booking.time,
    location: booking.location,
    price: booking.totalPrice || '$500',
    language: 'en' // TODO: Use user's language preference
  });

  return sendEmail({
    to: booking.customerEmail,
    subject: `Booking Confirmed - ${booking.charterName}`,
    htmlContent,
    trackOpens: true,
    trackClicks: true
  });
};

/**
 * Send booking reminder email before trip
 * Typically sent 24 hours and 1 hour before booking
 * 
 * @param booking - Booking details
 * @param hoursUntil - Hours until booking starts
 * @returns Promise with email send result
 */
export const sendBookingReminder = async (booking: BookingData, hoursUntil: number) => {
  const htmlContent = BookingReminderEmail({
    userName: booking.customerName,
    captainName: booking.captainName,
    date: booking.date,
    time: booking.time,
    location: booking.location,
    hoursUntil,
    language: 'en' // TODO: Use user's language preference
  });

  return sendEmail({
    to: booking.customerEmail,
    subject: `Reminder: Your ${booking.charterName} booking is in ${hoursUntil} hours`,
    htmlContent,
    trackOpens: true
  });
};

/**
 * Send cancellation email with refund information
 * 
 * @param booking - Booking details
 * @param refundAmount - Refund amount string (e.g., "$450")
 * @param reason - Optional cancellation reason
 * @returns Promise with email send result
 */
export const sendCancellationEmail = async (
  booking: BookingData,
  refundAmount: string,
  reason?: string
) => {
  // TODO: Create proper CancellationEmail template component
  const htmlContent = `<h1>Booking Cancelled</h1><p>Your booking has been cancelled. Refund: ${refundAmount}</p>`;

  return sendEmail({
    to: booking.customerEmail,
    subject: `Booking Cancelled - ${booking.charterName}`,
    htmlContent
  });
};

/**
 * Send booking update notification
 * Used when booking details change (time, date, location)
 * 
 * @param booking - Booking details
 * @param updateType - Type of update (e.g., "Time", "Date")
 * @param oldValue - Previous value
 * @param newValue - New value
 * @param message - Optional additional message
 * @returns Promise with email send result
 */
export const sendBookingUpdate = async (
  booking: BookingData,
  updateType: string,
  oldValue: string,
  newValue: string,
  message?: string
) => {
  // TODO: Create proper BookingUpdateEmail template component
  const htmlContent = `<h1>Booking Updated</h1><p>${updateType}: ${oldValue} → ${newValue}</p><p>${message || ''}</p>`;

  return sendEmail({
    to: booking.customerEmail,
    subject: `Booking Update - ${booking.charterName}`,
    htmlContent,
    trackOpens: true
  });
};

/**
 * Internal function to send email via Mailjet service
 * Calls Supabase Edge Function that interfaces with Mailjet API
 * 
 * @param emailData - Email configuration and content
 * @returns Promise with send result
 * @throws Error if email sending fails
 */
const sendEmail = async (emailData: {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  trackOpens?: boolean;
  trackClicks?: boolean;
}) => {
  try {
    const { data, error } = await supabase.functions.invoke('mailjet-email-service', {
      body: {
        action: 'send',
        emailData
      }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
};
