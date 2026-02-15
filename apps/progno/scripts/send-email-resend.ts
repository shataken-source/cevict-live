/**
 * Send Progno Email via Resend
 */

import { readFileSync } from 'fs';
import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_jXVbrfY9_GMigdNznKb6quipR8qER2pjJ';
const resend = new Resend(RESEND_API_KEY);

async function main() {
  try {
    // Read the generated email
    const html = readFileSync('./sample-email.html', 'utf-8');

    const { data, error } = await resend.emails.send({
      from: 'Progno <progno@cevict.ai>',
      to: ['shataken@gmail.com'],
      subject: '🎯 Progno Pick: Sydney Kings vs Perth Wildcats (+3.08% Edge)',
      html,
    });

    if (error) {
      console.error('❌ Resend error:', error);
      process.exit(1);
    }

    console.log('✅ Email sent to shataken@gmail.com');
    console.log('📧 Email ID:', data?.id);
    console.log('🚀 Test email delivered successfully!');
  } catch (err) {
    console.error('❌ Failed to send email:', err);
    process.exit(1);
  }
}

main();
