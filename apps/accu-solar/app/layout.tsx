import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'Accu Solar',
  description: 'Home solar system monitoring',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-slate-800 px-4 py-3 flex items-center justify-between">
          <div className="font-semibold">Accu Solar</div>
        </header>
        <main className="px-4 py-4 max-w-6xl mx-auto">{children}</main>
      </body>
    </html>
  );
}
