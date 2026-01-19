import React from 'react';

interface ProfileUpdateReminderEmailProps {
  captainName: string;
  lastUpdated: string;
  daysSinceUpdate: number;
  profileUrl: string;
}

export const ProfileUpdateReminderEmail: React.FC<ProfileUpdateReminderEmailProps> = ({
  captainName,
  lastUpdated,
  daysSinceUpdate,
  profileUrl
}) => {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ backgroundColor: '#0ea5e9', color: 'white', padding: '20px', textAlign: 'center' }}>
        <h1 style={{ margin: 0 }}>📋 Profile Update Reminder</h1>
      </div>
      
      <div style={{ padding: '30px', backgroundColor: '#f9fafb' }}>
        <p style={{ fontSize: '16px', lineHeight: '1.6' }}>
          Hi Captain {captainName},
        </p>
        
        <p style={{ fontSize: '16px', lineHeight: '1.6' }}>
          It's been <strong>{daysSinceUpdate} days</strong> since you last updated your profile (last update: {new Date(lastUpdated).toLocaleDateString()}).
        </p>
        
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', margin: '20px 0' }}>
          <h3 style={{ marginTop: 0 }}>Keep Your Profile Fresh</h3>
          <p>Regular updates help you:</p>
          <ul style={{ lineHeight: '1.8' }}>
            <li>Attract more customers with current information</li>
            <li>Showcase new equipment or services</li>
            <li>Update availability and pricing</li>
            <li>Maintain accurate contact details</li>
          </ul>
        </div>
        
        <div style={{ textAlign: 'center', margin: '30px 0' }}>
          <a href={profileUrl} style={{ backgroundColor: '#0ea5e9', color: 'white', padding: '12px 30px', textDecoration: 'none', borderRadius: '6px', display: 'inline-block', fontWeight: 'bold' }}>
            Update My Profile
          </a>
        </div>
        
        <p style={{ fontSize: '14px', color: '#6b7280' }}>
          Captains with up-to-date profiles receive 40% more booking inquiries on average.
        </p>
      </div>
      
      <div style={{ padding: '20px', textAlign: 'center', fontSize: '12px', color: '#9ca3af' }}>
        <p>Charter Booking Platform | Growth Team</p>
      </div>
    </div>
  );
};
