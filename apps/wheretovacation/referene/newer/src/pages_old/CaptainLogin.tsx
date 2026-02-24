import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CaptainLoginComponent from '@/components/CaptainLogin';
import SEO from '@/components/SEO';

export default function CaptainLoginPage() {
  const navigate = useNavigate();

  const handleLoginSuccess = (email: string) => {
    // Captain logged in successfully
    navigate('/captain-dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4">
      <SEO
        title="Captain Login - Gulf Charter Finder"
        description="Login to your captain dashboard to manage bookings and charters"
        type="website"
      />
      <div className="max-w-7xl mx-auto mb-8">
        <a href="/" className="text-blue-600 hover:underline">← Back to Home</a>
      </div>
      <CaptainLoginComponent onLoginSuccess={handleLoginSuccess} />
    </div>
  );
}
