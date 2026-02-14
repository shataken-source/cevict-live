import { useState } from 'react';

export default function TestEmail() {
  const [email, setEmail] = useState('shataken@gmail.com');
  const [status, setStatus] = useState('');

  const sendEmail = async () => {
    setStatus('Sending...');

    const body = `Hey there,

I'm finalizing Gulf Coast Charters T‑shirts and I've settled on one style:

- Big GCC logo on the back
- Small GCC logo + short slogan on the front pocket area

No extra artwork—just our real logo, clean and professional.

What I need from you

Please reply with:

1) Which front pocket slogan do you like best?
   (all with a small GCC logo next to or above the text)

   A) "Gulf Coast Charters – Captain's Crew"
   B) "Gulf Coast Charters – Life's Better on the Water"
   C) "Gulf Coast Charters – Reel Adventures"
   D) "Gulf Coast Charters – Est. 2024"

2) Shirt color(s) you'd actually wear
   - White
   - Navy
   - Black
   - Heather gray
   - Light blue
   - Other: _________

3) Size
   - S / M / L / XL / XXL / other

A short reply like this is perfect:
Back logo + C, navy or heather gray, XL

Thanks for helping me lock this in,
Shane
Gulf Coast Charters`;

    try {
      const response = await fetch('/api/send-test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: 'Vote on Gulf Coast Charters logo shirts (big back logo + pocket front)',
          body: body
        })
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('✅ Email sent! Check your inbox.');
      } else {
        setStatus(`❌ Error: ${data.error}`);
      }
    } catch (error: any) {
      setStatus(`❌ Error: ${error.message}`);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Test Email Sender</h1>
      <p>Send T-shirt vote email without database</p>

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{
          width: '100%',
          padding: '0.5rem',
          marginBottom: '1rem',
          fontSize: '16px'
        }}
      />

      <button
        onClick={sendEmail}
        style={{
          padding: '1rem 2rem',
          fontSize: '16px',
          backgroundColor: '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        Send Email
      </button>

      {status && (
        <p style={{ marginTop: '1rem', fontSize: '18px' }}>{status}</p>
      )}
    </div>
  );
}

// Force this page to render at request time so Next.js doesn't try to
// prerender it at build (which was failing).
export async function getServerSideProps() {
  return { props: {} };
}
