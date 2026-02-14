import { BannerAd, SquareAd } from "@/components/ads/GoogleAd";

export default function RentalsWithAds({ children }) {
  return (
    <>
      <BannerAd />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "20px", margin: "20px 0" }}>
        <main>{children}</main>
        <aside style={{ position: "sticky", top: "20px" }}>
          <SquareAd />
          <div style={{ marginTop: "20px" }}>
            <SquareAd />
          </div>
        </aside>
      </div>
    </>
  );
}
