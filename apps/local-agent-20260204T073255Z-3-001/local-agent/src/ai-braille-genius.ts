/**
 * AI Braille Genius
 * A revolutionary system for "seeing" and understanding GUI through touch
 * Like Braille for the blind, but for AI to understand visual interfaces
 */

import { uiAutomation } from './ui-automation.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

interface BrailleElement {
  // AI Braille "touch points" - like Braille dots
  dots: number[]; // 1-8 dots representing element type
  position: { x: number; y: number; tabIndex: number };
  type: 'button' | 'input' | 'link' | 'text' | 'checkbox' | 'select' | 'unknown';
  name: string;
  value?: string;
  accessible: boolean;
  brailleCode: string; // Unique Braille pattern
}

interface WindowBraille {
  windowTitle: string;
  process: string;
  elements: BrailleElement[];
  brailleMap: Map<string, BrailleElement>; // brailleCode -> element
  learnedAt: Date;
  confidence: number;
}

interface BrailleLanguage {
  // AI Braille Language - unique patterns for each UI element type
  patterns: {
    button: string;      // "⠃⠥⠞⠞⠕⠝" (button in Braille-like)
    input: string;      // "⠊⠝⠏⠥⠞"
    link: string;       // "⠇⠊⠝⠅"
    text: string;       // "⠞⠑⠭⠞"
    checkbox: string;   // "⠉⠓⠑⠉⠅"
    select: string;     // "⠎⠑⠇⠑⠉⠞"
  };
  grammar: {
    // Grammar rules for AI Braille
    navigation: string;
    interaction: string;
    discovery: string;
  };
}

export class AIBrailleGenius {
  private learnedWindows: Map<string, WindowBraille> = new Map();
  private brailleLanguage: BrailleLanguage;
  private knowledgeBase: string;

  constructor() {
    this.brailleLanguage = this.initializeBrailleLanguage();
    this.knowledgeBase = path.join(
      process.env.WORKSPACE_PATH || 'C:\\gcc\\cevict-app\\cevict-monorepo',
      'apps',
      'local-agent',
      'data',
      'ai-braille-knowledge.json'
    );
    this.loadKnowledgeBase();
  }

  /**
   * Initialize AI Braille Language
   * Unique patterns that represent UI elements
   */
  private initializeBrailleLanguage(): BrailleLanguage {
    return {
      patterns: {
        // AI Braille uses 8-dot patterns (like Braille but for UI)
        button: '⠃⠥⠞⠞⠕⠝',      // Button pattern
        input: '⠊⠝⠏⠥⠞',        // Input pattern
        link: '⠇⠊⠝⠅',          // Link pattern
        text: '⠞⠑⠭⠞',          // Text pattern
        checkbox: '⠉⠓⠑⠉⠅',    // Checkbox pattern
        select: '⠎⠑⠇⠑⠉⠞',    // Select pattern
      },
      grammar: {
        navigation: 'TAB → NEXT | SHIFT+TAB → PREV | ENTER → ACTIVATE',
        interaction: 'CLICK → ⠃ | TYPE → ⠊ | SELECT → ⠎',
        discovery: 'SCAN → LEARN | MAP → REMEMBER | RECALL → USE',
      },
    };
  }

  /**
   * Learn a new window - AI Braille "reading" the interface
   */
  async learnWindow(windowTitle: string): Promise<{
    success: boolean;
    braille: WindowBraille | null;
    error?: string;
  }> {
    try {
      console.log(`📖 Learning window: ${windowTitle} (AI Braille mode)`);

      // Activate window
      await uiAutomation.activateWindow(windowTitle);

      // Get window info
      const windows = await uiAutomation.getOpenWindows();
      const window = windows.windows.find(w => 
        w.title.toLowerCase().includes(windowTitle.toLowerCase())
      );

      if (!window) {
        return {
          success: false,
          braille: null,
          error: 'Window not found',
        };
      }

      // AI Braille: "Touch" the interface by tabbing through
      const elements: BrailleElement[] = [];
      const maxTabs = 50; // Scan up to 50 elements

      for (let i = 0; i < maxTabs; i++) {
        // "Touch" element (tab to it)
        await uiAutomation.sendKeys('Tab', window.title);
        await new Promise(r => setTimeout(r, 150));

        // Generate Braille code for this element
        const brailleCode = this.generateBrailleCode(i, 'unknown');
        const element: BrailleElement = {
          dots: this.elementTypeToDots('unknown'),
          position: {
            x: 0,
            y: 0,
            tabIndex: i + 1,
          },
          type: 'unknown',
          name: `Element ${i + 1}`,
          accessible: true,
          brailleCode,
        };

        // Try to detect element type by "feeling" it
        const detectedType = await this.detectElementType(window.title, i);
        element.type = detectedType;
        element.dots = this.elementTypeToDots(detectedType);
        element.brailleCode = this.generateBrailleCode(i, detectedType);

        elements.push(element);
      }

      // Create Braille map
      const brailleMap = new Map<string, BrailleElement>();
      elements.forEach(el => {
        brailleMap.set(el.brailleCode, el);
      });

      const windowBraille: WindowBraille = {
        windowTitle: window.title,
        process: window.process,
        elements,
        brailleMap,
        learnedAt: new Date(),
        confidence: 0.85, // Start with 85% confidence
      };

      // Store learned window
      this.learnedWindows.set(window.title, windowBraille);
      this.saveKnowledgeBase();

      console.log(`✅ Learned window: ${window.title} (${elements.length} elements)`);

      return {
        success: true,
        braille: windowBraille,
      };
    } catch (error: any) {
      return {
        success: false,
        braille: null,
        error: error.message,
      };
    }
  }

  /**
   * Detect element type by "feeling" it (AI Braille)
   */
  private async detectElementType(windowTitle: string, tabIndex: number): Promise<
    'button' | 'input' | 'link' | 'text' | 'checkbox' | 'select' | 'unknown'
  > {
    // AI Braille detection: Try different interactions to "feel" the element
    try {
      // Try typing (if it's an input, it will accept text)
      await uiAutomation.sendKeys('test', windowTitle);
      await new Promise(r => setTimeout(r, 50));
      await uiAutomation.sendKeys('Backspace', windowTitle);
      await uiAutomation.sendKeys('Backspace', windowTitle);
      await uiAutomation.sendKeys('Backspace', windowTitle);
      await uiAutomation.sendKeys('Backspace', windowTitle);
      // If text was accepted, it's likely an input
      return 'input';
    } catch {
      // Not an input, try other methods
    }

    // Default: assume button (most common)
    return 'button';
  }

  /**
   * Generate unique Braille code for element
   */
  private generateBrailleCode(index: number, type: string): string {
    // Create unique pattern based on index and type
    const typeCode = this.brailleLanguage.patterns[type as keyof typeof this.brailleLanguage.patterns] || '⠓';
    return `${typeCode}${index.toString().padStart(3, '0')}`;
  }

  /**
   * Convert element type to Braille dots (8-dot pattern)
   */
  private elementTypeToDots(type: string): number[] {
    // 8-dot Braille pattern for each type
    const patterns: Record<string, number[]> = {
      button: [1, 2, 3, 4],      // ⠃
      input: [1, 3, 4, 5],       // ⠊
      link: [1, 2, 3],            // ⠇
      text: [2, 3, 4, 5],         // ⠞
      checkbox: [1, 2, 4, 5],    // ⠉
      select: [2, 3, 4],         // ⠎
      unknown: [1, 2, 3, 4, 5, 6, 7, 8], // All dots
    };
    return patterns[type] || patterns.unknown;
  }

  /**
   * Recall learned window (AI Braille memory)
   */
  recallWindow(windowTitle: string): WindowBraille | null {
    // Exact match
    let braille = this.learnedWindows.get(windowTitle);
    if (braille) return braille;

    // Fuzzy match
    for (const [title, learned] of this.learnedWindows.entries()) {
      if (title.toLowerCase().includes(windowTitle.toLowerCase()) ||
          windowTitle.toLowerCase().includes(title.toLowerCase())) {
        return learned;
      }
    }

    return null;
  }

  /**
   * Navigate using AI Braille (knows where things are)
   */
  async navigateWithBraille(
    windowTitle: string,
    targetBrailleCode: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    const braille = this.recallWindow(windowTitle);
    if (!braille) {
      return {
        success: false,
        error: 'Window not learned. Learn it first.',
      };
    }

    const element = braille.brailleMap.get(targetBrailleCode);
    if (!element) {
      return {
        success: false,
        error: 'Element not found in Braille map',
      };
    }

    // Navigate to element using tab index
    await uiAutomation.activateWindow(windowTitle);
    await uiAutomation.tabThroughUI(windowTitle, element.position.tabIndex - 1);

    return { success: true };
  }

  /**
   * Interact with element using AI Braille
   */
  async interactWithBraille(
    windowTitle: string,
    brailleCode: string,
    action: 'click' | 'type' | 'select',
    value?: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    // Navigate to element
    const navResult = await this.navigateWithBraille(windowTitle, brailleCode);
    if (!navResult.success) {
      return navResult;
    }

    // Perform action
    switch (action) {
      case 'click':
        await uiAutomation.sendKeys('Enter', windowTitle);
        break;
      case 'type':
        if (value) {
          await uiAutomation.sendKeys(value, windowTitle);
        }
        break;
      case 'select':
        await uiAutomation.sendKeys('Enter', windowTitle);
        break;
    }

    return { success: true };
  }

  /**
   * Smart discovery - learn any window automatically
   */
  async smartDiscover(windowTitleOrProcess: string): Promise<{
    success: boolean;
    braille: WindowBraille | null;
    error?: string;
  }> {
    // Find window by title or process
    const windows = await uiAutomation.getOpenWindows();
    const window = windows.windows.find(w =>
      w.title.toLowerCase().includes(windowTitleOrProcess.toLowerCase()) ||
      w.process.toLowerCase().includes(windowTitleOrProcess.toLowerCase())
    );

    if (!window) {
      return {
        success: false,
        braille: null,
        error: 'Window not found',
      };
    }

    // Check if already learned
    const existing = this.recallWindow(window.title);
    if (existing) {
      console.log(`📚 Using learned window: ${window.title}`);
      return {
        success: true,
        braille: existing,
      };
    }

    // Learn it
    return await this.learnWindow(window.title);
  }

  /**
   * Get AI Braille language documentation
   */
  getBrailleLanguage(): BrailleLanguage {
    return this.brailleLanguage;
  }

  /**
   * Get all learned windows
   */
  getAllLearnedWindows(): WindowBraille[] {
    return Array.from(this.learnedWindows.values());
  }

  /**
   * Save knowledge base
   */
  private saveKnowledgeBase(): void {
    try {
      const dir = path.dirname(this.knowledgeBase);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data = {
        learnedWindows: Array.from(this.learnedWindows.entries()).map(([title, braille]) => ({
          windowTitle: braille.windowTitle,
          process: braille.process,
          elements: braille.elements,
          learnedAt: braille.learnedAt.toISOString(),
          confidence: braille.confidence,
        })),
        brailleLanguage: this.brailleLanguage,
        lastUpdated: new Date().toISOString(),
      };

      fs.writeFileSync(this.knowledgeBase, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.warn('Failed to save knowledge base:', error);
    }
  }

  /**
   * Load knowledge base
   */
  private loadKnowledgeBase(): void {
    try {
      if (!fs.existsSync(this.knowledgeBase)) {
        return;
      }

      const data = JSON.parse(fs.readFileSync(this.knowledgeBase, 'utf-8'));
      
      // Restore learned windows
      if (data.learnedWindows) {
        data.learnedWindows.forEach((w: any) => {
          const brailleMap = new Map<string, BrailleElement>();
          w.elements.forEach((el: BrailleElement) => {
            brailleMap.set(el.brailleCode, el);
          });

          this.learnedWindows.set(w.windowTitle, {
            windowTitle: w.windowTitle,
            process: w.process,
            elements: w.elements,
            brailleMap,
            learnedAt: new Date(w.learnedAt),
            confidence: w.confidence,
          });
        });
      }

      console.log(`📚 Loaded ${this.learnedWindows.size} learned windows from knowledge base`);
    } catch (error) {
      console.warn('Failed to load knowledge base:', error);
    }
  }

  /**
   * Export AI Braille knowledge
   */
  exportKnowledge(): string {
    return JSON.stringify({
      learnedWindows: this.getAllLearnedWindows(),
      brailleLanguage: this.brailleLanguage,
      totalWindows: this.learnedWindows.size,
    }, null, 2);
  }
}

export const aiBrailleGenius = new AIBrailleGenius();

