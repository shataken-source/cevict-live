import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useStore } from '@/store/useStore';
import { Channel } from '@/types';

interface SearchScreenProps {
  navigation: any;
}

type SearchType = 'all' | 'channels' | 'movies' | 'series';

const RECENT_SEARCHES_KEY = 'recent_searches';

export default function SearchScreen({ navigation }: SearchScreenProps) {
  const { currentPlaylist, favorites } = useStore();
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('all');
  const [recentSearches] = useState<string[]>([
    'ESPN SportsCenter',
    'NFL Network',
    'Breaking Bad',
  ]);

  const allChannels: Channel[] = currentPlaylist?.channels || [];

  const getFilteredResults = useCallback((): Channel[] => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();

    let pool = allChannels;
    if (searchType === 'channels') {
      pool = allChannels.filter(c => !c.group?.toLowerCase().includes('movie') && !c.group?.toLowerCase().includes('series'));
    } else if (searchType === 'movies') {
      pool = allChannels.filter(c => c.group?.toLowerCase().includes('movie') || c.group?.toLowerCase().includes('vod'));
    } else if (searchType === 'series') {
      pool = allChannels.filter(c => c.group?.toLowerCase().includes('series') || c.group?.toLowerCase().includes('show'));
    }

    return pool.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.group || '').toLowerCase().includes(q)
    ).slice(0, 60);
  }, [query, searchType, allChannels]);

  const getTrending = (): Channel[] => {
    return allChannels
      .filter(c => favorites.includes(c.id))
      .slice(0, 8);
  };

  const results = getFilteredResults();
  const trending = getTrending();

  const renderChannel = ({ item }: { item: Channel }) => (
    <TouchableOpacity
      style={styles.channelRow}
      onPress={() => navigation.navigate('Player', { channel: item })}
    >
      <View style={[styles.channelIcon, { backgroundColor: 'rgba(229,0,0,0.12)' }]}>
        <Text style={styles.channelIconText}>
          {item.name.substring(0, 2).toUpperCase()}
        </Text>
      </View>
      <View style={styles.channelInfo}>
        <Text style={styles.channelName} numberOfLines={1}>{item.name}</Text>
        {item.group ? <Text style={styles.channelGroup}>{item.group}</Text> : null}
      </View>
    </TouchableOpacity>
  );

  const TABS: { id: SearchType; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'channels', label: '📡 Channels' },
    { id: 'movies', label: '🎬 Movies' },
    { id: 'series', label: '🎭 Series' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🔍 Search</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancelBtn}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.inputWrap}>
        <TextInput
          style={styles.input}
          placeholder="Search channels, movies, shows..."
          placeholderTextColor="#666"
          value={query}
          onChangeText={setQuery}
          autoFocus
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Type Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabRow} contentContainerStyle={styles.tabRowContent}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, searchType === tab.id && styles.tabActive]}
            onPress={() => setSearchType(tab.id)}
          >
            <Text style={[styles.tabText, searchType === tab.id && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {query.trim() === '' ? (
        <ScrollView style={styles.content}>
          {/* Recent Searches */}
          <Text style={styles.sectionTitle}>Recent Searches</Text>
          {recentSearches.map((s, i) => (
            <TouchableOpacity key={i} style={styles.recentRow} onPress={() => setQuery(s)}>
              <Text style={styles.recentIcon}>🕐</Text>
              <Text style={styles.recentText}>{s}</Text>
              <Text style={styles.recentX}>✕</Text>
            </TouchableOpacity>
          ))}

          {/* Trending */}
          {trending.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Trending Now</Text>
              {trending.map(ch => (
                <TouchableOpacity
                  key={ch.id}
                  style={styles.channelRow}
                  onPress={() => navigation.navigate('Player', { channel: ch })}
                >
                  <View style={styles.channelIcon}>
                    <Text style={styles.channelIconText}>{ch.name.substring(0, 2).toUpperCase()}</Text>
                  </View>
                  <View style={styles.channelInfo}>
                    <Text style={styles.channelName} numberOfLines={1}>{ch.name}</Text>
                    {ch.group ? <Text style={styles.channelGroup}>{ch.group}</Text> : null}
                  </View>
                  <View style={styles.trendingBadge}>
                    <Text style={styles.trendingBadgeText}>★ FAV</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}
        </ScrollView>
      ) : (
        <>
          {results.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>No results for "{query}"</Text>
              <Text style={styles.emptySubtext}>Try a different search term</Text>
            </View>
          ) : (
            <FlatList
              data={results}
              keyExtractor={item => item.id}
              renderItem={renderChannel}
              style={styles.content}
              keyboardShouldPersistTaps="handled"
              ListHeaderComponent={
                <Text style={styles.resultsCount}>{results.length} result{results.length !== 1 ? 's' : ''}</Text>
              }
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 12,
    backgroundColor: '#13131a',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  cancelBtn: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  inputWrap: {
    margin: 14,
    backgroundColor: '#1a1a24',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  input: {
    color: '#fff',
    fontSize: 15,
    padding: 12,
  },
  tabRow: {
    flexGrow: 0,
    marginBottom: 8,
  },
  tabRowContent: {
    paddingHorizontal: 14,
    gap: 8,
    flexDirection: 'row',
  },
  tab: {
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#1a1a24',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginRight: 8,
  },
  tabActive: {
    backgroundColor: '#e50000',
    borderColor: '#e50000',
  },
  tabText: {
    color: '#8b8b9e',
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 14,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8b8b9e',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 8,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: 10,
  },
  recentIcon: {
    fontSize: 14,
    color: '#8b8b9e',
  },
  recentText: {
    flex: 1,
    fontSize: 13,
    color: '#aaa',
  },
  recentX: {
    fontSize: 12,
    color: '#555',
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 11,
    backgroundColor: '#1a1a24',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    marginBottom: 7,
  },
  channelIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: 'rgba(229,0,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  channelIconText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ff5555',
  },
  channelInfo: {
    flex: 1,
    minWidth: 0,
  },
  channelName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  channelGroup: {
    fontSize: 11,
    color: '#8b8b9e',
    marginTop: 1,
  },
  trendingBadge: {
    backgroundColor: 'rgba(255,193,7,0.15)',
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  trendingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffc107',
  },
  resultsCount: {
    fontSize: 11,
    color: '#8b8b9e',
    marginBottom: 10,
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
    opacity: 0.4,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#8b8b9e',
  },
});
