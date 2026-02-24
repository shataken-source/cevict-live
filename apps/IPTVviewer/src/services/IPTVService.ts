export interface IPTVCredentials {
  username: string;
  password: string;
  server: string;
  altServer?: string;
}

export const DEFAULT_CREDENTIALS: IPTVCredentials = {
  username: 'jascodezoriptv',
  password: '19e993b7f5',
  server: 'http://blogyfy.xyz',
  altServer: '',
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
    const { username, password, server } = this.credentials;
    return `${server}/get.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&type=m3u_plus&output=ts`;
  }

  getAltPlaylistUrl(): string {
    const { username, password, altServer } = this.credentials;
    if (!altServer) return this.getPlaylistUrl();
    return `${altServer}/get.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&type=m3u_plus&output=ts`;
  }

  getEPGUrl(): string {
    const { username, password, server } = this.credentials;
    return `${server}/xmltv.php?username=${username}&password=${password}`;
  }

  getChannelLogoUrl(logoPath: string): string {
    if (logoPath.startsWith('http')) return logoPath;
    return `${this.credentials.server}${logoPath}`;
  }

  getXtreamApiUrl(): string {
    const { username, password, server } = this.credentials;
    return `${server}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
  }

  async testConnection(): Promise<boolean> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(this.getXtreamApiUrl(), {
        method: 'GET',
        signal: controller.signal,
      });
      if (!response.ok) return false;
      const data = await response.json();
      return data?.user_info?.auth === 1;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  async testAltConnection(): Promise<boolean> {
    if (!this.credentials.altServer) return false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const { username, password, altServer } = this.credentials;
      const url = `${altServer}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });
      if (!response.ok) return false;
      const data = await response.json();
      return data?.user_info?.auth === 1;
    } catch (error) {
      console.error('Alt connection test failed:', error);
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }
}
