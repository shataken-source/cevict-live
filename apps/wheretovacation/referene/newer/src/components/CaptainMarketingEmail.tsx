import React from 'react';

export const CaptainMarketingEmail = () => {
  const baseUrl = window.location.origin;
  
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#0ea5e9', padding: '40px 20px', textAlign: 'center' }}>
        <h1 style={{ color: '#ffffff', margin: '0', fontSize: '32px', fontWeight: 'bold' }}>
          Captain, Your Command Center Awaits
        </h1>
        <p style={{ color: '#e0f2fe', margin: '10px 0 0', fontSize: '18px' }}>
          Run your charter business like a pro with our all-in-one platform
        </p>
      </div>

      {/* Incentive Banner */}
      <div style={{ backgroundColor: '#fbbf24', padding: '20px', textAlign: 'center', borderBottom: '4px solid #f59e0b' }}>
        <p style={{ margin: '0', fontSize: '24px', fontWeight: 'bold', color: '#78350f' }}>
          🎉 SPECIAL OFFER: First 90 Days FREE + $0 Booking Fees
        </p>
        <p style={{ margin: '5px 0 0', fontSize: '14px', color: '#92400e' }}>
          Sign up by December 31st, 2025
        </p>
      </div>

      {/* Introduction */}
      <div style={{ padding: '30px 20px' }}>
        <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#334155', margin: '0 0 20px' }}>
          Dear Captain,
        </p>
        <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#334155', margin: '0 0 20px' }}>
          Stop juggling multiple apps, spreadsheets, and paper logs. Our platform gives you everything you need to manage your charter business efficiently and safely—all in one place.
        </p>
      </div>

      {/* Features Grid */}
      <div style={{ padding: '0 20px 30px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', marginBottom: '20px', textAlign: 'center' }}>
          What You Get as a Captain Member
        </h2>

        {/* Feature Block */}
        <div style={{ marginBottom: '25px', borderLeft: '4px solid #0ea5e9', paddingLeft: '15px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 8px' }}>
            ⚓ Fleet & Vessel Management
          </h3>
          <ul style={{ margin: '0', paddingLeft: '20px', color: '#475569', lineHeight: '1.8' }}>
            <li>Digital boat profiles with photos and specifications</li>
            <li>Equipment inventory tracking</li>
            <li>Fuel consumption logs and cost analysis</li>
            <li>Maintenance scheduling with automated reminders</li>
            <li>Document storage (insurance, registration, permits)</li>
          </ul>
        </div>

        <div style={{ marginBottom: '25px', borderLeft: '4px solid #10b981', paddingLeft: '15px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 8px' }}>
            🌊 Real-Time Weather & Safety Alerts
          </h3>
          <ul style={{ margin: '0', paddingLeft: '20px', color: '#475569', lineHeight: '1.8' }}>
            <li>Live NOAA buoy data from 10 Gulf Coast stations</li>
            <li>Custom alert thresholds for wave height, wind speed, water temp</li>
            <li>Automated SMS & email notifications when conditions change</li>
            <li>Small Craft Advisories and marine warnings</li>
            <li>Historical weather trends for trip planning</li>
          </ul>
        </div>

        <div style={{ marginBottom: '25px', borderLeft: '4px solid #8b5cf6', paddingLeft: '15px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 8px' }}>
            📅 Booking & Calendar Management
          </h3>
          <ul style={{ margin: '0', paddingLeft: '20px', color: '#475569', lineHeight: '1.8' }}>
            <li>Live availability calendar with instant booking</li>
            <li>Accept/decline booking requests</li>
            <li>Automated booking confirmations and reminders</li>
            <li>Customer communication tools</li>
            <li>Booking modification and cancellation management</li>
          </ul>
        </div>

        <div style={{ marginBottom: '25px', borderLeft: '4px solid #f59e0b', paddingLeft: '15px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 8px' }}>
            💰 Revenue & Earnings Tracking
          </h3>
          <ul style={{ margin: '0', paddingLeft: '20px', color: '#475569', lineHeight: '1.8' }}>
            <li>Real-time earnings dashboard</li>
            <li>Revenue analytics and trends</li>
            <li>Automatic payout processing</li>
            <li>Tax-ready financial reports</li>
            <li>Performance metrics and booking insights</li>
          </ul>
        </div>

        <div style={{ marginBottom: '25px', borderLeft: '4px solid #ef4444', paddingLeft: '15px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 8px' }}>
            ✅ Compliance & Certification Management
          </h3>
          <ul style={{ margin: '0', paddingLeft: '20px', color: '#475569', lineHeight: '1.8' }}>
            <li>Captain's license and certification tracking</li>
            <li>Expiration reminders (90, 60, 30 days before)</li>
            <li>Coast Guard inspection scheduling and records</li>
            <li>Insurance verification system</li>
            <li>Compliance dashboard with status indicators</li>
          </ul>
        </div>

        <div style={{ marginBottom: '25px', borderLeft: '4px solid #06b6d4', paddingLeft: '15px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 8px' }}>
            📱 Modern Tools & Technology
          </h3>
          <ul style={{ margin: '0', paddingLeft: '20px', color: '#475569', lineHeight: '1.8' }}>
            <li>QR codes for vessel inspections</li>
            <li>Real-time customer messaging</li>
            <li>Digital signature capture</li>
            <li>Mobile-friendly dashboard</li>
            <li>Email marketing tools for repeat customers</li>
          </ul>
        </div>
      </div>

      {/* Social Proof */}
      <div style={{ backgroundColor: '#f1f5f9', padding: '30px 20px', margin: '0 0 30px' }}>
        <p style={{ fontSize: '18px', fontStyle: 'italic', color: '#475569', margin: '0 0 10px', textAlign: 'center' }}>
          "This platform saved me 10+ hours per week on admin work. The weather alerts alone have prevented two risky trips. Worth every penny!"
        </p>
        <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a', textAlign: 'center', margin: '0' }}>
          — Captain Mike Rodriguez, Tampa Bay Charters
        </p>
      </div>

      {/* Pricing Highlight */}
      <div style={{ padding: '0 20px 30px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', marginBottom: '15px', textAlign: 'center' }}>
          Simple, Transparent Pricing
        </h2>
        <div style={{ backgroundColor: '#ecfeff', border: '2px solid #06b6d4', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#0e7490', margin: '0' }}>
            $49/month
          </p>
          <p style={{ fontSize: '16px', color: '#155e75', margin: '10px 0 0' }}>
            Unlimited bookings • All features included • Cancel anytime
          </p>
          <p style={{ fontSize: '14px', color: '#0e7490', margin: '10px 0 0', fontWeight: 'bold' }}>
            First 90 days FREE with code: CAPTAIN2025
          </p>
        </div>
      </div>

      {/* CTA Button */}
      <div style={{ padding: '0 20px 40px', textAlign: 'center' }}>
        <a href={`${baseUrl}/apply-captain`} style={{ display: 'inline-block', backgroundColor: '#0ea5e9', color: '#ffffff', padding: '16px 40px', fontSize: '18px', fontWeight: 'bold', textDecoration: 'none', borderRadius: '8px' }}>
          Start Your Free 90-Day Trial
        </a>
        <p style={{ fontSize: '14px', color: '#64748b', margin: '15px 0 0' }}>
          No credit card required • Setup takes less than 5 minutes
        </p>
      </div>

      {/* Footer */}
      <div style={{ backgroundColor: '#0f172a', padding: '30px 20px', color: '#cbd5e1', fontSize: '14px', textAlign: 'center' }}>
        <p style={{ margin: '0 0 10px' }}>
          Questions? Reply to this email or call us at (888) 555-BOAT
        </p>
        <p style={{ margin: '0 0 20px' }}>
          We're here to help you succeed on the water.
        </p>
        <p style={{ margin: '0', fontSize: '12px', color: '#94a3b8' }}>
          © 2025 Gulf Coast Charter Platform. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default CaptainMarketingEmail;
