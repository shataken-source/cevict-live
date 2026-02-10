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
    let pos = 0;
    
    // Safer parsing using indexOf loop instead of global regex with backtracking
    while (true) {
      const startTag = '<programme';
      const endTag = '</programme>';
      
      const startIdx = xml.indexOf(startTag, pos);
      if (startIdx === -1) break;
      
      const endIdx = xml.indexOf(endTag, startIdx);
      if (endIdx === -1) break;
      
      // Extract just this program block
      const tagContent = xml.substring(startIdx, endIdx);
      pos = endIdx + endTag.length;
      
      // Extract attributes (simple regex on small string is safe)
      // Support both single and double quotes: start="..." or start='...'
      const startMatch = tagContent.match(/start=["']([^"']+)["']/);
      const stopMatch = tagContent.match(/stop=["']([^"']+)["']/);
      const channelMatch = tagContent.match(/channel=["']([^"']+)["']/);
      
      if (startMatch && stopMatch && channelMatch) {
        // Extract body content
        const bodyStart = tagContent.indexOf('>');
        if (bodyStart !== -1) {
          const body = tagContent.substring(bodyStart + 1);
          const titleMatch = body.match(/<title[^>]*>([^<]+)<\/title>/);
          const descMatch = body.match(/<desc[^>]*>([^<]+)<\/desc>/);
          
          try {
            programs.push({
              start: this.parseXMLTVDate(startMatch[1]),
              end: this.parseXMLTVDate(stopMatch[1]),
              channelId: channelMatch[1],
              title: titleMatch ? titleMatch[1] : 'Unknown',
              description: descMatch ? descMatch[1] : undefined,
            });
          } catch (e) {
            // Skip invalid dates
          }
        }
      }
    }
    
    return programs;
  }

  private static parseXMLTVDate(dateStr: string): Date {
    if (!dateStr || dateStr.length < 14) {
      throw new Error('Invalid date format');
    }
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1;
    const day = parseInt(dateStr.substring(6, 8));
    const hour = parseInt(dateStr.substring(8, 10));
    const minute = parseInt(dateStr.substring(10, 12));
    const second = parseInt(dateStr.substring(12, 14));
    
    const date = new Date(year, month, day, hour, minute, second);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date value');
    }
    return date;
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
