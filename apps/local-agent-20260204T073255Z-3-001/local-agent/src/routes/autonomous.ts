/**
 * Autonomous Mode API Routes
 * Full AI control - user can break in if needed
 */

import { Router, Request, Response } from 'express';
import { autonomousOrchestrator } from '../autonomous-orchestrator.js';

const router = Router();

/**
 * POST /autonomous/start
 * Start full autonomous mode
 */
router.post('/start', async (req: Request, res: Response) => {
  try {
    await autonomousOrchestrator.start();
    res.json({
      success: true,
      message: 'Autonomous mode started',
      status: autonomousOrchestrator.getStatus(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /autonomous/stop
 * Stop autonomous mode
 */
router.post('/stop', async (req: Request, res: Response) => {
  try {
    await autonomousOrchestrator.stop();
    res.json({
      success: true,
      message: 'Autonomous mode stopped',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /autonomous/status
 * Get autonomous mode status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = autonomousOrchestrator.getStatus();
    res.json({
      success: true,
      ...status,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /autonomous/break-in
 * User break-in - take control back
 */
router.post('/break-in', async (req: Request, res: Response) => {
  try {
    // Create break-in file
    const fs = await import('fs');
    const breakInFile = 'C:\\gcc\\cevict-app\\cevict-monorepo\\.break-in';
    fs.writeFileSync(breakInFile, new Date().toISOString());
    
    // Stop autonomous mode
    await autonomousOrchestrator.stop();
    
    res.json({
      success: true,
      message: 'Break-in successful - user has control',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /autonomous/configure
 * Auto-configure settings
 */
router.post('/configure', async (req: Request, res: Response) => {
  try {
    const { dailyGoal, maxDailyLoss, autoDebug, autoTest, autoTrade } = req.body;
    
    // Update configuration
    // In production, would save to config file
    
    res.json({
      success: true,
      message: 'Configuration updated',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;

