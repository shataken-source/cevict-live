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

interface MoviesScreenProps {
  navigation: any;
}

export default function MoviesScreen({ navigation }: MoviesScreenProps) {
  const { currentPlaylist, currentChannel, setCurrentChannel } = useStore();
  const [searchQuery, setSearchQuery] = useState('');

  const getMovieChannels = (): Channel[] => {
    if (!currentPlaylist) return [];

    return currentPlaylist.channels.filter(channel => {
      const group = (channel.group || '').toLowerCase();
      const name = channel.name.toLowerCase();
      return (
        group.includes('movie') ||
        group.includes('film') ||
        group.includes('cinema') ||
        group.includes('vod') ||
        name.includes('movie')
      );
    });
  };

  const getFilteredMovies = (): Channel[] => {
    let movies = getMovieChannels();

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      movies = movies.filter(m =>
        m.name.toLowerCase().includes(query) ||
        m.group?.toLowerCase().includes(query)
      );
    }

    return movies;
  };

  const renderMovie = ({ item }: { item: Channel }) => (
    <TouchableOpacity
      style={styles.movieCard}
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
          style={styles.moviePoster}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.moviePosterPlaceholder}>
          <Text style={styles.moviePosterText}>🎬</Text>
        </View>
      )}
      <View style={styles.movieInfo}>
        <Text style={styles.movieTitle} numberOfLines={2}>
          {item.name}
        </Text>
        {item.group && (
          <Text style={styles.movieCategory} numberOfLines={1}>
            {item.group}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const movies = getFilteredMovies();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Movies</Text>
        <View style={styles.headerRight}>
          <Text style={styles.movieCount}>{movies.length} movies</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search movies..."
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

      {/* Movie Grid */}
      <FlatList
        data={movies}
        renderItem={renderMovie}
        keyExtractor={item => item.id}
        numColumns={4}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.row}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No movies found</Text>
            <Text style={styles.emptySubtext}>
              Movies are auto-detected from channels with "Movie" in the category
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
  movieCount: {
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
  movieCard: {
    flex: 1,
    maxWidth: '23%',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#333',
  },
  moviePoster: {
    width: '100%',
    aspectRatio: 2 / 3,
    backgroundColor: '#2a2a2a',
  },
  moviePosterPlaceholder: {
    width: '100%',
    aspectRatio: 2 / 3,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moviePosterText: {
    fontSize: 64,
  },
  movieInfo: {
    padding: 16,
  },
  movieTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 6,
  },
  movieCategory: {
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
