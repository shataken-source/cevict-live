import {TVModule, ModuleManifest, ModuleContext} from './ModuleInterface';
import RNFS from 'react-native-fs';

export class ModuleManager {
  private static instance: ModuleManager;
  private modules: Map<string, TVModule> = new Map();
  private context: ModuleContext;
  private modulesPath: string;

  private constructor() {
    this.modulesPath = `${RNFS.DocumentDirectoryPath}/modules`;
  }

  static getInstance(): ModuleManager {
    if (!ModuleManager.instance) {
      ModuleManager.instance = new ModuleManager();
    }
    return ModuleManager.instance;
  }

  setContext(context: ModuleContext): void {
    this.context = context;
  }

  async loadModule(moduleId: string): Promise<void> {
    try {
      const manifestPath = `${this.modulesPath}/${moduleId}/manifest.json`;
      const manifestExists = await RNFS.exists(manifestPath);

      if (!manifestExists) {
        throw new Error(`Module ${moduleId} not found`);
      }

      const manifestContent = await RNFS.readFile(manifestPath, 'utf8');
      const manifest: ModuleManifest = JSON.parse(manifestContent);

      const entryPath = `${this.modulesPath}/${moduleId}/${manifest.entryPoint}`;
      const moduleCode = await RNFS.readFile(entryPath, 'utf8');

      const ModuleClass = this.evaluateModule(moduleCode);
      const moduleInstance = new ModuleClass(manifest, this.context);

      await moduleInstance.initialize();
      this.modules.set(moduleId, moduleInstance);

      console.log(`Module ${moduleId} loaded successfully`);
    } catch (error) {
      console.error(`Failed to load module ${moduleId}:`, error);
      throw error;
    }
  }

  async unloadModule(moduleId: string): Promise<void> {
    const module = this.modules.get(moduleId);
    if (module) {
      await module.cleanup();
      this.modules.delete(moduleId);
      console.log(`Module ${moduleId} unloaded`);
    }
  }

  getModule(moduleId: string): TVModule | undefined {
    return this.modules.get(moduleId);
  }

  getAllModules(): TVModule[] {
    return Array.from(this.modules.values());
  }

  async installModule(moduleZipPath: string): Promise<string> {
    try {
      const tempDir = `${RNFS.CachesDirectoryPath}/temp-module`;
      
      await this.extractZip(moduleZipPath, tempDir);
      
      const manifestPath = `${tempDir}/manifest.json`;
      const manifestContent = await RNFS.readFile(manifestPath, 'utf8');
      const manifest: ModuleManifest = JSON.parse(manifestContent);

      const targetPath = `${this.modulesPath}/${manifest.id}`;
      await RNFS.mkdir(targetPath);
      
      await RNFS.copyFolder(tempDir, targetPath);

      await RNFS.unlink(tempDir);

      return manifest.id;
    } catch (error) {
      console.error('Failed to install module:', error);
      throw error;
    }
  }

  async uninstallModule(moduleId: string): Promise<void> {
    await this.unloadModule(moduleId);
    
    const modulePath = `${this.modulesPath}/${moduleId}`;
    const exists = await RNFS.exists(modulePath);
    
    if (exists) {
      await RNFS.unlink(modulePath);
      console.log(`Module ${moduleId} uninstalled`);
    }
  }

  async listInstalledModules(): Promise<ModuleManifest[]> {
    const manifests: ModuleManifest[] = [];
    
    try {
      const exists = await RNFS.exists(this.modulesPath);
      if (!exists) {
        await RNFS.mkdir(this.modulesPath);
        return manifests;
      }

      const moduleIds = await RNFS.readDir(this.modulesPath);
      
      for (const item of moduleIds) {
        if (item.isDirectory()) {
          const manifestPath = `${item.path}/manifest.json`;
          const manifestExists = await RNFS.exists(manifestPath);
          
          if (manifestExists) {
            const content = await RNFS.readFile(manifestPath, 'utf8');
            manifests.push(JSON.parse(content));
          }
        }
      }
    } catch (error) {
      console.error('Error listing modules:', error);
    }
    
    return manifests;
  }

  private evaluateModule(code: string): typeof TVModule {
    const func = new Function('exports', 'require', 'module', code);
    const module = {exports: {}};
    func(module.exports, require, module);
    return module.exports as typeof TVModule;
  }

  private async extractZip(zipPath: string, destPath: string): Promise<void> {
    console.log('Extracting module from:', zipPath, 'to:', destPath);
  }
}
