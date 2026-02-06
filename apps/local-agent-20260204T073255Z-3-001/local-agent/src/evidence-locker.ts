/**
 * CEVICT EVIDENCE LOCKER (CEL)
 * Forensic logging system for AI interactions
 * 
 * Purpose: Capture legally admissible evidence of:
 * - AI hallucinations
 * - Context loss
 * - Data fabrication
 * - Negligence
 * - Potential fraud
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

export type AIProvider = 'openai' | 'anthropic' | 'google' | 'cursor' | 'other';
export type InteractionType = 'api_call' | 'code_generation' | 'analysis' | 'trade_suggestion';
export type EvidenceTag = 'HALLUCINATION' | 'CONTEXT_LOSS' | 'DATA_LOSS' | 'NEGLIGENCE' | 'FRAUD';
export type Severity = 'low' | 'medium' | 'high' | 'critical';

interface AIInteraction {
  provider: AIProvider;
  modelVersion: string;
  interactionType: InteractionType;
  requestId?: string;
  rawRequest: any;
  rawResponse: any;
  latencyMs?: number;
}

interface EvidenceFlag {
  evidenceId: string;
  tags: EvidenceTag[];
  severity: Severity;
  flaggedBy: 'system' | 'manual';
  legalNotes?: string;
  financialImpact?: number;
}

interface HallucDetection {
  evidenceId: string;
  detectionType: 'fake_file' | 'fake_api' | 'false_memory' | 'incorrect_data';
  claimedValue: string;
  actualValue?: string;
  verificationMethod: string;
  confidenceScore: number;
}

interface ContextLoss {
  evidenceId: string;
  expectedContext: string;
  providedContext?: string;
  missingElements: string[];
  impactLevel: 'minor' | 'moderate' | 'severe' | 'critical';
}

export class EvidenceLocker {
  private supabase: SupabaseClient;
  private localArchivePath: string;

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    this.supabase = createClient(
      supabaseUrl || process.env.SUPABASE_URL!,
      supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    this.localArchivePath = process.env.EVIDENCE_ARCHIVE_PATH || './evidence-archive';
  }

  /**
   * Log an AI interaction (The "Witness")
   */
  async logInteraction(interaction: AIInteraction): Promise<string> {
    try {
      const { data, error } = await this.supabase.rpc('log_ai_interaction', {
        p_provider: interaction.provider,
        p_model_version: interaction.modelVersion,
        p_interaction_type: interaction.interactionType,
        p_request_id: interaction.requestId,
        p_raw_request: interaction.rawRequest,
        p_raw_response: interaction.rawResponse,
        p_latency_ms: interaction.latencyMs,
      });

      if (error) throw error;

      // Also save to local archive for redundancy
      await this.saveToLocalArchive(interaction, data);

      console.log(`[CEL] Logged ${interaction.provider} interaction: ${data}`);
      return data;
    } catch (error: any) {
      console.error('[CEL] Failed to log interaction:', error.message);
      // Failsafe: Save to local file system
      await this.emergencySave(interaction);
      throw error;
    }
  }

  /**
   * Flag evidence (manual or automated)
   */
  async flagEvidence(flag: EvidenceFlag): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.rpc('flag_evidence', {
        p_evidence_id: flag.evidenceId,
        p_tags: flag.tags,
        p_severity: flag.severity,
        p_flagged_by: flag.flaggedBy,
        p_legal_notes: flag.legalNotes,
        p_financial_impact: flag.financialImpact,
      });

      if (error) throw error;

      console.log(`[CEL] Flagged evidence ${flag.evidenceId} with tags: ${flag.tags.join(', ')}`);
      return data;
    } catch (error: any) {
      console.error('[CEL] Failed to flag evidence:', error.message);
      throw error;
    }
  }

  /**
   * Log a detected hallucination
   */
  async logHallucination(detection: HallucDetection): Promise<string> {
    try {
      const { data, error } = await this.supabase.rpc('log_hallucination', {
        p_evidence_id: detection.evidenceId,
        p_detection_type: detection.detectionType,
        p_claimed_value: detection.claimedValue,
        p_actual_value: detection.actualValue,
        p_verification_method: detection.verificationMethod,
        p_confidence_score: detection.confidenceScore,
      });

      if (error) throw error;

      console.log(`[CEL] HALLUCINATION DETECTED: ${detection.detectionType} - "${detection.claimedValue}"`);
      return data;
    } catch (error: any) {
      console.error('[CEL] Failed to log hallucination:', error.message);
      throw error;
    }
  }

  /**
   * Log context loss event
   */
  async logContextLoss(contextLoss: ContextLoss): Promise<string> {
    try {
      const { data, error } = await this.supabase.rpc('log_context_loss', {
        p_evidence_id: contextLoss.evidenceId,
        p_expected_context: contextLoss.expectedContext,
        p_provided_context: contextLoss.providedContext,
        p_missing_elements: contextLoss.missingElements,
        p_impact_level: contextLoss.impactLevel,
      });

      if (error) throw error;

      console.log(`[CEL] CONTEXT LOSS: Missing ${contextLoss.missingElements.length} elements`);
      return data;
    } catch (error: any) {
      console.error('[CEL] Failed to log context loss:', error.message);
      throw error;
    }
  }

  /**
   * Verify a file claim made by an AI
   */
  async verifyFileClaim(
    evidenceId: string,
    claimedPath: string,
    provider: AIProvider
  ): Promise<boolean> {
    try {
      const exists = await fs.access(claimedPath).then(() => true).catch(() => false);

      if (!exists) {
        // AI hallucinated a file that doesn't exist
        await this.logHallucination({
          evidenceId,
          detectionType: 'fake_file',
          claimedValue: claimedPath,
          actualValue: 'File does not exist',
          verificationMethod: 'fs.access',
          confidenceScore: 1.0,
        });

        return false;
      }

      return true;
    } catch (error: any) {
      console.error('[CEL] File verification failed:', error.message);
      return false;
    }
  }

  /**
   * Verify memory context was properly used
   */
  async verifyContextUsage(
    evidenceId: string,
    expectedMemory: string[],
    responseText: string
  ): Promise<boolean> {
    const missingElements: string[] = [];

    for (const memory of expectedMemory) {
      if (!responseText.includes(memory)) {
        missingElements.push(memory);
      }
    }

    if (missingElements.length > 0) {
      await this.logContextLoss({
        evidenceId,
        expectedContext: expectedMemory.join('; '),
        providedContext: responseText.substring(0, 500),
        missingElements,
        impactLevel: missingElements.length >= expectedMemory.length / 2 ? 'severe' : 'moderate',
      });

      return false;
    }

    return true;
  }

  /**
   * Get evidence by provider for legal review
   */
  async getEvidenceByProvider(
    provider: AIProvider,
    startDate?: Date,
    endDate?: Date
  ): Promise<any[]> {
    const { data, error } = await this.supabase.rpc('get_evidence_by_provider', {
      p_provider: provider,
      p_start_date: startDate?.toISOString(),
      p_end_date: endDate?.toISOString(),
    });

    if (error) throw error;
    return data;
  }

  /**
   * Get flagged evidence summary
   */
  async getFlaggedSummary(): Promise<any[]> {
    const { data, error } = await this.supabase.rpc('get_flagged_evidence_summary');
    if (error) throw error;
    return data;
  }

  /**
   * Generate court-ready report (PDF-ready JSON)
   */
  async generateLegalReport(
    provider?: AIProvider,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    const evidence = provider
      ? await this.getEvidenceByProvider(provider, startDate, endDate)
      : await this.getAllFlaggedEvidence(startDate, endDate);

    const summary = await this.getFlaggedSummary();

    const report = {
      reportGenerated: new Date().toISOString(),
      reportType: 'AI Product Liability Evidence',
      targetProvider: provider || 'ALL',
      dateRange: {
        start: startDate?.toISOString() || 'All time',
        end: endDate?.toISOString() || 'Present',
      },
      totalIncidents: evidence.length,
      summary,
      evidence,
      legalDisclaimer: 'This report contains evidence for potential legal proceedings. All data is cryptographically verified and immutable.',
      verificationInstructions: 'Each evidence record includes a SHA-256 hash for independent verification.',
    };

    return report;
  }

  /**
   * Save to local archive (redundancy)
   */
  private async saveToLocalArchive(interaction: AIInteraction, evidenceId: string): Promise<void> {
    try {
      const providerDir = path.join(this.localArchivePath, interaction.provider);
      await fs.mkdir(providerDir, { recursive: true });

      const filename = `${new Date().toISOString().replace(/:/g, '-')}_${evidenceId}.json`;
      const filepath = path.join(providerDir, filename);

      await fs.writeFile(
        filepath,
        JSON.stringify({
          evidenceId,
          ...interaction,
          archivedAt: new Date().toISOString(),
        }, null, 2)
      );
    } catch (error: any) {
      console.error('[CEL] Local archive save failed:', error.message);
    }
  }

  /**
   * Emergency save if Supabase fails
   */
  private async emergencySave(interaction: AIInteraction): Promise<void> {
    const emergencyDir = path.join(this.localArchivePath, 'emergency');
    await fs.mkdir(emergencyDir, { recursive: true });

    const filename = `EMERGENCY_${new Date().toISOString().replace(/:/g, '-')}.json`;
    await fs.writeFile(
      path.join(emergencyDir, filename),
      JSON.stringify({
        ...interaction,
        savedAt: new Date().toISOString(),
        reason: 'Supabase connection failed',
      }, null, 2)
    );

    console.warn('[CEL] Evidence saved to emergency backup');
  }

  /**
   * Get all flagged evidence
   */
  private async getAllFlaggedEvidence(startDate?: Date, endDate?: Date): Promise<any[]> {
    let query = this.supabase
      .from('legal_evidence')
      .select('*')
      .not('flagged_at', 'is', null);

    if (startDate) query = query.gte('timestamp', startDate.toISOString());
    if (endDate) query = query.lte('timestamp', endDate.toISOString());

    const { data, error } = await query.order('timestamp', { ascending: false });

    if (error) throw error;
    return data;
  }

  /**
   * Auto-lock old evidence (run daily)
   */
  async autoLockEvidence(): Promise<void> {
    const { error } = await this.supabase.rpc('auto_lock_evidence');
    if (error) throw error;
    console.log('[CEL] Auto-locked evidence older than 24 hours');
  }
}

// Singleton instance
export const evidenceLocker = new EvidenceLocker();

