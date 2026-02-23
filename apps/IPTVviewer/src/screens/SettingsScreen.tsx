import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  TextInput,
  Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useStore } from '@/store/useStore';
import { PlaylistManager } from '@/services/PlaylistManager';
import { IPTVService, IPTVCredentials } from '@/services/IPTVService';
import { M3UParser } from '@/services/M3UParser';

interface SettingsScreenProps {
  navigation: any;
}

export default function SettingsScreen({ navigation }: SettingsScreenProps) {
  const { playlists, currentPlaylist, setCurrentPlaylist, addPlaylist, setPlaylists, adConfig, setAdConfig, epgUrl, setEpgUrl } = useStore();
  const [autoPlay, setAutoPlay] = useState(true);

  const [showCredentials, setShowCredentials] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [server, setServer] = useState('');
  const [altServer, setAltServer] = useState('');

  const [showDezorCredentials, setShowDezorCredentials] = useState(false);
  const [dezorUsername, setDezorUsername] = useState('');
  const [dezorPassword, setDezorPassword] = useState('');
  const [dezorServer, setDezorServer] = useState('');

  const adBlockEnabled = adConfig.enabled;
  const adVolumeReduction = adConfig.volumeReductionPercent;

  const handleSelectPlaylist = (playlistId: string) => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (playlist) {
      setCurrentPlaylist(playlist);
    }
  };

  const handleDeletePlaylist = (playlistId: string) => {
    Alert.alert('Delete Playlist', 'Remove this playlist?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          const updatedPlaylists = playlists.filter(p => p.id !== playlistId);
          setPlaylists(updatedPlaylists);
          await PlaylistManager.savePlaylists(updatedPlaylists);
          if (currentPlaylist?.id === playlistId) {
            setCurrentPlaylist(updatedPlaylists[0] ?? null);
          }
        },
      },
    ]);
  };

  const handleTestConnection = async () => {
    const credentials: IPTVCredentials = {
      username,
      password,
      server,
      altServer,
    };

    const iptvService = new IPTVService(credentials);
    const mainOk = await iptvService.testConnection();

    if (mainOk) {
      Alert.alert('Success', 'Main server connection successful!');
    } else {
      const altOk = await iptvService.testAltConnection();
      if (altOk) {
        Alert.alert('Success', 'Alternate server connection successful!');
      } else {
        Alert.alert('Error', 'Both servers failed to connect. Check credentials.');
      }
    }
  };

  const handleImportConfig = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      const response = await fetch(file.uri);
      const text = await response.text();
      const config = JSON.parse(text);

      // Populate fields from config
      if (config.server) setServer(config.server);
      if (config.username) setUsername(config.username);
      if (config.password) setPassword(config.password);
      if (config.alt) setAltServer(config.alt);
      if (config.epg) setEpgUrl(config.epg);

      Alert.alert('Success', 'Config imported! Tap "Update Credentials" to load channels.');
    } catch (error) {
      Alert.alert('Error', 'Failed to import config: ' + (error as Error).message);
    }
  };

  const handleUpdateCredentials = async () => {
    const credentials: IPTVCredentials = {
      username,
      password,
      server,
      altServer,
    };

    const iptvService = new IPTVService(credentials);
    const playlistUrl = iptvService.getPlaylistUrl();

    try {
      const playlist = await M3UParser.fetchAndParse(
        playlistUrl,
        'updated-playlist',
        `${username}'s Channels`
      );

      addPlaylist(playlist);
      setCurrentPlaylist(playlist);

      const updatedPlaylists = [...playlists, playlist];
      await PlaylistManager.savePlaylists(updatedPlaylists);

      Alert.alert('Success', 'Playlist loaded with new credentials!');
    } catch (error) {
      Alert.alert('Error', 'Failed to load playlist. Check credentials and try again.');
    }
  };

  const handleAdBlockToggle = () => {
    setAdConfig({ enabled: !adBlockEnabled });
  };

  const handleLoadDezorPlaylist = async () => {
    try {
      const dezorUrl = `${dezorServer}/get.php?username=${dezorUsername}&password=${dezorPassword}&type=m3u_plus&output=ts`;

      const playlist = await M3UParser.fetchAndParse(
        dezorUrl,
        'dezor-playlist-updated',
        `${dezorUsername}'s Dezor Channels`
      );

      addPlaylist(playlist);
      setCurrentPlaylist(playlist);

      const updatedPlaylists = [...playlists, playlist];
      await PlaylistManager.savePlaylists(updatedPlaylists);

      Alert.alert('Success', 'Dezor playlist loaded successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to load Dezor playlist. Check credentials and try again.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Playlists</Text>
        {playlists.map(playlist => (
          <View key={playlist.id} style={styles.playlistItem}>
            <TouchableOpacity
              style={styles.playlistInfo}
              onPress={() => handleSelectPlaylist(playlist.id)}>
              <Text style={styles.playlistName}>
                {playlist.name}
                {currentPlaylist?.id === playlist.id && ' (Current)'}
              </Text>
              <Text style={styles.playlistDetails}>
                {playlist.channels.length} channels
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDeletePlaylist(playlist.id)}>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>IPTV Credentials</Text>
          <TouchableOpacity onPress={() => setShowCredentials(!showCredentials)}>
            <Text style={styles.toggleText}>
              {showCredentials ? 'Hide' : 'Show'}
            </Text>
          </TouchableOpacity>
        </View>

        {showCredentials && (
          <>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your username"
              placeholderTextColor="#666"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor="#666"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <Text style={styles.label}>Main Server</Text>
            <TextInput
              style={styles.input}
              placeholder="http://link4tv.me:80"
              placeholderTextColor="#666"
              value={server}
              onChangeText={setServer}
              autoCapitalize="none"
            />

            <Text style={styles.label}>Alternate Server</Text>
            <TextInput
              style={styles.input}
              placeholder="http://ky-iptv.com:80"
              placeholderTextColor="#666"
              value={altServer}
              onChangeText={setAltServer}
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={styles.importButton}
              onPress={handleImportConfig}>
              <Text style={styles.buttonText}>📁 Import Provider Config</Text>
            </TouchableOpacity>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.testButton}
                onPress={handleTestConnection}>
                <Text style={styles.buttonText}>Test Connection</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.updateButton}
                onPress={handleUpdateCredentials}>
                <Text style={styles.buttonText}>Load Playlist</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Dezor IPTV Credentials</Text>
          <TouchableOpacity onPress={() => setShowDezorCredentials(!showDezorCredentials)}>
            <Text style={styles.toggleText}>
              {showDezorCredentials ? 'Hide' : 'Show'}
            </Text>
          </TouchableOpacity>
        </View>

        {showDezorCredentials && (
          <>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter Dezor username"
              placeholderTextColor="#666"
              value={dezorUsername}
              onChangeText={setDezorUsername}
              autoCapitalize="none"
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter Dezor password"
              placeholderTextColor="#666"
              value={dezorPassword}
              onChangeText={setDezorPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <Text style={styles.label}>Server</Text>
            <TextInput
              style={styles.input}
              placeholder="http://cf.like-cdn.com"
              placeholderTextColor="#666"
              value={dezorServer}
              onChangeText={setDezorServer}
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={[styles.updateButton, { marginTop: 15 }]}
              onPress={handleLoadDezorPlaylist}>
              <Text style={styles.buttonText}>Load Dezor Playlist</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ad Detection</Text>
        <View style={styles.settingRow}>
          <Text style={styles.label}>Auto-mute commercials</Text>
          <Switch
            value={adBlockEnabled}
            onValueChange={handleAdBlockToggle}
            trackColor={{ false: '#767577', true: '#34C759' }}
          />
        </View>

        <Text style={styles.label}>Volume Reduction: {adVolumeReduction}%</Text>
        <View style={styles.sliderRow}>
          <TouchableOpacity
            style={styles.sliderButton}
            onPress={() => setAdConfig({ volumeReductionPercent: Math.max(0, adVolumeReduction - 10) })}>
            <Text style={styles.buttonText}>-</Text>
          </TouchableOpacity>
          <View style={styles.sliderBar}>
            <View style={[styles.sliderFill, { width: `${adVolumeReduction}%` }]} />
          </View>
          <TouchableOpacity
            style={styles.sliderButton}
            onPress={() => setAdConfig({ volumeReductionPercent: Math.min(100, adVolumeReduction + 10) })}>
            <Text style={styles.buttonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>EPG (Program Guide)</Text>
        <Text style={styles.label}>XMLTV URL</Text>
        <TextInput
          style={styles.input}
          placeholder="https://example.com/epg.xml"
          placeholderTextColor="#999"
          value={epgUrl}
          onChangeText={(text) => {
            setEpgUrl(text);
            PlaylistManager.saveSettings({ epgUrl: text }).catch(() => { });
          }}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Playback</Text>
        <View style={styles.settingRow}>
          <Text style={styles.label}>Auto-play on channel select</Text>
          <Switch
            value={autoPlay}
            onValueChange={setAutoPlay}
            trackColor={{ false: '#767577', true: '#007AFF' }}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.aboutText}>Switchback TV v1.0.0</Text>
        <Text style={styles.aboutText}>IPTV viewer with previous-channel support</Text>
        <Text style={styles.aboutText}>Built for Android TV & mobile</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    padding: 20,
    backgroundColor: '#2a2a2a',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
  },
  backText: {
    color: '#007AFF',
    fontSize: 18,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  toggleText: {
    color: '#007AFF',
    fontSize: 16,
  },
  playlistItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
  playlistDetails: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  deleteText: {
    color: '#FF3B30',
    fontSize: 16,
  },
  label: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    fontStyle: 'italic',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
  },
  testButton: {
    flex: 1,
    backgroundColor: '#5856D6',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  updateButton: {
    flex: 1,
    backgroundColor: '#34C759',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  importButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aboutText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 8,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    marginBottom: 15,
  },
  sliderButton: {
    backgroundColor: '#2a2a2a',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#2a2a2a',
    borderRadius: 4,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#34C759',
  },
});
