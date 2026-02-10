import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  BackHandler,
} from 'react-native';
import Video from 'react-native-video';
import { useStore } from '@/store/useStore';
import { Channel } from '@/types';
import { AdDetectionService, AdDetectionResult } from '@/services/AdDetectionService';
import { EPGService } from '@/services/EPGService';
import type { EPGProgram } from '@/types';

interface PlayerScreenProps {
  route: {
    params: {
      channel: Channel;
    };
  };
  navigation: any;
}

export default function PlayerScreen({ route, navigation }: PlayerScreenProps) {
  const { channel } = route.params;
  const videoRef = useRef<Video>(null);
  const adTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    setCurrentChannel,
    setPlaying,
    setVolume,
    toggleMute,
    volume,
    isMuted,
    previousChannel,
    adConfig,
    epgUrl,
  } = useStore();

  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [adDetection, setAdDetection] = useState(true);
  const [isAdPlaying, setIsAdPlaying] = useState(false);
  const [originalVolume, setOriginalVolume] = useState(volume);
  const [currentProgram, setCurrentProgram] = useState<EPGProgram | null>(null);
  const adDetectionService = useRef(new AdDetectionService()).current;

  const handlePreviousChannel = useCallback(() => {
    if (previousChannel) {
      navigation.replace('Player', { channel: previousChannel });
    }
  }, [previousChannel, navigation]);

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

    // Back button: return to channel list. (TVEventHandler with "this" is undefined in function components and was removed.)
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.goBack();
      return true;
    });

    const adCheckInterval = setInterval(() => {
      if (adDetection) {
        simulateAdCheck();
      }
    }, 3000);

    return () => {
      sub.remove();
      setPlaying(false);
      adDetectionService.stopMonitoring();
      clearInterval(adCheckInterval);
      if (adTimeoutRef.current) clearTimeout(adTimeoutRef.current);
    };
  }, [channel, adConfig.enabled, adConfig.volumeReductionPercent]);

  // Auto-hide controls after 5s when they're shown (tap screen to show again)
  useEffect(() => {
    if (!showControls) return;
    const t = setTimeout(() => setShowControls(false), 5000);
    return () => clearTimeout(t);
  }, [showControls]);

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
    setVolume(originalVolume);
  };

  const simulateAdCheck = () => {
    const randomLevel = Math.random() * 2;
    const result = adDetectionService.simulateAdDetection(randomLevel);

    if (result.isAd && !isAdPlaying) {
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
        resizeMode="contain"
        volume={isMuted ? 0 : volume / 100}
        paused={false}
        onError={(error) => console.error('Video error:', error)}
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

            {previousChannel && (
              <TouchableOpacity
                style={[styles.button, styles.previousButton]}
                onPress={handlePreviousChannel}>
                <Text style={styles.buttonText}>
                  Previous ({previousChannel.name})
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

      <TouchableOpacity
        style={styles.touchArea}
        onPress={showControlsTemporarily}
        activeOpacity={1}
      />
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
