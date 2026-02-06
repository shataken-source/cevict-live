/**
 * Cookie Manager
 * 
 * Saves and loads Playwright cookies for multi-account support
 */

const fs = require('fs');
const path = require('path');
const { resolveProjectPath } = require('../config/loader');

class CookieManager {
  /**
   * Save cookies to file
   * @param {string} cookiesPath - Path to cookies file (relative or absolute)
   * @param {Array} cookies - Playwright cookies array
   */
  static async saveCookies(cookiesPath, cookies) {
    const absolutePath = resolveProjectPath(cookiesPath);
    const dir = path.dirname(absolutePath);
    
    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    try {
      fs.writeFileSync(absolutePath, JSON.stringify(cookies, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error(`Failed to save cookies to ${absolutePath}:`, error.message);
      return false;
    }
  }

  /**
   * Load cookies from file
   * @param {string} cookiesPath - Path to cookies file (relative or absolute)
   * @returns {Array|null} Cookies array or null if not found/invalid
   */
  static loadCookies(cookiesPath) {
    const absolutePath = resolveProjectPath(cookiesPath);
    
    if (!fs.existsSync(absolutePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(absolutePath, 'utf8');
      const cookies = JSON.parse(content);
      
      // Validate it's an array
      if (!Array.isArray(cookies)) {
        console.error(`Invalid cookies file format: ${absolutePath}`);
        return null;
      }

      return cookies;
    } catch (error) {
      console.error(`Failed to load cookies from ${absolutePath}:`, error.message);
      return null;
    }
  }

  /**
   * Check if cookies file exists
   * @param {string} cookiesPath - Path to cookies file
   * @returns {boolean}
   */
  static hasCookies(cookiesPath) {
    const absolutePath = resolveProjectPath(cookiesPath);
    return fs.existsSync(absolutePath);
  }
}

module.exports = CookieManager;
