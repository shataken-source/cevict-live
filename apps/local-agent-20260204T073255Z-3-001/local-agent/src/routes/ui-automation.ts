/**
 * UI Automation API Routes
 * AI Braille - See and interact with GUI
 */

import { Router, Request, Response } from 'express';
import { uiAutomation } from '../ui-automation.js';

const router = Router();

/**
 * GET /ui-automation/windows
 * Get all open windows (AI Braille - "seeing")
 */
router.get('/windows', async (req: Request, res: Response) => {
  try {
    const result = await uiAutomation.getOpenWindows();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      windows: [],
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /ui-automation/find-window
 * Find window by title
 */
router.post('/find-window', async (req: Request, res: Response) => {
  try {
    const { titlePattern } = req.body;
    if (!titlePattern) {
      return res.status(400).json({
        success: false,
        error: 'Title pattern is required',
      });
    }

    const result = await uiAutomation.findWindow(titlePattern);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /ui-automation/activate-window
 * Activate window (bring to front)
 */
router.post('/activate-window', async (req: Request, res: Response) => {
  try {
    const { titlePattern } = req.body;
    if (!titlePattern) {
      return res.status(400).json({
        success: false,
        error: 'Title pattern is required',
      });
    }

    const result = await uiAutomation.activateWindow(titlePattern);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /ui-automation/send-keys
 * Send keyboard input (Tab, Enter, etc.)
 */
router.post('/send-keys', async (req: Request, res: Response) => {
  try {
    const { keys, windowTitle } = req.body;
    if (!keys) {
      return res.status(400).json({
        success: false,
        error: 'Keys are required',
      });
    }

    const result = await uiAutomation.sendKeys(keys, windowTitle);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /ui-automation/tab-through
 * Tab through UI elements (AI Braille)
 */
router.post('/tab-through', async (req: Request, res: Response) => {
  try {
    const { windowTitle, steps } = req.body;
    if (!windowTitle) {
      return res.status(400).json({
        success: false,
        error: 'Window title is required',
      });
    }

    const result = await uiAutomation.tabThroughUI(windowTitle, steps || 5);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      steps: 0,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /ui-automation/click-button
 * Click button by tabbing to it
 */
router.post('/click-button', async (req: Request, res: Response) => {
  try {
    const { windowTitle, tabCount } = req.body;
    if (!windowTitle || tabCount === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Window title and tab count are required',
      });
    }

    const result = await uiAutomation.clickButtonByTab(windowTitle, tabCount);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /ui-automation/fill-form
 * Fill form by tabbing
 */
router.post('/fill-form', async (req: Request, res: Response) => {
  try {
    const { windowTitle, values } = req.body;
    if (!windowTitle || !Array.isArray(values)) {
      return res.status(400).json({
        success: false,
        error: 'Window title and values array are required',
      });
    }

    const result = await uiAutomation.fillFormByTab(windowTitle, values);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      fieldsFilled: 0,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /ui-automation/learn-ui
 * Learn UI structure (AI Braille)
 */
router.post('/learn-ui', async (req: Request, res: Response) => {
  try {
    const { windowTitle } = req.body;
    if (!windowTitle) {
      return res.status(400).json({
        success: false,
        error: 'Window title is required',
      });
    }

    const result = await uiAutomation.learnUIStructure(windowTitle);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      elements: [],
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /ui-automation/smart
 * Smart UI interaction (AI Braille - understands natural language)
 */
router.post('/smart', async (req: Request, res: Response) => {
  try {
    const { instruction } = req.body;
    if (!instruction) {
      return res.status(400).json({
        success: false,
        error: 'Instruction is required',
      });
    }

    const result = await uiAutomation.smartUIInteraction(instruction);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      action: 'unknown',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;

