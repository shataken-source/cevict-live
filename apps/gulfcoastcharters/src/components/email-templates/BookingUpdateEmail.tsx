interface BookingUpdateProps {
  customerName: string;
  bookingId: string;
  charterName: string;
  updateType: 'date_change' | 'time_change' | 'captain_change' | 'location_change' | 'general';
  oldValue: string;
  newValue: string;
  message?: string;
}

export const generateBookingUpdateHTML = (props: BookingUpdateProps) => {
  const updateTitles = {
    date_change: 'Date Changed',
    time_change: 'Time Changed',
    captain_change: 'Captain Changed',
    location_change: 'Location Changed',
    general: 'Booking Updated'
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 30px; text-align: center; }
    .content { background: #faf5ff; padding: 30px; }
    .update-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .change-display { display: flex; align-items: center; justify-content: center; gap: 20px; margin: 20px 0; }
    .value-box { background: #f3f4f6; padding: 15px; border-radius: 6px; flex: 1; text-align: center; }
    .arrow { font-size: 24px; color: #8b5cf6; }
    .button { background: #8b5cf6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Booking Update</h1>
      <p>${updateTitles[props.updateType]}</p>
    </div>
    <div class="content">
      <h2>Hi ${props.customerName},</h2>
      <p>There's been an update to your booking. Here's what changed:</p>
      
      <div class="update-box">
        <h3>${props.charterName}</h3>
        <p><strong>Booking ID:</strong> ${props.bookingId}</p>
        
        <div class="change-display">
          <div class="value-box">
            <small>Previous</small>
            <p><strong>${props.oldValue}</strong></p>
          </div>
          <div class="arrow">→</div>
          <div class="value-box">
            <small>New</small>
            <p><strong>${props.newValue}</strong></p>
          </div>
        </div>
        
        ${props.message ? `<p style="background: #ede9fe; padding: 15px; border-radius: 6px; margin-top: 15px;">${props.message}</p>` : ''}
      </div>
      
      <p>All other booking details remain the same. If you have any concerns about this change, please contact us immediately.</p>
      
      <a href="https://yourcharter.com/bookings/${props.bookingId}" class="button">View Updated Booking</a>
    </div>
    <div class="footer">
      <p>Questions? Contact us at support@yourcharter.com</p>
      <p>&copy; 2025 Charter Booking. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;
};
