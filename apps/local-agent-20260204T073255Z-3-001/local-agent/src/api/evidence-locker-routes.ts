/**
 * CEVICT EVIDENCE LOCKER - API ROUTES
 * RESTful endpoints for evidence management
 */

import { Router, Request, Response } from 'express';
import { evidenceLocker } from '../evidence-locker';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as archiver from 'archiver';
import * as nodemailer from 'nodemailer';

const router = Router();

/**
 * POST /api/evidence/log
 * Log a new AI interaction
 */
router.post('/log', async (req: Request, res: Response) => {
  try {
    const interaction = req.body;
    
    const evidenceId = await evidenceLocker.logInteraction({
      provider: interaction.provider,
      modelVersion: interaction.modelVersion || 'unknown',
      interactionType: interaction.interactionType,
      requestId: interaction.requestId,
      rawRequest: interaction.rawRequest,
      rawResponse: interaction.rawResponse,
      latencyMs: interaction.latencyMs,
    });

    res.json({
      success: true,
      evidenceId,
      message: 'Interaction logged to Evidence Locker',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/evidence/flag
 * Manually flag evidence (from dashboard)
 */
router.post('/flag', async (req: Request, res: Response) => {
  try {
    const { evidenceId, tags, severity, legalNotes, financialImpact } = req.body;

    await evidenceLocker.flagEvidence({
      evidenceId,
      tags,
      severity,
      flaggedBy: 'manual',
      legalNotes,
      financialImpact,
    });

    res.json({
      success: true,
      message: `Evidence ${evidenceId} flagged successfully`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/evidence/hallucination
 * Log a detected hallucination
 */
router.post('/hallucination', async (req: Request, res: Response) => {
  try {
    const detection = req.body;

    const hallucinationId = await evidenceLocker.logHallucination({
      evidenceId: detection.evidenceId,
      detectionType: detection.detectionType,
      claimedValue: detection.claimedValue,
      actualValue: detection.actualValue,
      verificationMethod: detection.verificationMethod,
      confidenceScore: detection.confidenceScore || 1.0,
    });

    res.json({
      success: true,
      hallucinationId,
      message: 'Hallucination logged',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/evidence/provider/:provider
 * Get all evidence for a specific provider
 */
router.get('/provider/:provider', async (req: Request, res: Response) => {
  try {
    const { provider } = req.params;
    const { startDate, endDate } = req.query;

    const evidence = await evidenceLocker.getEvidenceByProvider(
      provider as any,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json({
      success: true,
      provider,
      count: evidence.length,
      evidence,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/evidence/summary
 * Get flagged evidence summary
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const summary = await evidenceLocker.getFlaggedSummary();

    res.json({
      success: true,
      summary,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/legal/report
 * Generate court-ready evidence report
 */
router.get('/legal/report', async (req: Request, res: Response) => {
  try {
    const { provider, startDate, endDate } = req.query;

    const report = await evidenceLocker.generateLegalReport(
      provider as any,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json({
      success: true,
      report,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/legal/export
 * Generate weekly legal export ZIP
 */
router.post('/legal/export', async (req: Request, res: Response) => {
  try {
    const exportPath = await generateWeeklyExport();

    res.json({
      success: true,
      exportPath,
      message: 'Legal export generated',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Generate weekly legal export ZIP
 */
async function generateWeeklyExport(): Promise<string> {
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('T')[0];
  const exportDir = path.join(process.cwd(), 'legal-exports');
  await fs.mkdir(exportDir, { recursive: true });

  const zipPath = path.join(exportDir, `CEVICT_EVIDENCE_${timestamp}.zip`);
  
  // Generate report
  const report = await evidenceLocker.generateLegalReport();
  
  // Create ZIP archive
  const output = require('fs').createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.pipe(output);
  archive.append(JSON.stringify(report, null, 2), { name: 'evidence_report.json' });
  
  // Add evidence by provider
  for (const provider of ['openai', 'anthropic', 'google', 'cursor']) {
    const providerEvidence = await evidenceLocker.getEvidenceByProvider(provider as any);
    if (providerEvidence.length > 0) {
      archive.append(
        JSON.stringify(providerEvidence, null, 2),
        { name: `${provider}_evidence.json` }
      );
    }
  }

  await archive.finalize();

  return zipPath;
}

/**
 * POST /api/legal/email-export
 * Email weekly export to legal team
 */
router.post('/legal/email-export', async (req: Request, res: Response) => {
  try {
    const { recipients } = req.body;
    
    const zipPath = await generateWeeklyExport();
    
    // Send email
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: recipients || ['shataken@gmail.com', 'victoria@cevict.com'],
      subject: `CEVICT Legal Evidence Export - ${new Date().toLocaleDateString()}`,
      html: `
        <h2>CEVICT Evidence Locker - Weekly Export</h2>
        <p>Attached is the weekly evidence export containing all flagged AI interactions.</p>
        <p><strong>Date Range:</strong> Last 7 days</p>
        <p><strong>Export Generated:</strong> ${new Date().toISOString()}</p>
        <p><strong>Contents:</strong></p>
        <ul>
          <li>Comprehensive evidence report (JSON)</li>
          <li>Evidence by provider (OpenAI, Anthropic, Google, Cursor)</li>
          <li>SHA-256 verification hashes</li>
          <li>Hallucination detections</li>
          <li>Context loss events</li>
        </ul>
        <p><strong>Security Notice:</strong> This archive is password-protected. Contact Vic Cevict for the password.</p>
        <p>---</p>
        <p><em>This is an automated export from the CEVICT Evidence Locker (CEL) system.</em></p>
      `,
      attachments: [{
        filename: path.basename(zipPath),
        path: zipPath,
      }],
    });

    res.json({
      success: true,
      message: 'Legal export emailed successfully',
      recipients,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;

