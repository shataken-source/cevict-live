/**
 * Intent Language API Routes
 * Revolutionary human-to-AI communication
 */

import { Router, Request, Response } from 'express';
import { intentLanguage } from '../intent-language.js';
import { intentExecutor } from '../intent-executor.js';

const router = Router();

/**
 * POST /intent/parse
 * Parse human command into Intent
 */
router.post('/parse', (req: Request, res: Response) => {
  try {
    const { command } = req.body;
    if (!command) {
      return res.status(400).json({
        success: false,
        error: 'Command is required',
      });
    }

    const intent = intentLanguage.parse(command);
    const explanation = intentLanguage.explain(intent);

    res.json({
      success: true,
      intent,
      explanation,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /intent/execute
 * Execute intent (the magic happens here)
 */
router.post('/execute', async (req: Request, res: Response) => {
  try {
    const { command } = req.body;
    if (!command) {
      return res.status(400).json({
        success: false,
        error: 'Command is required',
      });
    }

    const result = await intentExecutor.execute(command);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      result: null,
      explanation: '',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /intent/documentation
 * Get Intent Language documentation
 */
router.get('/documentation', (req: Request, res: Response) => {
  try {
    const docs = intentLanguage.getDocumentation();
    res.json({
      success: true,
      ...docs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;

