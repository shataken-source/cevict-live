/**
 * GUI Controller API Routes
 * Allows AI assistants to control the GUI and execute operations
 */

import { Router, Request, Response } from 'express';
import { guiController } from '../gui-controller.js';
import { guiGenius } from '../gui-genius.js';

const router = Router();

/**
 * POST /gui/execute
 * Execute a command via GUI (defaults to monorepo root)
 */
router.post('/execute', async (req: Request, res: Response) => {
  try {
    const { command, cwd } = req.body;
    const result = await guiController.executeCommand(
      command,
      cwd // If not provided, defaults to monorepo root
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      output: '',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /gui/smart-execute
 * Smart command execution - understands natural language
 */
router.post('/smart-execute', async (req: Request, res: Response) => {
  try {
    const { instruction } = req.body;
    if (!instruction) {
      return res.status(400).json({
        success: false,
        error: 'Instruction is required',
      });
    }

    const result = await guiController.smartExecute(instruction);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      output: '',
      error: error instanceof Error ? error.message : String(error),
      method: 'unknown',
    });
  }
});

/**
 * POST /gui/ai-execute
 * AI-powered execution with learning (GENIUS MODE)
 * Uses Claude to understand intent and learns from results
 */
router.post('/ai-execute', async (req: Request, res: Response) => {
  try {
    const { instruction } = req.body;
    if (!instruction) {
      return res.status(400).json({
        success: false,
        error: 'Instruction is required',
      });
    }

    const result = await guiGenius.executeWithIntelligence(instruction);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      output: '',
      error: error instanceof Error ? error.message : String(error),
      method: 'unknown',
    });
  }
});

/**
 * POST /gui/navigate
 * Navigate to a folder (file manager)
 */
router.post('/navigate', async (req: Request, res: Response) => {
  try {
    const { path } = req.body;
    const result = await guiController.navigateToFolder(
      path || guiController['defaultCwd']
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      files: [],
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /gui/read-file
 * Read a file (file viewer)
 */
router.post('/read-file', async (req: Request, res: Response) => {
  try {
    const { path } = req.body;
    if (!path) {
      return res.status(400).json({
        success: false,
        error: 'File path is required',
      });
    }

    const result = await guiController.readFile(path);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      content: '',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /gui/quick-action
 * Execute a quick action
 */
router.post('/quick-action', async (req: Request, res: Response) => {
  try {
    const { action } = req.body;
    if (!action) {
      return res.status(400).json({
        success: false,
        error: 'Action is required',
      });
    }

    const result = await guiController.executeQuickAction(action);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      output: '',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /gui/status
 * Get GUI controller status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = await guiController.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /gui/learnings
 * Get what the GUI genius has learned
 */
router.get('/learnings', async (req: Request, res: Response) => {
  try {
    const learnings = guiGenius.getLearnings();
    const knowledge = guiGenius.getKnowledge();
    res.json({
      learnings,
      knowledge,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;

