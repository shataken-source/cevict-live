import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { Channel } from '@/types';
import { useStore } from '@/store/useStore';

interface ChannelPreviewProps {
    channel: Channel;
    onClose: () => void;
    onSelect: () => void;
}

export function ChannelPreview({ channel, onClose, onSelect }: ChannelPreviewProps) {
    const getChannelNumber = () => {
        const { channelPositions } = useStore.getState();
        const pos = channelPositions.find((p) => p.channelId === channel.id);
        return pos?.position || 0;
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.content}
                onPress={onSelect}
                activeOpacity={0.9}
            >
                {/* Channel Preview Card */}
                <View style={styles.previewCard}>
                    {/* Preview Image/Placeholder */}
                    <View style={styles.previewImage}>
                        {channel.logo ? (
                            <Text style={styles.previewPlaceholder}>📺</Text>
                        ) : (
                            <Text style={styles.previewPlaceholder}>📺</Text>
                        )}
                    </View>

                    {/* Channel Info */}
                    <View style={styles.info}>
                        <View style={styles.header}>
                            <Text style={styles.channelNumber}>#{getChannelNumber()}</Text>
                            <Text style={styles.channelName} numberOfLines={1}>
                                {channel.name}
                            </Text>
                        </View>

                        {channel.group && (
                            <View style={styles.programSection}>
                                <Text style={styles.programLabel}>GROUP</Text>
                                <Text style={styles.programTitle} numberOfLines={1}>
                                    {channel.group}
                                </Text>
                            </View>
                        )}

                        {channel.tvgId && (
                            <View style={styles.programSection}>
                                <Text style={styles.programLabel}>TVG ID</Text>
                                <Text style={styles.programTitle} numberOfLines={1}>
                                    {channel.tvgId}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Close Button */}
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                    <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>

                {/* Tap to Select */}
                <Text style={styles.hint}>Tap to watch</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 100,
        right: 20,
        width: 320,
        zIndex: 1000,
    },
    content: {
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        overflow: 'hidden',
    },
    previewCard: {
        flexDirection: 'row',
    },
    previewImage: {
        width: 120,
        height: 90,
        backgroundColor: '#333',
        alignItems: 'center',
        justifyContent: 'center',
    },
    previewPlaceholder: {
        fontSize: 36,
    },
    info: {
        flex: 1,
        padding: 12,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    channelNumber: {
        color: '#007AFF',
        fontSize: 14,
        fontWeight: 'bold',
        marginRight: 8,
    },
    channelName: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
    programSection: {
        marginTop: 4,
    },
    programLabel: {
        color: '#666',
        fontSize: 10,
        fontWeight: 'bold',
    },
    programTitle: {
        color: '#ccc',
        fontSize: 12,
    },
    closeButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeText: {
        color: '#fff',
        fontSize: 12,
    },
    hint: {
        color: '#007AFF',
        fontSize: 12,
        textAlign: 'center',
        padding: 8,
        backgroundColor: '#007AFF20',
    },
});
