import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { CloudDVRService, Recording } from '@/services/CloudDVRService';

interface RecordingsScreenProps {
  navigation: any;
}

type TabId = 'active' | 'completed' | 'all';

export default function RecordingsScreen({ navigation }: RecordingsScreenProps) {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [storageUsage, setStorageUsage] = useState({
    used: 0,
    total: 50,
    percentage: 0,
    recordingCount: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [allRecordings, usage] = await Promise.all([
        CloudDVRService.getRecordings(),
        CloudDVRService.getStorageUsage(),
      ]);
      setRecordings(allRecordings);
      setStorageUsage(usage);
    } catch (error) {
      console.error('Error loading recordings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = useCallback((recording: Recording) => {
    Alert.alert(
      'Delete Recording',
      `Delete "${recording.programTitle}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await CloudDVRService.deleteRecording(recording.id);
            await loadData();
          },
        },
      ]
    );
  }, []);

  const handlePlay = useCallback((recording: Recording) => {
    if (!recording.streamUrl) {
      Alert.alert('Unavailable', 'Playback URL not available for this recording.');
      return;
    }
    navigation.navigate('Player', {
      channel: {
        id: recording.channelId,
        name: `${recording.channelName} - ${recording.programTitle}`,
        url: recording.streamUrl,
        logo: recording.channelLogo,
      },
    });
  }, [navigation]);

  const handleStopRecording = useCallback(async (recording: Recording) => {
    await CloudDVRService.stopRecording(recording.id);
    await loadData();
  }, []);

  const handleClearAll = useCallback(() => {
    Alert.alert(
      'Clear All Recordings',
      'Delete all recordings? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            await CloudDVRService.clearAllRecordings();
            await loadData();
          },
        },
      ]
    );
  }, []);

  const filteredRecordings = recordings.filter((r) => {
    if (activeTab === 'active') return r.status === 'recording';
    if (activeTab === 'completed') return r.status === 'completed';
    return true;
  }).sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const renderRecording = ({ item }: { item: Recording }) => {
    const isActive = item.status === 'recording';
    const isFailed = item.status === 'failed';

    return (
      <View style={[styles.recordingItem, isActive && styles.recordingItemActive]}>
        <View style={styles.recordingMain}>
          <View style={styles.recordingHeader}>
            <Text style={styles.recordingTitle} numberOfLines={1}>
              {item.programTitle}
            </Text>
            <View style={[
              styles.statusBadge,
              isActive && styles.statusRecording,
              isFailed && styles.statusFailed,
              item.status === 'completed' && styles.statusCompleted,
            ]}>
              <Text style={styles.statusText}>
                {isActive ? 'REC' : item.status === 'completed' ? 'Done' : item.status.toUpperCase()}
              </Text>
            </View>
          </View>

          <Text style={styles.recordingChannel}>{item.channelName}</Text>

          <View style={styles.recordingMeta}>
            <Text style={styles.recordingMetaText}>{formatDate(item.recordedAt)}</Text>
            <Text style={styles.recordingMetaDot}>·</Text>
            <Text style={styles.recordingMetaText}>{formatDuration(item.duration)}</Text>
            {item.fileSize && (
              <>
                <Text style={styles.recordingMetaDot}>·</Text>
                <Text style={styles.recordingMetaText}>{item.fileSize} MB</Text>
              </>
            )}
          </View>

          {isActive && item.progress !== undefined && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${item.progress}%` }]} />
              </View>
              <Text style={styles.progressText}>{item.progress}%</Text>
            </View>
          )}
        </View>

        <View style={styles.recordingActions}>
          {isActive ? (
            <TouchableOpacity
              style={styles.stopButton}
              onPress={() => handleStopRecording(item)}>
              <Text style={styles.stopButtonText}>Stop</Text>
            </TouchableOpacity>
          ) : item.status === 'completed' ? (
            <>
              <TouchableOpacity
                style={styles.playButton}
                onPress={() => handlePlay(item)}>
                <Text style={styles.playButtonText}>Play</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(item)}>
                <Text style={styles.deleteButtonText}>Del</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDelete(item)}>
              <Text style={styles.deleteButtonText}>Del</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF3B30" />
        <Text style={styles.loadingText}>Loading recordings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Cloud DVR</Text>
          <Text style={styles.headerSubtitle}>
            {storageUsage.recordingCount} recordings
          </Text>
        </View>
        {recordings.length > 0 && (
          <TouchableOpacity style={styles.clearAllButton} onPress={handleClearAll}>
            <Text style={styles.clearAllText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Storage Bar */}
      <View style={styles.storageSection}>
        <View style={styles.storageHeader}>
          <Text style={styles.storageLabel}>Cloud Storage</Text>
          <Text style={styles.storageValue}>
            {storageUsage.used} GB / {storageUsage.total} GB
          </Text>
        </View>
        <View style={styles.storageBar}>
          <View
            style={[
              styles.storageFill,
              { width: `${Math.min(storageUsage.percentage, 100)}%` },
              storageUsage.percentage > 80 && styles.storageFillWarning,
              storageUsage.percentage > 95 && styles.storageFillCritical,
            ]}
          />
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {(['all', 'active', 'completed'] as TabId[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'all' ? 'All' : tab === 'active' ? 'Recording' : 'Completed'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recordings List */}
      {filteredRecordings.length > 0 ? (
        <FlatList
          data={filteredRecordings}
          renderItem={renderRecording}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Recordings</Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === 'active'
              ? 'No active recordings. Start recording from the player.'
              : activeTab === 'completed'
              ? 'No completed recordings yet.'
              : 'Record live TV from the player screen.'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a0a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
    marginTop: 16,
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
  clearAllButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  clearAllText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
  },
  storageSection: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  storageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  storageLabel: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
  },
  storageValue: {
    color: '#aaa',
    fontSize: 13,
  },
  storageBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  storageFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 3,
  },
  storageFillWarning: {
    backgroundColor: '#fbbf24',
  },
  storageFillCritical: {
    backgroundColor: '#FF3B30',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 10,
    backgroundColor: '#0a0a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  tab: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  tabActive: {
    backgroundColor: '#FF3B30',
  },
  tabText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
  },
  recordingItem: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  recordingItemActive: {
    borderWidth: 1,
    borderColor: '#FF3B30',
    backgroundColor: 'rgba(255, 59, 48, 0.06)',
  },
  recordingMain: {
    flex: 1,
  },
  recordingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recordingTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusRecording: {
    backgroundColor: '#FF3B30',
  },
  statusCompleted: {
    backgroundColor: 'rgba(52, 199, 89, 0.2)',
  },
  statusFailed: {
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  recordingChannel: {
    color: '#888',
    fontSize: 13,
    marginTop: 4,
  },
  recordingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  recordingMetaText: {
    color: '#666',
    fontSize: 12,
  },
  recordingMetaDot: {
    color: '#444',
    fontSize: 12,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 10,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF3B30',
    borderRadius: 2,
  },
  progressText: {
    color: '#FF3B30',
    fontSize: 12,
    fontWeight: '600',
    minWidth: 36,
  },
  recordingActions: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    gap: 8,
  },
  playButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  playButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  stopButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: '#666',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
});
