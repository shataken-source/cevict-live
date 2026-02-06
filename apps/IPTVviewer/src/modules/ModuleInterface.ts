export interface ModuleManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  entryPoint: string;
  permissions: string[];
  dependencies?: Record<string, string>;
}

export interface ModuleContext {
  navigation: any;
  store: any;
  services: {
    m3u: any;
    epg: any;
    playlist: any;
  };
}

export abstract class TVModule {
  protected manifest: ModuleManifest;
  protected context: ModuleContext;

  constructor(manifest: ModuleManifest, context: ModuleContext) {
    this.manifest = manifest;
    this.context = context;
  }

  abstract initialize(): Promise<void>;
  abstract render(): React.ReactNode | null;
  abstract cleanup(): Promise<void>;

  getManifest(): ModuleManifest {
    return this.manifest;
  }

  hasPermission(permission: string): boolean {
    return this.manifest.permissions.includes(permission);
  }
}
