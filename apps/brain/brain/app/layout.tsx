import { ReactNode } from 'react';

export const metadata = {
  title: 'Brain - Autonomous Monitoring & Self-Healing',
  description: 'The Brain monitors and fixes website problems autonomously',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
      </head>
      <body style={{
        margin: 0,
        padding: 0,
        overflowX: 'hidden'
      }}>
        {children}
      </body>
    </html>
  );
}
