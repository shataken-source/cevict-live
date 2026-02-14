import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Inbox file paths for each AI
const INBOX_PATHS = {
  claude: 'CURSOR-READY/INBOX/CLAUDE-INBOX.md',
  gemini: 'CURSOR-READY/INBOX/GEMINI-INBOX.md',
  cursor: 'CURSOR-READY/INBOX/CURSOR-INBOX.md',
};

// Project to AI mapping (which AI handles which project)
const PROJECT_AI_MAP: Record<string, string[]> = {
  'alpha-hunter': ['claude', 'cursor'],
  'prognostication': ['claude', 'cursor'],
  'orchestrator': ['claude', 'cursor'],
  'progno': ['claude'],
  'petreunion': ['gemini', 'cursor'],
  'popthepopcorn': ['gemini', 'cursor'],
  'smokersrights': ['gemini', 'cursor'],
  'gulfcoastcharters': ['claude', 'cursor'],
  'wheretovacation': ['gemini', 'cursor'],
};

export async function POST(request: NextRequest) {
  try {
    const { projectId, message, targetAI } = await request.json();

    if (!projectId || !message) {
      return NextResponse.json(
        { error: 'projectId and message are required' },
        { status: 400 }
      );
    }

    const aiTargets = targetAI ? [targetAI.toLowerCase()] : (PROJECT_AI_MAP[projectId] || ['cursor']);
    
    // Get workspace root (go up from apps/monitor to cevict-live root)
    const currentDir = process.cwd();
    const workspaceRoot = currentDir.includes('apps/monitor')
      ? currentDir.replace(/[\\/]apps[\\/]monitor.*$/i, '')
      : currentDir.replace(/[\\/]apps[\\/].*$/i, '');

    const results = [];

    for (const ai of aiTargets) {
      if (!['claude', 'gemini', 'cursor'].includes(ai)) {
        results.push({ ai, success: false, error: 'Invalid AI target' });
        continue;
      }

      try {
        const path = await import('path');
        const fs = await import('fs/promises');
        const inboxPath = path.join(workspaceRoot, INBOX_PATHS[ai as keyof typeof INBOX_PATHS]);

        // Read existing inbox
        let content = '';
        try {
          content = await fs.readFile(inboxPath, 'utf-8');
        } catch (error) {
          // File doesn't exist, create it
          content = `# ${ai.toUpperCase()} INBOX\n\n`;
        }

        // Append new message with timestamp
        const timestamp = new Date().toISOString();
        const taskId = `${ai.toUpperCase()}-CURSOR-${Date.now()}`;
        const newMessage = `\n\n---\n\n## ${taskId}\n**FROM:** Command Center\n**TO:** ${ai.toUpperCase()}\n**DATE:** ${timestamp}\n**PROJECT:** ${projectId}\n**PRIORITY:** 🟡 MEDIUM\n\n${message}\n\n**CURSOR STATUS: AWAITING RESPONSE**\n`;

        await fs.writeFile(inboxPath, content + newMessage, 'utf-8');

        results.push({
          ai,
          success: true,
          message: `Message added to ${ai} inbox`,
          taskId,
        });
      } catch (error: any) {
        results.push({
          ai,
          success: false,
          error: error.message || 'Failed to write to inbox',
        });
      }
    }

    const allSuccess = results.every(r => r.success);
    return NextResponse.json({
      success: allSuccess,
      results,
      message: allSuccess
        ? `Message sent to ${results.map(r => r.ai).join(', ')}`
        : 'Some messages failed to send',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to send AI message' },
      { status: 500 }
    );
  }
}

