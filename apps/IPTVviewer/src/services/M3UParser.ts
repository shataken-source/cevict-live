import { Channel, Playlist } from '@/types';

export class M3UParser {
  static async parse(content: string, playlistId: string, playlistName: string): Promise<Playlist> {
    const lines = content.split('\n').map(line => line.trim());
    const channels: Channel[] = [];

    let currentChannel: Partial<Channel> = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('#EXTINF:')) {
        const info = this.parseExtInf(line);
        currentChannel = {
          id: `${playlistId}-${channels.length}`,
          name: info.name,
          logo: info.logo,
          group: info.group,
          tvgId: info.tvgId,
        };
      } else if (line && !line.startsWith('#') && currentChannel.name) {
        currentChannel.url = line;
        channels.push(currentChannel as Channel);
        currentChannel = {};
      }
    }

    return {
      id: playlistId,
      name: playlistName,
      url: '',
      channels,
      lastUpdated: new Date(),
    };
  }

  private static parseExtInf(line: string): {
    name: string;
    logo?: string;
    group?: string;
    tvgId?: string;
  } {
    const nameMatch = line.match(/,(.+)$/);
    const name = nameMatch ? nameMatch[1].trim() : 'Unknown';

    const logoMatch = line.match(/tvg-logo="([^"]+)"/);
    const logo = logoMatch ? logoMatch[1] : undefined;

    const groupMatch = line.match(/group-title="([^"]+)"/);
    const group = groupMatch ? groupMatch[1] : undefined;

    const tvgIdMatch = line.match(/tvg-id="([^"]+)"/);
    const tvgId = tvgIdMatch ? tvgIdMatch[1] : undefined;

    return { name, logo, group, tvgId };
  }

  static async fetchAndParse(url: string, playlistId: string, playlistName: string): Promise<Playlist> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const content = await response.text();
      return this.parse(content, playlistId, playlistName);
    } finally {
      clearTimeout(timeout);
    }
  }
}
