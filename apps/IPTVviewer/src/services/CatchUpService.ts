/**
 * Catch-Up TV Service
 * Allows users to watch content from the past 7 days
 */

import { Channel } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EPGService } from '@/services/EPGService';

export interface CatchUpProgram {
  id: string;
  channelId: string;
  channelName: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  duration: number; // minutes
  thumbnail?: string;
  streamUrl?: string;
  genre?: string;
}

export interface CatchUpDay {
  date: Date;
  programs: CatchUpProgram[];
}

export class CatchUpService {
  private static readonly STORAGE_KEY = 'catchup_programs';
  private static readonly MAX_DAYS = 7;

  /**
   * Get catch-up programs for a specific channel
   */
  static async getCatchUpForChannel(
    channel: Channel,
    days: number = 7,
    epgUrl?: string
  ): Promise<CatchUpDay[]> {
    const catchUpDays: CatchUpDay[] = [];
    const now = new Date();

    for (let i = 0; i < Math.min(days, this.MAX_DAYS); i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const programs = await this.getProgramsForDay(channel, date, epgUrl);

      if (programs.length > 0) {
        catchUpDays.push({ date, programs });
      }
    }

    return catchUpDays;
  }

  /**
   * Get programs for a specific day — uses real EPG when available
   */
  private static async getProgramsForDay(
    channel: Channel,
    date: Date,
    epgUrl?: string
  ): Promise<CatchUpProgram[]> {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    // Try real EPG data first
    if (epgUrl?.trim()) {
      try {
        const allPrograms = await EPGService.fetchEPG(epgUrl.trim());
        const channelId = channel.tvgId || channel.id;
        const schedule = EPGService.getChannelSchedule(
          allPrograms,
          channelId,
          dayStart,
          dayEnd
        );

        if (schedule.length > 0) {
          return schedule.map((p, idx) => {
            const duration = Math.round(
              (p.end.getTime() - p.start.getTime()) / 60000
            );
            return {
              id: `${channelId}-${p.start.getTime()}-${idx}`,
              channelId: channel.id,
              channelName: channel.name,
              title: p.title,
              description: p.description,
              startTime: p.start,
              endTime: p.end,
              duration,
              streamUrl: this.getCatchUpStreamUrl(channel, p.start, duration),
              genre: p.genre || channel.group,
            };
          });
        }
      } catch (error) {
        console.warn('EPG fetch failed for catch-up, falling back to mock:', error);
      }
    }

    // Fallback: generate mock 1-hour slots
    const programs: CatchUpProgram[] = [];
    for (let hour = 0; hour < 24; hour++) {
      const startTime = new Date(dayStart);
      startTime.setHours(hour);
      const endTime = new Date(startTime);
      endTime.setHours(hour + 1);

      programs.push({
        id: `${channel.id}-${date.toISOString()}-${hour}`,
        channelId: channel.id,
        channelName: channel.name,
        title: `Program at ${hour}:00`,
        description: `Content from ${channel.name}`,
        startTime,
        endTime,
        duration: 60,
        streamUrl: this.getCatchUpStreamUrl(channel, startTime),
        genre: channel.group,
      });
    }

    return programs;
  }

  /**
   * Generate catch-up stream URL
   * Most IPTV providers support time-shift URLs like:
   * http://provider.com/live/channel.m3u8?utc=1234567890&duration=3600
   */
  private static getCatchUpStreamUrl(
    channel: Channel,
    startTime: Date,
    durationMinutes: number = 60
  ): string {
    const baseUrl = channel.url;
    const timestamp = Math.floor(startTime.getTime() / 1000);
    const durationSec = durationMinutes * 60;

    // Check if URL already has query params
    const separator = baseUrl.includes('?') ? '&' : '?';

    return `${baseUrl}${separator}utc=${timestamp}&duration=${durationSec}`;
  }

  /**
   * Check if catch-up is available for a channel
   */
  static isCatchUpAvailable(channel: Channel): boolean {
    // Most IPTV providers indicate catch-up support in M3U attributes
    // Check for common indicators:
    // - tvg-rec="1" or catchup="1" in M3U
    // - URL contains "timeshift" or "archive"

    const url = channel.url.toLowerCase();
    return (
      url.includes('timeshift') ||
      url.includes('archive') ||
      url.includes('catchup') ||
      url.includes('utc=')
    );
  }

  /**
   * Get catch-up availability window (in days)
   */
  static getCatchUpDays(channel: Channel): number {
    // Most providers offer 3-7 days
    // Could be parsed from M3U: catchup-days="7"
    return this.MAX_DAYS;
  }

  /**
   * Save recently watched catch-up programs
   */
  static async saveRecentCatchUp(program: CatchUpProgram): Promise<void> {
    try {
      const existing = await this.getRecentCatchUp();
      const updated = [
        program,
        ...existing.filter(p => p.id !== program.id)
      ].slice(0, 50); // Keep last 50

      await AsyncStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify(updated)
      );
    } catch (error) {
      console.error('Error saving catch-up history:', error);
    }
  }

  /**
   * Get recently watched catch-up programs
   */
  static async getRecentCatchUp(): Promise<CatchUpProgram[]> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (!data) return [];

      const programs: CatchUpProgram[] = JSON.parse(data);

      // Convert date strings back to Date objects
      return programs.map(p => ({
        ...p,
        startTime: new Date(p.startTime),
        endTime: new Date(p.endTime),
      }));
    } catch (error) {
      console.error('Error loading catch-up history:', error);
      return [];
    }
  }

  /**
   * Clear catch-up history
   */
  static async clearHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing catch-up history:', error);
    }
  }
}
