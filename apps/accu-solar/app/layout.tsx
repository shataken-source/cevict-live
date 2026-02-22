import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SolarProvider } from './context/SolarContext';
import { SettingsProvider } from './context/SettingsContext';

export const metadata: Metadata = {
  title: 'Accu Solar',
  description: 'Home solar system monitoring dashboard',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SettingsProvider>
          <SolarProvider>
            {children}
          </SolarProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
