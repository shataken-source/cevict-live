export interface IPTVCredentials {
  username: string;
  password: string;
  server: string;
  altServer?: string;
}

export const DEFAULT_CREDENTIALS: IPTVCredentials = {
  username: 'COCHJNAR01',
  password: 'VYa7uMUeFT',
  server: 'http://link4tv.me:80',
  altServer: 'http://ky-iptv.com:80',
};

export class IPTVService {
  private credentials: IPTVCredentials;

  constructor(credentials?: IPTVCredentials) {
    this.credentials = credentials || DEFAULT_CREDENTIALS;
  }

  setCredentials(credentials: IPTVCredentials): void {
    this.credentials = credentials;
  }

  getPlaylistUrl(): string {
    const {username, password, server} = this.credentials;
    return `${server}/playlist/${username}/${password}/m3u_plus?output=hls`;
  }

  getAltPlaylistUrl(): string {
    const {username, password, altServer} = this.credentials;
    if (!altServer) return this.getPlaylistUrl();
    return `${altServer}/playlist/${username}/${password}/m3u_plus?output=hls`;
  }

  getEPGUrl(): string {
    const {username, password, server} = this.credentials;
    return `${server}/xmltv.php?username=${username}&password=${password}`;
  }

  getChannelLogoUrl(logoPath: string): string {
    if (logoPath.startsWith('http')) return logoPath;
    return `${this.credentials.server}${logoPath}`;
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(this.getPlaylistUrl(), {
        method: 'HEAD',
        timeout: 5000,
      } as any);
      return response.ok;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  async testAltConnection(): Promise<boolean> {
    if (!this.credentials.altServer) return false;
    try {
      const response = await fetch(this.getAltPlaylistUrl(), {
        method: 'HEAD',
        timeout: 5000,
      } as any);
      return response.ok;
    } catch (error) {
      console.error('Alt connection test failed:', error);
      return false;
    }
  }
}
