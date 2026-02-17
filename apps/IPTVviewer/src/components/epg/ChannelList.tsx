import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Channel, EPGProgram, EPG_CONFIG } from '@/types';

interface ChannelListProps {
    channels: Channel[];
    currentProgramMap: Map<string, EPGProgram | null>;
    selectedChannelId?: string;
    onChannelSelect: (channel: Channel) => void;
    currentChannelId?: string;
    favorites?: string[];
}

export function ChannelList({
    channels,
    currentProgramMap,
    selectedChannelId,
    onChannelSelect,
    currentChannelId,
    favorites = [],
}: ChannelListProps) {
    const renderChannel = ({ item }: { item: Channel }) => {
        const isSelected = item.id === selectedChannelId;
        const isPlaying = item.id === currentChannelId;
        const isFavorite = favorites.includes(item.id);
        const currentProgram = currentProgramMap.get(item.id);

        return (
            <TouchableOpacity
                style={[
                    styles.channelRow,
                    isSelected && styles.selectedChannel,
                    isPlaying && styles.nowPlayingChannel,
                ]}
                onPress={() => onChannelSelect(item)}
            >
                <View style={styles.channelInfo}>
                    {item.logo ? (
                        <View style={styles.logoContainer}>
                            <Text style={styles.logoText}>📺</Text>
                        </View>
                    ) : (
                        <View style={styles.logoPlaceholder}>
                            <Text style={styles.logoPlaceholderText}>📺</Text>
                        </View>
                    )}
                    <View style={styles.channelDetails}>
                        <Text style={styles.channelName} numberOfLines={1}>
                            {item.name}
                        </Text>
                        {currentProgram && (
                            <Text style={styles.currentProgram} numberOfLines={1}>
                                {currentProgram.title}
                            </Text>
                        )}
                    </View>
                </View>
                <View style={styles.indicators}>
                    {isFavorite && <Text style={styles.favoriteIcon}>★</Text>}
                    {isPlaying && <View style={styles.playingIndicator} />}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <FlatList
                data={channels}
                renderItem={renderChannel}
                keyExtractor={item => item.id}
                showsVerticalScrollIndicator={false}
                getItemLayout={(_, index) => ({
                    length: EPG_CONFIG.channelRowHeight,
                    offset: EPG_CONFIG.channelRowHeight * index,
                    index,
                })}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: EPG_CONFIG.sidebarWidth,
        backgroundColor: '#2a2a2a',
        borderRightWidth: 1,
        borderRightColor: '#444',
    },
    channelRow: {
        height: EPG_CONFIG.channelRowHeight,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    selectedChannel: {
        backgroundColor: EPG_CONFIG.highlightColor + '40',
    },
    nowPlayingChannel: {
        borderLeftWidth: 3,
        borderLeftColor: '#34C759',
    },
    channelInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoContainer: {
        width: 32,
        height: 32,
        borderRadius: 4,
        backgroundColor: '#444',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    logoText: {
        fontSize: 16,
    },
    logoPlaceholder: {
        width: 32,
        height: 32,
        borderRadius: 4,
        backgroundColor: '#333',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    logoPlaceholderText: {
        fontSize: 14,
        color: '#666',
    },
    channelDetails: {
        flex: 1,
    },
    channelName: {
        color: EPG_CONFIG.textColor,
        fontSize: 13,
        fontWeight: '600',
    },
    currentProgram: {
        color: '#888',
        fontSize: 11,
        marginTop: 2,
    },
    indicators: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    favoriteIcon: {
        color: '#FFD700',
        fontSize: 14,
    },
    playingIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#34C759',
    },
});
