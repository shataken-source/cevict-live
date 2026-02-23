import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Image,
} from 'react-native';
import { useStore } from '@/store/useStore';
import { Channel } from '@/types';

interface SeriesScreenProps {
  navigation: any;
}

export default function SeriesScreen({ navigation }: SeriesScreenProps) {
  const { currentPlaylist, currentChannel, setCurrentChannel } = useStore();
  const [searchQuery, setSearchQuery] = useState('');

  const getSeriesChannels = (): Channel[] => {
    if (!currentPlaylist) return [];

    return currentPlaylist.channels.filter(channel => {
      const group = (channel.group || '').toLowerCase();
      const name = channel.name.toLowerCase();
      return (
        group.includes('series') ||
        group.includes('tv show') ||
        group.includes('episode') ||
        name.includes('series') ||
        name.includes('season')
      );
    });
  };

  const getFilteredSeries = (): Channel[] => {
    let series = getSeriesChannels();

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      series = series.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.group?.toLowerCase().includes(query)
      );
    }

    return series;
  };

  const renderSeries = ({ item }: { item: Channel }) => (
    <TouchableOpacity
      style={styles.seriesCard}
      onPress={() => {
        if (currentChannel) {
          setCurrentChannel(item);
        }
        navigation.navigate('Player', {
          channel: item,
          fromChannel: currentChannel || undefined,
        });
      }}>
      {item.logo ? (
        <Image
          source={{ uri: item.logo }}
          style={styles.seriesPoster}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.seriesPosterPlaceholder}>
          <Text style={styles.seriesPosterText}>📺</Text>
        </View>
      )}
      <View style={styles.seriesInfo}>
        <Text style={styles.seriesTitle} numberOfLines={2}>
          {item.name}
        </Text>
        {item.group && (
          <Text style={styles.seriesCategory} numberOfLines={1}>
            {item.group}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const series = getFilteredSeries();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Series</Text>
        <View style={styles.headerRight}>
          <Text style={styles.seriesCount}>{series.length} series</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search series..."
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

      {/* Series Grid */}
      <FlatList
        data={series}
        renderItem={renderSeries}
        keyExtractor={item => item.id}
        numColumns={4}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.row}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No series found</Text>
            <Text style={styles.emptySubtext}>
              Series are auto-detected from channels with "Series" in the category
            </Text>
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
  seriesCount: {
    fontSize: 18,
    color: '#999',
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
  row: {
    gap: 20,
    marginBottom: 20,
  },
  seriesCard: {
    flex: 1,
    maxWidth: '23%',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#333',
  },
  seriesPoster: {
    width: '100%',
    aspectRatio: 2 / 3,
    backgroundColor: '#2a2a2a',
  },
  seriesPosterPlaceholder: {
    width: '100%',
    aspectRatio: 2 / 3,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  seriesPosterText: {
    fontSize: 64,
  },
  seriesInfo: {
    padding: 16,
  },
  seriesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 6,
  },
  seriesCategory: {
    fontSize: 14,
    color: '#999',
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
    marginBottom: 12,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    maxWidth: 400,
  },
});
