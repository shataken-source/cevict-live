import { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  level?: number;
}

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
}

// Simple state management without zustand
let listeners: Array<() => void> = [];
let state: Omit<UserState, 'login' | 'logout'> = {
  user: null,
  isAuthenticated: false,
};

// Load from localStorage on init
try {
  const stored = localStorage.getItem('user-storage');
  if (stored) {
    const parsed = JSON.parse(stored);
    state = parsed.state || state;
  }
} catch (error) {
  console.error('Failed to load user state from localStorage:', error);
}


const setState = (newState: Partial<typeof state>) => {
  state = { ...state, ...newState };
  try {
    localStorage.setItem('user-storage', JSON.stringify({ state }));
  } catch (error) {
    console.error('Failed to save user state to localStorage:', error);
  }
  listeners.forEach(listener => listener());
};


export const useUserStore = <T>(selector: (state: UserState) => T): T => {
  const [, forceUpdate] = useState({});
  
  useEffect(() => {
    const listener = () => forceUpdate({});
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  }, []);
  
  const fullState: UserState = {
    ...state,
    login: (user: User) => setState({ user, isAuthenticated: true }),
    logout: () => setState({ user: null, isAuthenticated: false }),
  };
  
  return selector(fullState);
};
