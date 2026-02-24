
// TELNYX SMS SERVICE
// Simple, reliable SMS using Telnyx (Twilio Alternative)

export interface SMSResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Send SMS via Telnyx
 * @param to - Phone number (e.g. "+12562645669")
 * @param text - Message text
 * @param apiKey - Telnyx API Key
 * @param from - Telnyx Sending Number (e.g. "+1312...")
 */
export async function sendTelnyxSMS(
  to: string,
  text: string,
  apiKey: string,
  from: string
): Promise<SMSResult> {
  try {
    console.log(`[Telnyx] Sending SMS to ${to}...`);

    const response = await fetch('https://api.telnyx.com/v2/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        from: from,
        to: to,
        text: text
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Telnyx] Error:', data);
      return { 
        success: false, 
        error: data.errors?.[0]?.detail || 'Unknown Telnyx error' 
      };
    }

    console.log('[Telnyx] Success:', data);
    return { 
      success: true, 
      id: data.data?.id 
    };

  } catch (error: any) {
    console.error('[Telnyx] Network Error:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}





