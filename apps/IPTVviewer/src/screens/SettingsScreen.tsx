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
  ActivityIndicator,
} from 'react-native';
import { useStore } from '@/store/useStore';
import { PlaylistManager } from '@/services/PlaylistManager';
import { IPTVService, IPTVCredentials } from '@/services/IPTVService';
import { M3UParser } from '@/services/M3UParser';
import { VPNService, VPNConfig } from '@/services/VPNService';
import { fetchSurfsharkClusters, groupClustersByRegion } from '@/services/SurfsharkService';
import type { SurfsharkCluster } from '@/services/SurfsharkService';
import { ModuleManager } from '@/modules/ModuleManager';
import type { ModuleManifest } from '@/modules/ModuleInterface';
import { TMDBService } from '@/services/TMDBService';
import { TVMazeService } from '@/services/TVMazeService';
import { NewsService } from '@/services/NewsService';
import { WeatherService } from '@/services/WeatherService';
import { WatchmodeService } from '@/services/WatchmodeService';

interface SettingsScreenProps {
  navigation: any;
}

export default function SettingsScreen({ navigation }: SettingsScreenProps) {
  const { playlists, currentPlaylist, setCurrentPlaylist, addPlaylist, adConfig, setAdConfig, epgUrl, setEpgUrl } = useStore();
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

  const [vpnEnabled, setVpnEnabled] = useState(false);
  const [vpnConnecting, setVpnConnecting] = useState(false);
  const [vpnConnected, setVpnConnected] = useState(false);
  const [vpnServer, setVpnServer] = useState('vpn.example.com');
  const [vpnServerPublicKey, setVpnServerPublicKey] = useState('');
  const [vpnServerPort, setVpnServerPort] = useState('51820');
  const [wireguardPrivateKey, setWireguardPrivateKey] = useState('');
  const [vpnUsername, setVpnUsername] = useState('');
  const [vpnPassword, setVpnPassword] = useState('');
  const [currentIP, setCurrentIP] = useState('Checking...');

  const [showSurfsharkServers, setShowSurfsharkServers] = useState(false);
  const [surfsharkClusters, setSurfsharkClusters] = useState<SurfsharkCluster[]>([]);
  const [surfsharkLoading, setSurfsharkLoading] = useState(false);

  const adBlockEnabled = adConfig.enabled;
  const adVolumeReduction = adConfig.volumeReductionPercent;

  const vpnService = new VPNService();

  const [installedModules, setInstalledModules] = useState<ModuleManifest[]>([]);
  const [modulesRefresh, setModulesRefresh] = useState(0);
  const [moduleZipPath, setModuleZipPath] = useState('');
  const [moduleInstalling, setModuleInstalling] = useState(false);

  // TMDB API
  const [tmdbApiKey, setTmdbApiKey] = useState('');

  // News API
  const [newsApiKey, setNewsApiKey] = useState('');
  const [gnewsApiKey, setGnewsApiKey] = useState('');

  // Weather API
  const [weatherApiKey, setWeatherApiKey] = useState('');

  // Watchmode API
  const [watchmodeApiKey, setWatchmodeApiKey] = useState('');

  useEffect(() => {
    checkPublicIP();
  }, []);

  useEffect(() => {
    const mgr = ModuleManager.getInstance();
    mgr.setContext({
      navigation,
      // Use store values directly from useStore hook, not getState()
      store: {
        playlists: useStore.getState().playlists,
        currentPlaylist: useStore.getState().currentPlaylist,
        adConfig: useStore.getState().adConfig,
        epgUrl: useStore.getState().epgUrl,
      },
      services: { m3u: M3UParser, epg: null, playlist: PlaylistManager },
    });
    mgr.listInstalledModules().then(setInstalledModules);
  }, [navigation, modulesRefresh]);

  const checkPublicIP = async () => {
    const ip = await vpnService.getPublicIP();
    setCurrentIP(ip);
  };

  const handleSelectPlaylist = (playlistId: string) => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (playlist) {
      setCurrentPlaylist(playlist);
    }
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    const updatedPlaylists = playlists.filter(p => p.id !== playlistId);
    await PlaylistManager.savePlaylists(updatedPlaylists);

    if (currentPlaylist?.id === playlistId && updatedPlaylists.length > 0) {
      setCurrentPlaylist(updatedPlaylists[0]);
    }
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

  const handleVPNToggle = async () => {
    if (vpnConnected) {
      await vpnService.disconnect();
      setVpnConnected(false);
      setVpnEnabled(false);
      await checkPublicIP();
    } else {
      setVpnConnecting(true);
      const useWireGuard = !!(
        vpnServer.trim() &&
        vpnServerPublicKey.trim() &&
        wireguardPrivateKey.trim()
      );
      const config: VPNConfig = {
        enabled: true,
        provider: useWireGuard ? 'wireguard' : 'openvpn',
        serverAddress: vpnServer.trim(),
        serverPort: parseInt(vpnServerPort, 10) || 51820,
        username: vpnUsername,
        password: vpnPassword,
        autoConnect: false,
        wireguardServerPublicKey: vpnServerPublicKey.trim() || undefined,
        wireguardPrivateKey: wireguardPrivateKey.trim() || undefined,
      };
      vpnService.setConfig(config);
      const success = await vpnService.connect();
      setVpnConnecting(false);
      if (success) {
        setVpnConnected(true);
        setVpnEnabled(true);
        await checkPublicIP();
        Alert.alert('VPN Connected', useWireGuard ? 'WireGuard tunnel is up.' : 'Simulated connection.');
      } else {
        Alert.alert('VPN Failed', 'Could not connect. Check server, keys, and permission.');
      }
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
        <Text style={styles.sectionTitle}>VPN Settings</Text>
        <View style={styles.vpnStatusRow}>
          <View>
            <Text style={styles.label}>VPN Status</Text>
            <Text style={[styles.statusText, vpnConnected ? styles.statusConnected : styles.statusDisconnected]}>
              {vpnConnected ? '● Connected' : '○ Disconnected'}
            </Text>
            <Text style={styles.hint}>Your IP: {currentIP}</Text>
          </View>
          {vpnConnecting ? (
            <ActivityIndicator color="#007AFF" />
          ) : (
            <TouchableOpacity
              style={[styles.vpnButton, vpnConnected ? styles.vpnButtonConnected : styles.vpnButtonDisconnected]}
              onPress={handleVPNToggle}>
              <Text style={styles.buttonText}>
                {vpnConnected ? 'Disconnect' : 'Connect'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.label}>VPN Server</Text>
        <TextInput
          style={styles.input}
          placeholder="vpn.example.com or Surfshark server"
          placeholderTextColor="#666"
          value={vpnServer}
          onChangeText={setVpnServer}
          autoCapitalize="none"
          editable={!vpnConnected}
        />

        <View style={[styles.sectionHeader, { marginTop: 16 }]}>
          <Text style={styles.label}>Surfshark servers</Text>
          <TouchableOpacity
            onPress={async () => {
              if (showSurfsharkServers) {
                setShowSurfsharkServers(false);
                return;
              }
              setShowSurfsharkServers(true);
              if (surfsharkClusters.length === 0) {
                setSurfsharkLoading(true);
                try {
                  const list = await fetchSurfsharkClusters();
                  setSurfsharkClusters(list);
                } catch (e) {
                  Alert.alert('Error', 'Could not load Surfshark servers. Check network.');
                } finally {
                  setSurfsharkLoading(false);
                }
              }
            }}>
            <Text style={styles.toggleText}>
              {showSurfsharkServers ? 'Hide' : 'Show'} (from api.surfshark.com)
            </Text>
          </TouchableOpacity>
        </View>
        {showSurfsharkServers && (
          <>
            {surfsharkLoading ? (
              <ActivityIndicator color="#007AFF" style={{ marginVertical: 10 }} />
            ) : (
              <View style={{ maxHeight: 280, marginTop: 8 }}>
                <ScrollView nestedScrollEnabled style={{ flexGrow: 0 }}>
                  {Array.from(groupClustersByRegion(surfsharkClusters).entries()).map(([region, byCountry]) => (
                    <View key={region} style={{ marginBottom: 8 }}>
                      <Text style={[styles.label, { fontSize: 14, color: '#888' }]}>{region}</Text>
                      {Array.from(byCountry.entries()).flatMap(([countryKey, list]) =>
                        list.map((c) => (
                          <TouchableOpacity
                            key={c.id}
                            style={[styles.playlistItem, { paddingVertical: 10 }]}
                            onPress={() => {
                              setVpnServer(c.connectionName);
                              setVpnServerPublicKey(c.pubKey);
                            }}>
                            <Text style={styles.playlistName}>
                              {c.country} – {c.location}
                            </Text>
                            <Text style={styles.playlistDetails}>
                              {c.connectionName} · load {c.load}%
                            </Text>
                          </TouchableOpacity>
                        ))
                      )}
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
            <Text style={styles.hint}>
              Tap a server to set Server + Public key. Then add your WireGuard private key below and tap Connect.
            </Text>
          </>
        )}

        <Text style={styles.label}>WireGuard – Server public key</Text>
        <TextInput
          style={styles.input}
          placeholder="Set by Surfshark list above, or paste"
          placeholderTextColor="#666"
          value={vpnServerPublicKey}
          onChangeText={setVpnServerPublicKey}
          autoCapitalize="none"
          editable={!vpnConnected}
        />
        <Text style={styles.label}>WireGuard – Your private key</Text>
        <TextInput
          style={styles.input}
          placeholder="From Surfshark dashboard / WireGuard config"
          placeholderTextColor="#666"
          value={wireguardPrivateKey}
          onChangeText={setWireguardPrivateKey}
          secureTextEntry
          autoCapitalize="none"
          editable={!vpnConnected}
        />
        <Text style={styles.label}>WireGuard – Server port</Text>
        <TextInput
          style={styles.input}
          placeholder="51820"
          placeholderTextColor="#666"
          value={vpnServerPort}
          onChangeText={setVpnServerPort}
          keyboardType="number-pad"
          editable={!vpnConnected}
        />

        <Text style={styles.label}>VPN Username (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Leave empty for keyfile auth"
          placeholderTextColor="#666"
          value={vpnUsername}
          onChangeText={setVpnUsername}
          autoCapitalize="none"
          editable={!vpnConnected}
        />

        <Text style={styles.label}>VPN Password (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Leave empty for keyfile auth"
          placeholderTextColor="#666"
          value={vpnPassword}
          onChangeText={setVpnPassword}
          secureTextEntry
          autoCapitalize="none"
          editable={!vpnConnected}
        />

        <Text style={styles.hint}>
          Uses react-native-wireguard-vpn-connect when server + both keys are set. Otherwise simulated. Server list above uses
          Surfshark’s API (api.surfshark.com). Get your private key from Surfshark app or dashboard (WireGuard key).
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ad Detection & Mute</Text>
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

        <Text style={styles.hint}>
          When enabled, reduces volume during detected ads (simulation; no real audio analysis on device):
          • Uses store setting for reduction %. Real ad detection would need native audio access.
        </Text>
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
        <Text style={styles.hint}>
          When set, the player shows "Now playing" for the current channel (match by tvg-id). Cached 1 hour.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Movie & TV Data APIs</Text>
        <Text style={styles.label}>TMDb API Key</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your TMDb API key"
          placeholderTextColor="#666"
          value={tmdbApiKey}
          onChangeText={setTmdbApiKey}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={[styles.testButton, { marginTop: 10 }]}
          onPress={() => {
            if (tmdbApiKey.trim()) {
              TMDBService.setApiKey(tmdbApiKey.trim());
              Alert.alert('TMDb', 'API key configured! TV show data will now be enhanced with posters, ratings, and descriptions.');
            } else {
              Alert.alert('TMDb', 'Please enter a valid API key.');
            }
          }}>
          <Text style={styles.buttonText}>Save TMDb Key</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>
          Get a free API key at themoviedb.org. Enables enhanced channel info with posters, ratings, and descriptions.
        </Text>

        <Text style={[styles.label, { marginTop: 16 }]}>TVMaze (No API Key Required)</Text>
        <TouchableOpacity
          style={[styles.testButton, { marginTop: 10 }]}
          onPress={async () => {
            try {
              const shows = await TVMazeService.getPopularShows();
              Alert.alert('TVMaze', `Connected! ${shows.length} popular shows available.`);
            } catch (e) {
              Alert.alert('TVMaze', 'Failed to connect. Check your internet connection.');
            }
          }}>
          <Text style={styles.buttonText}>Test TVMaze</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>
          TVMaze provides free TV show data without an API key. Use it for show info and episode schedules.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>News API</Text>
        <Text style={styles.label}>NewsAPI Key (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your NewsAPI key"
          placeholderTextColor="#666"
          value={newsApiKey}
          onChangeText={setNewsApiKey}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={[styles.testButton, { marginTop: 10 }]}
          onPress={() => {
            if (newsApiKey.trim()) {
              NewsService.setNewsApiKey(newsApiKey.trim());
              Alert.alert('News', 'API key configured! News ticker will now show headlines.');
            }
          }}>
          <Text style={styles.buttonText}>Save NewsAPI Key</Text>
        </TouchableOpacity>
        <Text style={[styles.label, { marginTop: 16 }]}>GNews API Key (Free Alternative)</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your GNews API key"
          placeholderTextColor="#666"
          value={gnewsApiKey}
          onChangeText={setGnewsApiKey}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={[styles.testButton, { marginTop: 10 }]}
          onPress={() => {
            if (gnewsApiKey.trim()) {
              NewsService.setGnewsApiKey(gnewsApiKey.trim());
              Alert.alert('News', 'GNews API key configured! Free news data enabled.');
            }
          }}>
          <Text style={styles.buttonText}>Save GNews Key</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>
          Get free keys at newsapi.org or gnews.io. Enables news ticker overlay on channels.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Weather Widget</Text>
        <Text style={styles.label}>OpenWeatherMap API Key</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your OpenWeatherMap API key"
          placeholderTextColor="#666"
          value={weatherApiKey}
          onChangeText={setWeatherApiKey}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={[styles.testButton, { marginTop: 10 }]}
          onPress={() => {
            if (weatherApiKey.trim()) {
              WeatherService.setApiKey(weatherApiKey.trim());
              Alert.alert('Weather', 'API key configured! Weather widget will now show current conditions.');
            }
          }}>
          <Text style={styles.buttonText}>Save Weather Key</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>
          Get a free API key at openweathermap.org. Displays weather overlay on the player.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Streaming Availability</Text>
        <Text style={styles.label}>Watchmode API Key</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your Watchmode API key"
          placeholderTextColor="#666"
          value={watchmodeApiKey}
          onChangeText={setWatchmodeApiKey}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={[styles.testButton, { marginTop: 10 }]}
          onPress={() => {
            if (watchmodeApiKey.trim()) {
              WatchmodeService.setApiKey(watchmodeApiKey.trim());
              Alert.alert('Watchmode', 'API key configured! Shows where content is streaming.');
            }
          }}>
          <Text style={styles.buttonText}>Save Watchmode Key</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>
          Get a free API key at watchmode.com. Shows streaming availability for shows/movies.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Modules</Text>
        <Text style={styles.hint}>
          Load/Unload run or stop a module. Install from a .zip that contains manifest.json (and entry file) at root or in a single folder.
        </Text>
        <Text style={styles.label}>Install from ZIP (full path to .zip file)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. /data/user/0/.../files/module.zip"
          placeholderTextColor="#666"
          value={moduleZipPath}
          onChangeText={setModuleZipPath}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={[styles.updateButton, { marginTop: 10 }]}
          disabled={moduleInstalling || !moduleZipPath.trim()}
          onPress={async () => {
            setModuleInstalling(true);
            try {
              const mgr = ModuleManager.getInstance();
              const id = await mgr.installModule(moduleZipPath.trim());
              setModuleZipPath('');
              setModulesRefresh((r) => r + 1);
              Alert.alert('Installed', `Module "${id}" installed. You can Load it below.`);
            } catch (e) {
              Alert.alert('Install failed', String(e));
            } finally {
              setModuleInstalling(false);
            }
          }}>
          <Text style={styles.buttonText}>{moduleInstalling ? 'Installing…' : 'Install from ZIP'}</Text>
        </TouchableOpacity>
        {installedModules.length === 0 ? (
          <Text style={styles.hint}>No modules installed. Add a folder with manifest.json under the app documents/modules path.</Text>
        ) : (
          installedModules.map((m) => {
            const mgr = ModuleManager.getInstance();
            const isLoaded = !!mgr.getModule(m.id);
            return (
              <View key={m.id} style={styles.playlistItem}>
                <View style={styles.playlistInfo}>
                  <Text style={styles.playlistName}>{m.name}</Text>
                  <Text style={styles.playlistDetails}>{m.id} v{m.version}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.testButton, { paddingHorizontal: 12, paddingVertical: 8 }]}
                  onPress={async () => {
                    try {
                      if (isLoaded) {
                        await mgr.unloadModule(m.id);
                      } else {
                        await mgr.loadModule(m.id);
                      }
                      setModulesRefresh((r) => r + 1);
                    } catch (e) {
                      Alert.alert('Module error', String(e));
                    }
                  }}>
                  <Text style={styles.buttonText}>{isLoaded ? 'Unload' : 'Load'}</Text>
                </TouchableOpacity>
              </View>
            );
          })
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
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.aboutText}>NextTV Viewer v1.0.0</Text>
        <Text style={styles.aboutText}>
          IPTV viewer with previous-channel support
        </Text>
        <Text style={styles.aboutText}>
          Built with extensible architecture for future updates
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Keyboard Shortcuts (TV Remote)</Text>
        <View style={styles.shortcutItem}>
          <Text style={styles.shortcutKey}>Select / Enter</Text>
          <Text style={styles.shortcutDesc}>Go to previous channel</Text>
        </View>
        <View style={styles.shortcutItem}>
          <Text style={styles.shortcutKey}>Back</Text>
          <Text style={styles.shortcutDesc}>Return to channel list</Text>
        </View>
        <View style={styles.shortcutItem}>
          <Text style={styles.shortcutKey}>Volume +/-</Text>
          <Text style={styles.shortcutDesc}>Adjust volume</Text>
        </View>
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
  shortcutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  shortcutKey: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  shortcutDesc: {
    fontSize: 16,
    color: '#999',
  },
  vpnStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 5,
  },
  statusConnected: {
    color: '#34C759',
  },
  statusDisconnected: {
    color: '#999',
  },
  vpnButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  vpnButtonConnected: {
    backgroundColor: '#FF3B30',
  },
  vpnButtonDisconnected: {
    backgroundColor: '#34C759',
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
