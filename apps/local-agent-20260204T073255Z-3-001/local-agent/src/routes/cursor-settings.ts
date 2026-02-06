/**
 * Cursor IDE Settings API Routes
 */

import { Router, Request, Response } from 'express';
import { cursorSettings } from '../cursor-settings.js';

const router = Router();

/**
 * POST /cursor-settings/auto-accept
 * Configure Cursor to auto-accept AI suggestions
 */
router.post('/auto-accept', async (req: Request, res: Response) => {
  try {
    const result = await cursorSettings.configureAutoAccept();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /cursor-settings/disable-button
 * Disable accept button (don't show it)
 */
router.post('/disable-button', async (req: Request, res: Response) => {
  try {
    const result = await cursorSettings.disableAcceptButton();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /cursor-settings/current
 * Get current Cursor settings
 */
router.get('/current', async (req: Request, res: Response) => {
  try {
    const result = cursorSettings.getCurrentSettings();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      settings: {},
      path: '',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /cursor-settings/reset
 * Reset to default (show accept button)
 */
router.post('/reset', async (req: Request, res: Response) => {
  try {
    const result = await cursorSettings.resetToDefault();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;

