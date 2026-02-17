import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Dimensions,
} from 'react-native';
import { useStore } from '@/store/useStore';

interface MiniPlayerProps {
    onPress: () => void;
    onClose: () => void;
}

export function MiniPlayer({ onPress, onClose }: MiniPlayerProps) {
    const { currentChannel, isPlaying } = useStore();
    const [isExpanded, setIsExpanded] = useState(false);

    if (!currentChannel) {
        return null;
    }

    const handleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    if (isExpanded) {
        return (
            <TouchableOpacity
                style={styles.expandedContainer}
                onPress={onPress}
                activeOpacity={0.9}
            >
                <View style={styles.expandedContent}>
                    {/* Channel Logo/Preview */}
                    <View style={styles.expandedImage}>
                        <Text style={styles.previewPlaceholder}>📺</Text>
                    </View>

                    {/* Expanded Info */}
                    <View style={styles.expandedInfo}>
                        <Text style={styles.expandedChannelName} numberOfLines={1}>
                            {currentChannel.name}
                        </Text>
                        <View style={styles.expandedStatus}>
                            <View style={[styles.statusDot, { backgroundColor: isPlaying ? '#34C759' : '#FF3B30' }]} />
                            <Text style={styles.statusText}>
                                {isPlaying ? 'LIVE' : 'PAUSED'}
                            </Text>
                        </View>
                    </View>

                    {/* Controls */}
                    <View style={styles.expandedControls}>
                        <TouchableOpacity
                            style={styles.controlButton}
                            onPress={(e) => {
                                e.stopPropagation();
                                onClose();
                            }}
                        >
                            <Text style={styles.controlText}>✕</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        );
    }

    // Collapsed mini player
    return (
        <TouchableOpacity
            style={styles.container}
            onPress={handleExpand}
            activeOpacity={0.9}
        >
            <View style={styles.content}>
                {/* Channel indicator */}
                <View style={styles.indicator}>
                    <Text style={styles.indicatorText}>📺</Text>
                </View>

                {/* Channel name */}
                <Text style={styles.channelName} numberOfLines={1}>
                    {currentChannel.name}
                </Text>

                {/* Status */}
                <View style={styles.statusContainer}>
                    <View style={[styles.statusDot, { backgroundColor: isPlaying ? '#34C759' : '#FF3B30' }]} />
                    <Text style={styles.statusText}>
                        {isPlaying ? 'LIVE' : 'PAUSED'}
                    </Text>
                </View>

                {/* Expand button */}
                <TouchableOpacity
                    style={styles.expandButton}
                    onPress={handleExpand}
                >
                    <Text style={styles.expandText}>⤢</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        borderRadius: 12,
        zIndex: 999,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    indicator: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: '#333',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    indicatorText: {
        fontSize: 20,
    },
    channelName: {
        flex: 1,
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 12,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    statusText: {
        color: '#888',
        fontSize: 10,
        fontWeight: 'bold',
    },
    expandButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#333',
        alignItems: 'center',
        justifyContent: 'center',
    },
    expandText: {
        color: '#fff',
        fontSize: 14,
    },

    // Expanded styles
    expandedContainer: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        borderRadius: 16,
        zIndex: 999,
    },
    expandedContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    expandedImage: {
        width: 120,
        height: 68,
        borderRadius: 8,
        backgroundColor: '#333',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    previewPlaceholder: {
        fontSize: 32,
    },
    expandedInfo: {
        flex: 1,
    },
    expandedChannelName: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    expandedStatus: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    expandedControls: {
        flexDirection: 'row',
    },
    controlButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#333',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
    controlText: {
        color: '#fff',
        fontSize: 16,
    },
});
