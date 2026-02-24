import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  BackHandler,
  Platform,
  Pressable,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useStore } from '@/store/useStore';
import { Channel } from '@/types';
import { AdDetectionService, AdDetectionResult } from '@/services/AdDetectionService';
import { EPGService } from '@/services/EPGService';
import type { EPGProgram } from '@/types';

interface PlayerScreenProps {
  route: {
    params: {
      channel: Channel;
      fromChannel?: Channel; // Explicit previous channel from navigation
    };
  };
  navigation: any;
}

export default function PlayerScreen({ route, navigation }: PlayerScreenProps) {
  const { channel, fromChannel: initialPrevious } = route.params;
  const videoRef = useRef<any>(null);
  const adTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Use navigation param first, fall back to store for previous channel
  const [prevChannel, setPrevChannel] = useState<Channel | null>(initialPrevious || null);
  const prevChannelRef = useRef<Channel | null>(initialPrevious || null);

  // Other state
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [adDetection, setAdDetection] = useState(true);
  const [isAdPlaying, setIsAdPlaying] = useState(false);
  const [currentProgram, setCurrentProgram] = useState<EPGProgram | null>(null);
  const adDetectionService = useRef(new AdDetectionService()).current;
  const originalVolumeRef = useRef(50); // initialized to store default; updated on ad detection

  const {
    setCurrentChannel,
    setPlaying,
    setVolume,
    toggleMute,
    volume,
    isMuted,
    adConfig,
    epgUrl,
  } = useStore();

  const [originalVolume, setOriginalVolume] = useState(volume);

  // Handle previous channel switch - FLAWLESS IMPLEMENTATION
  const handlePreviousChannel = useCallback(() => {
    const prev = prevChannelRef.current;
    if (prev) {
      // CRITICAL: Store current channel as the new previous BEFORE navigating
      // This ensures we can switch back again
      setCurrentChannel(channel);
      // Update refs for the new navigation
      prevChannelRef.current = channel;
      // Navigate with explicit fromChannel for the new screen
      navigation.replace('Player', { channel: prev, fromChannel: channel });
    }
  }, [channel, navigation, setCurrentChannel]);

  // Initialize previous channel when navigating between channels
  useEffect(() => {
    if (initialPrevious) {
      setPrevChannel(initialPrevious);
      prevChannelRef.current = initialPrevious;
    }
  }, [initialPrevious]);

  useEffect(() => {
    setCurrentChannel(channel);
    setPlaying(true);

    const cfg = adDetectionService.getConfig();
    adDetectionService.setConfig({
      ...cfg,
      enabled: adConfig.enabled,
      volumeReductionPercent: adConfig.volumeReductionPercent,
    });
    adDetectionService.setCallbacks(handleAdDetected, handleAdEnded);
    adDetectionService.startMonitoring(volume);

    // Back button: return to channel list
    const backSub = BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.goBack();
      return true;
    });

    // Note: D-pad Select button is handled via on-screen "Previous" button
    // because TVEventHandler is unreliable in function components
    // Users can tap the on-screen Previous button to switch channels

    const adCheckInterval = setInterval(() => {
      if (adDetection) {
        simulateAdCheck();
      }
    }, 3000);

    return () => {
      backSub.remove();
      setPlaying(false);
      adDetectionService.stopMonitoring();
      clearInterval(adCheckInterval);
      if (adTimeoutRef.current) clearTimeout(adTimeoutRef.current);
    };
  }, [channel, adConfig.enabled, adConfig.volumeReductionPercent]);

  // Auto-hide controls is handled by showControlsTemporarily()

  // EPG: fetch and show current program when epgUrl is set (match by tvgId or channel id)
  useEffect(() => {
    if (!epgUrl?.trim()) {
      setCurrentProgram(null);
      return;
    }
    const channelId = channel.tvgId || channel.id;
    let cancelled = false;
    EPGService.fetchEPG(epgUrl.trim()).then((programs) => {
      if (cancelled) return;
      const program = EPGService.getCurrentProgram(programs, channelId);
      setCurrentProgram(program ?? null);
    }).catch(() => {
      if (!cancelled) setCurrentProgram(null);
    });
    return () => { cancelled = true; };
  }, [epgUrl, channel.id, channel.tvgId]);

  const handleAdDetected = (result: AdDetectionResult) => {
    console.log('Ad detected:', result);
    setIsAdPlaying(true);
    originalVolumeRef.current = volume;
    setOriginalVolume(volume);

    if (result.action === 'mute') {
      setVolume(0);
    } else if (result.action === 'reduce') {
      const reducedVol = adDetectionService.getReducedVolume();
      setVolume(reducedVol);
    }
  };

  const handleAdEnded = () => {
    console.log('Ad ended, restoring volume');
    setIsAdPlaying(false);
    setVolume(originalVolumeRef.current);
  };

  const simulateAdCheck = async () => {
    // Use real EPG-based detection instead of random simulation
    const programDuration = currentProgram?.end
      ? (currentProgram.end.getTime() - currentProgram.start.getTime()) / 1000
      : undefined;

    const result = await adDetectionService.detect(
      currentProgram?.title,
      programDuration,
    );

    if (result.isAd && !isAdPlaying) {
      console.log('[AdDetection] Ad detected:', result.reason);
      handleAdDetected(result);
      if (adTimeoutRef.current) clearTimeout(adTimeoutRef.current);
      adTimeoutRef.current = setTimeout(() => handleAdEnded(), 10000);
    }
  };

  const toggleAdDetection = () => {
    setAdDetection(!adDetection);
    const config = adDetectionService.getConfig();
    adDetectionService.setConfig({ ...config, enabled: !adDetection });
  };

  const showControlsTemporarily = () => {
    setShowControls(true);
    if (controlsTimeout) clearTimeout(controlsTimeout);
    const timeout = setTimeout(() => setShowControls(false), 5000);
    setControlsTimeout(timeout);
  };

  const handleVolumeUp = () => {
    const newVolume = Math.min(100, volume + 10);
    setVolume(newVolume);
    showControlsTemporarily();
  };

  const handleVolumeDown = () => {
    const newVolume = Math.max(0, volume - 10);
    setVolume(newVolume);
    showControlsTemporarily();
  };

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        source={{ uri: channel.url }}
        style={styles.video}
        resizeMode={ResizeMode.CONTAIN}
        volume={isMuted ? 0 : volume / 100}
        shouldPlay
        onError={(error: any) => console.error('Video error:', error)}
      />

      <TouchableOpacity
        style={styles.touchArea}
        onPress={showControlsTemporarily}
        activeOpacity={1}
      />

      {showControls && (
        <View style={styles.overlay}>
          <View style={styles.topBar}>
            <View>
              <Text style={styles.channelName}>{channel.name}</Text>
              {channel.group && (
                <Text style={styles.channelGroup}>{channel.group}</Text>
              )}
              {currentProgram && (
                <Text style={styles.epgNow} numberOfLines={1}>
                  Now: {currentProgram.title}
                </Text>
              )}
            </View>

            {isAdPlaying && (
              <View style={styles.adBadge}>
                <Text style={styles.adBadgeText}>AD MUTED</Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.adToggle,
                adDetection ? styles.adToggleOn : styles.adToggleOff,
              ]}
              onPress={toggleAdDetection}>
              <Text style={styles.adToggleText}>
                {adDetection ? 'AD Block: ON' : 'AD Block: OFF'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.goBack()}>
              <Text style={styles.buttonText}>Back</Text>
            </TouchableOpacity>

            {prevChannel && (
              <TouchableOpacity
                style={[styles.button, styles.previousButton]}
                onPress={handlePreviousChannel}>
                <Text style={styles.buttonText}>
                  Previous ({prevChannel.name})
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.button} onPress={toggleMute}>
              <Text style={styles.buttonText}>
                {isMuted ? 'Unmute' : 'Mute'}
              </Text>
            </TouchableOpacity>

            <View style={styles.volumeContainer}>
              <TouchableOpacity style={styles.button} onPress={handleVolumeDown}>
                <Text style={styles.buttonText}>Vol -</Text>
              </TouchableOpacity>
              <Text style={styles.volumeText}>{volume}</Text>
              <TouchableOpacity style={styles.button} onPress={handleVolumeUp}>
                <Text style={styles.buttonText}>Vol +</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  video: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  topBar: {
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  channelName: {
    fontSize: 32,
    color: '#fff',
    fontWeight: 'bold',
  },
  channelGroup: {
    fontSize: 20,
    color: '#ccc',
    marginTop: 5,
  },
  epgNow: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 4,
    fontStyle: 'italic',
  },
  adBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    position: 'absolute',
    right: 150,
    top: 20,
  },
  adBadgeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  adToggle: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  adToggleOn: {
    backgroundColor: '#34C759',
  },
  adToggleOff: {
    backgroundColor: '#666',
  },
  adToggleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomBar: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    gap: 15,
  },
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  previousButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.8)',
    flex: 1,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  volumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  volumeText: {
    color: '#fff',
    fontSize: 18,
    minWidth: 40,
    textAlign: 'center',
  },
  touchArea: {
    ...StyleSheet.absoluteFillObject,
  },
});
