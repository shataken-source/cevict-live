import React, { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Progno - Sports Prediction Platform',
  description: 'Advanced sports prediction and analytics platform with data-driven insights.',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var d=document.documentElement;var b=document.body;var s=localStorage.getItem('darkMode');var dark=s==='true';d.classList.toggle('dark',dark);d.style.backgroundColor=dark?'#0f172a':'#f1f5f9';b.style.backgroundColor=dark?'#0f172a':'transparent';})();`,
          }}
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
