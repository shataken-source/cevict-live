import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {useStore} from '@/store/useStore';
import {Channel} from '@/types';
import {M3UParser} from '@/services/M3UParser';
import {PlaylistManager} from '@/services/PlaylistManager';
import {SAMPLE_PLAYLIST} from '@/data/sampleData';
import {IPTVService} from '@/services/IPTVService';

interface HomeScreenProps {
  navigation: any;
}

export default function HomeScreen({navigation}: HomeScreenProps) {
  const {
    currentPlaylist,
    playlists,
    favorites,
    addPlaylist,
    setCurrentPlaylist,
    toggleFavorite,
  } = useStore();

  const [loading, setLoading] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'favorites'>('all');

  useEffect(() => {
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    try {
      const savedPlaylists = await PlaylistManager.loadPlaylists();
      const savedFavorites = await PlaylistManager.loadFavorites();
      
      savedPlaylists.forEach(p => addPlaylist(p));
      
      if (savedPlaylists.length > 0) {
        setCurrentPlaylist(savedPlaylists[0]);
      } else {
        await loadDefaultPlaylists();
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
      await loadDefaultPlaylists();
    }
  };

  const loadDefaultPlaylists = async () => {
    await loadSamplePlaylist();
    await loadLink4TVPlaylist();
    await loadDezorPlaylist();
  };

  const loadSamplePlaylist = async () => {
    try {
      const playlist = await M3UParser.parse(
        SAMPLE_PLAYLIST,
        'sample-playlist',
        'Sample Channels'
      );
      
      addPlaylist(playlist);
      if (!currentPlaylist) {
        setCurrentPlaylist(playlist);
      }
      
      const updatedPlaylists = [...playlists, playlist];
      await PlaylistManager.savePlaylists(updatedPlaylists);
    } catch (error) {
      console.error('Error loading sample playlist:', error);
    }
  };

  const loadLink4TVPlaylist = async () => {
    try {
      const iptvService = new IPTVService();
      const playlistUrl = iptvService.getPlaylistUrl();
      
      const playlist = await M3UParser.fetchAndParse(
        playlistUrl,
        'link4tv-playlist',
        'Link4TV Channels'
      );
      
      addPlaylist(playlist);
      setCurrentPlaylist(playlist);
      
      const updatedPlaylists = [...playlists, playlist];
      await PlaylistManager.savePlaylists(updatedPlaylists);
    } catch (error) {
      console.error('Error loading Link4TV playlist:', error);
      await tryAltServer();
    }
  };

  const tryAltServer = async () => {
    try {
      const iptvService = new IPTVService();
      const altUrl = iptvService.getAltPlaylistUrl();
      
      const playlist = await M3UParser.fetchAndParse(
        altUrl,
        'link4tv-playlist',
        'Link4TV Channels (Alt Server)'
      );
      
      addPlaylist(playlist);
      setCurrentPlaylist(playlist);
      
      const updatedPlaylists = [...playlists, playlist];
      await PlaylistManager.savePlaylists(updatedPlaylists);
    } catch (error) {
      console.error('Error loading from alt server:', error);
    }
  };

  const loadDezorPlaylist = async () => {
    try {
      const dezorUrl = 'http://cf.like-cdn.com/get.php?username=jascodezoripty&password=19e993b7f5&type=m3u_plus&output=ts';
      
      const playlist = await M3UParser.fetchAndParse(
        dezorUrl,
        'dezor-playlist',
        'Dezor IPTV Channels'
      );
      
      addPlaylist(playlist);
      setCurrentPlaylist(playlist);
      
      const updatedPlaylists = [...playlists, playlist];
      await PlaylistManager.savePlaylists(updatedPlaylists);
    } catch (error) {
      console.error('Error loading Dezor playlist:', error);
    }
  };

  const handleLoadSampleData = () => {
    Alert.alert(
      'Load Sample Channels',
      'This will load 30+ sample channels for testing. Continue?',
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Load', onPress: loadSamplePlaylist},
      ]
    );
  };

  const handleAddPlaylist = async () => {
    if (!playlistUrl.trim()) return;
    
    setLoading(true);
    try {
      const playlist = await M3UParser.fetchAndParse(
        playlistUrl,
        `playlist-${Date.now()}`,
        `Playlist ${playlists.length + 1}`
      );
      
      addPlaylist(playlist);
      setCurrentPlaylist(playlist);
      
      await PlaylistManager.savePlaylists([...playlists, playlist]);
      
      setPlaylistUrl('');
    } catch (error) {
      console.error('Error adding playlist:', error);
      alert('Failed to load playlist. Please check the URL and try again.');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredChannels = (): Channel[] => {
    if (!currentPlaylist) return [];
    
    let channels = currentPlaylist.channels;
    
    if (filter === 'favorites') {
      channels = channels.filter(c => favorites.includes(c.id));
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      channels = channels.filter(
        c =>
          c.name.toLowerCase().includes(query) ||
          c.group?.toLowerCase().includes(query)
      );
    }
    
    return channels;
  };

  const renderChannel = ({item}: {item: Channel}) => (
    <TouchableOpacity
      style={styles.channelItem}
      onPress={() => navigation.navigate('Player', {channel: item})}>
      <View style={styles.channelInfo}>
        <Text style={styles.channelName}>{item.name}</Text>
        {item.group && <Text style={styles.channelGroup}>{item.group}</Text>}
      </View>
      <TouchableOpacity
        onPress={() => {
          toggleFavorite(item.id);
          PlaylistManager.saveFavorites(
            favorites.includes(item.id)
              ? favorites.filter(id => id !== item.id)
              : [...favorites, item.id]
          );
        }}>
        <Text style={styles.favoriteIcon}>
          {favorites.includes(item.id) ? '★' : '☆'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>NextTV Viewer</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.sampleButton}
            onPress={handleLoadSampleData}>
            <Text style={styles.sampleButtonText}>Sample Data</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings')}>
            <Text style={styles.settingsText}>⚙</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.addPlaylistSection}>
        <TextInput
          style={styles.input}
          placeholder="Enter M3U playlist URL"
          placeholderTextColor="#999"
          value={playlistUrl}
          onChangeText={setPlaylistUrl}
        />
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddPlaylist}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.addButtonText}>Add</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.filterSection}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterActive]}
          onPress={() => setFilter('all')}>
          <Text style={styles.filterText}>All Channels</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === 'favorites' && styles.filterActive,
          ]}
          onPress={() => setFilter('favorites')}>
          <Text style={styles.filterText}>Favorites</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Search channels..."
        placeholderTextColor="#999"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {currentPlaylist ? (
        <FlatList
          data={getFilteredChannels()}
          renderItem={renderChannel}
          keyExtractor={item => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            Add a playlist to get started
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#2a2a2a',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sampleButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  sampleButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  settingsButton: {
    padding: 10,
  },
  settingsText: {
    fontSize: 24,
    color: '#fff',
  },
  addPlaylistSection: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    color: '#fff',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    justifyContent: 'center',
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  filterSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 10,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
  },
  filterActive: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    color: '#fff',
    fontSize: 16,
  },
  searchInput: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 8,
    fontSize: 16,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 20,
  },
  channelItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    padding: 20,
    marginBottom: 10,
    borderRadius: 8,
  },
  channelInfo: {
    flex: 1,
  },
  channelName: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
  channelGroup: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  favoriteIcon: {
    fontSize: 24,
    color: '#FFD700',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
  },
});
