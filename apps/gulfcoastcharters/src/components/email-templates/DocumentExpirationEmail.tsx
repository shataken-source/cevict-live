import React from 'react';

interface DocumentExpirationEmailProps {
  captainName: string;
  documentType: string;
  expirationDate: string;
  daysUntilExpiration: number;
  renewalUrl: string; // Changed from uploadUrl to renewalUrl
}


export const DocumentExpirationEmail: React.FC<DocumentExpirationEmailProps> = ({
  captainName,
  documentType,
  expirationDate,
  daysUntilExpiration,
  renewalUrl
}) => {

  const isUrgent = daysUntilExpiration <= 7;
  
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ backgroundColor: isUrgent ? '#dc2626' : '#f97316', color: 'white', padding: '20px', textAlign: 'center' }}>
        <h1 style={{ margin: 0 }}>{isUrgent ? '🚨 URGENT' : '⚠️'} Document Expiration Notice</h1>
      </div>
      
      <div style={{ padding: '30px', backgroundColor: '#f9fafb' }}>
        <p style={{ fontSize: '16px', lineHeight: '1.6' }}>
          Dear Captain {captainName},
        </p>
        
        <p style={{ fontSize: '16px', lineHeight: '1.6' }}>
          Your <strong>{documentType}</strong> is expiring in <strong style={{ color: isUrgent ? '#dc2626' : '#f97316' }}>{daysUntilExpiration} days</strong> on {new Date(expirationDate).toLocaleDateString()}.
        </p>
        
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', margin: '20px 0' }}>
          <h3 style={{ marginTop: 0 }}>Action Required</h3>
          <p>Please upload your renewed document to maintain compliance and continue accepting bookings.</p>
        </div>
        
        <div style={{ textAlign: 'center', margin: '30px 0' }}>
          <a href={renewalUrl} style={{ backgroundColor: '#2563eb', color: 'white', padding: '12px 30px', textDecoration: 'none', borderRadius: '6px', display: 'inline-block', fontWeight: 'bold' }}>
            🚀 Renew Document Now (One-Click Upload)
          </a>
        </div>
        
        <div style={{ backgroundColor: '#eff6ff', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
          <h4 style={{ marginTop: 0, color: '#1e40af' }}>✨ New: Instant Upload & Verification</h4>
          <ul style={{ margin: '10px 0', paddingLeft: '20px', color: '#1e40af' }}>
            <li>Drag & drop your renewed document</li>
            <li>Automatic expiration date extraction</li>
            <li>Instant verification status update</li>
          </ul>
        </div>
        
        <p style={{ fontSize: '14px', color: '#6b7280' }}>
          If your document expires without renewal, your charter listings may be temporarily suspended until compliance is restored.
        </p>
      </div>

      
      <div style={{ padding: '20px', textAlign: 'center', fontSize: '12px', color: '#9ca3af' }}>
        <p>Charter Booking Platform | Compliance Team</p>
      </div>
    </div>
  );
};
