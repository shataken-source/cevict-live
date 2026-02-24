// @ts-nocheck
// This is a Deno/Supabase Edge Function - TypeScript errors here are false positives
// Deno runtime handles these imports and global types at runtime

/**
 * SEND RECIPE VIA SMS
 * Sends a recipe to a phone number via SMS
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Send SMS via Twilio
async function sendSMS(phoneNumber: string, message: string): Promise<{ success: boolean; twilioSid?: string; error?: string }> {
  const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    return { success: false, error: 'Twilio credentials not configured' };
  }

  // Ensure phone number has +1 prefix
  if (!phoneNumber.startsWith('+')) {
    phoneNumber = '+1' + phoneNumber.replace(/^1/, '');
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: twilioPhoneNumber,
          To: phoneNumber,
          Body: message,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: error };
    }

    const result = await response.json();
    if (result.status === 'queued' || result.status === 'sent' || result.status === 'delivered') {
      return { success: true, twilioSid: result.sid };
    } else {
      return { success: false, error: result.error_message || 'Unknown Twilio error' };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Format recipe for SMS (split into multiple messages if needed)
function formatRecipeForSMS(recipe: any): string[] {
  const maxLength = 1600; // Twilio limit is 1600 chars per SMS
  
  let text = `🍳 ${recipe.name}\n\n`;
  
  if (recipe.description) {
    text += `${recipe.description}\n\n`;
  }
  
  text += `⏱️ Prep: ${recipe.prepTime || 'N/A'}\n`;
  text += `⏱️ Cook: ${recipe.cookTime || 'N/A'}\n`;
  text += `👥 Serves: ${recipe.serves || 'N/A'}\n\n`;
  
  text += `📝 INGREDIENTS:\n`;
  recipe.ingredients.forEach((ing: string, i: number) => {
    text += `${i + 1}. ${ing}\n`;
  });
  
  text += `\n👨‍🍳 INSTRUCTIONS:\n`;
  recipe.instructions.forEach((step: string, i: number) => {
    text += `${i + 1}. ${step}\n`;
  });
  
  if (recipe.notes) {
    text += `\n💡 Notes: ${recipe.notes}`;
  }
  
  // Split into multiple SMS if needed
  const messages: string[] = [];
  if (text.length <= maxLength) {
    messages.push(text);
  } else {
    // Split by sections
    const parts = text.split('\n\n');
    let current = '';
    for (const part of parts) {
      if ((current + part + '\n\n').length > maxLength) {
        if (current) messages.push(current.trim());
        current = part + '\n\n';
      } else {
        current += part + '\n\n';
      }
    }
    if (current) messages.push(current.trim());
  }
  
  return messages;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { phoneNumber, recipe } = body;

    if (!phoneNumber) {
      return new Response(
        JSON.stringify({ error: 'phoneNumber required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!recipe || !recipe.name || !recipe.ingredients || !recipe.instructions) {
      return new Response(
        JSON.stringify({ error: 'recipe with name, ingredients, and instructions required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const messages = formatRecipeForSMS(recipe);
    const results = [];

    // Send each message
    for (const message of messages) {
      const result = await sendSMS(phoneNumber, message);
      results.push(result);
      if (!result.success) {
        break; // Stop on first error
      }
      // Small delay between messages
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const allSuccess = results.every(r => r.success);

    return new Response(
      JSON.stringify({
        success: allSuccess,
        sentTo: phoneNumber,
        messagesSent: results.filter(r => r.success).length,
        totalMessages: messages.length,
        twilioSids: results.map(r => r.twilioSid).filter(Boolean),
        errors: results.filter(r => !r.success).map(r => r.error)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

