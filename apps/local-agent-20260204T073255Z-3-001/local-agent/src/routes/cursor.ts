/**
 * Cursor IDE Integration API Routes
 * Allows Local Agent to be a genius at using Cursor IDE
 */

import { Router, Request, Response } from 'express';
import { cursorIntegration } from '../cursor-integration.js';

const router = Router();

/**
 * POST /cursor/read
 * Read a file (like Cursor)
 */
router.post('/read', async (req: Request, res: Response) => {
  try {
    const { filePath } = req.body;
    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: 'File path is required',
      });
    }

    const result = await cursorIntegration.readFile(filePath);
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
 * POST /cursor/write
 * Write/edit a file (like Cursor)
 */
router.post('/write', async (req: Request, res: Response) => {
  try {
    const { filePath, content } = req.body;
    if (!filePath || !content) {
      return res.status(400).json({
        success: false,
        error: 'File path and content are required',
      });
    }

    const result = await cursorIntegration.writeFile(filePath, content);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /cursor/edit
 * Edit file (find and replace)
 */
router.post('/edit', async (req: Request, res: Response) => {
  try {
    const { filePath, oldString, newString } = req.body;
    if (!filePath || !oldString || !newString) {
      return res.status(400).json({
        success: false,
        error: 'File path, oldString, and newString are required',
      });
    }

    const result = await cursorIntegration.editFile(filePath, oldString, newString);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /cursor/search
 * Search codebase (like Cursor search)
 */
router.post('/search', async (req: Request, res: Response) => {
  try {
    const { query, filePattern } = req.body;
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required',
      });
    }

    const result = await cursorIntegration.searchCodebase(query, filePattern);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      results: [],
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /cursor/context
 * Understand code context (like Cursor AI)
 */
router.post('/context', async (req: Request, res: Response) => {
  try {
    const { filePath } = req.body;
    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: 'File path is required',
      });
    }

    const result = await cursorIntegration.understandContext(filePath);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      context: null,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /cursor/create
 * Create file with AI understanding
 */
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { filePath, instruction } = req.body;
    if (!filePath || !instruction) {
      return res.status(400).json({
        success: false,
        error: 'File path and instruction are required',
      });
    }

    const result = await cursorIntegration.createFileWithContext(filePath, instruction);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /cursor/smart
 * Smart code operation - understands natural language
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

    const result = await cursorIntegration.smartCodeOperation(instruction);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;

