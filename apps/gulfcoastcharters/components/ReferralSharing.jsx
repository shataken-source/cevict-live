// components/ReferralSharing.jsx - SHARE WITH CONTACTS FOR POINTS!
import React, { useState, useEffect } from 'react'

export default function ReferralSharing({ userId, userName }) {
  const [referralLink, setReferralLink] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [showShareModal, setShowShareModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [emailList, setEmailList] = useState('')
  const [phoneNumbers, setPhoneNumbers] = useState('')
  const [shareStats, setShareStats] = useState({
    totalShares: 0,
    successfulReferrals: 0,
    pendingReferrals: 0,
    pointsEarned: 0
  })

  useEffect(() => {
    // Generate unique referral code for user
    const code = generateReferralCode(userId)
    setReferralCode(code)
    setReferralLink(`https://gulfcoastcharters.com/signup?referral=${code}`)
    loadShareStats()
  }, [userId])

  const generateReferralCode = (id) => {
    // Create unique code like "FISH-JOHN-A7B3"
    const name = userName ? userName.toUpperCase().slice(0, 4) : 'USER'
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    return `FISH-${name}-${random}`
  }

  const loadShareStats = async () => {
    // Load user's referral statistics
    // This would connect to your database
    setShareStats({
      totalShares: 12,
      successfulReferrals: 3,
      pendingReferrals: 5,
      pointsEarned: 750
    })
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  const shareViaWhatsApp = () => {
    const message = `Hey! I have been using Gulf Coast Charters to book fishing trips and it is amazing! 🎣

Join using my link and we BOTH get $25 off our next charter!

${referralLink}

They have:
✅ Verified captains only
✅ Real-time GPS tracking  
✅ Weather guarantees
✅ Points and rewards

See you on the water! 🌊`

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
    trackShare('whatsapp')
  }

  const shareViaText = () => {
    const message = `Check out Gulf Coast Charters! Book fishing trips and join the community. We both get $25 off: ${referralLink}`
    
    // For mobile devices with SMS capability
    if (/Android|iPhone/i.test(navigator.userAgent)) {
      window.open(`sms:?body=${encodeURIComponent(message)}`, '_blank')
    } else {
      alert('Text message sharing is only available on mobile devices')
    }
    trackShare('sms')
  }

  const shareViaEmail = () => {
    const subject = "You have to check out Gulf Coast Charters!"
    const body = `Hi!

I wanted to share something awesome with you. I have been using Gulf Coast Charters to book fishing charters and it has been incredible!

If you sign up using my personal referral link, we BOTH get $25 off our next fishing trip:
${referralLink}

Here is what makes them special:
• Over 15,000 anglers in the community worldwide
• Verified and insured captains only (USCG licensed)
• Book charters from Texas to Florida
• Real-time GPS tracking for safety
• Weather alerts and guarantees
• Earn points and badges for every trip
• Amazing fishing community features

The platform is super easy to use - you can book instantly, see real-time availability, and even track the boat location during your trip.

Join me on there! My username is @${userName || 'fisher'}

Tight lines!
${userName || 'Your friend'}`

    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    trackShare('email')
  }

  const shareViaFacebook = () => {
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}&quote=${encodeURIComponent('Join me on Gulf Coast Charters! We both get $25 off 🎣')}`
    window.open(shareUrl, '_blank', 'width=600,height=400')
    trackShare('facebook')
  }

  const shareViaTwitter = () => {
    const text = `Just joined Gulf Coast Charters! Book verified fishing charters and join 15,000+ anglers worldwide 🎣 Get $25 off with my link:`
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(referralLink)}&hashtags=Fishing,GulfCoast`
    window.open(shareUrl, '_blank', 'width=600,height=400')
    trackShare('twitter')
  }

  const shareViaLinkedIn = () => {
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`
    window.open(shareUrl, '_blank', 'width=600,height=400')
    trackShare('linkedin')
  }

  const sendBulkEmails = () => {
    const emails = emailList.split(/[,\n]/).map(email => email.trim()).filter(email => email)
    if (emails.length === 0) {
      alert('Please enter at least one email address')
      return
    }

    // Send to backend API
    fetch('/api/referral/bulk-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        emails,
        referralCode,
        referralLink
      })
    })
    .then(() => {
      alert(`Invitations sent to ${emails.length} contacts!`)
      setEmailList('')
      trackShare('bulk_email', emails.length)
    })
  }

  const sendBulkTexts = () => {
    const phones = phoneNumbers.split(/[,\n]/).map(phone => phone.trim()).filter(phone => phone)
    if (phones.length === 0) {
      alert('Please enter at least one phone number')
      return
    }

    // Send to backend API for SMS
    fetch('/api/referral/bulk-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        phones,
        referralCode,
        referralLink
      })
    })
    .then(() => {
      alert(`Text invitations sent to ${phones.length} contacts!`)
      setPhoneNumbers('')
      trackShare('bulk_sms', phones.length)
    })
  }

  const trackShare = (platform, count = 1) => {
    // Track sharing activity
    fetch('/api/referral/track-share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        platform,
        count,
        referralCode
      })
    })
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Main Share Button */}
      <button
        onClick={() => setShowShareModal(true)}
        style={{
          padding: '15px 30px',
          background: 'linear-gradient(45deg, #10b981, #059669)',
          color: 'white',
          border: 'none',
          borderRadius: '50px',
          fontSize: '18px',
          fontWeight: 'bold',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
          animation: 'pulse 2s infinite'
        }}
      >
        <span style={{ fontSize: '24px' }}>🎁</span>
        Share and Earn $25 + 500 Points!
        <span style={{
          background: 'red',
          color: 'white',
          padding: '2px 8px',
          borderRadius: '20px',
          fontSize: '12px'
        }}>
          {shareStats.pendingReferrals} pending
        </span>
      </button>

      {/* Referral Stats Bar */}
      <div style={{
        marginTop: '10px',
        padding: '10px',
        background: 'rgba(16, 185, 129, 0.1)',
        borderRadius: '10px',
        fontSize: '14px',
        display: 'flex',
        gap: '20px'
      }}>
        <span>📤 Shared: {shareStats.totalShares}</span>
        <span>✅ Joined: {shareStats.successfulReferrals}</span>
        <span>⏳ Pending: {shareStats.pendingReferrals}</span>
        <span>🏆 Points: {shareStats.pointsEarned}</span>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '30px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h2 style={{ margin: 0 }}>🎣 Share and Earn Rewards!</h2>
              <button
                onClick={() => setShowShareModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            {/* Referral Code Display */}
            <div style={{
              background: 'linear-gradient(45deg, #fbbf24, #f59e0b)',
              padding: '20px',
              borderRadius: '15px',
              marginBottom: '20px',
              textAlign: 'center',
              color: 'white'
            }}>
              <p style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Your Referral Code:</p>
              <div style={{
                fontSize: '24px',
                fontWeight: 'bold',
                letterSpacing: '2px'
              }}>
                {referralCode}
              </div>
              <p style={{ margin: '10px 0 0 0', fontSize: '12px' }}>
                You and your friend each get $25 off!
              </p>
            </div>

            {/* Referral Link with Copy */}
            <div style={{
              background: '#f3f4f6',
              padding: '15px',
              borderRadius: '10px',
              marginBottom: '20px'
            }}>
              <label style={{ fontSize: '12px', color: '#6b7280' }}>Your Personal Referral Link:</label>
              <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                <input
                  type="text"
                  value={referralLink}
                  readOnly
                  style={{
                    flex: 1,
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '5px',
                    fontSize: '14px'
                  }}
                />
                <button
                  onClick={copyToClipboard}
                  style={{
                    padding: '10px 20px',
                    background: copied ? '#10b981' : '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  {copied ? '✓ Copied!' : '📋 Copy'}
                </button>
              </div>
            </div>

            {/* Quick Share Buttons */}
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '15px' }}>Quick Share:</h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                gap: '10px'
              }}>
                <ShareButton onClick={shareViaWhatsApp} icon="📱" label="WhatsApp" color="#25D366" />
                <ShareButton onClick={shareViaText} icon="💬" label="Text" color="#0084FF" />
                <ShareButton onClick={shareViaEmail} icon="📧" label="Email" color="#EA4335" />
                <ShareButton onClick={shareViaFacebook} icon="📘" label="Facebook" color="#1877F2" />
                <ShareButton onClick={shareViaTwitter} icon="🐦" label="Twitter" color="#1DA1F2" />
                <ShareButton onClick={shareViaLinkedIn} icon="💼" label="LinkedIn" color="#0A66C2" />
              </div>
            </div>

            {/* Bulk Email Invite */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>📧 Bulk Email Invite:</h3>
              <textarea
                value={emailList}
                onChange={(e) => setEmailList(e.target.value)}
                placeholder="Enter email addresses separated by commas or new lines:
john@example.com
sarah@example.com
mike@example.com"
                style={{
                  width: '100%',
                  height: '80px',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '5px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
              <button
                onClick={sendBulkEmails}
                style={{
                  marginTop: '10px',
                  padding: '10px 20px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Send Email Invites
              </button>
            </div>

            {/* Bulk SMS Invite */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>💬 Bulk Text Invite:</h3>
              <textarea
                value={phoneNumbers}
                onChange={(e) => setPhoneNumbers(e.target.value)}
                placeholder="Enter phone numbers separated by commas or new lines:
555-123-4567
555-987-6543"
                style={{
                  width: '100%',
                  height: '80px',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '5px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
              <button
                onClick={sendBulkTexts}
                style={{
                  marginTop: '10px',
                  padding: '10px 20px',
                  background: '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Send Text Invites
              </button>
            </div>

            {/* How It Works */}
            <div style={{
              background: '#f0f9ff',
              padding: '15px',
              borderRadius: '10px'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#0891b2' }}>🎁 How Referrals Work:</h4>
              <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#64748b' }}>
                <li>Share your link with friends and family</li>
                <li>They sign up using your code</li>
                <li>They get $25 off their first charter</li>
                <li>You get $25 credit + 500 points</li>
                <li>No limit on referrals - earn unlimited!</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper component for share buttons
function ShareButton({ onClick, icon, label, color }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px',
        background: color,
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '5px',
        fontSize: '12px',
        fontWeight: 'bold'
      }}
    >
      <span style={{ fontSize: '20px' }}>{icon}</span>
      {label}
    </button>
  )
}

// Add animation styles
const style = document.createElement('style')
style.textContent = `
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
`
if (typeof document !== 'undefined') {
  document.head.appendChild(style)
}
