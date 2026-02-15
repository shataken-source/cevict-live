/**
 * Send Progno SMS via Sinch
 */

const SINCH_API_TOKEN = '78f84e980220406892c2cfccf515e755';
const SINCH_FROM_NUMBER = '+12085812971';

const SINCH_SERVICE_PLAN_ID = 'f432293c-50fc-47d7-b226-c7f208b6b3b5';

interface SMSOptions {
  to: string;
  message: string;
}

async function sendSMS(options: SMSOptions): Promise<void> {
  const response = await fetch(`https://sms.api.sinch.com/xms/v1/${SINCH_SERVICE_PLAN_ID}/batches`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SINCH_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: SINCH_FROM_NUMBER,
      to: [options.to],
      body: options.message,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Sinch error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  console.log(`✅ SMS sent to ${options.to}`);
  console.log('📱 Batch ID:', data.id);
}

async function main() {
  try {
    // Short prediction alert for SMS
    const message = `🎯 Progno Pick Alert!\n\nSydney Kings vs Perth Wildcats\nPick: Sydney Kings ML (-355)\nEdge: +3.08%\n\nBet $25 → Win $7.04\n\nGet full analysis: progno.ai/picks`;

    await sendSMS({
      to: '+12562645669',  // Your number from vault
      message,
    });

    console.log('\n🚀 SMS delivered successfully!');
  } catch (err) {
    console.error('❌ Failed to send SMS:', err);
    process.exit(1);
  }
}

main();
