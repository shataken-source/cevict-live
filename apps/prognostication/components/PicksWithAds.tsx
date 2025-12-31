import { ReactNode } from "react";
import { BannerAd, SquareAd } from "@/components/ads/GoogleAd";

export default function PicksWithAds({ children }: { children: ReactNode }) {
  return (
    <>
      <div style={{ textAlign: "center", margin: "20px 0", background: "#f8f9fa", padding: "10px" }}>
        <small style={{ color: "#666" }}>Advertisement</small>
        <BannerAd />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "20px" }}>
        <main>{children}</main>
        <aside>
          <SquareAd />
          <div style={{ marginTop: "20px", padding: "20px", background: "#f8f9fa", borderRadius: "8px" }}>
            <h3>Sponsored</h3>
            <SquareAd />
          </div>
        </aside>
      </div>
    </>
  );
}


