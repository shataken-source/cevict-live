import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Alpha Hunter — Live Trading Dashboard',
  description: 'AI-powered trading bot: Coinbase Crypto + Kalshi + Coinbase Predict',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
