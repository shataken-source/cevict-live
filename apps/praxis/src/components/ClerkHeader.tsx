'use client';

import { useState, useEffect } from 'react';
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs';

/**
 * Renders only on the client after mount. Avoids Clerk DOM queries during SSR
 * and reduces "childNodes of null" / tracking-prevention errors when storage is blocked.
 */
export function ClerkHeader() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <header
        className="flex justify-end items-center gap-4 h-14 px-4 sm:px-6 border-b border-[var(--border)]"
        style={{ backgroundColor: 'var(--card)' }}
      >
        <div className="w-20 h-9 rounded bg-[var(--border)] animate-pulse" aria-hidden />
      </header>
    );
  }

  return (
    <header
      className="flex justify-end items-center gap-4 h-14 px-4 sm:px-6 border-b border-[var(--border)]"
      style={{ backgroundColor: 'var(--card)' }}
    >
      <SignedOut>
        <SignInButton mode="modal">
          <button
            type="button"
            className="text-sm font-medium text-[var(--foreground)] hover:opacity-80 cursor-pointer"
          >
            Sign In
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button
            type="button"
            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-medium text-sm h-9 px-4 cursor-pointer"
          >
            Sign Up
          </button>
        </SignUpButton>
      </SignedOut>
      <SignedIn>
        <UserButton
          afterSignOutUrl="/"
          appearance={{
            elements: {
              avatarBox: 'w-9 h-9',
            },
          }}
        />
      </SignedIn>
    </header>
  );
}
