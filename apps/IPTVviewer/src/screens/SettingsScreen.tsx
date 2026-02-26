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
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useStore } from '@/store/useStore';
import { PlaylistManager } from '@/services/PlaylistManager';
import { IPTVService, IPTVCredentials } from '@/services/IPTVService';
import { M3UParser } from '@/services/M3UParser';
import { UpdateService } from '@/services/UpdateService';
import { ProviderConfigService } from '@/services/ProviderConfigService';

const APP_VERSION: string = require('../../app.json').expo.version;

interface SettingsScreenProps {
  navigation: any;
}

export default function SettingsScreen({ navigation }: SettingsScreenProps) {
  const { playlists, currentPlaylist, setCurrentPlaylist, addPlaylist, setPlaylists, adConfig, setAdConfig, epgUrl, setEpgUrl } = useStore();
  const [autoPlay, setAutoPlay] = useState(true);
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(true);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  const [showCredentials, setShowCredentials] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [server, setServer] = useState('');
  const [altServer, setAltServer] = useState('');

  const [showDezorCredentials, setShowDezorCredentials] = useState(false);
  const [dezorUsername, setDezorUsername] = useState('');
  const [dezorPassword, setDezorPassword] = useState('');
  const [dezorServer, setDezorServer] = useState('');

  // Provider config import modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPasteText, setImportPasteText] = useState('');
  const [importing, setImporting] = useState(false);

  const adBlockEnabled = adConfig.enabled;
  const adVolumeReduction = adConfig.volumeReductionPercent;

  useEffect(() => {
    // Load auto-update preference
    UpdateService.isAutoUpdateEnabled().then(setAutoUpdateEnabled);
  }, []);

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
    setShowImportModal(true);
  };

  const handleImportFromFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      const response = await fetch(file.uri);
      const text = await response.text();
      await applyProviderConfig(text);
    } catch (error) {
      Alert.alert('Error', 'Failed to read file: ' + (error as Error).message);
    }
  };

  const handleImportFromPaste = async () => {
    if (!importPasteText.trim()) {
      Alert.alert('Error', 'Paste your provider config text first.');
      return;
    }
    await applyProviderConfig(importPasteText.trim());
  };

  const applyProviderConfig = async (text: string) => {
    setImporting(true);
    try {
      // Try ProviderConfigService first (structured JSON)
      const config = ProviderConfigService.parseConfig(text);
      if (config) {
        const result = await ProviderConfigService.importConfig(config);
        if (result.success) {
          setShowImportModal(false);
          setImportPasteText('');
          Alert.alert('✓ Setup Complete', result.message + '\n\nYour channels are ready!');
          return;
        }
      }

      // Fallback: try parsing as legacy JSON {server, username, password, epg}
      try {
        const legacy = JSON.parse(text);
        if (legacy.server) setServer(legacy.server);
        if (legacy.username) setUsername(legacy.username);
        if (legacy.password) setPassword(legacy.password);
        if (legacy.alt) setAltServer(legacy.alt);
        if (legacy.epg) setEpgUrl(legacy.epg);
        if (legacy.server && legacy.username && legacy.password) {
          // Auto-load playlist
          const creds: IPTVCredentials = {
            username: legacy.username,
            password: legacy.password,
            server: legacy.server,
            altServer: legacy.alt || '',
          };
          const svc = new IPTVService(creds);
          const playlist = await M3UParser.fetchAndParse(
            svc.getPlaylistUrl(),
            'imported-playlist',
            `${legacy.username}'s Channels`
          );
          addPlaylist(playlist);
          setCurrentPlaylist(playlist);
          setShowImportModal(false);
          setImportPasteText('');
          Alert.alert('✓ Setup Complete', `Loaded ${playlist.channels.length} channels. You\'re all set!`);
          return;
        }
      } catch { /* not JSON, fall through */ }

      // If it's just a plain M3U URL
      if (text.startsWith('http') && (text.includes('m3u') || text.includes('get.php'))) {
        const playlist = await M3UParser.fetchAndParse(text, 'url-import', 'Imported Playlist');
        addPlaylist(playlist);
        setCurrentPlaylist(playlist);
        setShowImportModal(false);
        setImportPasteText('');
        Alert.alert('✓ Setup Complete', `Loaded ${playlist.channels.length} channels!`);
        return;
      }

      Alert.alert('Error', 'Could not recognise this config format. Ask your provider for a Switchback TV config file.');
    } catch (error) {
      Alert.alert('Error', 'Import failed: ' + (error as Error).message);
    } finally {
      setImporting(false);
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

      await PlaylistManager.savePlaylists(useStore.getState().playlists);

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

      await PlaylistManager.savePlaylists(useStore.getState().playlists);

      Alert.alert('Success', 'Dezor playlist loaded successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to load Dezor playlist. Check credentials and try again.');
    }
  };

  const handleCheckForUpdates = async () => {
    setCheckingUpdate(true);
    try {
      const result = await UpdateService.checkForUpdates();
      await UpdateService.saveLastUpdateCheck();

      if (result.error) {
        Alert.alert('Update Check Failed', `Could not check for updates: ${result.error}`);
      } else if (result.updateAvailable && result.latestVersion) {
        const { version, releaseNotes, fileSize, downloadUrl } = result.latestVersion;
        Alert.alert(
          'Update Available',
          `Version ${version} is available (${UpdateService.formatFileSize(fileSize)})\n\n${releaseNotes}`,
          [
            { text: 'Later', style: 'cancel' },
            {
              text: 'Download',
              onPress: async () => {
                try {
                  await UpdateService.downloadUpdate(downloadUrl);
                } catch (error) {
                  Alert.alert('Error', 'Failed to open download link');
                }
              },
            },
          ]
        );
      } else {
        Alert.alert('Up to Date', `You're running the latest version (${result.currentVersion})`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to check for updates');
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleToggleAutoUpdate = async (enabled: boolean) => {
    setAutoUpdateEnabled(enabled);
    await UpdateService.setAutoUpdateEnabled(enabled);
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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.sectionTitle}>Playlists</Text>
          <TouchableOpacity onPress={() => navigation.navigate('PlaylistManager')}>
            <Text style={{ color: '#007AFF', fontSize: 13, fontWeight: '600' }}>Manage Playlists ›</Text>
          </TouchableOpacity>
        </View>
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
          returnKeyType="done"
          blurOnSubmit
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        {epgUrl.length > 0 && (
          <Text style={styles.hint}>TV Guide will use this URL when loaded.</Text>
        )}
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
        <Text style={styles.sectionTitle}>Updates</Text>
        <View style={styles.settingRow}>
          <Text style={styles.label}>Auto-check for updates</Text>
          <Switch
            value={autoUpdateEnabled}
            onValueChange={handleToggleAutoUpdate}
            trackColor={{ false: '#767577', true: '#34C759' }}
          />
        </View>
        <TouchableOpacity
          style={[styles.updateButton, { marginTop: 15 }]}
          onPress={handleCheckForUpdates}
          disabled={checkingUpdate}>
          <Text style={styles.buttonText}>
            {checkingUpdate ? 'Checking...' : 'Check for Updates'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.aboutText}>Current version: {APP_VERSION}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.aboutText}>Switchback TV v{APP_VERSION}</Text>
        <Text style={styles.aboutText}>IPTV viewer with previous-channel support</Text>
        <Text style={styles.aboutText}>Built for Android TV &amp; mobile</Text>
      </View>

      {/* ── Provider Config Import Modal ────────────────── */}
      <Modal
        visible={showImportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowImportModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📁 Import Provider Config</Text>
              <TouchableOpacity onPress={() => { setShowImportModal(false); setImportPasteText(''); }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Get a config from your IPTV provider and paste it below, or load a file. Tap Done and you're all set — no typing required.
            </Text>

            <TextInput
              style={[styles.input, styles.pasteInput]}
              placeholder={'Paste config text, JSON, or M3U URL here…'}
              placeholderTextColor="#555"
              value={importPasteText}
              onChangeText={setImportPasteText}
              multiline
              numberOfLines={5}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={[styles.updateButton, importing && styles.btnDisabled]}
              onPress={handleImportFromPaste}
              disabled={importing}
            >
              {importing
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.buttonText}>✓ Done — Set Up My App</Text>
              }
            </TouchableOpacity>

            <View style={styles.modalDivider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity style={styles.importButton} onPress={handleImportFromFile}>
              <Text style={styles.buttonText}>📂 Choose File from Device</Text>
            </TouchableOpacity>

            <Text style={[styles.hint, { textAlign: 'center', marginTop: 14 }]}>
              Supports: Switchback config JSON · Legacy JSON · Plain M3U URL
            </Text>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#1e1e1e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 22,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  modalClose: {
    fontSize: 20,
    color: '#999',
    paddingHorizontal: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#999',
    marginBottom: 14,
    lineHeight: 19,
  },
  pasteInput: {
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  modalDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#333',
  },
  dividerText: {
    color: '#666',
    fontSize: 13,
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
