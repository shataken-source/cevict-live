import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Channel, EPGProgram, EPG_CONFIG } from '@/types';

interface ChannelListProps {
  channels: Channel[];
  currentProgramMap: Map<string, EPGProgram | null>;
  selectedChannelId?: string;
  currentChannelId?: string;
  favorites: string[];
  onChannelSelect: (channel: Channel) => void;
}

export function ChannelList({
  channels,
  currentProgramMap,
  selectedChannelId,
  currentChannelId,
  favorites,
  onChannelSelect,
}: ChannelListProps) {
  const renderChannel = ({ item }: { item: Channel }) => {
    const epgId = item.tvgId || item.id;
    const currentProgram = currentProgramMap.get(epgId);
    const isSelected = selectedChannelId === item.id;
    const isPlaying = currentChannelId === item.id;
    const isFavorite = favorites.includes(item.id);

    return (
      <TouchableOpacity
        style={[
          styles.channelRow,
          isSelected && styles.selectedRow,
          isPlaying && styles.playingRow,
        ]}
        onPress={() => onChannelSelect(item)}
        activeOpacity={0.7}>
        <View style={styles.logoContainer}>
          {item.logo ? (
            <Image source={{ uri: item.logo }} style={styles.logo} resizeMode="contain" />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoText} numberOfLines={1}>
                {item.name.substring(0, 3).toUpperCase()}
              </Text>
            </View>
          )}
          {isFavorite && <Text style={styles.favDot}>★</Text>}
        </View>
        <View style={styles.channelInfo}>
          <Text style={styles.channelName} numberOfLines={1}>
            {isPlaying ? '▶ ' : ''}{item.name}
          </Text>
          {currentProgram && (
            <Text style={styles.nowPlaying} numberOfLines={1}>
              {currentProgram.title}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={channels}
      renderItem={renderChannel}
      keyExtractor={item => item.id}
      style={styles.list}
      showsVerticalScrollIndicator={false}
      getItemLayout={(_, index) => ({
        length: EPG_CONFIG.channelRowHeight,
        offset: EPG_CONFIG.channelRowHeight * index,
        index,
      })}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    width: EPG_CONFIG.sidebarWidth,
    borderRightWidth: 1,
    borderRightColor: '#444',
  },
  channelRow: {
    height: EPG_CONFIG.channelRowHeight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    backgroundColor: '#1a1a1a',
  },
  selectedRow: {
    backgroundColor: '#007AFF22',
  },
  playingRow: {
    backgroundColor: '#34C75922',
  },
  logoContainer: {
    width: 36,
    height: 36,
    marginRight: 6,
    position: 'relative',
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 4,
  },
  logoPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 4,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: '#888',
    fontSize: 9,
    fontWeight: 'bold',
  },
  favDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    fontSize: 10,
    color: '#FFD700',
  },
  channelInfo: {
    flex: 1,
  },
  channelName: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  nowPlaying: {
    color: '#888',
    fontSize: 10,
    marginTop: 2,
  },
});
