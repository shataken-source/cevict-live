// Promotional Offers System
// File: apps/prognostication/components/PromoOffers.tsx
'use client';

import { useState } from 'react';
import BannerPlaceholder from './BannerPlaceholder';

interface PromoOffer {
  id: string;
  name: string;
  code: string;
  description: string;
  terms: string[];
  disclaimer: string;
  active: boolean;
}

const PROMO_OFFERS: PromoOffer[] = [
  {
    id: 'money-back-7',
    name: '7-Day Money-Back Guarantee',
    code: 'TRYITNOW',
    description: 'Try any plan risk-free for 7 days. Not satisfied? Get 100% refund, no questions asked.',
    terms: [
      'Valid for first-time subscribers only',
      'Request refund within 7 days of purchase',
      'Full refund processed within 5 business days',
      'One refund per customer',
    ],
    disclaimer: 'Refund applies to subscription cost only. Sports betting involves risk. Past performance does not guarantee future results.',
    active: true,
  },
  {
    id: 'clv-guarantee',
    name: 'Closing Line Value Guarantee',
    code: 'BEATTHELINE',
    description: 'If our weekly picks don\'t beat the closing line average, get your next week FREE.',
    terms: [
      'Measured against documented closing lines',
      'Must follow all picks as recommended',
      'Minimum 10 picks per week required',
      'CLV calculated using industry-standard formula',
      'Free week applied automatically if qualified',
    ],
    disclaimer: 'Positive CLV indicates sharp betting but does not guarantee profits. Variance exists in all sports betting.',
    active: true,
  },
  {
    id: 'profitable-week',
    name: 'Profitable First Week or Free',
    code: 'WINWEEK1',
    description: 'If you don\'t show a profit following our Week 1 picks, get Week 2 absolutely FREE.',
    terms: [
      'Must follow ALL recommended picks in Week 1',
      'Track record must be documented and submitted',
      'Standard unit sizing must be used (1 unit per pick)',
      'Juice/vig factored into profit calculation',
      'Maximum one free week per customer',
    ],
    disclaimer: 'This guarantee is about our service quality, not gambling outcomes. You must document all bets. Sports betting is risky.',
    active: true,
  },
  {
    id: 'trial-5-days',
    name: '$1 for 5 Days Trial',
    code: 'TRIAL5',
    description: 'Get full Pro access for just $1 for 5 days. No commitment. Cancel anytime.',
    terms: [
      'New subscribers only',
      'Converts to $29/month after 5 days unless cancelled',
      'Cancel anytime during trial',
      'Full access to all Pro features',
    ],
    disclaimer: 'Trial period is for service evaluation. Sports betting involves significant risk of loss.',
    active: true,
  },
  {
    id: 'roi-protection',
    name: '30-Day ROI Protection Plan',
    code: 'ROIPROTECT',
    description: 'Track your ROI for 30 days. If below break-even, get your next 30 days at 50% off.',
    terms: [
      'Elite tier only',
      'Must document all bets in provided tracker',
      'Minimum 50 tracked bets required',
      'ROI calculated using standard bankroll formula',
      'Discount applied automatically if qualified',
    ],
    disclaimer: 'ROI tracking measures your execution of our strategy. Individual results vary. Past performance does not predict future success.',
    active: false, // Premium promo
  },
];

export default function PromoOffers() {
  const [selectedPromo, setSelectedPromo] = useState<PromoOffer | null>(null);
  const [promoCode, setPromoCode] = useState('');

  const applyPromo = () => {
    const promo = PROMO_OFFERS.find(p =>
      p.code.toLowerCase() === promoCode.toLowerCase() && p.active
    );

    if (promo) {
      setSelectedPromo(promo);
      alert(`✅ Promo "${promo.name}" applied! Check your email for details.`);
    } else {
      alert('❌ Invalid or expired promo code');
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <BannerPlaceholder position="header" adSlot="prognostication-promos-internal-header" />
      <h2 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem', textAlign: 'center' }}>
        🎁 Special Promotional Offers
      </h2>

      {/* Promo Code Input */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '2rem',
        borderRadius: '12px',
        marginBottom: '3rem',
        color: 'white',
      }}>
        <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
          Have a Promo Code?
        </h3>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <input
            type="text"
            placeholder="Enter code..."
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            style={{
              flex: 1,
              padding: '1rem',
              fontSize: '1rem',
              borderRadius: '8px',
              border: 'none',
            }}
          />
          <button
            onClick={applyPromo}
            style={{
              padding: '1rem 2rem',
              fontSize: '1rem',
              fontWeight: 'bold',
              borderRadius: '8px',
              border: 'none',
              background: 'white',
              color: '#667eea',
              cursor: 'pointer',
            }}
          >
            Apply
          </button>
        </div>
      </div>

      {/* Active Promos */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '2rem',
      }}>
        {PROMO_OFFERS.filter(p => p.active).map((promo) => (
          <div
            key={promo.id}
            style={{
              background: 'white',
              border: '2px solid #e5e7eb',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: 'bold',
              display: 'inline-block',
              marginBottom: '1rem',
            }}>
              CODE: {promo.code}
            </div>

            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              marginBottom: '1rem',
              color: '#1f2937',
            }}>
              {promo.name}
            </h3>

            <p style={{
              color: '#4b5563',
              marginBottom: '1.5rem',
              fontSize: '1rem',
            }}>
              {promo.description}
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{
                fontSize: '0.875rem',
                fontWeight: 'bold',
                color: '#6b7280',
                marginBottom: '0.5rem',
              }}>
                Terms & Conditions:
              </h4>
              <ul style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                paddingLeft: '1.5rem',
              }}>
                {promo.terms.map((term, i) => (
                  <li key={i} style={{ marginBottom: '0.25rem' }}>{term}</li>
                ))}
              </ul>
            </div>

            <div style={{
              background: '#fef3c7',
              border: '1px solid #fbbf24',
              borderRadius: '6px',
              padding: '0.75rem',
              marginTop: '1rem',
            }}>
              <p style={{
                fontSize: '0.75rem',
                color: '#92400e',
                margin: 0,
              }}>
                ⚠️ {promo.disclaimer}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Legal Disclaimer */}
      <div style={{
        marginTop: '4rem',
        padding: '2rem',
        background: '#fee2e2',
        border: '2px solid #ef4444',
        borderRadius: '12px',
      }}>
        <h3 style={{
          fontSize: '1.25rem',
          fontWeight: 'bold',
          color: '#991b1b',
          marginBottom: '1rem',
        }}>
          ⚠️ Important Legal Disclaimer
        </h3>
        <p style={{ color: '#7f1d1d', fontSize: '0.875rem', lineHeight: '1.6' }}>
          <strong>NO GUARANTEE OF PROFITS:</strong> While we strive to provide high-quality analysis and predictions,
          sports betting inherently involves risk and variance. These promotional offers are designed to demonstrate
          our confidence in our service quality and methodology, NOT to guarantee gambling profits.
          <br /><br />
          <strong>PAST PERFORMANCE ≠ FUTURE RESULTS:</strong> Historical win rates and ROI do not guarantee future
          performance. Sports outcomes are unpredictable and subject to variance.
          <br /><br />
          <strong>RESPONSIBLE GAMBLING:</strong> Only bet what you can afford to lose. If you have a gambling problem,
          call 1-800-GAMBLER.
          <br /><br />
          <strong>MUST BE 21+:</strong> Sports betting is only for adults 21 years or older in jurisdictions where legal.
        </p>
      </div>

      <BannerPlaceholder position="in-content" adSlot="prognostication-promos-internal-incontent" className="my-8" />
      <BannerPlaceholder position="footer" adSlot="prognostication-promos-internal-footer" />
    </div>
  );
}
