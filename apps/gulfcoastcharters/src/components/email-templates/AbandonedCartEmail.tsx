export default function AbandonedCartEmail({ 
  userName, 
  cartItems, 
  totalAmount,
  checkoutUrl 
}: { 
  userName: string; 
  cartItems: Array<{ name: string; price: number; image?: string }>;
  totalAmount: number;
  checkoutUrl: string;
}) {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto', backgroundColor: '#f8fafc' }}>
      <div style={{ backgroundColor: '#0ea5e9', padding: '30px 20px', textAlign: 'center' }}>
        <h1 style={{ color: 'white', margin: 0, fontSize: '28px' }}>You Left Something Behind!</h1>
      </div>
      
      <div style={{ backgroundColor: 'white', padding: '40px 30px' }}>
        <h2 style={{ color: '#1e293b', marginTop: 0 }}>Hi {userName},</h2>
        
        <p style={{ color: '#475569', fontSize: '16px', lineHeight: '1.6' }}>
          We noticed you didn't complete your booking. Your adventure is still waiting!
        </p>

        <div style={{ backgroundColor: '#f1f5f9', padding: '20px', borderRadius: '8px', marginTop: '20px' }}>
          <h3 style={{ color: '#1e293b', marginTop: 0 }}>Your Cart:</h3>
          {cartItems.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', marginBottom: '15px', paddingBottom: '15px', borderBottom: idx < cartItems.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
              {item.image && (
                <img src={item.image} alt={item.name} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', marginRight: '15px' }} />
              )}
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 5px 0', color: '#1e293b', fontWeight: 'bold' }}>{item.name}</p>
                <p style={{ margin: 0, color: '#0ea5e9', fontSize: '18px', fontWeight: 'bold' }}>${item.price}</p>
              </div>
            </div>
          ))}
          <div style={{ textAlign: 'right', marginTop: '20px', paddingTop: '20px', borderTop: '2px solid #cbd5e1' }}>
            <p style={{ margin: 0, color: '#1e293b', fontSize: '20px', fontWeight: 'bold' }}>
              Total: ${totalAmount.toFixed(2)}
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '30px' }}>
          <a href={checkoutUrl} 
             style={{ display: 'inline-block', backgroundColor: '#0ea5e9', color: 'white', padding: '16px 40px', textDecoration: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold' }}>
            Complete Your Booking
          </a>
        </div>

        <div style={{ backgroundColor: '#dcfce7', border: '2px solid #22c55e', padding: '15px', borderRadius: '8px', marginTop: '30px', textAlign: 'center' }}>
          <p style={{ color: '#166534', margin: 0, fontSize: '14px', fontWeight: 'bold' }}>
            🎁 Complete within 24 hours and get 100 bonus points!
          </p>
        </div>
      </div>

      <div style={{ backgroundColor: '#1e293b', padding: '30px 20px', textAlign: 'center', color: '#94a3b8' }}>
        <p style={{ margin: '5px 0', fontSize: '14px' }}>© 2024 Gulf Coast Charters. All rights reserved.</p>
      </div>
    </div>
  );
}
