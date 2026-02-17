import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    FlatList,
    Dimensions,
} from 'react-native';
import { useStore } from '@/store/useStore';
import { Channel } from '@/types';

interface QuickChannelSwitcherProps {
    visible: boolean;
    onClose: () => void;
    onSelectChannel: (channel: Channel) => void;
}

export function QuickChannelSwitcher({
    visible,
    onClose,
    onSelectChannel,
}: QuickChannelSwitcherProps) {
    const { channelHistory, playlists, currentChannel } = useStore();
    const [recentChannels, setRecentChannels] = useState<Channel[]>([]);

    useEffect(() => {
        // Get recent channels from history
        const channelMap = new Map<string, Channel>();

        // Add current channel first
        if (currentChannel) {
            channelMap.set(currentChannel.id, currentChannel);
        }

        // Get channels from history
        channelHistory.slice(0, 20).forEach((item) => {
            if (!channelMap.has(item.channelId)) {
                // Find channel in playlists
                playlists.forEach((playlist) => {
                    const channel = playlist.channels.find((c) => c.id === item.channelId);
                    if (channel && !channelMap.has(channel.id)) {
                        channelMap.set(channel.id, channel);
                    }
                });
            }
        });

        setRecentChannels(Array.from(channelMap.values()).slice(0, 12));
    }, [channelHistory, currentChannel, playlists]);

    const handleSelectChannel = (channel: Channel) => {
        onSelectChannel(channel);
        onClose();
    };

    const renderChannel = ({ item, index }: { item: Channel; index: number }) => (
        <TouchableOpacity
            style={[
                styles.channelItem,
                currentChannel?.id === item.id && styles.currentChannel,
            ]}
            onPress={() => handleSelectChannel(item)}
        >
            <Text style={styles.channelNumber}>{index + 1}</Text>
            <View style={styles.channelInfo}>
                <Text style={styles.channelName} numberOfLines={1}>
                    {item.name}
                </Text>
                {item.group && (
                    <Text style={styles.channelGroup} numberOfLines={1}>
                        {item.group}
                    </Text>
                )}
            </View>
            {currentChannel?.id === item.id && (
                <View style={styles.playingIndicator}>
                    <Text style={styles.playingText}>▶</Text>
                </View>
            )}
        </TouchableOpacity>
    );

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Quick Switch</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Text style={styles.closeText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={recentChannels}
                        renderItem={renderChannel}
                        keyExtractor={(item) => item.id}
                        numColumns={2}
                        contentContainerStyle={styles.listContent}
                    />

                    <Text style={styles.hint}>
                        Tap a channel to switch • Use number keys for quick access
                    </Text>
                </View>
            </View>
        </Modal>
    );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        backgroundColor: '#2a2a2a',
        borderRadius: 16,
        width: width * 0.85,
        maxHeight: height * 0.6,
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#444',
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeText: {
        color: '#fff',
        fontSize: 16,
    },
    listContent: {
        padding: 8,
    },
    channelItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#3a3a3a',
        borderRadius: 8,
        padding: 12,
        margin: 4,
        minWidth: '45%',
    },
    currentChannel: {
        backgroundColor: '#007AFF40',
        borderWidth: 1,
        borderColor: '#007AFF',
    },
    channelNumber: {
        color: '#666',
        fontSize: 12,
        width: 24,
    },
    channelInfo: {
        flex: 1,
    },
    channelName: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    channelGroup: {
        color: '#888',
        fontSize: 11,
        marginTop: 2,
    },
    playingIndicator: {
        backgroundColor: '#34C759',
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    playingText: {
        color: '#fff',
        fontSize: 10,
    },
    hint: {
        color: '#666',
        fontSize: 12,
        textAlign: 'center',
        marginTop: 12,
    },
});
