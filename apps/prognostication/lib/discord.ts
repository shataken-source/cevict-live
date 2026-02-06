/**
 * Post to a Discord channel via webhook.
 * Set DISCORD_WEBHOOK_URL in .env.local (see DISCORD_SETUP.md).
 */

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

export interface DiscordSendOptions {
  /** Optional title for an embed (rich message). */
  title?: string;
  /** Optional description for the embed. */
  description?: string;
  /** Optional color (decimal, e.g. 0x00ff00 = green). */
  color?: number;
}

/**
 * Send a plain message or a simple embed to the configured Discord webhook.
 * No-op if DISCORD_WEBHOOK_URL is not set.
 */
export async function sendToDiscord(
  message: string,
  options: DiscordSendOptions = {}
): Promise<{ ok: boolean; error?: string }> {
  if (!WEBHOOK_URL || !WEBHOOK_URL.startsWith('https://discord.com/api/webhooks/')) {
    return { ok: false, error: 'DISCORD_WEBHOOK_URL not configured' };
  }

  const body: { content?: string; embeds?: Array<{ title?: string; description?: string; color?: number }> } = {};

  if (options.title || options.description) {
    body.embeds = [
      {
        title: options.title,
        description: options.description ?? message,
        color: options.color ?? 0x5865f2, // Discord blurple
      },
    ];
  } else {
    body.content = message;
  }

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `Discord ${res.status}: ${text.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Request failed' };
  }
}
