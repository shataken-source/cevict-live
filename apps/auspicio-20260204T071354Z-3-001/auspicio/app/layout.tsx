import React, { ReactNode } from 'react';

export const metadata = {
  title: 'Auspicio Forge - AI Development Platform',
  description: 'Advanced AI development forge for building intelligent applications and AI agents.',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
