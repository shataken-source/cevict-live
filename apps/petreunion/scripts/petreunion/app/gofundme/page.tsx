'use client';

import { ArrowRight, Gift, Heart, Shield } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function GoFundMePage() {
  const [donationAmount, setDonationAmount] = useState<number | ''>('');
  const [customAmount, setCustomAmount] = useState('');
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [donorMessage, setDonorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{ totalPets: number; reunitedPets: number } | null>(null);

  const presetAmounts = [25, 50, 100, 250, 500, 1000];

  useEffect(() => {
    // Fetch stats for the page
    fetch('/api/petreunion/stats')
      .then(res => res.json())
      .then(data => {
        if (data.total_pets !== undefined) {
          setStats({
            totalPets: data.total_pets || 0,
            reunitedPets: data.by_status?.reunited || 0
          });
        }
      })
      .catch(console.error);
  }, []);

  const handleDonate = async (e: React.FormEvent) => {
    e.preventDefault();

    const amount = customAmount ? parseFloat(customAmount) : donationAmount;
    if (!amount || amount < 1) {
      alert('Please enter a valid donation amount');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/petreunion/donate/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          donorName: donorName || undefined,
          donorEmail: donorEmail || undefined,
          donorMessage: donorMessage || undefined,
          label: 'PetReunion GoFundMe Donation',
        }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else if (data.configured === false) {
        alert('Donations are not yet configured. Please contact support at donate@petreunion.org');
      } else {
        alert('Failed to process donation. Please try again.');
      }
    } catch (error) {
      alert('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom, #f8f9fa, #ffffff)' }}>
      {/* Hero Section */}
      <section style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '80px 20px 60px',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>🐾</div>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 'bold', marginBottom: '20px', lineHeight: '1.2' }}>
            Help PetReunion Reunite More Pets
          </h1>
          <p style={{ fontSize: 'clamp(18px, 2.5vw, 24px)', opacity: 0.95, lineHeight: '1.6', maxWidth: '700px', margin: '0 auto' }}>
            We rely on donations and sponsors to keep PetReunion <strong>100% free</strong> for everyone.
            Every dollar helps reunite lost pets with their families.
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section style={{ padding: '40px 20px', background: 'white' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '24px',
            marginBottom: '40px'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '16px',
              padding: '30px',
              textAlign: 'center',
              color: 'white',
              boxShadow: '0 4px 16px rgba(102, 126, 234, 0.3)'
            }}>
              <div style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '8px' }}>
                {stats?.totalPets.toLocaleString() || '—'}
              </div>
              <div style={{ fontSize: '16px', opacity: 0.9 }}>Pets in Database</div>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              borderRadius: '16px',
              padding: '30px',
              textAlign: 'center',
              color: 'white',
              boxShadow: '0 4px 16px rgba(240, 147, 251, 0.3)'
            }}>
              <div style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '8px' }}>
                {stats?.reunitedPets.toLocaleString() || '—'}
              </div>
              <div style={{ fontSize: '16px', opacity: 0.9 }}>Pets Reunited</div>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              borderRadius: '16px',
              padding: '30px',
              textAlign: 'center',
              color: 'white',
              boxShadow: '0 4px 16px rgba(79, 172, 254, 0.3)'
            }}>
              <div style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '8px' }}>100%</div>
              <div style={{ fontSize: '16px', opacity: 0.9 }}>Free Forever</div>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
              borderRadius: '16px',
              padding: '30px',
              textAlign: 'center',
              color: 'white',
              boxShadow: '0 4px 16px rgba(67, 233, 123, 0.3)'
            }}>
              <div style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '8px' }}>$0</div>
              <div style={{ fontSize: '16px', opacity: 0.9 }}>Cost to Pet Owners</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section style={{ padding: '60px 20px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px' }}>
          {/* Left Column - Donation Form */}
          <div>
            <div style={{
              background: 'white',
              borderRadius: '20px',
              padding: '40px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              border: '2px solid #e5e7eb'
            }}>
              <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
                Make a Donation
              </h2>
              <p style={{ color: '#666', marginBottom: '30px', fontSize: '16px' }}>
                Every donation helps us keep PetReunion free for everyone
              </p>

              <form onSubmit={handleDonate}>
                {/* Preset Amounts */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#333', fontSize: '16px' }}>
                    Select Amount
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
                    {presetAmounts.map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => {
                          setDonationAmount(amount);
                          setCustomAmount('');
                        }}
                        style={{
                          padding: '14px 20px',
                          background: donationAmount === amount
                            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                            : '#f3f4f6',
                          color: donationAmount === amount ? 'white' : '#333',
                          border: '2px solid',
                          borderColor: donationAmount === amount ? '#667eea' : '#e5e7eb',
                          borderRadius: '10px',
                          fontSize: '16px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        ${amount}
                      </button>
                    ))}
                  </div>
                  <div>
                    <input
                      type="number"
                      placeholder="Or enter custom amount"
                      value={customAmount}
                      onChange={(e) => {
                        setCustomAmount(e.target.value);
                        setDonationAmount('');
                      }}
                      min="1"
                      step="0.01"
                      style={{
                        width: '100%',
                        padding: '14px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '10px',
                        fontSize: '16px',
                      }}
                    />
                  </div>
                </div>

                {/* Donor Info */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333', fontSize: '14px' }}>
                    Your Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    placeholder="John Doe"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '10px',
                      fontSize: '16px',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333', fontSize: '14px' }}>
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={donorEmail}
                    onChange={(e) => setDonorEmail(e.target.value)}
                    placeholder="you@example.com"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '10px',
                      fontSize: '16px',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333', fontSize: '14px' }}>
                    Message (Optional)
                  </label>
                  <textarea
                    value={donorMessage}
                    onChange={(e) => setDonorMessage(e.target.value)}
                    placeholder="Leave a message of support..."
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '10px',
                      fontSize: '16px',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || (!donationAmount && !customAmount)}
                  style={{
                    width: '100%',
                    padding: '18px',
                    background: loading || (!donationAmount && !customAmount)
                      ? '#ccc'
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '20px',
                    fontWeight: 'bold',
                    cursor: loading || (!donationAmount && !customAmount) ? 'not-allowed' : 'pointer',
                    boxShadow: loading || (!donationAmount && !customAmount)
                      ? 'none'
                      : '0 4px 16px rgba(102, 126, 234, 0.4)',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  {loading ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <Heart style={{ width: '20px', height: '20px' }} />
                      Donate Now
                    </>
                  )}
                </button>

                <p style={{
                  textAlign: 'center',
                  fontSize: '12px',
                  color: '#666',
                  marginTop: '16px'
                }}>
                  🔒 Secure payment processing. Your information is safe and encrypted.
                </p>
              </form>
            </div>
          </div>

          {/* Right Column - Why Donate & Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Why Donate */}
            <div style={{
              background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
              borderRadius: '20px',
              padding: '30px',
              border: '2px solid #667eea30'
            }}>
              <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', color: '#333', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Heart style={{ width: '24px', height: '24px', color: '#667eea' }} />
                Why Your Donation Matters
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {[
                  { icon: '💻', title: 'AI Development', desc: 'Improve matching algorithms to find pets faster' },
                  { icon: '🏢', title: 'Shelter Partnerships', desc: 'Connect with more shelters and rescues nationwide' },
                  { icon: '📱', title: 'Mobile Apps', desc: 'Launch iOS and Android apps for easier reporting' },
                  { icon: '📢', title: 'Marketing & Awareness', desc: 'Reach more pet owners and increase reunions' },
                  { icon: '🆓', title: 'Keep It Free', desc: 'Ensure PetReunion remains 100% free forever' },
                  { icon: '💯', title: '100% to Operations', desc: 'Every dollar goes directly to helping pets' },
                ].map((item, idx) => (
                  <li key={idx} style={{
                    padding: '16px 0',
                    borderBottom: idx < 5 ? '1px solid #e5e7eb' : 'none',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start'
                  }}>
                    <span style={{ fontSize: '24px', flexShrink: 0 }}>{item.icon}</span>
                    <div>
                      <strong style={{ color: '#333', fontSize: '16px', display: 'block', marginBottom: '4px' }}>
                        {item.title}
                      </strong>
                      <span style={{ color: '#666', fontSize: '14px' }}>{item.desc}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Other Ways to Help */}
            <div style={{
              background: 'white',
              borderRadius: '20px',
              padding: '30px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
              border: '2px solid #e5e7eb'
            }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', color: '#333', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Gift style={{ width: '20px', height: '20px', color: '#764ba2' }} />
                Other Ways to Help
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Link href="/sponsor" style={{ textDecoration: 'none' }}>
                  <div style={{
                    padding: '16px',
                    background: '#f3f4f6',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                    border: '2px solid transparent',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#667eea15';
                    e.currentTarget.style.borderColor = '#667eea';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f3f4f6';
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Shield style={{ width: '20px', height: '20px', color: '#667eea' }} />
                      <span style={{ fontWeight: '600', color: '#333' }}>Become a Sponsor</span>
                    </div>
                    <ArrowRight style={{ width: '16px', height: '16px', color: '#666' }} />
                  </div>
                </Link>
                <Link href="/report" style={{ textDecoration: 'none' }}>
                  <div style={{
                    padding: '16px',
                    background: '#f3f4f6',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                    border: '2px solid transparent',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#667eea15';
                    e.currentTarget.style.borderColor = '#667eea';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f3f4f6';
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Heart style={{ width: '20px', height: '20px', color: '#f5576c' }} />
                      <span style={{ fontWeight: '600', color: '#333' }}>Report a Lost Pet</span>
                    </div>
                    <ArrowRight style={{ width: '16px', height: '16px', color: '#666' }} />
                  </div>
                </Link>
              </div>
            </div>

            {/* Tax Deductible Notice */}
            <div style={{
              background: 'linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)',
              borderRadius: '20px',
              padding: '24px',
              border: '2px solid #ffc107'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <Shield style={{ width: '24px', height: '24px', color: '#856404', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ color: '#856404', fontSize: '16px', display: 'block', marginBottom: '8px' }}>
                    💡 Tax Deductible
                  </strong>
                  <p style={{ color: '#856404', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
                    PetReunion is a registered 501(c)(3) nonprofit organization.
                    Your donations are tax-deductible to the full extent allowed by law.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <section style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '40px 20px',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h3 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '16px' }}>
            Thank You for Supporting PetReunion!
          </h3>
          <p style={{ fontSize: '18px', opacity: 0.95, marginBottom: '24px', lineHeight: '1.6' }}>
            Every donation, no matter the size, helps us reunite more pets with their families.
            Together, we're making a difference—one reunion at a time.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/" style={{
              color: 'white',
              textDecoration: 'underline',
              fontSize: '16px',
              padding: '8px 16px'
            }}>
              Back to Home
            </Link>
            <Link href="/donate" style={{
              color: 'white',
              textDecoration: 'underline',
              fontSize: '16px',
              padding: '8px 16px'
            }}>
              Regular Donation Page
            </Link>
            <Link href="/about" style={{
              color: 'white',
              textDecoration: 'underline',
              fontSize: '16px',
              padding: '8px 16px'
            }}>
              Learn More About Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
