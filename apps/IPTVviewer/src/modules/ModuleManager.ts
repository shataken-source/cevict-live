import {TVModule, ModuleManifest, ModuleContext} from './ModuleInterface';
import RNFS from 'react-native-fs';
import { unzip } from 'react-native-zip-archive';

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
    const tempDir = `${RNFS.CachesDirectoryPath}/temp-module-${Date.now()}`;
    try {
      await RNFS.mkdir(tempDir);
      await this.extractZip(moduleZipPath, tempDir);

      const manifestPath = await this.findManifestPath(tempDir);
      const manifestContent = await RNFS.readFile(manifestPath, 'utf8');
      const manifest: ModuleManifest = JSON.parse(manifestContent);
      const contentRoot = manifestPath.replace(/\/manifest\.json$/i, '');

      const targetPath = `${this.modulesPath}/${manifest.id}`;
      const exists = await RNFS.exists(this.modulesPath);
      if (!exists) await RNFS.mkdir(this.modulesPath);
      await RNFS.mkdir(targetPath);
      await this.copyFolderRecursive(contentRoot, targetPath);

      await RNFS.unlink(tempDir);
      return manifest.id;
    } catch (error) {
      try { await RNFS.unlink(tempDir); } catch (_) {}
      console.error('Failed to install module:', error);
      throw error;
    }
  }

  private async findManifestPath(tempDir: string): Promise<string> {
    const flat = `${tempDir}/manifest.json`;
    if (await RNFS.exists(flat)) return flat;
    const dirs = await RNFS.readDir(tempDir);
    const subdir = dirs.find((d) => d.isDirectory());
    if (subdir) {
      const inSub = `${subdir.path}/manifest.json`;
      if (await RNFS.exists(inSub)) return inSub;
    }
    throw new Error('ZIP must contain manifest.json at root or in a single folder');
  }

  private async copyFolderRecursive(src: string, dest: string): Promise<void> {
    const items = await RNFS.readDir(src);
    for (const item of items) {
      const destPath = `${dest}/${item.name}`;
      if (item.isDirectory()) {
        await RNFS.mkdir(destPath);
        await this.copyFolderRecursive(item.path, destPath);
      } else {
        await RNFS.copyFile(item.path, destPath);
      }
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
    // SECURITY: Dynamic code execution is currently disabled.
    // const func = new Function('exports', 'require', 'module', code);
    // const module = {exports: {}};
    // func(module.exports, require, module);
    // return module.exports as typeof TVModule;
    throw new Error('Module execution is disabled in this build (security hardening).');
  }

  private async extractZip(zipPath: string, destPath: string): Promise<void> {
    await unzip(zipPath, destPath);
  }
}
