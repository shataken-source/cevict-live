import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
} from 'react-native';
import { useStore } from '@/store/useStore';
import { Channel } from '@/types';

interface ChannelHistoryScreenProps {
    onChannelSelect: (channel: Channel) => void;
    onClose: () => void;
}

interface HistoryItem {
    channel: Channel;
    timestamp: Date;
}

export function ChannelHistoryScreen({
    onChannelSelect,
    onClose,
}: ChannelHistoryScreenProps) {
    const { channelHistory, playlists } = useStore();
    const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

    useEffect(() => {
        // Convert history to full channel objects
        const items: HistoryItem[] = [];
        const seenChannels = new Map<string, HistoryItem>();

        // Process history in reverse (most recent first)
        [...channelHistory].reverse().forEach((item) => {
            if (seenChannels.has(item.channelId)) return;

            // Find channel in playlists
            let channel: Channel | undefined;
            for (const playlist of playlists) {
                channel = playlist.channels.find((c) => c.id === item.channelId);
                if (channel) break;
            }

            if (channel) {
                const historyItem = {
                    channel,
                    timestamp: new Date(item.timestamp),
                };
                seenChannels.set(item.channelId, historyItem);
                items.push(historyItem);
            }
        });

        setHistoryItems(items);
    }, [channelHistory, playlists]);

    const formatTime = (date: Date): string => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);

        if (days > 0) {
            return `${days}d ago`;
        } else if (hours > 0) {
            return `${hours}h ago`;
        } else {
            return 'Just now';
        }
    };

    const renderHistoryItem = ({ item, index }: { item: HistoryItem; index: number }) => (
        <TouchableOpacity
            style={styles.channelItem}
            onPress={() => {
                onChannelSelect(item.channel);
                onClose();
            }}
        >
            {/* Channel number/index */}
            <Text style={styles.channelNumber}>{index + 1}</Text>

            {/* Channel logo or placeholder */}
            <View style={styles.channelLogo}>
                {item.channel.logo ? (
                    <Image
                        source={{ uri: item.channel.logo }}
                        style={styles.logoImage}
                        resizeMode="contain"
                    />
                ) : (
                    <Text style={styles.logoPlaceholder}>📺</Text>
                )}
            </View>

            {/* Channel info */}
            <View style={styles.channelInfo}>
                <Text style={styles.channelName} numberOfLines={1}>
                    {item.channel.name}
                </Text>
                {item.channel.group && (
                    <Text style={styles.channelGroup} numberOfLines={1}>
                        {item.channel.group}
                    </Text>
                )}
                <Text style={styles.timestamp}>{formatTime(item.timestamp)}</Text>
            </View>

            {/* Play button */}
            <TouchableOpacity
                style={styles.playButton}
                onPress={() => {
                    onChannelSelect(item.channel);
                    onClose();
                }}
            >
                <Text style={styles.playIcon}>▶</Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Watch History</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
            </View>

            {/* Stats */}
            <View style={styles.stats}>
                <Text style={styles.statsText}>
                    {historyItems.length} channels • Last 50 watched
                </Text>
            </View>

            {/* History list */}
            {historyItems.length > 0 ? (
                <FlatList
                    data={historyItems}
                    renderItem={renderHistoryItem}
                    keyExtractor={(item) => item.channel.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            ) : (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>📡</Text>
                    <Text style={styles.emptyTitle}>No History</Text>
                    <Text style={styles.emptyText}>
                        Channels you watch will appear here
                    </Text>
                </View>
            )}

            {/* Clear history button */}
            {historyItems.length > 0 && (
                <TouchableOpacity
                    style={styles.clearButton}
                    onPress={() => {
                        // Clear history functionality would go here
                        console.log('Clear history');
                    }}
                >
                    <Text style={styles.clearButtonText}>Clear History</Text>
                </TouchableOpacity>
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
        paddingTop: 40,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    title: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#333',
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeText: {
        color: '#fff',
        fontSize: 16,
    },
    stats: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    statsText: {
        color: '#888',
        fontSize: 12,
    },
    listContent: {
        padding: 12,
    },
    channelItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2a2a2a',
        borderRadius: 12,
        padding: 12,
        marginVertical: 4,
    },
    channelNumber: {
        color: '#666',
        fontSize: 14,
        width: 24,
        textAlign: 'center',
    },
    channelLogo: {
        width: 50,
        height: 50,
        borderRadius: 8,
        backgroundColor: '#333',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    logoImage: {
        width: 40,
        height: 40,
        borderRadius: 4,
    },
    logoPlaceholder: {
        fontSize: 24,
    },
    channelInfo: {
        flex: 1,
    },
    channelName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    channelGroup: {
        color: '#888',
        fontSize: 12,
        marginTop: 2,
    },
    timestamp: {
        color: '#666',
        fontSize: 10,
        marginTop: 2,
    },
    playButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#007AFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    playIcon: {
        color: '#fff',
        fontSize: 16,
        marginLeft: 2,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    emptyText: {
        color: '#888',
        fontSize: 14,
        textAlign: 'center',
    },
    clearButton: {
        margin: 20,
        padding: 14,
        backgroundColor: '#FF3B3020',
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FF3B30',
    },
    clearButtonText: {
        color: '#FF3B30',
        fontSize: 14,
        fontWeight: '600',
    },
});
