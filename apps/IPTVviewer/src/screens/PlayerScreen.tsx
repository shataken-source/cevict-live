import React, {useRef, useState, useEffect} from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  TVEventHandler,
  Platform,
} from 'react-native';
import Video from 'react-native-video';
import {useStore} from '@/store/useStore';
import {Channel} from '@/types';
import {AdDetectionService, AdDetectionResult} from '@/services/AdDetectionService';

interface PlayerScreenProps {
  route: {
    params: {
      channel: Channel;
    };
  };
  navigation: any;
}

export default function PlayerScreen({route, navigation}: PlayerScreenProps) {
  const {channel} = route.params;
  const videoRef = useRef<Video>(null);
  
  const {
    setCurrentChannel,
    goToPreviousChannel,
    setPlaying,
    setVolume,
    toggleMute,
    volume,
    isMuted,
    previousChannel,
  } = useStore();

  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);
  const [adDetection, setAdDetection] = useState(true);
  const [isAdPlaying, setIsAdPlaying] = useState(false);
  const [originalVolume, setOriginalVolume] = useState(volume);
  const adDetectionService = useRef(new AdDetectionService()).current;

  useEffect(() => {
    setCurrentChannel(channel);
    setPlaying(true);
    
    adDetectionService.setCallbacks(handleAdDetected, handleAdEnded);
    adDetectionService.startMonitoring(volume);
    
    const tvEventHandler = new TVEventHandler();
    tvEventHandler.enable(this, (cmp, evt) => {
      if (evt && evt.eventType === 'select') {
        handlePreviousChannel();
      }
    });

    const adCheckInterval = setInterval(() => {
      if (adDetection) {
        simulateAdCheck();
      }
    }, 3000);

    return () => {
      tvEventHandler.disable();
      setPlaying(false);
      adDetectionService.stopMonitoring();
      clearInterval(adCheckInterval);
    };
  }, [channel]);

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
      setTimeout(() => handleAdEnded(), 10000);
    }
  };

  const toggleAdDetection = () => {
    setAdDetection(!adDetection);
    const config = adDetectionService.getConfig();
    adDetectionService.setConfig({...config, enabled: !adDetection});
  };

  const handlePreviousChannel = () => {
    if (previousChannel) {
      navigation.replace('Player', {channel: previousChannel});
    }
  };

  const showControlsTemporarily = () => {
    setShowControls(true);
    if (controlsTimeout) {
      clearTimeout(controlsTimeout);
    }
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
        source={{uri: channel.url}}
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
