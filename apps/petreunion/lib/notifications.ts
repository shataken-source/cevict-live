const SINCH_PLAN = process.env.SINCH_SERVICE_PLAN_ID;
const SINCH_TOKEN = process.env.SINCH_API_TOKEN;
const SINCH_FROM = process.env.SINCH_NUMBER;

export async function sendMatchAlert(phone: string, message: string) {
  if (!SINCH_PLAN || !SINCH_TOKEN || !SINCH_FROM) {
    console.error('[NOTIFY] Missing Sinch credentials');
    return { success: false, error: 'Missing Sinch credentials' };
  }
  try {
    const res = await fetch(`https://us.sms.api.sinch.com/xms/v1/${SINCH_PLAN}/batches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SINCH_TOKEN}`,
      },
      body: JSON.stringify({
        from: SINCH_FROM,
        to: [phone],
        body: message,
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error('[NOTIFY] Sinch failed:', txt);
      return { success: false, error: txt };
    }
    const data = await res.json();
    return { success: true, id: data.id };
  } catch (err: any) {
    console.error('[NOTIFY] Sinch error:', err?.message || err);
    return { success: false, error: err?.message || 'Unknown error' };
  }
}

export async function notifyHighConfidenceMatch(phone: string, confidence: number, petName?: string) {
  if (confidence < 85) return { success: false, error: 'Below threshold' };
  const msg = `AI Match ${petName ? `for ${petName} ` : ''}score ${confidence}%. Check your PetReunion dashboard to review and confirm.`;
  return sendMatchAlert(phone, msg);
}
