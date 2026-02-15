/**
 * Send Progno Email via SendGrid SDK
 */

import { readFileSync } from 'fs';
import sgMail from '@sendgrid/mail';

const SENDGRID_API_KEY = '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';

sgMail.setApiKey(SENDGRID_API_KEY);

async function main() {
  try {
    // Read the generated email
    const html = readFileSync('./sample-email.html', 'utf-8');

    const msg = {
      to: 'shataken@gmail.com',
      from: 'progno@cevict.com',
      subject: '🎯 Progno Pick: Sydney Kings vs Perth Wildcats (+3.08% Edge)',
      html,
    };

    await sgMail.send(msg);

    console.log('✅ Email sent to shataken@gmail.com');
    console.log('🚀 Test email delivered successfully!');
  } catch (err: any) {
    console.error('❌ Failed to send email:', err.response?.body || err.message || err);
    process.exit(1);
  }
}

main();
