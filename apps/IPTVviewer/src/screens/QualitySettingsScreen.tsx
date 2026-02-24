import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Switch,
} from 'react-native';
import {
  StreamQualityService,
  StreamQuality,
  QualityOption,
  StreamHealth,
} from '@/services/StreamQualityService';

interface QualitySettingsScreenProps {
  navigation: any;
}

export default function QualitySettingsScreen({ navigation }: QualitySettingsScreenProps) {
  const [currentQuality, setCurrentQuality] = useState<StreamQuality>('auto');
  const [qualityOptions, setQualityOptions] = useState<QualityOption[]>([]);
  const [streamHealth, setStreamHealth] = useState<StreamHealth | null>(null);
  const [bandwidth, setBandwidth] = useState<number | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [hwAccelEnabled, setHwAccelEnabled] = useState(true);
  const [serverStatus, setServerStatus] = useState<{
    uptime: number;
    status: 'online' | 'degraded' | 'offline';
    lastCheck: Date;
  } | null>(null);

  const bufferConfig = StreamQualityService.getBufferConfig();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const [quality, hwAccel, health, server] = await Promise.all([
      StreamQualityService.getQualityPreference(),
      StreamQualityService.isHardwareAccelerationEnabled(),
      StreamQualityService.monitorStreamHealth(),
      StreamQualityService.getServerUptime(),
    ]);
    setCurrentQuality(quality);
    setHwAccelEnabled(hwAccel);
    setStreamHealth(health);
    setServerStatus(server);
  };

  const handleRunBandwidthTest = useCallback(async () => {
    setIsTesting(true);
    setBandwidth(null);
    try {
      const result = await StreamQualityService.measureBandwidth();
      setBandwidth(result);
      // Reload quality options with new bandwidth data
      const mockChannel = { id: 'test', name: 'Test', url: 'http://test' };
      const options = await StreamQualityService.getAvailableQualities(mockChannel);
      setQualityOptions(options);
    } catch (error) {
      console.error('Bandwidth test failed:', error);
    } finally {
      setIsTesting(false);
    }
  }, []);

  const handleQualityChange = useCallback(async (quality: StreamQuality) => {
    setCurrentQuality(quality);
    await StreamQualityService.saveQualityPreference(quality);
  }, []);

  const handleToggleHwAccel = useCallback(async (enabled: boolean) => {
    setHwAccelEnabled(enabled);
    await StreamQualityService.setHardwareAcceleration(enabled);
  }, []);

  const formatBandwidth = (kbps: number) => {
    if (kbps >= 1000) return `${(kbps / 1000).toFixed(1)} Mbps`;
    return `${kbps} kbps`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return '#34C759';
      case 'degraded': return '#fbbf24';
      case 'offline': return '#FF3B30';
      default: return '#888';
    }
  };

  const getHealthColor = (value: number) => {
    if (value >= 80) return '#34C759';
    if (value >= 50) return '#fbbf24';
    return '#FF3B30';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Quality Settings</Text>
          <Text style={styles.headerSubtitle}>Stream quality & performance</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Server Status */}
        {serverStatus && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Server Status</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(serverStatus.status) }]} />
              <Text style={styles.statusLabel}>
                {serverStatus.status.charAt(0).toUpperCase() + serverStatus.status.slice(1)}
              </Text>
              <Text style={styles.statusUptime}>{serverStatus.uptime}% uptime</Text>
            </View>
          </View>
        )}

        {/* Bandwidth Test */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bandwidth</Text>
          <View style={styles.bandwidthCard}>
            {bandwidth !== null && (
              <View style={styles.bandwidthResult}>
                <Text style={styles.bandwidthValue}>{formatBandwidth(bandwidth)}</Text>
                <Text style={styles.bandwidthLabel}>Current Speed</Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.testButton, isTesting && styles.testButtonDisabled]}
              onPress={handleRunBandwidthTest}
              disabled={isTesting}>
              {isTesting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.testButtonText}>
                  {bandwidth !== null ? 'Re-test' : 'Run Speed Test'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Quality Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Default Quality</Text>
          <Text style={styles.sectionDesc}>
            Applies to all streams. Auto adapts to your connection speed.
          </Text>
          {(['auto', '4k', '1080p', '720p', '480p', '360p'] as StreamQuality[]).map((q) => {
            const opt = qualityOptions.find(o => o.quality === q);
            const isActive = currentQuality === q;
            const isDisabled = opt ? !opt.available : false;
            const labels: Record<StreamQuality, string> = {
              auto: 'Auto (Adaptive)',
              '4k': '4K UHD',
              '1080p': 'Full HD 1080p',
              '720p': 'HD 720p',
              '480p': 'SD 480p',
              '360p': 'Low 360p',
            };
            const bitrates: Record<StreamQuality, string> = {
              auto: 'Adapts automatically',
              '4k': '25 Mbps',
              '1080p': '8 Mbps',
              '720p': '5 Mbps',
              '480p': '2.5 Mbps',
              '360p': '1 Mbps',
            };

            return (
              <TouchableOpacity
                key={q}
                style={[
                  styles.qualityRow,
                  isActive && styles.qualityRowActive,
                  isDisabled && styles.qualityRowDisabled,
                ]}
                onPress={() => handleQualityChange(q)}
                disabled={isDisabled}>
                <View style={styles.qualityRowLeft}>
                  <Text style={[
                    styles.qualityLabel,
                    isActive && styles.qualityLabelActive,
                    isDisabled && styles.qualityLabelDisabled,
                  ]}>
                    {labels[q]}
                  </Text>
                  <Text style={[styles.qualityBitrate, isDisabled && styles.qualityLabelDisabled]}>
                    {bitrates[q]}
                  </Text>
                </View>
                {isActive && (
                  <View style={styles.activeBadge}>
                    <Text style={styles.activeBadgeText}>Active</Text>
                  </View>
                )}
                {isDisabled && (
                  <Text style={styles.disabledText}>Unavailable</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Stream Health */}
        {streamHealth && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Stream Health</Text>
            <View style={styles.healthGrid}>
              <View style={styles.healthTile}>
                <Text style={[styles.healthValue, { color: getHealthColor(streamHealth.bufferHealth) }]}>
                  {streamHealth.bufferHealth}%
                </Text>
                <Text style={styles.healthLabel}>Buffer</Text>
              </View>
              <View style={styles.healthTile}>
                <Text style={styles.healthValue}>{streamHealth.fps}</Text>
                <Text style={styles.healthLabel}>FPS</Text>
              </View>
              <View style={styles.healthTile}>
                <Text style={styles.healthValue}>{streamHealth.latency}ms</Text>
                <Text style={styles.healthLabel}>Latency</Text>
              </View>
              <View style={styles.healthTile}>
                <Text style={styles.healthValue}>{streamHealth.droppedFrames}</Text>
                <Text style={styles.healthLabel}>Dropped</Text>
              </View>
            </View>
          </View>
        )}

        {/* Buffer Config */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Buffer Configuration</Text>
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Buffer Size</Text>
            <Text style={styles.configValue}>{bufferConfig.bufferSize}s</Text>
          </View>
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Max Buffer</Text>
            <Text style={styles.configValue}>{bufferConfig.maxBufferSize}s</Text>
          </View>
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Min Buffer</Text>
            <Text style={styles.configValue}>{bufferConfig.minBufferSize}s</Text>
          </View>
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Rebuffer Threshold</Text>
            <Text style={styles.configValue}>{bufferConfig.rebufferThreshold}s</Text>
          </View>
        </View>

        {/* Hardware Acceleration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Advanced</Text>
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>Hardware Acceleration</Text>
              <Text style={styles.switchDesc}>Uses GPU for video decoding</Text>
            </View>
            <Switch
              value={hwAccelEnabled}
              onValueChange={handleToggleHwAccel}
              trackColor={{ false: '#333', true: '#3b82f6' }}
              thumbColor={hwAccelEnabled ? '#fff' : '#888'}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 16,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#888',
    fontSize: 14,
    marginTop: 2,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    color: '#888',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  sectionDesc: {
    color: '#666',
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: 14,
    borderRadius: 10,
    gap: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  statusUptime: {
    color: '#888',
    fontSize: 14,
  },
  bandwidthCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    gap: 16,
  },
  bandwidthResult: {
    alignItems: 'center',
  },
  bandwidthValue: {
    color: '#3b82f6',
    fontSize: 36,
    fontWeight: '700',
  },
  bandwidthLabel: {
    color: '#888',
    fontSize: 13,
    marginTop: 4,
  },
  testButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
    minWidth: 160,
    alignItems: 'center',
  },
  testButtonDisabled: {
    opacity: 0.6,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  qualityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 6,
  },
  qualityRowActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  qualityRowDisabled: {
    opacity: 0.4,
  },
  qualityRowLeft: {
    flex: 1,
  },
  qualityLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  qualityLabelActive: {
    color: '#60a5fa',
  },
  qualityLabelDisabled: {
    color: '#666',
  },
  qualityBitrate: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  activeBadge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  disabledText: {
    color: '#555',
    fontSize: 12,
  },
  healthGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  healthTile: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  healthValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  healthLabel: {
    color: '#888',
    fontSize: 11,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 8,
    marginBottom: 4,
  },
  configLabel: {
    color: '#aaa',
    fontSize: 14,
  },
  configValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: 16,
    borderRadius: 10,
  },
  switchLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  switchDesc: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
});
