export interface AdDetectionConfig {
  enabled: boolean;
  audioThreshold: number;
  volumeReductionPercent: number;
  silenceDuration: number;
  patterns: AdPattern[];
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
}

export class AdDetectionService {
  private config: AdDetectionConfig;
  private isMonitoring: boolean = false;
  private currentVolume: number = 50;
  private onAdDetected?: (result: AdDetectionResult) => void;
  private onAdEnded?: () => void;

  constructor(config?: AdDetectionConfig) {
    this.config = config || {
      enabled: true,
      audioThreshold: 0.8,
      volumeReductionPercent: 90,
      silenceDuration: 2000,
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
    this.config = config;
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
    console.log('Ad detection monitoring started');
  }

  stopMonitoring(): void {
    this.isMonitoring = false;
    console.log('Ad detection monitoring stopped');
  }

  async analyzeAudio(audioLevel: number, frequency?: number): Promise<AdDetectionResult> {
    if (!this.config.enabled || !this.isMonitoring) {
      return {isAd: false, confidence: 0, action: 'none'};
    }

    for (const pattern of this.config.patterns) {
      const match = this.checkPattern(pattern, audioLevel, frequency);
      
      if (match.isMatch) {
        const result: AdDetectionResult = {
          isAd: true,
          confidence: match.confidence,
          patternMatched: pattern.name,
          action: this.config.volumeReductionPercent >= 80 ? 'mute' : 'reduce',
        };

        if (this.onAdDetected) {
          this.onAdDetected(result);
        }

        return result;
      }
    }

    return {isAd: false, confidence: 0, action: 'none'};
  }

  private checkPattern(
    pattern: AdPattern,
    audioLevel: number,
    frequency?: number,
  ): {isMatch: boolean; confidence: number} {
    switch (pattern.type) {
      case 'volume':
        if (audioLevel > pattern.threshold) {
          return {isMatch: true, confidence: 0.85};
        }
        break;

      case 'silence':
        if (audioLevel < pattern.threshold) {
          return {isMatch: true, confidence: 0.75};
        }
        break;

      case 'frequency':
        if (frequency && frequency > pattern.threshold) {
          return {isMatch: true, confidence: 0.7};
        }
        break;

      case 'duration':
        return {isMatch: false, confidence: 0};
    }

    return {isMatch: false, confidence: 0};
  }

  simulateAdDetection(audioLevel: number): AdDetectionResult {
    if (audioLevel > 1.3 || audioLevel < 0.05) {
      return {
        isAd: true,
        confidence: 0.9,
        patternMatched: audioLevel > 1.3 ? 'Sudden Volume Increase' : 'Extended Silence',
        action: 'mute',
      };
    }

    return {isAd: false, confidence: 0, action: 'none'};
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
}
