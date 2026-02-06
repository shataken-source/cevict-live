/**
 * Click Watcher API Routes
 * Learn from user clicks and replicate them
 */

import { Router, Request, Response } from 'express';
import { clickWatcher } from '../click-watcher.js';

const router = Router();

/**
 * POST /click-watcher/start
 * Start watching user clicks
 */
router.post('/start', (req: Request, res: Response) => {
  try {
    const { context } = req.body;
    clickWatcher.startWatching(context);
    res.json({
      success: true,
      message: 'Click watcher started - click on things and I will learn!',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /click-watcher/stop
 * Stop watching
 */
router.post('/stop', (req: Request, res: Response) => {
  try {
    clickWatcher.stopWatching();
    res.json({
      success: true,
      message: 'Click watcher stopped',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /click-watcher/record
 * Record a click (when user clicks something)
 */
router.post('/record', async (req: Request, res: Response) => {
  try {
    const { windowTitle, action } = req.body;
    await clickWatcher.recordClick(windowTitle, action || 'click');
    res.json({
      success: true,
      message: 'Click recorded',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /click-watcher/learn
 * Learn a sequence of clicks
 */
router.post('/learn', (req: Request, res: Response) => {
  try {
    const { pattern, sequence } = req.body;
    if (!pattern || !sequence) {
      return res.status(400).json({
        success: false,
        error: 'Pattern and sequence are required',
      });
    }

    clickWatcher.learnSequence(pattern, sequence);
    res.json({
      success: true,
      message: `Learned sequence: ${pattern}`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /click-watcher/replay
 * Replay a learned sequence
 */
router.post('/replay', async (req: Request, res: Response) => {
  try {
    const { pattern } = req.body;
    if (!pattern) {
      return res.status(400).json({
        success: false,
        error: 'Pattern is required',
      });
    }

    const result = await clickWatcher.replaySequence(pattern);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /click-watcher/history
 * Get click history
 */
router.get('/history', (req: Request, res: Response) => {
  try {
    const history = clickWatcher.getClickHistory();
    res.json({
      success: true,
      history,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /click-watcher/learned
 * Get all learned sequences
 */
router.get('/learned', (req: Request, res: Response) => {
  try {
    const learned = clickWatcher.getAllLearned();
    res.json({
      success: true,
      learned,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;

