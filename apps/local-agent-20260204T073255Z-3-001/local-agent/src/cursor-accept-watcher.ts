/**
 * Cursor Accept Button Watcher
 * Automatically clicks Accept button when it appears
 * Uses AI Braille to detect and click
 */

import { uiAutomation } from './ui-automation.js';
import { cursorSettings } from './cursor-settings.js';
import { aiBrailleKeepAll } from './ai-braille-keep-all.js';
import { CronJob } from 'cron';

export class CursorAcceptWatcher {
  private isWatching: boolean = false;
  private checkInterval: NodeJS.Timeout | null = null;
  private lastClickTime: Date = new Date(0);

  /**
   * Start watching for Accept button and auto-click it
   */
  async start(): Promise<void> {
    if (this.isWatching) {
      console.log('⚠️ Accept button watcher already running');
      return;
    }

    console.log('👁️ Starting Cursor Button Watcher (Accept + Keep)...');

    // First, try to configure Cursor settings
    console.log('🔧 Attempting to configure Cursor settings...');
    const settingsResult = await cursorSettings.configureAutoAccept();
    if (settingsResult.success) {
      console.log('✅ Cursor settings configured');
    } else {
      console.log('⚠️ Settings configuration failed, will use auto-click fallback');
    }

    this.isWatching = true;

    // Check every 2 seconds for Accept button
    this.checkInterval = setInterval(async () => {
      await this.checkAndClickAccept();
    }, 2000);

    console.log('✅ Button watcher started - will auto-click Accept, Keep, and Keep All buttons every 2 seconds');
  }

  /**
   * Check for Accept button and click it
   * Also checks for Keep button and clicks it
   */
  private async checkAndClickAccept(): Promise<void> {
    try {
      // Find Cursor window
      const windows = await uiAutomation.getOpenWindows();
      if (!windows.success) return;

      const cursorWindow = windows.windows.find(w => 
        w.title.toLowerCase().includes('cursor') || 
        w.process.toLowerCase().includes('cursor')
      );

      if (!cursorWindow) return;

      // Try to find and click Accept button
      // Method 1: Look for "Accept" text in window title or try common positions
      // Method 2: Tab through and look for Accept button
      
      // Quick method: Try common keyboard shortcuts
      // In Cursor, Accept is often the default action, so we can try:
      // 1. Tab to focus, then Enter
      // 2. Or use Ctrl+Enter (common accept shortcut)
      
      // Since we can't easily detect the button visually, we'll use a smart approach:
      // If there's a Cursor window active, periodically send Tab+Enter to accept any prompts
      
      const now = new Date();
      const timeSinceLastClick = now.getTime() - this.lastClickTime.getTime();
      
      // Only try clicking if it's been at least 3 seconds since last click
      if (timeSinceLastClick > 3000) {
        // Activate Cursor window
        await uiAutomation.activateWindow('cursor');
        
      // Try common accept methods
      // Method 1: Ctrl+Enter (common accept shortcut)
      await uiAutomation.sendKeys('Ctrl+Enter', cursorWindow.title);
      await new Promise(r => setTimeout(r, 100));
      
      // Method 2: Tab then Enter (if button is focused)
      await uiAutomation.sendKeys('Tab', cursorWindow.title);
      await new Promise(r => setTimeout(r, 100));
      await uiAutomation.sendKeys('Enter', cursorWindow.title);
      
      // Method 3: Look for "Keep" button (Tab through to find it)
      // Keep button is often after Accept, so tab a few times
      await new Promise(r => setTimeout(r, 100));
      await uiAutomation.sendKeys('Tab', cursorWindow.title);
      await new Promise(r => setTimeout(r, 100));
      await uiAutomation.sendKeys('Tab', cursorWindow.title);
      await new Promise(r => setTimeout(r, 100));
      await uiAutomation.sendKeys('Enter', cursorWindow.title); // Click Keep
      
      // Method 4: Use AI Braille Keep All specialist
      await new Promise(r => setTimeout(r, 100));
      await aiBrailleKeepAll.clickKeepAll(cursorWindow.title);
      
      // Method 5: Try Escape then Tab to Keep All (sometimes Keep All is default)
      await new Promise(r => setTimeout(r, 100));
      await uiAutomation.sendKeys('Escape', cursorWindow.title);
      await new Promise(r => setTimeout(r, 100));
      await uiAutomation.sendKeys('Tab', cursorWindow.title);
      await new Promise(r => setTimeout(r, 100));
      await uiAutomation.sendKeys('Tab', cursorWindow.title); // Extra tab for Keep All
      await new Promise(r => setTimeout(r, 100));
      await uiAutomation.sendKeys('Enter', cursorWindow.title);
      
      this.lastClickTime = new Date();
      }
    } catch (error) {
      // Silently fail - don't spam errors
    }
  }

  /**
   * Stop watching
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isWatching = false;
    console.log('🛑 Accept button watcher stopped');
  }

  /**
   * Force click Accept button now
   */
  async forceClickAccept(): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const windows = await uiAutomation.getOpenWindows();
      if (!windows.success) {
        return { success: false, error: 'Could not get windows' };
      }

      const cursorWindow = windows.windows.find(w => 
        w.title.toLowerCase().includes('cursor') || 
        w.process.toLowerCase().includes('cursor')
      );

      if (!cursorWindow) {
        return { success: false, error: 'Cursor window not found' };
      }

      // Activate and try to accept
      await uiAutomation.activateWindow(cursorWindow.title);
      await new Promise(r => setTimeout(r, 200));
      
      // Try multiple accept methods
      await uiAutomation.sendKeys('Ctrl+Enter', cursorWindow.title);
      await new Promise(r => setTimeout(r, 100));
      await uiAutomation.sendKeys('Tab', cursorWindow.title);
      await new Promise(r => setTimeout(r, 100));
      await uiAutomation.sendKeys('Enter', cursorWindow.title);
      await new Promise(r => setTimeout(r, 100));
      await uiAutomation.sendKeys('Enter', cursorWindow.title); // Double tap for safety
      
      // Also try to click Keep and Keep All buttons (AI Braille)
      await new Promise(r => setTimeout(r, 100));
      await uiAutomation.sendKeys('Tab', cursorWindow.title); // Tab to Keep
      await new Promise(r => setTimeout(r, 100));
      await uiAutomation.sendKeys('Enter', cursorWindow.title); // Click Keep
      await new Promise(r => setTimeout(r, 100));
      await uiAutomation.sendKeys('Tab', cursorWindow.title); // Tab to Keep All
      await new Promise(r => setTimeout(r, 100));
      await uiAutomation.sendKeys('Enter', cursorWindow.title); // Click Keep All

      this.lastClickTime = new Date();
      
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export const cursorAcceptWatcher = new CursorAcceptWatcher();

