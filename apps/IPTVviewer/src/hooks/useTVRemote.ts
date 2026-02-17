import { useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
// @ts-ignore - TVEventHandler is not in main react-native types
import TVEventHandler from 'react-native/Libraries/Components/AppleTV/TVEventHandler';

export type TVRemoteEvent = {
  eventType: string;
  eventKeyAction?: number;
};

export function useTVRemote(
  onSelect: () => void,
  onBack: () => void,
  onLeft?: () => void,
  onRight?: () => void,
  onUp?: () => void,
  onDown?: () => void
) {
  const eventHandlerRef = useRef<TVEventHandler | null>(null);
  const callbacksRef = useRef({ onSelect, onBack, onLeft, onRight, onUp, onDown });

  // Keep callbacks fresh
  useEffect(() => {
    callbacksRef.current = { onSelect, onBack, onLeft, onRight, onUp, onDown };
  }, [onSelect, onBack, onLeft, onRight, onUp, onDown]);

  useEffect(() => {
    // Only enable on Android TV
    if (Platform.OS !== 'android') return;

    const handler = new TVEventHandler();
    eventHandlerRef.current = handler;

    handler.enable(null, (_: any, event: TVRemoteEvent) => {
      const { eventType } = event;

      switch (eventType) {
        case 'select':
        case 'enter':
          callbacksRef.current.onSelect?.();
          break;
        case 'back':
          callbacksRef.current.onBack?.();
          break;
        case 'left':
          callbacksRef.current.onLeft?.();
          break;
        case 'right':
          callbacksRef.current.onRight?.();
          break;
        case 'up':
          callbacksRef.current.onUp?.();
          break;
        case 'down':
          callbacksRef.current.onDown?.();
          break;
      }
    });

    return () => {
      handler.disable();
      eventHandlerRef.current = null;
    };
  }, []);
}

// Hook for managing focus on TV
export function useTVFocus<T extends { focus: () => void }>() {
  const focusedIndexRef = useRef(0);
  const elementsRef = useRef<T[]>([]);

  const registerElement = useCallback((index: number, ref: T | null) => {
    if (ref) {
      elementsRef.current[index] = ref;
    }
  }, []);

  const setFocus = useCallback((index: number) => {
    focusedIndexRef.current = index;
    elementsRef.current[index]?.focus();
  }, []);

  const moveFocus = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    // Simple grid navigation - can be enhanced based on layout
    const current = focusedIndexRef.current;
    let next = current;

    switch (direction) {
      case 'up':
        next = Math.max(0, current - 1);
        break;
      case 'down':
        next = Math.min(elementsRef.current.length - 1, current + 1);
        break;
      case 'left':
        next = Math.max(0, current - 1);
        break;
      case 'right':
        next = Math.min(elementsRef.current.length - 1, current + 1);
        break;
    }

    if (next !== current) {
      setFocus(next);
    }
  }, [setFocus]);

  return { registerElement, setFocus, moveFocus, focusedIndex: focusedIndexRef };
}
