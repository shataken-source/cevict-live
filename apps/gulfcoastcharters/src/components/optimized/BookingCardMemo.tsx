import React from 'react';
import { BookingHistoryCard } from '../BookingHistoryCard';

/**
 * Memoized BookingHistoryCard for performance
 * Prevents unnecessary re-renders in booking lists
 */
export const BookingCardMemo = React.memo(BookingHistoryCard, (prevProps, nextProps) => {
  return (
    prevProps.booking?.id === nextProps.booking?.id &&
    prevProps.booking?.status === nextProps.booking?.status
  );
});

BookingCardMemo.displayName = 'BookingCardMemo';
