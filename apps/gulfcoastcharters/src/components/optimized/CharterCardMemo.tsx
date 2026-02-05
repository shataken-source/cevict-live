import React from 'react';
import { CharterCard } from '../CharterCard';

/**
 * Memoized CharterCard for performance optimization
 * Only re-renders when props actually change
 */
export const CharterCardMemo = React.memo(CharterCard, (prevProps, nextProps) => {
  return (
    prevProps.id === nextProps.id &&
    prevProps.name === nextProps.name &&
    prevProps.price === nextProps.price &&
    prevProps.rating === nextProps.rating
  );
});

CharterCardMemo.displayName = 'CharterCardMemo';
