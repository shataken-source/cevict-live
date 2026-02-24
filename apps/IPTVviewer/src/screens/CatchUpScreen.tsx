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
import { Channel } from '@/types';
import { CatchUpService, CatchUpProgram, CatchUpDay } from '@/services/CatchUpService';
import { useStore } from '@/store/useStore';

interface CatchUpScreenProps {
  route: {
    params: {
      channel: Channel;
    };
  };
  navigation: any;
}

export default function CatchUpScreen({ route, navigation }: CatchUpScreenProps) {
  const { channel } = route.params;
  const [catchUpDays, setCatchUpDays] = useState<CatchUpDay[]>([]);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [recentPrograms, setRecentPrograms] = useState<CatchUpProgram[]>([]);

  const { epgUrl } = useStore();
  const maxDays = CatchUpService.getCatchUpDays(channel);

  useEffect(() => {
    loadCatchUp();
    loadRecent();
  }, [channel, epgUrl]);

  const loadCatchUp = async () => {
    setIsLoading(true);
    try {
      const days = await CatchUpService.getCatchUpForChannel(channel, maxDays, epgUrl);
      setCatchUpDays(days);
    } catch (error) {
      console.error('Error loading catch-up:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecent = async () => {
    const recent = await CatchUpService.getRecentCatchUp();
    setRecentPrograms(recent.filter(p => p.channelId === channel.id).slice(0, 5));
  };

  const handlePlayProgram = useCallback(async (program: CatchUpProgram) => {
    if (!program.streamUrl) {
      Alert.alert('Unavailable', 'This program is not available for catch-up playback.');
      return;
    }
    await CatchUpService.saveRecentCatchUp(program);
    navigation.navigate('Player', {
      channel: {
        ...channel,
        url: program.streamUrl,
        name: `${channel.name} - ${program.title}`,
      },
    });
  }, [channel, navigation]);

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatDayLabel = (date: Date, index: number) => {
    if (index === 0) return 'Today';
    if (index === 1) return 'Yesterday';
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
  };

  const selectedDay = catchUpDays[selectedDayIndex];

  const renderDayTab = (day: CatchUpDay, index: number) => {
    const isActive = index === selectedDayIndex;
    return (
      <TouchableOpacity
        key={index}
        style={[styles.dayTab, isActive && styles.dayTabActive]}
        onPress={() => setSelectedDayIndex(index)}>
        <Text style={[styles.dayTabText, isActive && styles.dayTabTextActive]}>
          {formatDayLabel(day.date, index)}
        </Text>
        <Text style={[styles.dayTabCount, isActive && styles.dayTabCountActive]}>
          {day.programs.length} programs
        </Text>
      </TouchableOpacity>
    );
  };

  const renderProgram = ({ item }: { item: CatchUpProgram }) => {
    const now = new Date();
    const isLive = item.startTime <= now && item.endTime > now;
    const isPast = item.endTime <= now;

    return (
      <TouchableOpacity
        style={[styles.programItem, isLive && styles.programItemLive]}
        onPress={() => handlePlayProgram(item)}
        disabled={!isPast && !isLive}>
        <View style={styles.programTime}>
          <Text style={styles.programTimeText}>{formatTime(item.startTime)}</Text>
          <Text style={styles.programTimeSep}>-</Text>
          <Text style={styles.programTimeText}>{formatTime(item.endTime)}</Text>
        </View>
        <View style={styles.programInfo}>
          <Text style={styles.programTitle} numberOfLines={1}>{item.title}</Text>
          {item.description && (
            <Text style={styles.programDesc} numberOfLines={2}>{item.description}</Text>
          )}
          <View style={styles.programMeta}>
            <Text style={styles.programDuration}>{item.duration} min</Text>
            {item.genre && <Text style={styles.programGenre}>{item.genre}</Text>}
          </View>
        </View>
        <View style={styles.programAction}>
          {isLive ? (
            <View style={styles.liveBadge}>
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
          ) : isPast ? (
            <Text style={styles.playIcon}>▶</Text>
          ) : (
            <Text style={styles.futureText}>Upcoming</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading catch-up guide...</Text>
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
          <Text style={styles.headerTitle}>Catch-Up TV</Text>
          <Text style={styles.headerSubtitle}>{channel.name} - Last {maxDays} days</Text>
        </View>
      </View>

      {/* Day Tabs */}
      <View style={styles.dayTabsContainer}>
        <FlatList
          horizontal
          data={catchUpDays}
          renderItem={({ item, index }) => renderDayTab(item, index)}
          keyExtractor={(_, index) => `day-${index}`}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayTabsList}
        />
      </View>

      {/* Recent Section */}
      {recentPrograms.length > 0 && selectedDayIndex === 0 && (
        <View style={styles.recentSection}>
          <Text style={styles.recentTitle}>Continue Watching</Text>
          <FlatList
            horizontal
            data={recentPrograms}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.recentItem}
                onPress={() => handlePlayProgram(item)}>
                <Text style={styles.recentItemTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.recentItemTime}>{formatTime(item.startTime)}</Text>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
          />
        </View>
      )}

      {/* Program List */}
      {selectedDay ? (
        <FlatList
          data={selectedDay.programs}
          renderItem={renderProgram}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.programList}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No catch-up programs available</Text>
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
  dayTabsContainer: {
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  dayTabsList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  dayTab: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 100,
  },
  dayTabActive: {
    backgroundColor: '#3b82f6',
  },
  dayTabText: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '600',
  },
  dayTabTextActive: {
    color: '#fff',
  },
  dayTabCount: {
    color: '#666',
    fontSize: 11,
    marginTop: 2,
  },
  dayTabCountActive: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  recentSection: {
    paddingVertical: 12,
    paddingLeft: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  recentTitle: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  recentItem: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginRight: 10,
    minWidth: 140,
  },
  recentItemTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  recentItemTime: {
    color: '#60a5fa',
    fontSize: 12,
    marginTop: 4,
  },
  programList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  programItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  programItemLive: {
    borderWidth: 1,
    borderColor: '#FF3B30',
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
  },
  programTime: {
    alignItems: 'center',
    minWidth: 60,
    marginRight: 14,
  },
  programTimeText: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '600',
  },
  programTimeSep: {
    color: '#555',
    fontSize: 10,
  },
  programInfo: {
    flex: 1,
  },
  programTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  programDesc: {
    color: '#888',
    fontSize: 13,
    marginTop: 4,
  },
  programMeta: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  programDuration: {
    color: '#666',
    fontSize: 12,
  },
  programGenre: {
    color: '#666',
    fontSize: 12,
  },
  programAction: {
    marginLeft: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  liveBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  liveBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  playIcon: {
    color: '#3b82f6',
    fontSize: 24,
  },
  futureText: {
    color: '#555',
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
  },
});
