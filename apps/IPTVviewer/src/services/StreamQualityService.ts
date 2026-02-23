/**
 * Stream Quality Service
 * Manages 4K/UHD streaming, adaptive bitrate, and anti-freeze technology
 */

import { Channel } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type StreamQuality = 'auto' | '4k' | '1080p' | '720p' | '480p' | '360p';

export interface QualityOption {
  quality: StreamQuality;
  label: string;
  bitrate: number; // kbps
  resolution: string;
  available: boolean;
}

export interface StreamHealth {
  quality: StreamQuality;
  bitrate: number;
  fps: number;
  bufferHealth: number; // 0-100
  droppedFrames: number;
  latency: number; // ms
  bandwidth: number; // kbps
  uptime: number; // percentage
}

export class StreamQualityService {
  private static readonly STORAGE_KEY = 'stream_quality_preference';
  private static readonly BUFFER_SIZE_SECONDS = 30; // Anti-freeze buffer
  private static readonly MIN_BANDWIDTH_4K = 25000; // 25 Mbps for 4K
  private static readonly MIN_BANDWIDTH_1080P = 8000; // 8 Mbps for 1080p
  private static readonly MIN_BANDWIDTH_720P = 5000; // 5 Mbps for 720p

  /**
   * Get available quality options for a channel
   */
  static async getAvailableQualities(channel: Channel): Promise<QualityOption[]> {
    const bandwidth = await this.measureBandwidth();

    const qualities: QualityOption[] = [
      {
        quality: 'auto',
        label: 'Auto (Adaptive)',
        bitrate: 0,
        resolution: 'Adaptive',
        available: true,
      },
      {
        quality: '4k',
        label: '4K UHD',
        bitrate: 25000,
        resolution: '3840x2160',
        available: bandwidth >= this.MIN_BANDWIDTH_4K && this.supports4K(channel),
      },
      {
        quality: '1080p',
        label: 'Full HD',
        bitrate: 8000,
        resolution: '1920x1080',
        available: bandwidth >= this.MIN_BANDWIDTH_1080P,
      },
      {
        quality: '720p',
        label: 'HD',
        bitrate: 5000,
        resolution: '1280x720',
        available: bandwidth >= this.MIN_BANDWIDTH_720P,
      },
      {
        quality: '480p',
        label: 'SD',
        bitrate: 2500,
        resolution: '854x480',
        available: true,
      },
      {
        quality: '360p',
        label: 'Low',
        bitrate: 1000,
        resolution: '640x360',
        available: true,
      },
    ];

    return qualities;
  }

  /**
   * Check if channel supports 4K
   */
  private static supports4K(channel: Channel): boolean {
    const url = channel.url.toLowerCase();
    const name = channel.name.toLowerCase();
    
    return (
      url.includes('4k') ||
      url.includes('uhd') ||
      url.includes('2160p') ||
      name.includes('4k') ||
      name.includes('uhd')
    );
  }

  /**
   * Measure current bandwidth
   */
  static async measureBandwidth(): Promise<number> {
    // In production, this would do actual bandwidth testing
    // For now, return a simulated value based on connection type
    
    try {
      // Simulate bandwidth test
      const testUrl = 'https://speed.cloudflare.com/__down?bytes=1000000'; // 1MB test
      const startTime = Date.now();
      
      const response = await fetch(testUrl);
      const blob = await response.blob();
      
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000; // seconds
      const bytes = blob.size;
      const kbps = (bytes * 8) / duration / 1000;
      
      return Math.round(kbps);
    } catch (error) {
      console.error('Bandwidth test failed:', error);
      // Return conservative estimate
      return 10000; // 10 Mbps
    }
  }

  /**
   * Get optimal quality based on bandwidth
   */
  static async getOptimalQuality(channel: Channel): Promise<StreamQuality> {
    const bandwidth = await this.measureBandwidth();
    const supports4K = this.supports4K(channel);

    if (bandwidth >= this.MIN_BANDWIDTH_4K && supports4K) {
      return '4k';
    } else if (bandwidth >= this.MIN_BANDWIDTH_1080P) {
      return '1080p';
    } else if (bandwidth >= this.MIN_BANDWIDTH_720P) {
      return '720p';
    } else if (bandwidth >= 2500) {
      return '480p';
    } else {
      return '360p';
    }
  }

  /**
   * Get stream URL with quality parameter
   */
  static getStreamUrlWithQuality(
    channel: Channel,
    quality: StreamQuality
  ): string {
    if (quality === 'auto') {
      return channel.url; // Use adaptive streaming
    }

    const baseUrl = channel.url;
    const separator = baseUrl.includes('?') ? '&' : '?';

    // Common quality parameter formats
    const qualityParams: Record<StreamQuality, string> = {
      'auto': '',
      '4k': 'quality=4k',
      '1080p': 'quality=1080p',
      '720p': 'quality=720p',
      '480p': 'quality=480p',
      '360p': 'quality=360p',
    };

    return `${baseUrl}${separator}${qualityParams[quality]}`;
  }

  /**
   * Save quality preference
   */
  static async saveQualityPreference(quality: StreamQuality): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, quality);
    } catch (error) {
      console.error('Error saving quality preference:', error);
    }
  }

  /**
   * Get saved quality preference
   */
  static async getQualityPreference(): Promise<StreamQuality> {
    try {
      const quality = await AsyncStorage.getItem(this.STORAGE_KEY);
      return (quality as StreamQuality) || 'auto';
    } catch (error) {
      console.error('Error loading quality preference:', error);
      return 'auto';
    }
  }

  /**
   * Monitor stream health (anti-freeze technology)
   */
  static async monitorStreamHealth(): Promise<StreamHealth> {
    // In production, this would monitor actual stream metrics
    // For now, return simulated health data
    
    const bandwidth = await this.measureBandwidth();
    const quality = await this.getQualityPreference();

    return {
      quality,
      bitrate: bandwidth,
      fps: 60,
      bufferHealth: 95, // 95% buffer health
      droppedFrames: 0,
      latency: 50, // 50ms latency
      bandwidth,
      uptime: 99.9,
    };
  }

  /**
   * Anti-freeze buffer management
   */
  static getBufferConfig(): {
    bufferSize: number;
    maxBufferSize: number;
    minBufferSize: number;
    rebufferThreshold: number;
  } {
    return {
      bufferSize: this.BUFFER_SIZE_SECONDS,
      maxBufferSize: 60, // 60 seconds max buffer
      minBufferSize: 10, // 10 seconds min buffer
      rebufferThreshold: 5, // Start rebuffering at 5 seconds
    };
  }

  /**
   * Adaptive bitrate algorithm
   */
  static async adjustQualityBasedOnConditions(
    currentQuality: StreamQuality,
    bufferHealth: number,
    bandwidth: number
  ): Promise<StreamQuality> {
    // If buffer is low, downgrade quality
    if (bufferHealth < 30) {
      const downgrades: Record<StreamQuality, StreamQuality> = {
        'auto': 'auto',
        '4k': '1080p',
        '1080p': '720p',
        '720p': '480p',
        '480p': '360p',
        '360p': '360p',
      };
      return downgrades[currentQuality];
    }

    // If buffer is healthy and bandwidth is good, upgrade
    if (bufferHealth > 80 && bandwidth > this.MIN_BANDWIDTH_4K) {
      const upgrades: Record<StreamQuality, StreamQuality> = {
        'auto': 'auto',
        '360p': '480p',
        '480p': '720p',
        '720p': '1080p',
        '1080p': '4k',
        '4k': '4k',
      };
      return upgrades[currentQuality];
    }

    return currentQuality;
  }

  /**
   * Get server uptime (99.9% guarantee)
   */
  static async getServerUptime(): Promise<{
    uptime: number;
    status: 'online' | 'degraded' | 'offline';
    lastCheck: Date;
  }> {
    // In production, this would ping actual servers
    return {
      uptime: 99.9,
      status: 'online',
      lastCheck: new Date(),
    };
  }

  /**
   * Enable/disable hardware acceleration
   */
  static async setHardwareAcceleration(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem('hardware_acceleration', enabled.toString());
    } catch (error) {
      console.error('Error setting hardware acceleration:', error);
    }
  }

  /**
   * Check if hardware acceleration is enabled
   */
  static async isHardwareAccelerationEnabled(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem('hardware_acceleration');
      return value !== 'false'; // Default to true
    } catch (error) {
      console.error('Error checking hardware acceleration:', error);
      return true;
    }
  }
}
