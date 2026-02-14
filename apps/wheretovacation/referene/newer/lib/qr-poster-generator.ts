/**
 * QR POSTER GENERATOR
 * 
 * Generates QR codes and printable PDF posters for lost pets.
 * Features:
 * - Unique QR codes linking to public status page
 * - High-quality PDF posters (8.5x11")
 * - Pet photo, name, location, and QR code
 * - Dynamic status updates
 */

import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import { createClient } from '@supabase/supabase-js';

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

// Base URL for public pet pages
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://petreunion.com';

export interface PetData {
  id: number;
  pet_name: string;
  pet_type: string;
  breed: string;
  color: string;
  photo_url: string | null;
  location_city: string;
  location_state: string;
  location_detail?: string;
  date_lost: string;
  reward_amount?: number;
  public_url_slug?: string;
  owner_phone?: string;
  description?: string;
}

export interface PosterOptions {
  includeReward?: boolean;
  includePhone?: boolean;
  colorScheme?: 'urgent' | 'hopeful' | 'neutral';
}

/**
 * Generate a unique QR code for a lost pet
 */
export async function generatePetQRCode(pet: PetData): Promise<string> {
  const publicUrl = `${BASE_URL}/pet/${pet.public_url_slug || pet.id}`;
  
  try {
    // Generate QR code as base64 PNG
    const qrDataUrl = await QRCode.toDataURL(publicUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'H' // High error correction for durability
    });
    
    return qrDataUrl;
  } catch (error) {
    console.error('QR generation error:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generate a printable PDF poster for a lost pet
 */
export async function generatePetPoster(
  pet: PetData, 
  options: PosterOptions = {}
): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      // Generate QR code first
      const qrCodeDataUrl = await generatePetQRCode(pet);
      
      // Create PDF document (8.5 x 11 inches)
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 36, bottom: 36, left: 36, right: 36 }
      });
      
      const chunks: Buffer[] = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      const pageWidth = 612; // 8.5" at 72dpi
      const contentWidth = pageWidth - 72; // Minus margins
      
      // Color schemes
      const colors = {
        urgent: { header: '#DC2626', accent: '#FEE2E2' },
        hopeful: { header: '#059669', accent: '#D1FAE5' },
        neutral: { header: '#1F2937', accent: '#F3F4F6' }
      };
      const scheme = colors[options.colorScheme || 'urgent'];
      
      // ========== HEADER ==========
      doc
        .rect(0, 0, pageWidth, 100)
        .fill(scheme.header);
      
      doc
        .fontSize(48)
        .fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .text('LOST PET', 0, 25, { align: 'center', width: pageWidth });
      
      doc
        .fontSize(16)
        .text('PLEASE HELP US FIND OUR FAMILY MEMBER', 0, 70, { align: 'center', width: pageWidth });
      
      // ========== PET PHOTO ==========
      let photoY = 120;
      if (pet.photo_url) {
        try {
          // Handle base64 or URL
          if (pet.photo_url.startsWith('data:image')) {
            const base64Data = pet.photo_url.split(',')[1];
            const imageBuffer = Buffer.from(base64Data, 'base64');
            doc.image(imageBuffer, (pageWidth - 250) / 2, photoY, { 
              width: 250,
              height: 250,
              fit: [250, 250]
            });
          } else {
            // For URL, we'd need to fetch it - for now, add placeholder
            doc
              .rect((pageWidth - 250) / 2, photoY, 250, 250)
              .fill('#E5E7EB');
            doc
              .fontSize(14)
              .fillColor('#6B7280')
              .text('Photo available online', (pageWidth - 250) / 2, photoY + 115, { width: 250, align: 'center' });
          }
        } catch (imgError) {
          console.warn('Could not embed photo:', imgError);
          // Add placeholder
          doc
            .rect((pageWidth - 250) / 2, photoY, 250, 250)
            .fill('#E5E7EB');
        }
      } else {
        // No photo placeholder
        doc
          .rect((pageWidth - 250) / 2, photoY, 250, 250)
          .fill('#E5E7EB');
        doc
          .fontSize(14)
          .fillColor('#6B7280')
          .text(`${pet.pet_type?.toUpperCase() || 'PET'}`, (pageWidth - 250) / 2, photoY + 115, { width: 250, align: 'center' });
      }
      
      // ========== PET DETAILS ==========
      let detailY = 390;
      
      // Pet Name (large)
      if (pet.pet_name) {
        doc
          .fontSize(36)
          .fillColor('#1F2937')
          .font('Helvetica-Bold')
          .text(pet.pet_name.toUpperCase(), 36, detailY, { align: 'center', width: contentWidth });
        detailY += 50;
      }
      
      // Breed & Color
      doc
        .fontSize(18)
        .fillColor('#4B5563')
        .font('Helvetica')
        .text(`${pet.breed || 'Unknown Breed'} • ${pet.color || 'Unknown Color'}`, 36, detailY, { align: 'center', width: contentWidth });
      detailY += 35;
      
      // Last Seen Location (highlighted)
      doc
        .rect(36, detailY, contentWidth, 60)
        .fill(scheme.accent);
      
      doc
        .fontSize(14)
        .fillColor('#6B7280')
        .text('LAST SEEN', 36, detailY + 10, { align: 'center', width: contentWidth });
      
      const locationText = [
        pet.location_detail,
        pet.location_city,
        pet.location_state
      ].filter(Boolean).join(', ');
      
      doc
        .fontSize(20)
        .fillColor('#1F2937')
        .font('Helvetica-Bold')
        .text(locationText || 'Location Unknown', 36, detailY + 30, { align: 'center', width: contentWidth });
      
      detailY += 75;
      
      // Date Lost
      if (pet.date_lost) {
        const lostDate = new Date(pet.date_lost);
        doc
          .fontSize(14)
          .fillColor('#6B7280')
          .font('Helvetica')
          .text(`Missing since: ${lostDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}`, 36, detailY, { align: 'center', width: contentWidth });
        detailY += 25;
      }
      
      // Reward (if applicable)
      if (options.includeReward && pet.reward_amount) {
        doc
          .fontSize(24)
          .fillColor(scheme.header)
          .font('Helvetica-Bold')
          .text(`💰 $${pet.reward_amount} REWARD`, 36, detailY, { align: 'center', width: contentWidth });
        detailY += 40;
      }
      
      // ========== QR CODE SECTION ==========
      const qrY = 570;
      
      // QR Code
      const qrBuffer = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');
      doc.image(qrBuffer, 36, qrY, { width: 120, height: 120 });
      
      // Scan instructions
      doc
        .fontSize(12)
        .fillColor('#1F2937')
        .font('Helvetica-Bold')
        .text('SCAN FOR UPDATES', 170, qrY + 15, { width: 200 });
      
      doc
        .fontSize(11)
        .fillColor('#6B7280')
        .font('Helvetica')
        .text('• See real-time status', 170, qrY + 35)
        .text('• Report a sighting', 170, qrY + 50)
        .text('• Get latest location info', 170, qrY + 65)
        .text('• Contact owner directly', 170, qrY + 80);
      
      // Public URL
      const publicUrl = `${BASE_URL}/pet/${pet.public_url_slug || pet.id}`;
      doc
        .fontSize(10)
        .fillColor('#4B5563')
        .text(publicUrl, 36, qrY + 125, { width: 250 });
      
      // Contact Phone (if included)
      if (options.includePhone && pet.owner_phone) {
        doc
          .rect(380, qrY, 200, 100)
          .fill(scheme.accent)
          .stroke(scheme.header);
        
        doc
          .fontSize(12)
          .fillColor('#1F2937')
          .font('Helvetica-Bold')
          .text('CALL IF FOUND:', 390, qrY + 15);
        
        doc
          .fontSize(22)
          .text(pet.owner_phone, 390, qrY + 40);
      }
      
      // ========== FOOTER ==========
      doc
        .rect(0, 730, pageWidth, 62)
        .fill('#1F2937');
      
      doc
        .fontSize(10)
        .fillColor('#9CA3AF')
        .text('Generated by PetReunion.com • AI-Powered Lost Pet Recovery', 0, 745, { 
          align: 'center', 
          width: pageWidth 
        });
      
      doc
        .fontSize(8)
        .text('This poster was created to help reunite lost pets with their families.', 0, 760, { 
          align: 'center', 
          width: pageWidth 
        });
      
      // Finalize PDF
      doc.end();
      
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Save generated poster to Supabase Storage and update pet record
 */
export async function savePosterToStorage(
  petId: number,
  pdfBuffer: Buffer,
  qrCodeDataUrl: string
): Promise<{ posterUrl: string; qrUrl: string }> {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }
  
  const timestamp = Date.now();
  
  // Save PDF to Supabase Storage
  const pdfPath = `posters/${petId}/poster-${timestamp}.pdf`;
  const { error: pdfError } = await supabase.storage
    .from('pet-images')
    .upload(pdfPath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true
    });
  
  if (pdfError) {
    console.error('PDF upload error:', pdfError);
    throw pdfError;
  }
  
  // Save QR code image
  const qrBuffer = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');
  const qrPath = `qrcodes/${petId}/qr-${timestamp}.png`;
  const { error: qrError } = await supabase.storage
    .from('pet-images')
    .upload(qrPath, qrBuffer, {
      contentType: 'image/png',
      upsert: true
    });
  
  if (qrError) {
    console.error('QR upload error:', qrError);
    throw qrError;
  }
  
  // Get public URLs
  const { data: { publicUrl: posterUrl } } = supabase.storage
    .from('pet-images')
    .getPublicUrl(pdfPath);
  
  const { data: { publicUrl: qrUrl } } = supabase.storage
    .from('pet-images')
    .getPublicUrl(qrPath);
  
  // Update pet record
  await supabase
    .from('lost_pets')
    .update({
      poster_pdf_url: posterUrl,
      qr_code_url: qrUrl,
      poster_generated_at: new Date().toISOString()
    })
    .eq('id', petId);
  
  return { posterUrl, qrUrl };
}

/**
 * Generate poster for an existing pet by ID
 */
export async function generatePosterForPet(
  petId: number,
  options: PosterOptions = {}
): Promise<{ posterUrl: string; qrUrl: string }> {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }
  
  // Fetch pet data
  const { data: pet, error } = await supabase
    .from('lost_pets')
    .select('*')
    .eq('id', petId)
    .single();
  
  if (error || !pet) {
    throw new Error('Pet not found');
  }
  
  // Generate QR code
  const qrCodeDataUrl = await generatePetQRCode(pet);
  
  // Generate PDF poster
  const pdfBuffer = await generatePetPoster(pet, options);
  
  // Save to storage
  return await savePosterToStorage(petId, pdfBuffer, qrCodeDataUrl);
}

