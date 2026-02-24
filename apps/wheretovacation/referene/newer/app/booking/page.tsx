import { Metadata } from 'next';
import BookingClient from './BookingClient';

export const metadata: Metadata = {
  title: 'Book Your Vacation - Where To Vacation',
  description: 'Complete your vacation booking with secure payment processing',
};

export default function BookingPage() {
  return <BookingClient />;
}
