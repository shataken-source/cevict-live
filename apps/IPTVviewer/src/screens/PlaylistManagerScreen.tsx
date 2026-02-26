import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useStore } from '@/store/useStore';
import { Playlist } from '@/types';
import { M3UParser } from '@/services/M3UParser';

interface PlaylistManagerScreenProps {
  navigation: any;
}

export default function PlaylistManagerScreen({ navigation }: PlaylistManagerScreenProps) {
  const { playlists, currentPlaylist, setCurrentPlaylist, addPlaylist, setPlaylists } = useStore();

  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleActivate = (playlist: Playlist) => {
    setCurrentPlaylist(playlist);
    Alert.alert('Activated', `"${playlist.name}" is now active.`);
  };

  const handleRefresh = async (playlist: Playlist) => {
    setLoadingId(playlist.id);
    try {
      const updated = await M3UParser.fetchAndParse(playlist.url, playlist.id, playlist.name);
      const newList = playlists.map(p => p.id === playlist.id ? updated : p);
      setPlaylists(newList);
      if (currentPlaylist?.id === playlist.id) setCurrentPlaylist(updated);
      Alert.alert('Refreshed', `Loaded ${updated.channels.length} channels.`);
    } catch (e: any) {
      Alert.alert('Error', `Failed to refresh: ${e.message}`);
    } finally {
      setLoadingId(null);
    }
  };

  const handleRemove = (playlist: Playlist) => {
    Alert.alert(
      'Remove Playlist',
      `Remove "${playlist.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const newList = playlists.filter(p => p.id !== playlist.id);
            setPlaylists(newList);
            if (currentPlaylist?.id === playlist.id) {
              setCurrentPlaylist(newList.length > 0 ? newList[0] : null);
            }
          },
        },
      ]
    );
  };

  const handleAddM3U = async () => {
    const url = newUrl.trim();
    if (!url) { Alert.alert('Error', 'Enter a M3U URL.'); return; }

    const id = Date.now().toString();
    const name = newName.trim() || `Playlist ${playlists.length + 1}`;
    setLoading(true);
    try {
      const playlist = await M3UParser.fetchAndParse(url, id, name);
      // fetchAndParse sets url to '' in parse(); restore it
      const withUrl: Playlist = { ...playlist, url };
      addPlaylist(withUrl);
      if (!currentPlaylist) setCurrentPlaylist(withUrl);
      setNewUrl('');
      setNewName('');
      Alert.alert('Added', `"${withUrl.name}" loaded with ${withUrl.channels.length} channels.`);
    } catch (e: any) {
      Alert.alert('Error', `Could not load playlist: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d: Date) => {
    try {
      return new Date(d).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      });
    } catch { return '—'; }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>📋 Playlists</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">

        {/* Active Playlists */}
        <Text style={styles.sectionTitle}>Active Playlists</Text>

        {playlists.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No playlists yet</Text>
            <Text style={styles.emptySubtext}>Add an M3U URL below to get started</Text>
          </View>
        )}

        {playlists.map(pl => {
          const isActive = currentPlaylist?.id === pl.id;
          const isRefreshing = loadingId === pl.id;
          return (
            <View key={pl.id} style={[styles.playlistCard, isActive && styles.playlistCardActive]}>
              <View style={styles.playlistRow}>
                <View style={styles.playlistInfo}>
                  <Text style={styles.playlistName} numberOfLines={1}>{pl.name}</Text>
                  <Text style={styles.playlistMeta}>
                    {pl.channels.length.toLocaleString()} channels · M3U
                  </Text>
                  <Text style={styles.playlistDate} numberOfLines={1}>
                    {pl.url.replace(/^https?:\/\//, '').substring(0, 32)}…
                  </Text>
                  <Text style={styles.playlistDate}>
                    Last refreshed: {formatDate(pl.lastUpdated)}
                  </Text>
                </View>
                {isActive ? (
                  <View style={styles.activeBadge}>
                    <Text style={styles.activeBadgeText}>● Active</Text>
                  </View>
                ) : (
                  <View style={styles.standbyBadge}>
                    <Text style={styles.standbyBadgeText}>Standby</Text>
                  </View>
                )}
              </View>

              <View style={styles.playlistActions}>
                {!isActive && (
                  <TouchableOpacity style={styles.btnBlue} onPress={() => handleActivate(pl)}>
                    <Text style={styles.btnText}>▶ Activate</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.btnGray, isRefreshing && styles.btnDisabled]}
                  onPress={() => !isRefreshing && handleRefresh(pl)}
                >
                  {isRefreshing
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.btnText}>🔄 Refresh</Text>
                  }
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnRed} onPress={() => handleRemove(pl)}>
                  <Text style={styles.btnText}>🗑 Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {/* Add Playlist */}
        <Text style={styles.sectionTitle}>Add Playlist</Text>
        <View style={styles.addCard}>
          <TextInput
            style={styles.input}
            placeholder="M3U URL  e.g. http://provider.xyz/playlist.m3u"
            placeholderTextColor="#555"
            value={newUrl}
            onChangeText={setNewUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            placeholder="Playlist name (optional)"
            placeholderTextColor="#555"
            value={newName}
            onChangeText={setNewName}
          />
          <View style={styles.addActions}>
            <TouchableOpacity
              style={[styles.btnBlue, { flex: 1 }, loading && styles.btnDisabled]}
              onPress={handleAddM3U}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.btnText}>Load M3U</Text>
              }
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
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
    paddingBottom: 14,
    backgroundColor: '#13131a',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backBtn: { width: 60 },
  backText: { color: '#007AFF', fontSize: 14, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '800', color: '#fff' },
  content: { flex: 1, padding: 16 },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8b8b9e',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 10,
  },
  emptyBox: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#1a1a24',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 10,
  },
  emptyIcon: { fontSize: 40, marginBottom: 10, opacity: 0.4 },
  emptyText: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 4 },
  emptySubtext: { fontSize: 12, color: '#8b8b9e', textAlign: 'center' },
  playlistCard: {
    backgroundColor: '#1a1a24',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#333',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  playlistCardActive: {
    borderLeftColor: '#00e676',
  },
  playlistRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  playlistInfo: { flex: 1, marginRight: 10 },
  playlistName: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 3 },
  playlistMeta: { fontSize: 11, color: '#8b8b9e', marginBottom: 2 },
  playlistDate: { fontSize: 10, color: '#555', marginTop: 1 },
  activeBadge: {
    backgroundColor: 'rgba(0,230,118,0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.3)',
  },
  activeBadgeText: { fontSize: 11, color: '#00e676', fontWeight: '700' },
  standbyBadge: {
    backgroundColor: 'rgba(255,193,7,0.12)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,193,7,0.25)',
  },
  standbyBadgeText: { fontSize: 11, color: '#ffc107', fontWeight: '700' },
  playlistActions: { flexDirection: 'row', gap: 8 },
  addCard: {
    backgroundColor: '#1a1a24',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 30,
  },
  input: {
    backgroundColor: '#0a0a0f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 10,
    color: '#fff',
    fontSize: 13,
  },
  addActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  btnBlue: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGray: {
    backgroundColor: '#2a2a3a',
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnRed: {
    backgroundColor: 'rgba(229,0,0,0.25)',
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
