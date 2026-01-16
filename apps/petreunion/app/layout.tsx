import { Metadata } from "next";
import { ReactNode } from "react";
import CookieConsent from "@/components/CookieConsent";
import PanicMode from "@/components/PanicMode";
import "./globals.css";
import { Providers } from "./providers";
import ClientLayoutShell from "./ClientLayoutShell";

const quietMode =
  String(process.env.PETREUNION_QUIET_MODE || process.env.QUIET_MODE || '')
    .trim()
    .toLowerCase() === 'true' ||
  String(process.env.PETREUNION_QUIET_MODE || process.env.QUIET_MODE || '')
    .trim()
    .toLowerCase() === '1';

export const metadata: Metadata = {
  title: "PetReunion - AI-Powered Pet Reunion Platform | Free Forever",
  description: "Reuniting lost pets with their families using AI-powered matching. Free forever. Report lost or found pets, search our database, and get help from shelters.",
  keywords: ["lost pets", "found pets", "pet reunion", "lost dog", "lost cat", "pet finder", "animal rescue", "shelter"],
  openGraph: {
    title: "PetReunion - AI-Powered Pet Reunion",
    description: "Reuniting lost pets with their families using AI-powered matching. Free forever.",
    type: "website",
    url: "https://petreunion.org",
    siteName: "PetReunion",
    images: [{
      url: "https://petreunion.org/og-image.jpg",
      width: 1200,
      height: 630,
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PetReunion - AI-Powered Pet Reunion",
    description: "Reuniting lost pets with their families using AI-powered matching.",
  },
  robots: {
    index: !quietMode,
    follow: !quietMode,
    googleBot: {
      index: !quietMode,
      follow: !quietMode,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: "https://petreunion.org",
  },
  other: {
    'google-adsense-account': 'ca-pub-0940073536675562',
  },
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="google-adsense-account" content="ca-pub-0940073536675562" />
      </head>
      <body>
        <Providers>
          <CookieConsent />
          <ClientLayoutShell>{children}</ClientLayoutShell>
          {/* Panic Mode - Floating button visible only on mobile (hidden on md+) */}
          <div className="md:hidden">
            <PanicMode />
          </div>
        </Providers>
      </body>
    </html>
  );
}











