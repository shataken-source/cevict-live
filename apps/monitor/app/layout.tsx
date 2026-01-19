import type { Metadata } from 'next';
import './globals.css';
import AuthGate from './components/AuthGate';

export const metadata: Metadata = {
  title: 'Monitor',
  description: 'Website monitoring dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-white">
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}

