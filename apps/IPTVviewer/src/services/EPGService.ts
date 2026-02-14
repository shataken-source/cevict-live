import { EPGProgram } from '@/types';

export interface EPGState {
  programs: Map<string, EPGProgram[]>; // channelId -> programs
  currentTime: Date;
  selectedDate: Date;
  selectedChannel: import('@/types').Channel | null;
  selectedProgram: EPGProgram | null;
  timeOffset: number; // hours from current time (0 = now)
  isLoading: boolean;
  error: string | null;
}

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
          // Improved regex to handle CDATA, entities, and multi-line content
          const titleMatch = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
          const descMatch = body.match(/<desc[^>]*>([\s\S]*?)<\/desc>/i);

          // Helper to decode common HTML entities
          const decodeEntities = (str: string): string => {
            return str
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'")
              .replace(/&nbsp;/g, ' ')
              .replace(/<[^>]+>/g, '')
              .trim();
          };

          try {
            programs.push({
              start: this.parseXMLTVDate(startMatch[1]),
              end: this.parseXMLTVDate(stopMatch[1]),
              channelId: channelMatch[1],
              title: titleMatch ? decodeEntities(titleMatch[1]) : 'Unknown',
              description: descMatch ? decodeEntities(descMatch[1]) : undefined,
            });
          } catch (e) {
            // Skip invalid entries
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

  /**
   * Get programs for specific channels within a time range
   */
  static getProgramsForChannels(
    allPrograms: EPGProgram[],
    channelIds: string[],
    startTime: Date,
    endTime: Date
  ): Map<string, EPGProgram[]> {
    const result = new Map<string, EPGProgram[]>();

    channelIds.forEach(channelId => {
      const channelPrograms = allPrograms.filter(
        p => p.channelId === channelId &&
          p.start < endTime &&
          p.end > startTime
      ).sort((a, b) => a.start.getTime() - b.start.getTime());
      result.set(channelId, channelPrograms);
    });

    return result;
  }

  /**
   * Get the program playing at a specific time for each channel
   */
  static getProgramsAtTime(
    allPrograms: EPGProgram[],
    channelIds: string[],
    time: Date
  ): Map<string, EPGProgram | null> {
    const result = new Map<string, EPGProgram | null>();

    channelIds.forEach(channelId => {
      const program = allPrograms.find(
        p => p.channelId === channelId && p.start <= time && p.end > time
      ) || null;
      result.set(channelId, program);
    });

    return result;
  }

  /**
   * Get schedule for a specific channel within a time range
   */
  static getChannelSchedule(
    allPrograms: EPGProgram[],
    channelId: string,
    startTime: Date,
    endTime: Date
  ): EPGProgram[] {
    return allPrograms
      .filter(
        p => p.channelId === channelId &&
          p.start < endTime &&
          p.end > startTime
      )
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }

  /**
   * Format program duration as "1h 30m" or "30m"
   */
  static formatProgramDuration(start: Date, end: Date): string {
    const diffMs = end.getTime() - start.getTime();
    const diffMinutes = Math.round(diffMs / 60000);

    if (diffMinutes >= 60) {
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }

    return `${diffMinutes}m`;
  }

  /**
   * Get time slots for the time header
   */
  static getTimeSlots(
    startTime: Date,
    hours: number = 6
  ): Date[] {
    const slots: Date[] = [];
    for (let i = 0; i <= hours; i++) {
      const slotTime = new Date(startTime.getTime() + i * 3600000);
      slots.push(slotTime);
    }
    return slots;
  }

  /**
   * Calculate program cell width based on duration
   */
  static calculateProgramWidth(
    start: Date,
    end: Date,
    timeSlotWidth: number = 120
  ): number {
    const durationMs = end.getTime() - start.getTime();
    const hours = durationMs / 3600000;
    return Math.max(timeSlotWidth * hours, 60);
  }

  /**
   * Calculate program cell left offset
   */
  static calculateProgramOffset(
    programStart: Date,
    viewStart: Date,
    timeSlotWidth: number = 120
  ): number {
    const offsetMs = programStart.getTime() - viewStart.getTime();
    const hours = offsetMs / 3600000;
    return timeSlotWidth * hours;
  }
}
