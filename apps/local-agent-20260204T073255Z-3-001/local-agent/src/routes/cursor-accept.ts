/**
 * Cursor Accept Button Auto-Click API
 */

import { Router, Request, Response } from 'express';
import { cursorAcceptWatcher } from '../cursor-accept-watcher.js';

const router = Router();

/**
 * POST /cursor-accept/start
 * Start watching and auto-clicking Accept button
 */
router.post('/start', async (req: Request, res: Response) => {
  try {
    await cursorAcceptWatcher.start();
    res.json({
      success: true,
      message: 'Accept button watcher started - will auto-click every 2 seconds',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /cursor-accept/stop
 * Stop watching
 */
router.post('/stop', (req: Request, res: Response) => {
  try {
    cursorAcceptWatcher.stop();
    res.json({
      success: true,
      message: 'Accept button watcher stopped',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /cursor-accept/click-now
 * Force click Accept button right now
 */
router.post('/click-now', async (req: Request, res: Response) => {
  try {
    const result = await cursorAcceptWatcher.forceClickAccept();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;

