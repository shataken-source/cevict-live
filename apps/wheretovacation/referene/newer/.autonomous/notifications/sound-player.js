/**
 * Sound Notification System
 * Plays sounds when user attention is needed
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

class SoundPlayer {
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    this.soundFile = options.soundFile || path.join(__dirname, '../assets/hey-stupid.mp3');
    this.duration = options.duration || 4000; // 4 seconds
    this.platform = process.platform;
  }

  /**
   * Play a sound file
   */
  async playSound(filePath = null, duration = null) {
    if (!this.enabled) {
      console.log('[SOUND] Sound notifications disabled');
      return;
    }

    const soundFile = filePath || this.soundFile;
    const playDuration = duration || this.duration;

    // Check if file exists
    if (!fs.existsSync(soundFile)) {
      console.warn(`[SOUND] Sound file not found: ${soundFile}, using system beep`);
      return this.playBeep();
    }

    try {
      if (this.platform === 'win32') {
        // Windows: Use PowerShell to play sound
        await this.playWindowsSound(soundFile, playDuration);
      } else if (this.platform === 'darwin') {
        // macOS: Use afplay
        await this.playMacSound(soundFile, playDuration);
      } else {
        // Linux: Use aplay or paplay
        await this.playLinuxSound(soundFile, playDuration);
      }
    } catch (error) {
      console.error('[SOUND] Failed to play sound:', error.message);
      this.playBeep();
    }
  }

  /**
   * Play sound on Windows
   */
  async playWindowsSound(filePath, duration) {
    return new Promise((resolve, reject) => {
      // Use PowerShell to play WAV/MP3
      const command = `powershell -Command "Add-Type -AssemblyName presentationCore; $mediaPlayer = New-Object system.windows.media.mediaplayer; $mediaPlayer.open([uri]'${filePath.replace(/\\/g, '/')}'); $mediaPlayer.Play(); Start-Sleep -Milliseconds ${duration}; $mediaPlayer.Stop()"`;
      
      exec(command, (error) => {
        if (error) {
          // Fallback to beep
          this.playBeep();
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Play sound on macOS
   */
  async playMacSound(filePath, duration) {
    return new Promise((resolve, reject) => {
      exec(`afplay "${filePath}" &`, (error) => {
        if (error) {
          this.playBeep();
          reject(error);
        } else {
          setTimeout(resolve, duration);
        }
      });
    });
  }

  /**
   * Play sound on Linux
   */
  async playLinuxSound(filePath, duration) {
    return new Promise((resolve, reject) => {
      // Try paplay first, then aplay
      exec(`paplay "${filePath}" || aplay "${filePath}"`, (error) => {
        if (error) {
          this.playBeep();
          reject(error);
        } else {
          setTimeout(resolve, duration);
        }
      });
    });
  }

  /**
   * Play system beep (fallback)
   */
  playBeep() {
    if (this.platform === 'win32') {
      // Windows: Use PowerShell beep
      exec('powershell -Command "[console]::beep(800,500)"');
    } else {
      // Unix: Use system beep
      exec('echo -e "\\a"');
    }
  }

  /**
   * Play multiple beeps (attention grabber)
   */
  playAttentionBeep(count = 3) {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        this.playBeep();
      }, i * 200);
    }
  }

  /**
   * Notify that user attention is needed
   */
  async notifyUserNeeded(reason = 'User attention required') {
    console.log(`[NOTIFICATION] ${reason}`);
    await this.playSound();
    this.playAttentionBeep(3);
  }

  /**
   * Notify that operation finished
   */
  async notifyFinished(message = 'Operation completed') {
    console.log(`[NOTIFICATION] ${message}`);
    if (this.enabled) {
      // Single beep for completion
      this.playBeep();
    }
  }

  /**
   * Notify of error
   */
  async notifyError(error) {
    console.error(`[NOTIFICATION] Error: ${error.message}`);
    this.playAttentionBeep(5);
  }

  /**
   * Notify that code is frozen
   */
  async notifyFrozen() {
    console.error('[NOTIFICATION] Code appears frozen!');
    this.playAttentionBeep(10);
    await this.playSound(null, 6000); // Longer sound for frozen
  }
}

module.exports = SoundPlayer;












