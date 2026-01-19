interface CancellationEmailProps {
  customerName: string;
  bookingId: string;
  charterName: string;
  date: string;
  refundAmount: string;
  cancellationReason?: string;
}

export const generateCancellationHTML = (props: CancellationEmailProps) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; }
    .content { background: #fef2f2; padding: 30px; }
    .cancel-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .refund-info { background: #fee2e2; padding: 15px; border-radius: 6px; margin: 20px 0; text-align: center; }
    .button { background: #0ea5e9; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Booking Cancelled</h1>
      <p>We're sorry to see you go</p>
    </div>
    <div class="content">
      <h2>Hello ${props.customerName},</h2>
      <p>Your booking has been successfully cancelled as requested.</p>
      
      <div class="cancel-box">
        <h3>Cancelled Booking Details</h3>
        <p><strong>Booking ID:</strong> ${props.bookingId}</p>
        <p><strong>Charter:</strong> ${props.charterName}</p>
        <p><strong>Original Date:</strong> ${props.date}</p>
        ${props.cancellationReason ? `<p><strong>Reason:</strong> ${props.cancellationReason}</p>` : ''}
      </div>
      
      <div class="refund-info">
        <h3>Refund Information</h3>
        <p style="font-size: 24px; font-weight: bold; color: #059669;">${props.refundAmount}</p>
        <p>Your refund will be processed within 5-7 business days</p>
      </div>
      
      <p>We hope to see you again soon! Browse our available charters and book your next adventure.</p>
      
      <a href="https://yourcharter.com" class="button">Explore Charters</a>
    </div>
    <div class="footer">
      <p>Questions about your refund? Contact us at support@yourcharter.com</p>
      <p>&copy; 2025 Charter Booking. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;
