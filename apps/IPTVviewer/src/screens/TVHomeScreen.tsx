import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useStore } from '@/store/useStore';

interface TVHomeScreenProps {
  navigation: any;
}

export default function TVHomeScreen({ navigation }: TVHomeScreenProps) {
  const { currentPlaylist, playlists } = useStore();
  const [expiresIn, setExpiresIn] = useState<string>('');

  useEffect(() => {
    if (currentPlaylist?.expiresAt) {
      const updateExpiration = () => {
        const now = new Date();
        const expires = new Date(currentPlaylist.expiresAt!);
        const diff = expires.getTime() - now.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (days < 0) {
          setExpiresIn('Expired');
        } else if (days === 0) {
          setExpiresIn('Expires today');
        } else {
          setExpiresIn(`Expires in ${days} days`);
        }
      };
      
      updateExpiration();
      const interval = setInterval(updateExpiration, 60000);
      return () => clearInterval(interval);
    }
  }, [currentPlaylist]);

  const getChannelCount = () => {
    return currentPlaylist?.channels.length || 0;
  };

  const getCategoryCount = () => {
    if (!currentPlaylist) return 0;
    const categories = new Set(currentPlaylist.channels.map(c => c.group).filter(Boolean));
    return categories.size;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appName}>Switchback TV</Text>
          {currentPlaylist && (
            <Text style={styles.playlistInfo}>
              {currentPlaylist.name} • {getChannelCount()} channels
            </Text>
          )}
        </View>
        {expiresIn && (
          <View style={[
            styles.expirationBadge,
            expiresIn.includes('Expired') && styles.expirationExpired
          ]}>
            <Text style={styles.expirationText}>{expiresIn}</Text>
          </View>
        )}
      </View>

      {/* Main Grid */}
      <View style={styles.grid}>
        {/* Live TV - Large Primary Tile */}
        <TouchableOpacity
          style={[styles.tile, styles.tileLarge]}
          onPress={() => navigation.navigate('Channels')}>
          <View style={styles.tileIcon}>
            <Text style={styles.tileIconText}>📺</Text>
          </View>
          <Text style={styles.tileLabelLarge}>Live TV</Text>
          <Text style={styles.tileSubtext}>{getChannelCount()} channels</Text>
        </TouchableOpacity>

        {/* Right Column */}
        <View style={styles.rightColumn}>
          {/* Movies */}
          <TouchableOpacity
            style={styles.tile}
            onPress={() => navigation.navigate('Movies')}>
            <View style={styles.tileIcon}>
              <Text style={styles.tileIconText}>🎬</Text>
            </View>
            <Text style={styles.tileLabel}>Movies</Text>
          </TouchableOpacity>

          {/* Series */}
          <TouchableOpacity
            style={styles.tile}
            onPress={() => navigation.navigate('Series')}>
            <View style={styles.tileIcon}>
              <Text style={styles.tileIconText}>📺</Text>
            </View>
            <Text style={styles.tileLabel}>Series</Text>
          </TouchableOpacity>
        </View>

        {/* Sidebar */}
        <View style={styles.sidebar}>
          <TouchableOpacity
            style={styles.sidebarButton}
            onPress={() => navigation.navigate('Settings')}>
            <Text style={styles.sidebarIcon}>⚙️</Text>
            <Text style={styles.sidebarText}>Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sidebarButton}
            onPress={() => {
              // Reload playlist logic
            }}>
            <Text style={styles.sidebarIcon}>🔄</Text>
            <Text style={styles.sidebarText}>Reload</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sidebarButton}
            onPress={() => {
              // Exit app
            }}>
            <Text style={styles.sidebarIcon}>🚪</Text>
            <Text style={styles.sidebarText}>Exit</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Row */}
      <View style={styles.bottomRow}>
        <TouchableOpacity
          style={styles.tile}
          onPress={() => navigation.navigate('Favorites')}>
          <View style={styles.tileIcon}>
            <Text style={styles.tileIconText}>⭐</Text>
          </View>
          <Text style={styles.tileLabel}>Favorites</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tile}
          onPress={() => navigation.navigate('History')}>
          <View style={styles.tileIcon}>
            <Text style={styles.tileIconText}>🕐</Text>
          </View>
          <Text style={styles.tileLabel}>History</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tile}
          onPress={() => navigation.navigate('EPG')}>
          <View style={styles.tileIcon}>
            <Text style={styles.tileIconText}>📋</Text>
          </View>
          <Text style={styles.tileLabel}>Guide</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tile}
          onPress={() => navigation.navigate('Settings')}>
          <View style={styles.tileIcon}>
            <Text style={styles.tileIconText}>👤</Text>
          </View>
          <Text style={styles.tileLabel}>Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    padding: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  appName: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(255, 0, 100, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  playlistInfo: {
    fontSize: 20,
    color: '#999',
    marginTop: 8,
  },
  expirationBadge: {
    backgroundColor: 'rgba(255, 200, 0, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ffc800',
  },
  expirationExpired: {
    backgroundColor: 'rgba(255, 0, 0, 0.2)',
    borderColor: '#ff0000',
  },
  expirationText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
  grid: {
    flex: 1,
    flexDirection: 'row',
    gap: 20,
  },
  rightColumn: {
    flex: 1,
    gap: 20,
  },
  sidebar: {
    width: 180,
    gap: 20,
  },
  tile: {
    backgroundColor: 'rgba(200, 0, 80, 0.3)',
    borderRadius: 20,
    padding: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 0, 100, 0.5)',
  },
  tileLarge: {
    flex: 2,
    minHeight: 400,
  },
  tileIcon: {
    marginBottom: 20,
  },
  tileIconText: {
    fontSize: 80,
  },
  tileLabelLarge: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  tileLabel: {
    fontSize: 28,
    fontWeight: '600',
    color: '#fff',
  },
  tileSubtext: {
    fontSize: 20,
    color: '#ccc',
  },
  sidebarButton: {
    backgroundColor: 'rgba(100, 100, 100, 0.3)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  sidebarIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  sidebarText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
  bottomRow: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 20,
  },
});
