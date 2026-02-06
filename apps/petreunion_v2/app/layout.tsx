import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'PetReunion v2',
  description: 'Honest lost & found pet finder (no fake data)',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        {children}
      </body>
    </html>
  );
}

