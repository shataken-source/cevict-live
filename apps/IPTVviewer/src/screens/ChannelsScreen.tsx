import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Image,
  ScrollView,
} from 'react-native';
import { useStore } from '@/store/useStore';
import { Channel } from '@/types';
import { EPGService } from '@/services/EPGService';

interface ChannelsScreenProps {
  navigation: any;
}

export default function ChannelsScreen({ navigation }: ChannelsScreenProps) {
  const {
    currentPlaylist,
    currentChannel,
    favorites,
    setCurrentChannel,
    toggleFavorite,
    epgUrl,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [nowPlaying, setNowPlaying] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    loadEPGData();
  }, [currentPlaylist, epgUrl]);

  const loadEPGData = async () => {
    if (!epgUrl || !currentPlaylist) return;

    try {
      const programs = await EPGService.fetchEPG(epgUrl);
      const now = new Date();
      const playing = new Map<string, string>();

      currentPlaylist.channels.forEach(channel => {
        const channelPrograms = programs.filter(p => 
          p.channelId === channel.tvgId || p.channelId === channel.id
        );
        const current = channelPrograms.find(p => 
          p.start <= now && p.end > now
        );
        if (current) {
          playing.set(channel.id, current.title);
        }
      });

      setNowPlaying(playing);
    } catch (error) {
      console.error('Error loading EPG:', error);
    }
  };

  const getCategories = (): string[] => {
    if (!currentPlaylist) return ['All'];
    
    const categories = new Set<string>(['All']);
    currentPlaylist.channels.forEach(channel => {
      if (channel.group) {
        categories.add(channel.group);
      }
    });
    
    return Array.from(categories).sort();
  };

  const getFilteredChannels = (): Channel[] => {
    if (!currentPlaylist) return [];

    let channels = currentPlaylist.channels;

    // Category filter
    if (selectedCategory !== 'All') {
      channels = channels.filter(c => c.group === selectedCategory);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      channels = channels.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.group?.toLowerCase().includes(query) ||
        c.channelNumber?.includes(query)
      );
    }

    return channels;
  };

  const renderChannel = ({ item }: { item: Channel }) => {
    const isFavorite = favorites.includes(item.id);
    const currentShow = nowPlaying.get(item.id);

    return (
      <TouchableOpacity
        style={styles.channelItem}
        onPress={() => {
          if (currentChannel) {
            setCurrentChannel(item);
          }
          navigation.navigate('Player', {
            channel: item,
            fromChannel: currentChannel || undefined,
          });
        }}>
        {/* Channel Number */}
        {item.channelNumber && (
          <View style={styles.channelNumberBox}>
            <Text style={styles.channelNumber}>{item.channelNumber}</Text>
          </View>
        )}

        {/* Channel Logo */}
        {item.logo ? (
          <Image
            source={{ uri: item.logo }}
            style={styles.channelLogo}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.channelLogoPlaceholder}>
            <Text style={styles.channelLogoText}>📺</Text>
          </View>
        )}

        {/* Channel Info */}
        <View style={styles.channelInfo}>
          <Text style={styles.channelName} numberOfLines={1}>
            {item.name}
          </Text>
          {currentShow && (
            <Text style={styles.nowPlaying} numberOfLines={1}>
              ▶ {currentShow}
            </Text>
          )}
          {item.group && !currentShow && (
            <Text style={styles.channelGroup} numberOfLines={1}>
              {item.group}
            </Text>
          )}
        </View>

        {/* Favorite Button */}
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={(e) => {
            e.stopPropagation();
            toggleFavorite(item.id);
          }}>
          <Text style={styles.favoriteIcon}>
            {isFavorite ? '★' : '☆'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const categories = getCategories();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Live TV</Text>
        <View style={styles.headerRight}>
          <Text style={styles.channelCount}>
            {getFilteredChannels().length} channels
          </Text>
        </View>
      </View>

      {/* Category Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryTabs}
        contentContainerStyle={styles.categoryTabsContent}>
        {categories.map(category => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryTab,
              selectedCategory === category && styles.categoryTabActive,
            ]}
            onPress={() => setSelectedCategory(category)}>
            <Text
              style={[
                styles.categoryTabText,
                selectedCategory === category && styles.categoryTabTextActive,
              ]}>
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search channels, numbers..."
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSearchQuery('')}>
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Channel List */}
      <FlatList
        data={getFilteredChannels()}
        renderItem={renderChannel}
        keyExtractor={item => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No channels found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255, 0, 100, 0.3)',
  },
  backButton: {
    padding: 12,
  },
  backButtonText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  channelCount: {
    fontSize: 18,
    color: '#999',
  },
  categoryTabs: {
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  categoryTabsContent: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
  },
  categoryTab: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#2a2a2a',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryTabActive: {
    backgroundColor: 'rgba(255, 0, 100, 0.2)',
    borderColor: '#ff0064',
  },
  categoryTabText: {
    fontSize: 18,
    color: '#999',
    fontWeight: '600',
  },
  categoryTabTextActive: {
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    margin: 24,
    marginBottom: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#333',
  },
  searchIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 20,
    color: '#fff',
    paddingVertical: 16,
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    fontSize: 24,
    color: '#666',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 24,
    paddingTop: 12,
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 20,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#333',
    minHeight: 100,
  },
  channelNumberBox: {
    width: 60,
    height: 60,
    backgroundColor: 'rgba(255, 0, 100, 0.2)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: '#ff0064',
  },
  channelNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  channelLogo: {
    width: 80,
    height: 60,
    marginRight: 20,
    borderRadius: 8,
  },
  channelLogoPlaceholder: {
    width: 80,
    height: 60,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  channelLogoText: {
    fontSize: 32,
  },
  channelInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  channelName: {
    fontSize: 22,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  nowPlaying: {
    fontSize: 18,
    color: '#00ff88',
    fontWeight: '500',
  },
  channelGroup: {
    fontSize: 16,
    color: '#999',
  },
  favoriteButton: {
    padding: 12,
    marginLeft: 12,
  },
  favoriteIcon: {
    fontSize: 36,
    color: '#ffd700',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 22,
    color: '#666',
  },
});
