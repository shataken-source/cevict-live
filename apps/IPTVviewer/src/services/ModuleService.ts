import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Module {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  enabled: boolean;
  config: Record<string, any>;
  entryPoint: string; // Path to module code
  permissions: string[];
  installedAt: Date;
  updatedAt: Date;
}

export interface ModuleManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  entryPoint: string;
  permissions: string[];
  config?: Record<string, any>;
}

const MODULES_STORAGE_KEY = '@nexttv_modules';

export class ModuleService {
  private static modules: Map<string, Module> = new Map();
  private static initialized = false;

  /**
   * Initialize the module system
   * Loads all installed modules from storage
   */
  static async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const stored = await AsyncStorage.getItem(MODULES_STORAGE_KEY);
      if (stored) {
        const modulesArray: Module[] = JSON.parse(stored);
        modulesArray.forEach(mod => {
          // Convert date strings back to Date objects
          mod.installedAt = new Date(mod.installedAt);
          mod.updatedAt = new Date(mod.updatedAt);
          this.modules.set(mod.id, mod);
        });
      }
      this.initialized = true;
      console.log(`Module system initialized with ${this.modules.size} modules`);
    } catch (error) {
      console.error('Failed to initialize module system:', error);
      throw error;
    }
  }

  /**
   * Install a new module from a manifest
   */
  static async installModule(manifest: ModuleManifest, moduleCode: string): Promise<Module> {
    await this.initialize();

    const moduleId = `${manifest.name}-${manifest.version}`.toLowerCase().replace(/\s+/g, '-');
    
    if (this.modules.has(moduleId)) {
      throw new Error(`Module ${manifest.name} v${manifest.version} is already installed`);
    }

    const now = new Date();
    const module: Module = {
      id: moduleId,
      name: manifest.name,
      description: manifest.description,
      version: manifest.version,
      author: manifest.author,
      enabled: true,
      config: manifest.config || {},
      entryPoint: manifest.entryPoint,
      permissions: manifest.permissions,
      installedAt: now,
      updatedAt: now,
    };

    // Store module code (in production, this would be more secure)
    await AsyncStorage.setItem(`@nexttv_module_code_${moduleId}`, moduleCode);

    this.modules.set(moduleId, module);
    await this.saveModules();

    console.log(`Module installed: ${module.name} v${module.version}`);
    return module;
  }

  /**
   * Uninstall a module
   */
  static async uninstallModule(moduleId: string): Promise<void> {
    await this.initialize();

    if (!this.modules.has(moduleId)) {
      throw new Error(`Module ${moduleId} not found`);
    }

    this.modules.delete(moduleId);
    await AsyncStorage.removeItem(`@nexttv_module_code_${moduleId}`);
    await this.saveModules();

    console.log(`Module uninstalled: ${moduleId}`);
  }

  /**
   * Enable or disable a module
   */
  static async setModuleEnabled(moduleId: string, enabled: boolean): Promise<void> {
    await this.initialize();

    const module = this.modules.get(moduleId);
    if (!module) {
      throw new Error(`Module ${moduleId} not found`);
    }

    module.enabled = enabled;
    module.updatedAt = new Date();
    await this.saveModules();

    console.log(`Module ${moduleId} ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Update module configuration
   */
  static async updateModuleConfig(
    moduleId: string,
    config: Record<string, any>
  ): Promise<void> {
    await this.initialize();

    const module = this.modules.get(moduleId);
    if (!module) {
      throw new Error(`Module ${moduleId} not found`);
    }

    module.config = { ...module.config, ...config };
    module.updatedAt = new Date();
    await this.saveModules();

    console.log(`Module ${moduleId} config updated`);
  }

  /**
   * Get all installed modules
   */
  static async getAllModules(): Promise<Module[]> {
    await this.initialize();
    return Array.from(this.modules.values());
  }

  /**
   * Get all enabled modules
   */
  static async getEnabledModules(): Promise<Module[]> {
    await this.initialize();
    return Array.from(this.modules.values()).filter(m => m.enabled);
  }

  /**
   * Get a specific module
   */
  static async getModule(moduleId: string): Promise<Module | null> {
    await this.initialize();
    return this.modules.get(moduleId) || null;
  }

  /**
   * Load and execute a module
   * WARNING: In production, this should use a proper sandboxed environment
   */
  static async loadModule(moduleId: string): Promise<any> {
    await this.initialize();

    const module = this.modules.get(moduleId);
    if (!module) {
      throw new Error(`Module ${moduleId} not found`);
    }

    if (!module.enabled) {
      throw new Error(`Module ${moduleId} is disabled`);
    }

    const code = await AsyncStorage.getItem(`@nexttv_module_code_${moduleId}`);
    if (!code) {
      throw new Error(`Module ${moduleId} code not found`);
    }

    // In production, this should use a proper sandbox (e.g., JavaScriptCore, Hermes)
    // For now, this is a placeholder that would need proper security
    try {
      /* SECURITY: Dynamic code execution disabled
      // eslint-disable-next-line no-new-func
      const moduleFunction = new Function('module', 'exports', code);
      const exports = {};
      moduleFunction({ exports }, exports);
      return exports;
      */
      throw new Error('Module execution disabled: Sandboxing required.');
    } catch (error) {
      console.error(`Failed to load module ${moduleId}:`, error);
      throw error;
    }
  }

  /**
   * Check if a module has a specific permission
   */
  static async hasPermission(moduleId: string, permission: string): Promise<boolean> {
    await this.initialize();
    const module = this.modules.get(moduleId);
    return module ? module.permissions.includes(permission) : false;
  }

  /**
   * Save modules to storage
   */
  private static async saveModules(): Promise<void> {
    const modulesArray = Array.from(this.modules.values());
    await AsyncStorage.setItem(MODULES_STORAGE_KEY, JSON.stringify(modulesArray));
  }

  /**
   * Clear all modules (for testing/reset)
   */
  static async clearAllModules(): Promise<void> {
    await this.initialize();
    
    // Remove all module code
    for (const moduleId of this.modules.keys()) {
      await AsyncStorage.removeItem(`@nexttv_module_code_${moduleId}`);
    }
    
    this.modules.clear();
    await AsyncStorage.removeItem(MODULES_STORAGE_KEY);
    console.log('All modules cleared');
  }
}
