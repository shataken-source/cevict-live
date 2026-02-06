import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Website Monitor – One dashboard for all your websites | cevict.ai',
  description:
    'Monitor uptime, response times, visitor stats, and bot health for multiple websites from a single dashboard. For freelancers, agencies, and teams. Free tier available.',
  openGraph: {
    title: 'Website Monitor – One dashboard for all your websites',
    description:
      'Monitor multiple websites from one place. Uptime, alerts, visitor analytics, AI assistant. Part of cevict.ai.',
  },
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
