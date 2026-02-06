import {EPGProgram} from '@/types';

export class EPGService {
  private static cache: Map<string, EPGProgram[]> = new Map();
  private static cacheExpiry: Map<string, number> = new Map();
  private static readonly CACHE_DURATION = 3600000;

  static async fetchEPG(xmltvUrl: string): Promise<EPGProgram[]> {
    const now = Date.now();
    const expiry = this.cacheExpiry.get(xmltvUrl);
    
    if (expiry && now < expiry) {
      const cached = this.cache.get(xmltvUrl);
      if (cached) return cached;
    }

    try {
      const response = await fetch(xmltvUrl);
      const xmlText = await response.text();
      const programs = this.parseXMLTV(xmlText);
      
      this.cache.set(xmltvUrl, programs);
      this.cacheExpiry.set(xmltvUrl, now + this.CACHE_DURATION);
      
      return programs;
    } catch (error) {
      console.error('Error fetching EPG:', error);
      return [];
    }
  }

  private static parseXMLTV(xml: string): EPGProgram[] {
    const programs: EPGProgram[] = [];
    
    const programRegex = /<programme[^>]*start="([^"]+)"[^>]*stop="([^"]+)"[^>]*channel="([^"]+)"[^>]*>([\s\S]*?)<\/programme>/g;
    const titleRegex = /<title[^>]*>([^<]+)<\/title>/;
    const descRegex = /<desc[^>]*>([^<]+)<\/desc>/;
    
    let match;
    while ((match = programRegex.exec(xml)) !== null) {
      const [, start, stop, channelId, content] = match;
      
      const titleMatch = content.match(titleRegex);
      const descMatch = content.match(descRegex);
      
      programs.push({
        start: this.parseXMLTVDate(start),
        end: this.parseXMLTVDate(stop),
        channelId,
        title: titleMatch ? titleMatch[1] : 'Unknown',
        description: descMatch ? descMatch[1] : undefined,
      });
    }
    
    return programs;
  }

  private static parseXMLTVDate(dateStr: string): Date {
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1;
    const day = parseInt(dateStr.substring(6, 8));
    const hour = parseInt(dateStr.substring(8, 10));
    const minute = parseInt(dateStr.substring(10, 12));
    const second = parseInt(dateStr.substring(12, 14));
    
    return new Date(year, month, day, hour, minute, second);
  }

  static getCurrentProgram(programs: EPGProgram[], channelId: string): EPGProgram | null {
    const now = new Date();
    return programs.find(
      p => p.channelId === channelId && p.start <= now && p.end > now
    ) || null;
  }

  static getUpcomingPrograms(
    programs: EPGProgram[],
    channelId: string,
    count: number = 5
  ): EPGProgram[] {
    const now = new Date();
    return programs
      .filter(p => p.channelId === channelId && p.start > now)
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .slice(0, count);
  }
}
