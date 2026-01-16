import type { Metadata } from 'next';
import React from 'react';

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await props.params;
  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://petreunion.org').replace(/\/+$/, '');

  return {
    metadataBase: new URL(site),
    alternates: {
      canonical: `/lost/${encodeURIComponent(id)}`,
    },
    openGraph: {
      images: [
        {
          url: `/api/petreunion/og/pet/${encodeURIComponent(id)}`,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      images: [`/api/petreunion/og/pet/${encodeURIComponent(id)}`],
    },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

