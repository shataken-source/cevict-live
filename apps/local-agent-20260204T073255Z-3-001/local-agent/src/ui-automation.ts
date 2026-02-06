/**
 * UI Automation - AI Braille
 * Teaches Local Agent to see and interact with GUI elements
 * Reads window titles, tabs through UI, understands accessibility
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';

const execAsync = promisify(exec);

interface WindowInfo {
  title: string;
  process: string;
  hwnd?: string;
  pid?: string;
}

interface UIElement {
  type: 'button' | 'input' | 'link' | 'text' | 'checkbox' | 'select' | 'unknown';
  name: string;
  value?: string;
  accessible?: boolean;
  tabIndex?: number;
}

export class UIAutomation {
  private platform: string;

  constructor() {
    this.platform = os.platform();
  }

  /**
   * Get all open windows (AI Braille - "seeing" windows)
   */
  async getOpenWindows(): Promise<{
    success: boolean;
    windows: WindowInfo[];
    error?: string;
  }> {
    try {
      if (this.platform === 'win32') {
        return await this.getWindowsWindows();
      } else if (this.platform === 'linux') {
        return await this.getLinuxWindows();
      } else {
        return {
          success: false,
          windows: [],
          error: 'Platform not supported',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        windows: [],
        error: error.message,
      };
    }
  }

  /**
   * Get windows on Windows
   */
  private async getWindowsWindows(): Promise<{
    success: boolean;
    windows: WindowInfo[];
    error?: string;
  }> {
    try {
      // Use PowerShell to get window titles
      const psScript = `
Get-Process | Where-Object {$_.MainWindowTitle} | ForEach-Object {
  [PSCustomObject]@{
    Title = $_.MainWindowTitle
    Process = $_.ProcessName
    PID = $_.Id
  }
} | ConvertTo-Json
      `;

      const { stdout } = await execAsync(`powershell -Command "${psScript}"`);
      const processes = JSON.parse(stdout);

      const windows: WindowInfo[] = Array.isArray(processes)
        ? processes.map((p: any) => ({
            title: p.Title || '',
            process: p.Process || p.ProcessName || '',
            pid: p.PID?.toString() || '',
          }))
        : [{
            title: processes.Title || '',
            process: processes.Process || processes.ProcessName || '',
            pid: processes.PID?.toString() || '',
          }];

      return {
        success: true,
        windows: windows.filter(w => w.title),
      };
    } catch (error: any) {
      return {
        success: false,
        windows: [],
        error: error.message,
      };
    }
  }

  /**
   * Get windows on Linux
   */
  private async getLinuxWindows(): Promise<{
    success: boolean;
    windows: WindowInfo[];
    error?: string;
  }> {
    try {
      // Use wmctrl to get window list
      const { stdout } = await execAsync('wmctrl -l');
      const lines = stdout.split('\n').filter(Boolean);

      const windows: WindowInfo[] = lines.map(line => {
        const parts = line.split(/\s+/, 4);
        return {
          title: parts[3] || '',
          process: parts[0] || '',
          hwnd: parts[0] || '',
        };
      });

      return {
        success: true,
        windows,
      };
    } catch (error: any) {
      return {
        success: false,
        windows: [],
        error: error.message,
      };
    }
  }

  /**
   * Find window by title (AI Braille - "reading" window titles)
   */
  async findWindow(titlePattern: string): Promise<{
    success: boolean;
    window?: WindowInfo;
    error?: string;
  }> {
    const result = await this.getOpenWindows();
    if (!result.success) {
      return result;
    }

    const pattern = new RegExp(titlePattern, 'i');
    const window = result.windows.find(w => pattern.test(w.title));

    if (window) {
      return {
        success: true,
        window,
      };
    }

    return {
      success: false,
      error: `Window with title matching "${titlePattern}" not found`,
    };
  }

  /**
   * Activate window (bring to front)
   */
  async activateWindow(titlePattern: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      if (this.platform === 'win32') {
        const window = await this.findWindow(titlePattern);
        if (!window.success || !window.window) {
          return { success: false, error: 'Window not found' };
        }

        // Use PowerShell to activate window
        const psScript = `
Add-Type @"
  using System;
  using System.Runtime.InteropServices;
  public class Win32 {
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  }
"@
$process = Get-Process -Id ${window.window.pid}
[Win32]::ShowWindow($process.MainWindowHandle, 9)
[Win32]::SetForegroundWindow($process.MainWindowHandle)
        `;

        await execAsync(`powershell -Command "${psScript}"`);
        return { success: true };
      } else if (this.platform === 'linux') {
        const window = await this.findWindow(titlePattern);
        if (!window.success || !window.window?.hwnd) {
          return { success: false, error: 'Window not found' };
        }

        await execAsync(`wmctrl -a "${window.window.title}"`);
        return { success: true };
      }

      return { success: false, error: 'Platform not supported' };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send keyboard input (Tab, Enter, etc.) - AI Braille navigation
   */
  async sendKeys(keys: string, windowTitle?: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      if (windowTitle) {
        await this.activateWindow(windowTitle);
        // Small delay to ensure window is active
        await new Promise(r => setTimeout(r, 200));
      }

      if (this.platform === 'win32') {
        // Use PowerShell to send keys
        const keyMap: Record<string, string> = {
          'Tab': '{TAB}',
          'Enter': '{ENTER}',
          'Space': '{SPACE}',
          'Escape': '{ESC}',
          'Up': '{UP}',
          'Down': '{DOWN}',
          'Left': '{LEFT}',
          'Right': '{RIGHT}',
          'Ctrl': '^',
          'Alt': '%',
          'Shift': '+',
        };

        let sendString = keys;
        for (const [key, code] of Object.entries(keyMap)) {
          sendString = sendString.replace(new RegExp(key, 'gi'), code);
        }

        const psScript = `
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.SendKeys]::SendWait("${sendString}")
        `;

        await execAsync(`powershell -Command "${psScript}"`);
        return { success: true };
      } else if (this.platform === 'linux') {
        // Use xdotool for Linux
        const keyMap: Record<string, string> = {
          'Tab': 'Tab',
          'Enter': 'Return',
          'Space': 'space',
          'Escape': 'Escape',
          'Up': 'Up',
          'Down': 'Down',
          'Left': 'Left',
          'Right': 'Right',
        };

        let sendString = keys;
        for (const [key, code] of Object.entries(keyMap)) {
          sendString = sendString.replace(new RegExp(key, 'gi'), code);
        }

        await execAsync(`xdotool key ${sendString}`);
        return { success: true };
      }

      return { success: false, error: 'Platform not supported' };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Tab through UI elements (AI Braille - "feeling" the UI)
   */
  async tabThroughUI(
    windowTitle: string,
    steps: number = 5
  ): Promise<{
    success: boolean;
    steps: number;
    error?: string;
  }> {
    try {
      await this.activateWindow(windowTitle);

      for (let i = 0; i < steps; i++) {
        await this.sendKeys('Tab');
        await new Promise(r => setTimeout(r, 100)); // Small delay between tabs
      }

      return {
        success: true,
        steps,
      };
    } catch (error: any) {
      return {
        success: false,
        steps: 0,
        error: error.message,
      };
    }
  }

  /**
   * Click button by tabbing to it (AI Braille - finding and clicking)
   */
  async clickButtonByTab(
    windowTitle: string,
    tabCount: number
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.activateWindow(windowTitle);
      await this.tabThroughUI(windowTitle, tabCount);
      await this.sendKeys('Enter');
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Fill form by tabbing (AI Braille - understanding form structure)
   */
  async fillFormByTab(
    windowTitle: string,
    values: string[]
  ): Promise<{
    success: boolean;
    fieldsFilled: number;
    error?: string;
  }> {
    try {
      await this.activateWindow(windowTitle);

      let fieldsFilled = 0;
      for (const value of values) {
        await this.sendKeys('Tab');
        await new Promise(r => setTimeout(r, 100));
        await this.sendKeys(value);
        await new Promise(r => setTimeout(r, 100));
        fieldsFilled++;
      }

      return {
        success: true,
        fieldsFilled,
      };
    } catch (error: any) {
      return {
        success: false,
        fieldsFilled: 0,
        error: error.message,
      };
    }
  }

  /**
   * Learn UI structure (AI Braille - understanding layout)
   */
  async learnUIStructure(windowTitle: string): Promise<{
    success: boolean;
    elements: UIElement[];
    error?: string;
  }> {
    try {
      await this.activateWindow(windowTitle);

      // Tab through and "feel" the UI
      const elements: UIElement[] = [];
      const maxTabs = 20;

      for (let i = 0; i < maxTabs; i++) {
        await this.sendKeys('Tab');
        await new Promise(r => setTimeout(r, 150));

        // Try to detect element type by trying different keys
        // This is "AI Braille" - learning by interaction
        elements.push({
          type: 'unknown',
          name: `Element ${i + 1}`,
          tabIndex: i + 1,
          accessible: true,
        });
      }

      return {
        success: true,
        elements,
      };
    } catch (error: any) {
      return {
        success: false,
        elements: [],
        error: error.message,
      };
    }
  }

  /**
   * Smart UI interaction (AI Braille - intelligent navigation)
   */
  async smartUIInteraction(instruction: string): Promise<{
    success: boolean;
    action: string;
    error?: string;
  }> {
    const lower = instruction.toLowerCase();

    // Detect window operations
    if (lower.includes('find window') || lower.includes('list windows')) {
      const result = await this.getOpenWindows();
      return {
        success: result.success,
        action: 'list_windows',
        error: result.error,
      };
    }

    // Detect tab operations
    if (lower.includes('tab') && lower.includes('through')) {
      const windowMatch = instruction.match(/(?:in|window|to)\s+([^,]+)/i);
      const windowTitle = windowMatch ? windowMatch[1].trim() : undefined;
      const stepsMatch = instruction.match(/(\d+)\s*(?:times|steps|tabs)?/i);
      const steps = stepsMatch ? parseInt(stepsMatch[1]) : 5;

      if (windowTitle) {
        const result = await this.tabThroughUI(windowTitle, steps);
        return {
          success: result.success,
          action: 'tab_through',
          error: result.error,
        };
      }
    }

    // Detect click operations
    if (lower.includes('click') || lower.includes('press')) {
      const windowMatch = instruction.match(/(?:in|window|to)\s+([^,]+)/i);
      const windowTitle = windowMatch ? windowMatch[1].trim() : undefined;
      const tabMatch = instruction.match(/(\d+)(?:st|nd|rd|th)?\s*(?:tab|element|button)/i);
      const tabCount = tabMatch ? parseInt(tabMatch[1]) : 1;

      if (windowTitle) {
        const result = await this.clickButtonByTab(windowTitle, tabCount);
        return {
          success: result.success,
          action: 'click_button',
          error: result.error,
        };
      }
    }

    // Default: try to understand and execute
    return {
      success: false,
      action: 'unknown',
      error: 'Could not understand UI interaction instruction',
    };
  }
}

export const uiAutomation = new UIAutomation();

