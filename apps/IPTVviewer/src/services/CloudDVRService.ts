/**
 * Cloud DVR Service
 * Record live TV to cloud storage without external hardware
 */

import { Channel } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Recording {
  id: string;
  channelId: string;
  channelName: string;
  channelLogo?: string;
  programTitle: string;
  programDescription?: string;
  startTime: Date;
  endTime: Date;
  duration: number; // minutes
  recordedAt: Date;
  fileSize?: number; // MB
  streamUrl?: string;
  thumbnail?: string;
  status: 'scheduled' | 'recording' | 'completed' | 'failed';
  progress?: number; // 0-100
}

export interface RecordingSchedule {
  id: string;
  channelId: string;
  programTitle: string;
  startTime: Date;
  endTime: Date;
  recurring?: 'daily' | 'weekly' | 'none';
  enabled: boolean;
}

export class CloudDVRService {
  private static readonly STORAGE_KEY_RECORDINGS = 'cloud_dvr_recordings';
  private static readonly STORAGE_KEY_SCHEDULES = 'cloud_dvr_schedules';
  private static readonly MAX_RECORDINGS = 100; // Storage limit
  private static readonly MAX_STORAGE_GB = 50; // Cloud storage limit

  /**
   * Schedule a recording
   */
  static async scheduleRecording(
    channel: Channel,
    programTitle: string,
    startTime: Date,
    endTime: Date,
    recurring: 'daily' | 'weekly' | 'none' = 'none'
  ): Promise<RecordingSchedule> {
    const schedule: RecordingSchedule = {
      id: `schedule-${Date.now()}`,
      channelId: channel.id,
      programTitle,
      startTime,
      endTime,
      recurring,
      enabled: true,
    };

    const schedules = await this.getSchedules();
    schedules.push(schedule);
    await this.saveSchedules(schedules);

    return schedule;
  }

  /**
   * Start recording now
   */
  static async startRecording(
    channel: Channel,
    programTitle: string,
    duration: number // minutes
  ): Promise<Recording> {
    const now = new Date();
    const endTime = new Date(now.getTime() + duration * 60000);

    const recording: Recording = {
      id: `rec-${Date.now()}`,
      channelId: channel.id,
      channelName: channel.name,
      channelLogo: channel.logo,
      programTitle,
      startTime: now,
      endTime,
      duration,
      recordedAt: now,
      status: 'recording',
      progress: 0,
      streamUrl: this.getRecordingStreamUrl(channel, now, duration),
    };

    const recordings = await this.getRecordings();
    recordings.push(recording);
    await this.saveRecordings(recordings);

    // Simulate recording progress
    this.simulateRecording(recording.id, duration);

    return recording;
  }

  /**
   * Simulate recording progress (in production, this would be handled by backend)
   */
  private static async simulateRecording(
    recordingId: string,
    duration: number
  ): Promise<void> {
    const updateInterval = (duration * 60000) / 100; // Update every 1% of duration

    for (let progress = 0; progress <= 100; progress += 5) {
      await new Promise(resolve => setTimeout(resolve, updateInterval * 5));
      
      const recordings = await this.getRecordings();
      const recording = recordings.find(r => r.id === recordingId);
      
      if (recording && recording.status === 'recording') {
        recording.progress = progress;
        
        if (progress === 100) {
          recording.status = 'completed';
          recording.fileSize = Math.round(duration * 2.5); // ~2.5MB per minute estimate
        }
        
        await this.saveRecordings(recordings);
      }
    }
  }

  /**
   * Stop an active recording
   */
  static async stopRecording(recordingId: string): Promise<void> {
    const recordings = await this.getRecordings();
    const recording = recordings.find(r => r.id === recordingId);
    
    if (recording && recording.status === 'recording') {
      recording.status = 'completed';
      recording.endTime = new Date();
      recording.duration = Math.round(
        (recording.endTime.getTime() - recording.startTime.getTime()) / 60000
      );
      await this.saveRecordings(recordings);
    }
  }

  /**
   * Delete a recording
   */
  static async deleteRecording(recordingId: string): Promise<void> {
    const recordings = await this.getRecordings();
    const filtered = recordings.filter(r => r.id !== recordingId);
    await this.saveRecordings(filtered);
  }

  /**
   * Get all recordings
   */
  static async getRecordings(): Promise<Recording[]> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY_RECORDINGS);
      if (!data) return [];

      const recordings: Recording[] = JSON.parse(data);
      
      return recordings.map(r => ({
        ...r,
        startTime: new Date(r.startTime),
        endTime: new Date(r.endTime),
        recordedAt: new Date(r.recordedAt),
      }));
    } catch (error) {
      console.error('Error loading recordings:', error);
      return [];
    }
  }

  /**
   * Get recordings for a specific channel
   */
  static async getRecordingsForChannel(channelId: string): Promise<Recording[]> {
    const recordings = await this.getRecordings();
    return recordings.filter(r => r.channelId === channelId);
  }

  /**
   * Get completed recordings
   */
  static async getCompletedRecordings(): Promise<Recording[]> {
    const recordings = await this.getRecordings();
    return recordings.filter(r => r.status === 'completed');
  }

  /**
   * Get active recordings
   */
  static async getActiveRecordings(): Promise<Recording[]> {
    const recordings = await this.getRecordings();
    return recordings.filter(r => r.status === 'recording');
  }

  /**
   * Get scheduled recordings
   */
  static async getSchedules(): Promise<RecordingSchedule[]> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY_SCHEDULES);
      if (!data) return [];

      const schedules: RecordingSchedule[] = JSON.parse(data);
      
      return schedules.map(s => ({
        ...s,
        startTime: new Date(s.startTime),
        endTime: new Date(s.endTime),
      }));
    } catch (error) {
      console.error('Error loading schedules:', error);
      return [];
    }
  }

  /**
   * Delete a schedule
   */
  static async deleteSchedule(scheduleId: string): Promise<void> {
    const schedules = await this.getSchedules();
    const filtered = schedules.filter(s => s.id !== scheduleId);
    await this.saveSchedules(filtered);
  }

  /**
   * Get storage usage
   */
  static async getStorageUsage(): Promise<{
    used: number; // GB
    total: number; // GB
    percentage: number;
    recordingCount: number;
  }> {
    const recordings = await this.getCompletedRecordings();
    const totalMB = recordings.reduce((sum, r) => sum + (r.fileSize || 0), 0);
    const usedGB = totalMB / 1024;
    
    return {
      used: Math.round(usedGB * 100) / 100,
      total: this.MAX_STORAGE_GB,
      percentage: Math.round((usedGB / this.MAX_STORAGE_GB) * 100),
      recordingCount: recordings.length,
    };
  }

  /**
   * Check if storage is available
   */
  static async hasStorageAvailable(estimatedSizeMB: number): Promise<boolean> {
    const usage = await this.getStorageUsage();
    const estimatedGB = estimatedSizeMB / 1024;
    return (usage.used + estimatedGB) <= usage.total;
  }

  /**
   * Generate recording stream URL
   */
  private static getRecordingStreamUrl(
    channel: Channel,
    startTime: Date,
    duration: number
  ): string {
    // In production, this would be a cloud storage URL
    // For now, generate a timeshift URL
    const timestamp = Math.floor(startTime.getTime() / 1000);
    const separator = channel.url.includes('?') ? '&' : '?';
    
    return `${channel.url}${separator}record=1&utc=${timestamp}&duration=${duration * 60}`;
  }

  /**
   * Save recordings to storage
   */
  private static async saveRecordings(recordings: Recording[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.STORAGE_KEY_RECORDINGS,
        JSON.stringify(recordings)
      );
    } catch (error) {
      console.error('Error saving recordings:', error);
    }
  }

  /**
   * Save schedules to storage
   */
  private static async saveSchedules(schedules: RecordingSchedule[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.STORAGE_KEY_SCHEDULES,
        JSON.stringify(schedules)
      );
    } catch (error) {
      console.error('Error saving schedules:', error);
    }
  }

  /**
   * Clear all recordings
   */
  static async clearAllRecordings(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY_RECORDINGS);
    } catch (error) {
      console.error('Error clearing recordings:', error);
    }
  }

  /**
   * Clear all schedules
   */
  static async clearAllSchedules(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY_SCHEDULES);
    } catch (error) {
      console.error('Error clearing schedules:', error);
    }
  }
}
