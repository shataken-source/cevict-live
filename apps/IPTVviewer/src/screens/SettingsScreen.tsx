import React, {useState, useEffect} from 'react';
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
import {useStore} from '@/store/useStore';
import {PlaylistManager} from '@/services/PlaylistManager';
import {IPTVService, IPTVCredentials} from '@/services/IPTVService';
import {M3UParser} from '@/services/M3UParser';
import {VPNService, VPNConfig} from '@/services/VPNService';
import {AdDetectionService} from '@/services/AdDetectionService';

interface SettingsScreenProps {
  navigation: any;
}

export default function SettingsScreen({navigation}: SettingsScreenProps) {
  const {playlists, currentPlaylist, setCurrentPlaylist, addPlaylist} = useStore();
  const [epgUrl, setEpgUrl] = useState('');
  const [autoPlay, setAutoPlay] = useState(true);
  
  const [showCredentials, setShowCredentials] = useState(false);
  const [username, setUsername] = useState('COCHJNAR01');
  const [password, setPassword] = useState('VYa7uMUeFT');
  const [server, setServer] = useState('http://link4tv.me:80');
  const [altServer, setAltServer] = useState('http://ky-iptv.com:80');

  const [showDezorCredentials, setShowDezorCredentials] = useState(false);
  const [dezorUsername, setDezorUsername] = useState('jascodezoripty');
  const [dezorPassword, setDezorPassword] = useState('19e993b7f5');
  const [dezorServer, setDezorServer] = useState('http://cf.like-cdn.com');

  const [vpnEnabled, setVpnEnabled] = useState(false);
  const [vpnConnecting, setVpnConnecting] = useState(false);
  const [vpnConnected, setVpnConnected] = useState(false);
  const [vpnServer, setVpnServer] = useState('vpn.example.com');
  const [vpnUsername, setVpnUsername] = useState('');
  const [vpnPassword, setVpnPassword] = useState('');
  const [currentIP, setCurrentIP] = useState('Checking...');
  
  const [adBlockEnabled, setAdBlockEnabled] = useState(true);
  const [adVolumeReduction, setAdVolumeReduction] = useState(90);
  
  const vpnService = new VPNService();
  const adService = new AdDetectionService();

  useEffect(() => {
    checkPublicIP();
  }, []);

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
      const config: VPNConfig = {
        enabled: true,
        provider: 'openvpn',
        serverAddress: vpnServer,
        username: vpnUsername,
        password: vpnPassword,
        autoConnect: false,
      };
      vpnService.setConfig(config);
      const success = await vpnService.connect();
      setVpnConnecting(false);
      if (success) {
        setVpnConnected(true);
        setVpnEnabled(true);
        await checkPublicIP();
        Alert.alert('VPN Connected', 'Your connection is now secured.');
      } else {
        Alert.alert('VPN Failed', 'Could not connect to VPN server.');
      }
    }
  };

  const handleAdBlockToggle = () => {
    const newEnabled = !adBlockEnabled;
    setAdBlockEnabled(newEnabled);
    const config = adService.getConfig();
    adService.setConfig({...config, enabled: newEnabled});
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
              placeholder="COCHJNAR01"
              placeholderTextColor="#666"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="VYa7uMUeFT"
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
              placeholder="jascodezoripty"
              placeholderTextColor="#666"
              value={dezorUsername}
              onChangeText={setDezorUsername}
              autoCapitalize="none"
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="19e993b7f5"
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
              style={[styles.updateButton, {marginTop: 15}]}
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
          placeholder="vpn.example.com or IP address"
          placeholderTextColor="#666"
          value={vpnServer}
          onChangeText={setVpnServer}
          autoCapitalize="none"
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
          Note: VPN integration requires OpenVPN or WireGuard configuration files.
          This is a simplified interface for demonstration.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ad Detection & Mute</Text>
        <View style={styles.settingRow}>
          <Text style={styles.label}>Auto-mute commercials</Text>
          <Switch
            value={adBlockEnabled}
            onValueChange={handleAdBlockToggle}
            trackColor={{false: '#767577', true: '#34C759'}}
          />
        </View>

        <Text style={styles.label}>Volume Reduction: {adVolumeReduction}%</Text>
        <View style={styles.sliderRow}>
          <TouchableOpacity
            style={styles.sliderButton}
            onPress={() => setAdVolumeReduction(Math.max(0, adVolumeReduction - 10))}>
            <Text style={styles.buttonText}>-</Text>
          </TouchableOpacity>
          <View style={styles.sliderBar}>
            <View style={[styles.sliderFill, {width: `${adVolumeReduction}%`}]} />
          </View>
          <TouchableOpacity
            style={styles.sliderButton}
            onPress={() => setAdVolumeReduction(Math.min(100, adVolumeReduction + 10))}>
            <Text style={styles.buttonText}>+</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>
          Automatically detects commercials by analyzing audio patterns:
          • Sudden volume increases
          • Extended silence periods
          • Repetitive background music
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>EPG Settings</Text>
        <Text style={styles.label}>XMLTV URL (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="https://example.com/epg.xml"
          placeholderTextColor="#999"
          value={epgUrl}
          onChangeText={setEpgUrl}
        />
        <Text style={styles.hint}>
          Leave empty to use server EPG: {`${server}/xmltv.php?username=${username}&password=${password}`}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Playback</Text>
        <View style={styles.settingRow}>
          <Text style={styles.label}>Auto-play on channel select</Text>
          <Switch
            value={autoPlay}
            onValueChange={setAutoPlay}
            trackColor={{false: '#767577', true: '#007AFF'}}
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
