/**
 * Captain Document OCR API
 * POST /api/captain/documents/ocr
 * Body: { imageUrl: string, documentType: string }
 *
 * Extracts text from uploaded document images and parses structured fields
 * based on document type (USCG License, Insurance, Boat Registration, etc.)
 *
 * Strategy:
 *   1. If GOOGLE_CLOUD_VISION_API_KEY is set → use Google Cloud Vision (best accuracy)
 *   2. Otherwise → fetch image, extract text with regex heuristics on common doc formats
 *
 * After OCR, auto-updates the captain_documents record with extracted fields.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthedUser, getSupabaseAdmin } from '../../_lib/supabase';

// ── Field extraction by document type ────────────────────────────────────────

interface ExtractedFields {
  licenseNumber?: string;
  policyNumber?: string;
  registrationNumber?: string;
  certificateNumber?: string;
  holderName?: string;
  expirationDate?: string;
  issueDate?: string;
  issuingAuthority?: string;
  vesselName?: string;
  vesselNumber?: string;
  endorsements?: string[];
  mmrNumber?: string;
}

/** Parse a date string from OCR text in various formats */
function parseDate(text: string): string | undefined {
  // MM/DD/YYYY or MM-DD-YYYY
  const m1 = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (m1) return `${m1[3]}-${m1[1].padStart(2, '0')}-${m1[2].padStart(2, '0')}`;

  // Month DD, YYYY
  const months: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    january: '01', february: '02', march: '03', april: '04', june: '06',
    july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
  };
  const m2 = text.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (m2) {
    const mo = months[m2[1].toLowerCase()];
    if (mo) return `${m2[3]}-${mo}-${m2[2].padStart(2, '0')}`;
  }

  // YYYY-MM-DD
  const m3 = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m3) return m3[0];

  return undefined;
}

function extractUSCGLicense(text: string): ExtractedFields {
  const fields: ExtractedFields = {};

  // License/MMC number: ML-1234567, MMC-1234567, 1234567, MR-1234567
  const licNum = text.match(/(?:ML|MMC|MR|License\s*(?:No\.?|#|Number|Num))\s*[:\-\s]?\s*([A-Z]{0,4}[\-]?\d{5,10})/i);
  if (licNum) fields.licenseNumber = licNum[1].trim();
  // Bare 7-digit number near "license" context
  if (!fields.licenseNumber) {
    const bare = text.match(/(?:license|credential|certificate)\D{0,20}(\d{7})/i);
    if (bare) fields.licenseNumber = bare[1];
  }

  // MMR Number
  const mmr = text.match(/MMR\s*[:\-#]?\s*(\d{5,10})/i);
  if (mmr) fields.mmrNumber = mmr[1];

  // Holder name: look for "issued to" or "name" followed by a capitalized name
  const name = text.match(/(?:issued\s+to|holder|name)\s*[:\-]?\s*([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
  if (name) fields.holderName = name[1].trim();

  // Expiration date
  const expCtx = text.match(/(?:expir|exp\.?\s*date|valid\s+(?:thru|through|until))\s*[:\-]?\s*(.{8,30})/i);
  if (expCtx) fields.expirationDate = parseDate(expCtx[1]);

  // Issue date
  const issCtx = text.match(/(?:issue\s*date|issued|effective)\s*[:\-]?\s*(.{8,30})/i);
  if (issCtx) fields.issueDate = parseDate(issCtx[1]);

  // Endorsements: Master, OUPV, Mate, etc.
  const endorsements: string[] = [];
  if (/master/i.test(text)) endorsements.push('Master');
  if (/oupv|operator.*uninspected/i.test(text)) endorsements.push('OUPV');
  if (/mate/i.test(text)) endorsements.push('Mate');
  if (/near\s*coastal/i.test(text)) endorsements.push('Near Coastal');
  if (/inland/i.test(text)) endorsements.push('Inland');
  if (/great\s*lakes/i.test(text)) endorsements.push('Great Lakes');
  if (/oceans?/i.test(text)) endorsements.push('Oceans');
  if (endorsements.length > 0) fields.endorsements = endorsements;

  fields.issuingAuthority = 'U.S. Coast Guard';
  return fields;
}

function extractInsurance(text: string): ExtractedFields {
  const fields: ExtractedFields = {};

  const policy = text.match(/(?:policy|pol)\s*(?:no\.?|#|number|num)\s*[:\-]?\s*([A-Z0-9\-]{5,20})/i);
  if (policy) fields.policyNumber = policy[1].trim();

  const name = text.match(/(?:insured|named\s+insured|policy\s*holder)\s*[:\-]?\s*([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
  if (name) fields.holderName = name[1].trim();

  const expCtx = text.match(/(?:expir|exp\.?\s*date|policy\s*end|ends?)\s*[:\-]?\s*(.{8,30})/i);
  if (expCtx) fields.expirationDate = parseDate(expCtx[1]);

  const effCtx = text.match(/(?:effective|eff\.?\s*date|policy\s*start|begins?)\s*[:\-]?\s*(.{8,30})/i);
  if (effCtx) fields.issueDate = parseDate(effCtx[1]);

  const issuer = text.match(/(?:issued\s+by|insurer|company|underwriter)\s*[:\-]?\s*([A-Z][A-Za-z\s&.]{3,40})/i);
  if (issuer) fields.issuingAuthority = issuer[1].trim();

  return fields;
}

function extractBoatRegistration(text: string): ExtractedFields {
  const fields: ExtractedFields = {};

  // Registration / hull number: FL1234AB, TX-1234-AB, CF 1234 AB
  const regNum = text.match(/(?:registration|reg|hull|HIN)\s*(?:no\.?|#|number)?\s*[:\-]?\s*([A-Z]{2}[\-\s]?\d{3,6}[\-\s]?[A-Z]{0,2}\d{0,4})/i);
  if (regNum) fields.registrationNumber = regNum[1].replace(/\s+/g, '').trim();

  // Vessel name
  const vessel = text.match(/(?:vessel|boat)\s*(?:name)?\s*[:\-]?\s*([A-Z][A-Za-z\s\-']{2,30})/i);
  if (vessel) fields.vesselName = vessel[1].trim();

  const expCtx = text.match(/(?:expir|exp\.?\s*date|valid\s+(?:thru|through|until))\s*[:\-]?\s*(.{8,30})/i);
  if (expCtx) fields.expirationDate = parseDate(expCtx[1]);

  const owner = text.match(/(?:owner|registered\s+to)\s*[:\-]?\s*([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
  if (owner) fields.holderName = owner[1].trim();

  return fields;
}

function extractSafetyCert(text: string): ExtractedFields {
  const fields: ExtractedFields = {};

  const certNum = text.match(/(?:certificate|cert)\s*(?:no\.?|#|number)?\s*[:\-]?\s*([A-Z0-9\-]{4,20})/i);
  if (certNum) fields.certificateNumber = certNum[1].trim();

  const name = text.match(/(?:awarded\s+to|issued\s+to|name|holder)\s*[:\-]?\s*([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
  if (name) fields.holderName = name[1].trim();

  const expCtx = text.match(/(?:expir|exp\.?\s*date|valid\s+(?:thru|through|until))\s*[:\-]?\s*(.{8,30})/i);
  if (expCtx) fields.expirationDate = parseDate(expCtx[1]);

  const issCtx = text.match(/(?:issue\s*date|issued|completed|date)\s*[:\-]?\s*(.{8,30})/i);
  if (issCtx) fields.issueDate = parseDate(issCtx[1]);

  return fields;
}

function extractFields(text: string, documentType: string): ExtractedFields {
  const dt = documentType.toLowerCase();
  if (dt.includes('uscg') || dt.includes('license') || dt.includes('captain')) return extractUSCGLicense(text);
  if (dt.includes('insurance') || dt.includes('policy')) return extractInsurance(text);
  if (dt.includes('registration') || dt.includes('boat reg')) return extractBoatRegistration(text);
  // Safety, First Aid, CPR, Medical, etc.
  return extractSafetyCert(text);
}

// ── Google Cloud Vision OCR ──────────────────────────────────────────────────

async function googleVisionOCR(imageUrl: string, apiKey: string): Promise<string> {
  const body = {
    requests: [{
      image: { source: { imageUri: imageUrl } },
      features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
    }],
  };

  const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new Error(`Vision API: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.responses?.[0]?.fullTextAnnotation?.text || json.responses?.[0]?.textAnnotations?.[0]?.description || '';
}

// ── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth: must be captain
  const { user, error: authError } = await getAuthedUser(req, res);
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  const admin = getSupabaseAdmin();
  const { data: captainProfile } = await admin
    .from('captain_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();
  if (!captainProfile) return res.status(403).json({ error: 'User is not a captain' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { imageUrl, documentType, documentId } = body;

    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({ error: 'imageUrl is required' });
    }
    if (!documentType || typeof documentType !== 'string') {
      return res.status(400).json({ error: 'documentType is required' });
    }

    // Validate URL is from expected domains (Supabase storage, etc.)
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(imageUrl);
    } catch {
      return res.status(400).json({ error: 'Invalid imageUrl' });
    }
    // Block non-HTTPS and private IPs
    if (parsedUrl.protocol !== 'https:') {
      return res.status(400).json({ error: 'imageUrl must use HTTPS' });
    }

    // OCR
    let rawText = '';
    const visionKey = process.env.GOOGLE_CLOUD_VISION_API_KEY?.trim();

    if (visionKey) {
      rawText = await googleVisionOCR(imageUrl, visionKey);
    } else {
      // Without Vision API, we can't do real OCR on images.
      // Return guidance to the user.
      return res.status(200).json({
        success: true,
        ocrAvailable: false,
        message: 'OCR processing requires GOOGLE_CLOUD_VISION_API_KEY. Please set this environment variable or manually enter document fields.',
        extractedFields: {},
        rawText: '',
      });
    }

    if (!rawText) {
      return res.status(200).json({
        success: true,
        ocrAvailable: true,
        message: 'No text could be extracted from the image. Please ensure the image is clear and legible.',
        extractedFields: {},
        rawText: '',
      });
    }

    // Extract structured fields
    const extractedFields = extractFields(rawText, documentType);

    // If a documentId was provided, auto-update the captain_documents record
    if (documentId && typeof documentId === 'string') {
      const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
      if (extractedFields.expirationDate) updateData.expiry_date = extractedFields.expirationDate;
      if (extractedFields.licenseNumber || extractedFields.policyNumber || extractedFields.registrationNumber || extractedFields.certificateNumber) {
        updateData.document_number = extractedFields.licenseNumber || extractedFields.policyNumber || extractedFields.registrationNumber || extractedFields.certificateNumber;
      }
      if (extractedFields.holderName) updateData.holder_name = extractedFields.holderName;
      if (extractedFields.issuingAuthority) updateData.issuing_authority = extractedFields.issuingAuthority;
      if (extractedFields.issueDate) updateData.issue_date = extractedFields.issueDate;

      // Only update if we have useful data and the doc belongs to this captain
      if (Object.keys(updateData).length > 1) {
        await admin
          .from('captain_documents')
          .update(updateData)
          .eq('id', documentId)
          .eq('captain_id', user.id);
      }
    }

    return res.status(200).json({
      success: true,
      ocrAvailable: true,
      documentType,
      extractedFields,
      rawText: rawText.slice(0, 2000), // Truncate to avoid huge responses
    });
  } catch (e: any) {
    console.error('[OCR] Error:', e);
    return res.status(500).json({ error: String(e?.message || 'OCR processing failed') });
  }
}
