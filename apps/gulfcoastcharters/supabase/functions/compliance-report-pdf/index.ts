/**
 * Compliance Report PDF Edge Function
 *
 * Generates a PDF report for fleet compliance (Coast Guard / audits).
 * Body: { metrics, vessels (vesselCompliance), expiringDocuments, generatedDate }
 * Returns: { pdf: base64 }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function drawText(
  page: any,
  text: string,
  x: number,
  y: number,
  size: number,
  font: any,
  color = rgb(0, 0, 0)
) {
  page.drawText(text, { x, y, size, font, color });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { metrics, vessels = [], expiringDocuments = [], generatedDate } = body;

    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    let currentPage = doc.addPage([612, 792]);
    const margin = 50;
    let y = 750;

    const title = 'Fleet Compliance Report';
    drawText(currentPage, title, margin, y, 18, fontBold);
    y -= 24;

    const dateStr = generatedDate ? new Date(generatedDate).toLocaleDateString() : new Date().toLocaleDateString();
    drawText(currentPage, `Generated: ${dateStr}`, margin, y, 10, font, rgb(0.4, 0.4, 0.4));
    y -= 30;

    if (metrics) {
      drawText(currentPage, 'Summary', margin, y, 12, fontBold);
      y -= 18;
      drawText(currentPage, `Total Vessels: ${metrics.totalVessels ?? 0}`, margin, y, 10, font);
      y -= 14;
      drawText(currentPage, `Compliant (90%+): ${metrics.compliantVessels ?? 0}`, margin, y, 10, font);
      y -= 14;
      drawText(currentPage, `Expiring (30 days): ${metrics.expiringDocs ?? 0}`, margin, y, 10, font);
      y -= 14;
      drawText(currentPage, `Expired: ${metrics.expiredDocs ?? 0}`, margin, y, 10, font);
      y -= 14;
      drawText(currentPage, `Overall Compliance: ${metrics.overallCompliance ?? 0}%`, margin, y, 10, font);
      y -= 24;
    }

    if (Array.isArray(vessels) && vessels.length > 0) {
      drawText(currentPage, 'Vessel Compliance', margin, y, 12, fontBold);
      y -= 18;
      for (const v of vessels.slice(0, 20)) {
        if (y < 100) {
          currentPage = doc.addPage([612, 792]);
          y = 750;
        }
        const line = `${v.name || 'N/A'} | Docs: ${v.totalDocuments ?? 0} | ${v.compliancePercentage ?? 0}%`;
        drawText(currentPage, line, margin, y, 9, font);
        y -= 12;
      }
      y -= 12;
    }

    if (Array.isArray(expiringDocuments) && expiringDocuments.length > 0) {
      if (y < 200) {
        currentPage = doc.addPage([612, 792]);
        y = 750;
      }
      drawText(currentPage, 'Upcoming Expirations', margin, y, 12, fontBold);
      y -= 18;
      for (const d of expiringDocuments.slice(0, 25)) {
        if (y < 80) {
          currentPage = doc.addPage([612, 792]);
          y = 750;
        }
        const expDate = d.expirationDate ? new Date(d.expirationDate).toLocaleDateString() : 'N/A';
        const line = `${d.vesselName || 'N/A'} | ${d.documentType || 'N/A'} | ${expDate} | ${d.daysUntilExpiration ?? 0} days`;
        drawText(currentPage, line, margin, y, 9, font);
        y -= 12;
      }
    }

    const pdfBytes = await doc.save();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(pdfBytes)));

    return new Response(
      JSON.stringify({ pdf: base64 }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ error: 'Failed to generate PDF' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
