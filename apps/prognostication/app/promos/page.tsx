import BannerPlaceholder from '@/components/BannerPlaceholder';
import PromoOffers from '@/components/PromoOffers';

export default function PromosPage() {
  return (
    <div>
      <BannerPlaceholder position="header" adSlot="prognostication-promos-header" />
      <PromoOffers />
      <BannerPlaceholder position="footer" adSlot="prognostication-promos-footer" />
    </div>
  );
}
