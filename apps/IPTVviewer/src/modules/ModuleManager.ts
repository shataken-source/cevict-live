import { TVModule, ModuleManifest, ModuleContext } from './ModuleInterface';
// Expo Go compatible - native modules disabled
import AsyncStorage from '@react-native-async-storage/async-storage';

export class ModuleManager {
  private static instance: ModuleManager;
  private modules: Map<string, TVModule> = new Map();
  private context!: ModuleContext;
  private MODULES_KEY = '@modules';

  private constructor() { }

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
    console.log('Module system disabled in Expo Go. Build custom client to enable.');
    return;
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
    console.log('Module installation disabled in Expo Go. Build custom client to enable.');
    return '';
  }

  async uninstallModule(moduleId: string): Promise<void> {
    await this.unloadModule(moduleId);
    const data = await AsyncStorage.getItem(this.MODULES_KEY);
    const modules = data ? JSON.parse(data) : [];
    const filtered = modules.filter((m: any) => m.id !== moduleId);
    await AsyncStorage.setItem(this.MODULES_KEY, JSON.stringify(filtered));
  }

  async listInstalledModules(): Promise<ModuleManifest[]> {
    const data = await AsyncStorage.getItem(this.MODULES_KEY);
    return data ? JSON.parse(data) : [];
  }

  private evaluateModule(code: string): typeof TVModule {
    throw new Error('Module execution disabled in Expo Go. Build custom client to enable.');
  }
}
