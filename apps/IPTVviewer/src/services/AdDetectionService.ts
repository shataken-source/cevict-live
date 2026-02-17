export interface AdDetectionConfig {
  enabled: boolean;
  audioThreshold: number;
  volumeReductionPercent: number;
  silenceDuration: number;
  patterns: AdPattern[];
  /** EPG-based ad detection: known commercial time slots (minutes from hour) */
  commercialSlots: number[];
  /** Enable EPG-based detection */
  useEpgDetection: boolean;
}

export interface AdPattern {
  name: string;
  type: 'volume' | 'silence' | 'frequency' | 'duration';
  threshold: number;
  duration: number;
}

export interface AdDetectionResult {
  isAd: boolean;
  confidence: number;
  patternMatched?: string;
  action: 'mute' | 'reduce' | 'none';
  /** Reason for detection */
  reason?: string;
}

export class AdDetectionService {
  private config: AdDetectionConfig;
  private isMonitoring: boolean = false;
  private currentVolume: number = 50;
  private onAdDetected?: (result: AdDetectionResult) => void;
  private onAdEnded?: () => void;
  private lastDetectionTime: number = 0;
  private consecutiveDetections: number = 0;

  constructor(config?: AdDetectionConfig) {
    this.config = config || {
      enabled: true,
      audioThreshold: 0.8,
      volumeReductionPercent: 90,
      silenceDuration: 2000,
      useEpgDetection: true,
      commercialSlots: [0, 15, 30, 45], // Common commercial breaks at :00, :15, :30, :45
      patterns: [
        {
          name: 'Sudden Volume Increase',
          type: 'volume',
          threshold: 1.5,
          duration: 1000,
        },
        {
          name: 'Extended Silence',
          type: 'silence',
          threshold: 0.1,
          duration: 2000,
        },
        {
          name: 'High Frequency Noise',
          type: 'frequency',
          threshold: 8000,
          duration: 500,
        },
        {
          name: 'Repetitive Pattern',
          type: 'duration',
          threshold: 30,
          duration: 30000,
        },
      ],
    };
  }

  setConfig(config: AdDetectionConfig): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): AdDetectionConfig {
    return this.config;
  }

  setCallbacks(
    onAdDetected: (result: AdDetectionResult) => void,
    onAdEnded: () => void,
  ): void {
    this.onAdDetected = onAdDetected;
    this.onAdEnded = onAdEnded;
  }

  startMonitoring(currentVolume: number): void {
    if (!this.config.enabled) return;
    this.isMonitoring = true;
    this.currentVolume = currentVolume;
    this.consecutiveDetections = 0;
    console.log('[AdDetection] Monitoring started');
  }

  stopMonitoring(): void {
    this.isMonitoring = false;
    console.log('[AdDetection] Monitoring stopped');
  }

  /**
   * EPG-based ad detection - detects ads based on current time and EPG data
   * This is the REAL ad detection method that works without native audio access
   */
  async detectFromEPG(
    currentProgramTitle?: string,
    programDuration?: number,
  ): Promise<AdDetectionResult> {
    if (!this.config.enabled || !this.config.useEpgDetection) {
      return { isAd: false, confidence: 0, action: 'none' };
    }

    const now = new Date();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const timeIntoHour = minutes * 60 + seconds;

    // Check if we're in a known commercial slot (within 2 minutes of :00, :15, :30, :45)
    const inCommercialSlot = this.config.commercialSlots.some((slotMinute) => {
      const slotSeconds = slotMinute * 60;
      return Math.abs(timeIntoHour - slotSeconds) < 120; // Within 2 minutes
    });

    if (inCommercialSlot) {
      // High confidence if we're in a known commercial slot and program is short (< 5 min)
      const isShortProgram = programDuration && programDuration < 300;

      return {
        isAd: true,
        confidence: isShortProgram ? 0.9 : 0.7,
        patternMatched: 'Commercial Slot',
        action: this.config.volumeReductionPercent >= 80 ? 'mute' : 'reduce',
        reason: `Detected commercial slot at :${String(minutes).padStart(2, '0')}`,
      };
    }

    // Check for suspiciously short programs (likely ads)
    if (programDuration && programDuration < 60) {
      return {
        isAd: true,
        confidence: 0.8,
        patternMatched: 'Short Duration',
        action: this.config.volumeReductionPercent >= 80 ? 'mute' : 'reduce',
        reason: `Suspiciously short program (${programDuration}s)`,
      };
    }

    // Check program title patterns common for ads
    const adTitlePatterns = [
      /^(ad|sponsored|commercial)/i,
      /^\d+$/, // Just numbers
      /^spot$/i,
      /^promo$/i,
      /advertisement/i,
    ];

    if (currentProgramTitle) {
      for (const pattern of adTitlePatterns) {
        if (pattern.test(currentProgramTitle)) {
          return {
            isAd: true,
            confidence: 0.95,
            patternMatched: 'Ad Title Pattern',
            action: this.config.volumeReductionPercent >= 80 ? 'mute' : 'reduce',
            reason: `Program title matches ad pattern: "${currentProgramTitle}"`,
          };
        }
      }
    }

    return { isAd: false, confidence: 0, action: 'none' };
  }

  /**
   * Legacy audio analysis - requires actual audio stream data
   * In React Native, this needs native module integration for real PCM data
   */
  async analyzeAudio(audioLevel: number, frequency?: number): Promise<AdDetectionResult> {
    if (!this.config.enabled || !this.isMonitoring) {
      return { isAd: false, confidence: 0, action: 'none' };
    }

    // Rate limiting - don't detect more than once per 500ms
    const now = Date.now();
    if (now - this.lastDetectionTime < 500) {
      return { isAd: false, confidence: 0, action: 'none' };
    }

    // Check audio patterns
    for (const pattern of this.config.patterns) {
      const match = this.checkPattern(pattern, audioLevel, frequency);

      if (match.isMatch) {
        this.consecutiveDetections++;

        // Require 2+ consecutive detections for higher confidence
        if (this.consecutiveDetections < 2) {
          return { isAd: false, confidence: 0, action: 'none' };
        }

        const result: AdDetectionResult = {
          isAd: true,
          confidence: match.confidence,
          patternMatched: pattern.name,
          action: this.config.volumeReductionPercent >= 80 ? 'mute' : 'reduce',
          reason: `Audio pattern detected: ${pattern.name}`,
        };

        this.lastDetectionTime = now;
        this.consecutiveDetections = 0;

        if (this.onAdDetected) {
          this.onAdDetected(result);
        }

        return result;
      }
    }

    this.consecutiveDetections = 0;
    return { isAd: false, confidence: 0, action: 'none' };
  }

  /**
   * Combined detection - uses EPG first, then audio patterns
   */
  async detect(
    currentProgramTitle?: string,
    programDuration?: number,
    audioLevel?: number,
    frequency?: number,
  ): Promise<AdDetectionResult> {
    // First try EPG-based detection (most reliable without native code)
    if (this.config.useEpgDetection) {
      const epgResult = await this.detectFromEPG(currentProgramTitle, programDuration);
      if (epgResult.isAd) {
        return epgResult;
      }
    }

    // Fall back to audio analysis if available
    if (audioLevel !== undefined) {
      return this.analyzeAudio(audioLevel, frequency);
    }

    return { isAd: false, confidence: 0, action: 'none' };
  }

  private checkPattern(
    pattern: AdPattern,
    audioLevel: number,
    frequency?: number,
  ): { isMatch: boolean; confidence: number } {
    switch (pattern.type) {
      case 'volume':
        if (audioLevel > pattern.threshold) {
          return { isMatch: true, confidence: 0.85 };
        }
        break;

      case 'silence':
        if (audioLevel < pattern.threshold) {
          return { isMatch: true, confidence: 0.75 };
        }
        break;

      case 'frequency':
        if (frequency && frequency > pattern.threshold) {
          return { isMatch: true, confidence: 0.7 };
        }
        break;

      case 'duration':
        return { isMatch: false, confidence: 0 };
    }

    return { isMatch: false, confidence: 0 };
  }

  /**
   * Quick detection for testing - simulates ad detection
   */
  simulateAdDetection(audioLevel: number): AdDetectionResult {
    if (audioLevel > 1.3 || audioLevel < 0.05) {
      return {
        isAd: true,
        confidence: 0.9,
        patternMatched: audioLevel > 1.3 ? 'Sudden Volume Increase' : 'Extended Silence',
        action: 'mute',
        reason: 'Simulated ad detection for testing',
      };
    }

    return { isAd: false, confidence: 0, action: 'none' };
  }

  getReducedVolume(): number {
    const reduction = this.currentVolume * (this.config.volumeReductionPercent / 100);
    return Math.max(0, this.currentVolume - reduction);
  }

  notifyAdEnded(): void {
    if (this.onAdEnded) {
      this.onAdEnded();
    }
  }

  /**
   * Check if current time is likely during commercial break
   */
  isCommercialTime(): boolean {
    const now = new Date();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const timeIntoHour = minutes * 60 + seconds;

    return this.config.commercialSlots.some((slotMinute) => {
      const slotSeconds = slotMinute * 60;
      return Math.abs(timeIntoHour - slotSeconds) < 180; // Within 3 minutes
    });
  }
}
