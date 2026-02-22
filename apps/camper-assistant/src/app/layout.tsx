import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LocationProvider } from "./context/LocationContext";
import { ProfileProvider } from "./context/ProfileContext";
import { SolarProvider } from "./context/SolarContext";
import { WeatherProvider } from "./context/WeatherContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Camper Assistant",
  description: "All-in-one camping companion with solar monitoring, weather, recipes, and trip planning",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-900 text-white min-h-screen`}
      >
        <ProfileProvider>
          <LocationProvider>
            <SolarProvider>
              <WeatherProvider>
                {children}
              </WeatherProvider>
            </SolarProvider>
          </LocationProvider>
        </ProfileProvider>
      </body>
    </html>
  );
}
