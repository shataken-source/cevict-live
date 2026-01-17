/**
 * Audit Logger for PetReunion
 * Simplified version for pet matching operations
 */

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  entity: string;
  entityId?: string;
  reasoning: {
    model: string;
    reasoning: string;
    confidence: number;
  };
  context?: Record<string, any>;
}

export class AuditLogger {
  private static instance: AuditLogger;
  private logs: AuditLogEntry[] = [];

  public static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  public async logAIDecision(params: {
    action: string;
    entity: string;
    entityId?: string;
    model: string;
    reasoning: string;
    confidence: number;
    alternatives?: Array<{ petId: string; confidence: number; reason: string }>;
    guardrails?: string[];
    context?: Record<string, any>;
  }): Promise<string> {
    const logEntry: AuditLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      reasoning: {
        model: params.model,
        reasoning: params.reasoning,
        confidence: params.confidence,
      },
      context: params.context,
    };

    this.logs.push(logEntry);
    console.log('Audit Log:', JSON.stringify(logEntry, null, 2));
    return logEntry.id;
  }
}

export default AuditLogger;

