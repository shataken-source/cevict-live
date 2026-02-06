import crypto from 'crypto';
import sharp from 'sharp';

export type PhotoValidationMode = 'off' | 'soft' | 'strict';

export type PhotoValidationResult = {
  ok: boolean;
  mode: PhotoValidationMode;
  method: 'off' | 'basic' | 'openai';
  pet_type: 'dog' | 'cat' | 'other' | 'unknown';
  confidence: number | null; // 0..1 when available
  reason: string;
};

function getMode(): PhotoValidationMode {
  const raw = (process.env.PETREUNION_PHOTO_VALIDATION_MODE || '').trim().toLowerCase();
  if (raw === 'off' || raw === 'soft' || raw === 'strict') return raw;
  return 'soft';
}

function getOpenAIConfig() {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com').replace(/\/+$/, '');
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  return { apiKey, baseUrl, model };
}

function looksLikeDataImageUrl(s: string) {
  return /^data:image\/[a-z0-9.+-]+;base64,/i.test(s);
}

export function parseDataImageUrl(dataUrl: string): { mimeType: string; buffer: Buffer } | null {
  const m = dataUrl.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  if (!m) return null;
  const mimeType = m[1].toLowerCase();
  const b64 = m[2];
  try {
    const buffer = Buffer.from(b64, 'base64');
    return { mimeType, buffer };
  } catch {
    return null;
  }
}

async function basicImageChecks(buffer: Buffer): Promise<{ ok: boolean; reason: string }> {
  const maxBytes = 6 * 1024 * 1024; // 6MB
  if (buffer.length === 0) return { ok: false, reason: 'Empty file' };
  if (buffer.length > maxBytes) return { ok: false, reason: `Image too large (> ${maxBytes} bytes)` };

  try {
    const meta = await sharp(buffer, { failOn: 'error' }).metadata();
    const w = meta.width || 0;
    const h = meta.height || 0;
    if (!w || !h) return { ok: false, reason: 'Unreadable image' };
    if (w < 64 || h < 64) return { ok: false, reason: 'Image too small' };
    return { ok: true, reason: 'Valid image' };
  } catch {
    return { ok: false, reason: 'Invalid image file' };
  }
}

async function openAiClassifyIsPet(imageUrl: string): Promise<{ ok: boolean; pet_type: 'dog' | 'cat' | 'other' | 'unknown'; confidence: number | null; reason: string }> {
  const { apiKey, baseUrl, model } = getOpenAIConfig();
  if (!apiKey) {
    return { ok: false, pet_type: 'unknown', confidence: null, reason: 'Missing OPENAI_API_KEY' };
  }

  // Small, deterministic prompt; force JSON response.
  const prompt = `You are a strict image verifier for a lost-pet website.
Decide if the image is a REAL photo of a dog or cat (not a meme, screenshot, text, logo, person selfie, food, random object, or AI/art).
Return JSON ONLY with:
- ok: boolean
- pet_type: "dog" | "cat" | "other" | "unknown"
- confidence: number (0 to 1)
- reason: short string`;

  const resp = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: imageUrl } }],
        },
      ],
      temperature: 0,
      max_tokens: 200,
      response_format: { type: 'json_object' },
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    return {
      ok: false,
      pet_type: 'unknown',
      confidence: null,
      reason: `OpenAI HTTP ${resp.status}${errText ? `: ${errText.slice(0, 120)}` : ''}`,
    };
  }

  const json: any = await resp.json();
  const content = json?.choices?.[0]?.message?.content || '';
  try {
    const parsed = JSON.parse(content);
    const ok = Boolean(parsed?.ok);
    const petTypeRaw = String(parsed?.pet_type || 'unknown').toLowerCase();
    const pet_type =
      petTypeRaw === 'dog' ? 'dog' : petTypeRaw === 'cat' ? 'cat' : petTypeRaw === 'other' ? 'other' : 'unknown';
    const confidenceNum = typeof parsed?.confidence === 'number' ? parsed.confidence : Number(parsed?.confidence);
    const confidence = Number.isFinite(confidenceNum) ? Math.max(0, Math.min(1, confidenceNum)) : null;
    const reason = String(parsed?.reason || '').slice(0, 200) || (ok ? 'Verified pet photo' : 'Not a pet photo');
    return { ok, pet_type, confidence, reason };
  } catch {
    // As a fallback, attempt a naive parse
    const ok = /"ok"\s*:\s*true/i.test(content);
    return { ok, pet_type: 'unknown', confidence: null, reason: 'Unparseable OpenAI response' };
  }
}

export async function validatePetPhotoInput(input: { photo_url?: string | null; photo_file?: { buffer: Buffer; mimeType?: string } | null }): Promise<PhotoValidationResult> {
  const mode = getMode();
  if (mode === 'off') {
    return { ok: true, mode, method: 'off', pet_type: 'unknown', confidence: null, reason: 'Validation disabled' };
  }

  // Choose buffer path first (safer than fetching URLs).
  if (input.photo_file?.buffer) {
    const basic = await basicImageChecks(input.photo_file.buffer);
    if (!basic.ok) return { ok: false, mode, method: 'basic', pet_type: 'unknown', confidence: null, reason: basic.reason };

    // strict requires OpenAI to be configured
    const { apiKey } = getOpenAIConfig();
    if (!apiKey && mode === 'strict') {
      return { ok: false, mode, method: 'openai', pet_type: 'unknown', confidence: null, reason: 'Photo validation unavailable (missing OPENAI_API_KEY)' };
    }
    if (!apiKey) {
      return { ok: true, mode, method: 'basic', pet_type: 'unknown', confidence: null, reason: 'Basic image checks passed (OpenAI not configured)' };
    }

    const dataUrl = `data:${input.photo_file.mimeType || 'image/jpeg'};base64,${input.photo_file.buffer.toString('base64')}`;
    const ai = await openAiClassifyIsPet(dataUrl);
    return { ok: ai.ok, mode, method: 'openai', pet_type: ai.pet_type, confidence: ai.confidence, reason: ai.reason };
  }

  const photoUrl = (input.photo_url || '').trim();
  if (!photoUrl) {
    return { ok: true, mode, method: 'basic', pet_type: 'unknown', confidence: null, reason: 'No photo provided' };
  }

  if (looksLikeDataImageUrl(photoUrl)) {
    const parsed = parseDataImageUrl(photoUrl);
    if (!parsed) return { ok: false, mode, method: 'basic', pet_type: 'unknown', confidence: null, reason: 'Invalid data URL' };
    const basic = await basicImageChecks(parsed.buffer);
    if (!basic.ok) return { ok: false, mode, method: 'basic', pet_type: 'unknown', confidence: null, reason: basic.reason };

    const { apiKey } = getOpenAIConfig();
    if (!apiKey && mode === 'strict') {
      return { ok: false, mode, method: 'openai', pet_type: 'unknown', confidence: null, reason: 'Photo validation unavailable (missing OPENAI_API_KEY)' };
    }
    if (!apiKey) {
      return { ok: true, mode, method: 'basic', pet_type: 'unknown', confidence: null, reason: 'Basic image checks passed (OpenAI not configured)' };
    }

    const ai = await openAiClassifyIsPet(photoUrl);
    return { ok: ai.ok, mode, method: 'openai', pet_type: ai.pet_type, confidence: ai.confidence, reason: ai.reason };
  }

  // For remote URLs, do NOT fetch (SSRF risk). Best-effort: allow in soft mode; require OpenAI+manual allowlist if you want strict.
  if (mode === 'strict') {
    return { ok: false, mode, method: 'basic', pet_type: 'unknown', confidence: null, reason: 'Photo URL must be an uploaded image (data URL) in strict mode' };
  }
  return { ok: true, mode, method: 'basic', pet_type: 'unknown', confidence: null, reason: 'Remote photo URL accepted (not verified)' };
}
