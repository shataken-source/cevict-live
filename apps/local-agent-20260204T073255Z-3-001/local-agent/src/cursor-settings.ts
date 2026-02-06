/**
 * Cursor IDE Settings Configuration
 * Auto-accept AI suggestions or disable accept button
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class CursorSettings {
  private settingsPath: string;

  constructor() {
    const platform = os.platform();
    if (platform === 'win32') {
      // Windows: %APPDATA%\Cursor\User\settings.json
      this.settingsPath = path.join(
        process.env.APPDATA || '',
        'Cursor',
        'User',
        'settings.json'
      );
    } else if (platform === 'linux') {
      // Linux: ~/.config/Cursor/User/settings.json
      this.settingsPath = path.join(
        os.homedir(),
        '.config',
        'Cursor',
        'User',
        'settings.json'
      );
    } else {
      // macOS: ~/Library/Application Support/Cursor/User/settings.json
      this.settingsPath = path.join(
        os.homedir(),
        'Library',
        'Application Support',
        'Cursor',
        'User',
        'settings.json'
      );
    }
  }

  /**
   * Configure Cursor to auto-accept AI suggestions
   */
  async configureAutoAccept(): Promise<{
    success: boolean;
    message: string;
    error?: string;
  }> {
    try {
      // Read existing settings
      let settings: any = {};
      if (fs.existsSync(this.settingsPath)) {
        const content = fs.readFileSync(this.settingsPath, 'utf-8');
        settings = JSON.parse(content);
      }

      // Configure auto-accept settings
      settings['cursor.ai.autoAccept'] = true;
      settings['cursor.ai.autoApply'] = true;
      settings['cursor.ai.showAcceptButton'] = false;
      settings['cursor.ai.autoAcceptDelay'] = 0;
      settings['cursor.ai.confirmBeforeAccept'] = false;
      
      // Alternative settings (depending on Cursor version)
      settings['cursor.general.autoAcceptSuggestions'] = true;
      settings['cursor.general.showAcceptButton'] = false;
      settings['cursor.editor.autoAccept'] = true;
      settings['cursor.editor.autoApply'] = true;

      // Write settings
      const dir = path.dirname(this.settingsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(
        this.settingsPath,
        JSON.stringify(settings, null, 2),
        'utf-8'
      );

      return {
        success: true,
        message: `✅ Cursor settings configured! Auto-accept enabled. Settings file: ${this.settingsPath}\n\nYou may need to restart Cursor IDE for changes to take effect.`,
      };
    } catch (error: any) {
      return {
        success: false,
        message: '',
        error: `Failed to configure Cursor settings: ${error.message}\n\nSettings path: ${this.settingsPath}\n\nYou can manually edit this file or open Cursor Settings (Ctrl+,) and search for "auto accept"`,
      };
    }
  }

  /**
   * Disable accept button (don't show it at all)
   */
  async disableAcceptButton(): Promise<{
    success: boolean;
    message: string;
    error?: string;
  }> {
    try {
      let settings: any = {};
      if (fs.existsSync(this.settingsPath)) {
        const content = fs.readFileSync(this.settingsPath, 'utf-8');
        settings = JSON.parse(content);
      }

      // Hide accept button
      settings['cursor.ai.showAcceptButton'] = false;
      settings['cursor.ai.showRejectButton'] = false;
      settings['cursor.general.showAcceptButton'] = false;
      settings['cursor.editor.showAcceptButton'] = false;
      
      // Auto-apply instead
      settings['cursor.ai.autoApply'] = true;
      settings['cursor.editor.autoApply'] = true;

      const dir = path.dirname(this.settingsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(
        this.settingsPath,
        JSON.stringify(settings, null, 2),
        'utf-8'
      );

      return {
        success: true,
        message: `✅ Accept button disabled! Suggestions will auto-apply. Settings file: ${this.settingsPath}\n\nYou may need to restart Cursor IDE for changes to take effect.`,
      };
    } catch (error: any) {
      return {
        success: false,
        message: '',
        error: `Failed to disable accept button: ${error.message}`,
      };
    }
  }

  /**
   * Get current settings
   */
  getCurrentSettings(): {
    success: boolean;
    settings: any;
    path: string;
    error?: string;
  } {
    try {
      if (!fs.existsSync(this.settingsPath)) {
        return {
          success: false,
          settings: {},
          path: this.settingsPath,
          error: 'Settings file does not exist',
        };
      }

      const content = fs.readFileSync(this.settingsPath, 'utf-8');
      const settings = JSON.parse(content);

      return {
        success: true,
        settings,
        path: this.settingsPath,
      };
    } catch (error: any) {
      return {
        success: false,
        settings: {},
        path: this.settingsPath,
        error: error.message,
      };
    }
  }

  /**
   * Reset to default (show accept button)
   */
  async resetToDefault(): Promise<{
    success: boolean;
    message: string;
    error?: string;
  }> {
    try {
      let settings: any = {};
      if (fs.existsSync(this.settingsPath)) {
        const content = fs.readFileSync(this.settingsPath, 'utf-8');
        settings = JSON.parse(content);
      }

      // Reset to defaults
      delete settings['cursor.ai.autoAccept'];
      delete settings['cursor.ai.autoApply'];
      delete settings['cursor.ai.showAcceptButton'];
      delete settings['cursor.ai.autoAcceptDelay'];
      delete settings['cursor.ai.confirmBeforeAccept'];
      delete settings['cursor.general.autoAcceptSuggestions'];
      delete settings['cursor.general.showAcceptButton'];
      delete settings['cursor.editor.autoAccept'];
      delete settings['cursor.editor.autoApply'];
      delete settings['cursor.editor.showAcceptButton'];

      const dir = path.dirname(this.settingsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(
        this.settingsPath,
        JSON.stringify(settings, null, 2),
        'utf-8'
      );

      return {
        success: true,
        message: `✅ Settings reset to default. Accept button will show again.`,
      };
    } catch (error: any) {
      return {
        success: false,
        message: '',
        error: error.message,
      };
    }
  }
}

export const cursorSettings = new CursorSettings();

