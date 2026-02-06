/**
 * Configuration Loader
 * 
 * Loads config.json and secrets.json with vault path support.
 * Mirrors the pattern from alpha-hunter/src/lib/secret-store.ts
 */

const fs = require('fs');
const path = require('path');

/**
 * Try to read a JSON file, return null if it doesn't exist or is invalid
 */
function tryReadJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Resolve the secrets file path with priority:
 * 1. Explicit TIKTOK_AUTOMATION_SECRETS_PATH env var
 * 2. Default vault path: C:\Cevict_Vault\tiktok-automation.secrets.json
 * 3. Local: config/secrets.json
 */
function resolveSecretsPath() {
  // Priority 1: Explicit path
  const explicitPath = process.env.TIKTOK_AUTOMATION_SECRETS_PATH;
  if (explicitPath && fs.existsSync(explicitPath)) {
    return explicitPath;
  }

  // Priority 2: Default vault path
  const vaultPath = path.join('C:', 'Cevict_Vault', 'tiktok-automation.secrets.json');
  if (fs.existsSync(vaultPath)) {
    return vaultPath;
  }

  // Priority 3: Local config
  const projectRoot = path.resolve(__dirname, '..');
  const localPath = path.join(projectRoot, 'config', 'secrets.json');
  return localPath;
}

/**
 * Load configuration
 * @param {string} configPath - Path to config.json (defaults to config/config.json)
 * @returns {object|null} Configuration object or null if not found
 */
function loadConfig(configPath = null) {
  const projectRoot = path.resolve(__dirname, '..');
  const defaultConfigPath = configPath || path.join(projectRoot, 'config', 'config.json');
  
  const config = tryReadJsonFile(defaultConfigPath);
  
  if (!config) {
    console.error(`⚠️  Config file not found: ${defaultConfigPath}`);
    console.error(`   Create it from config/config.example.json`);
    return null;
  }

  return config;
}

/**
 * Load secrets
 * @returns {object|null} Secrets object or null if not found
 */
function loadSecrets() {
  const secretsPath = resolveSecretsPath();
  const secrets = tryReadJsonFile(secretsPath);

  if (!secrets) {
    console.warn(`⚠️  Secrets file not found: ${secretsPath}`);
    console.warn(`   Create it from config/secrets.example.json`);
    return {};
  }

  return secrets;
}

/**
 * Get account configuration by ID
 * @param {object} config - Full config object
 * @param {string} accountId - Account ID (e.g., "primary")
 * @returns {object|null} Account config or null if not found
 */
function getAccountConfig(config, accountId) {
  if (!config || !config.accounts) {
    return null;
  }

  const account = config.accounts.find(acc => acc.id === accountId);
  if (!account) {
    console.error(`⚠️  Account "${accountId}" not found in config`);
    return null;
  }

  return account;
}

/**
 * Resolve a path relative to project root
 * @param {string} relativePath - Path relative to project root (e.g., "../videos/daily")
 * @returns {string} Absolute path
 */
function resolveProjectPath(relativePath) {
  const projectRoot = path.resolve(__dirname, '..');
  
  // Handle paths starting with ../
  if (relativePath.startsWith('../')) {
    return path.resolve(projectRoot, relativePath);
  }
  
  // Handle absolute paths
  if (path.isAbsolute(relativePath)) {
    return relativePath;
  }
  
  // Handle relative paths
  return path.resolve(projectRoot, relativePath);
}

module.exports = {
  loadConfig,
  loadSecrets,
  getAccountConfig,
  resolveProjectPath,
  resolveSecretsPath,
};
