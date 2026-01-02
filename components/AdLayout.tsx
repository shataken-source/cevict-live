'use client';

import React, { useEffect, useState } from "react";
import { BannerAd, SquareAd, SkyscraperAd } from "@/components/ads/GoogleAd";
import { shouldShowAds } from "@/lib/adsense-utils";
import { usePathname } from "next/navigation";

type Props = {
  children: React.ReactNode;
};

export default function SmokersRightsAds({ children }: Props) {
  const pathname = usePathname();
  const [showAds, setShowAds] = useState(false);

  useEffect(() => {
    // Check if ads should be shown on this page
    const canShowAds = shouldShowAds(pathname || '');
    setShowAds(canShowAds);
  }, [pathname]);

  // If ads shouldn't be shown, just render children without ad layout
  if (!showAds) {
    return <>{children}</>;
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "160px 1fr 300px",
        gap: "20px",
        maxWidth: "1400px",
        margin: "0 auto",
        padding: "20px",
      }}
    >
      {/* Left skyscraper */}
      <aside style={{ position: "sticky", top: "20px", height: "fit-content" }}>
        <SkyscraperAd />
      </aside>

      {/* Main content with top banner */}
      <main>
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <BannerAd />
        </div>
        {children}
      </main>

      {/* Right sidebar with square units */}
      <aside style={{ position: "sticky", top: "20px" }}>
        <SquareAd />
        <div style={{ marginTop: "20px" }}>
          <SquareAd />
        </div>
      </aside>
    </div>
  );
}
