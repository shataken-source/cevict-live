import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Dimensions,
    Platform,
} from 'react-native';
import { useStore } from '@/store/useStore';

interface PictureInPictureProps {
    onExpand: () => void;
    onClose: () => void;
    position?: 'bottom-right' | 'bottom-left';
}

export function PictureInPicture({
    onExpand,
    onClose,
    position = 'bottom-right',
}: PictureInPictureProps) {
    const { currentChannel, isPlaying } = useStore();
    const [isExpanded, setIsExpanded] = useState(false);

    // Note: Actual PiP requires native implementation
    // For Android: Use PictureInPictureModule from react-native
    // For iOS: Use AVPictureInPictureController

    const isNativePipSupported = Platform.OS === 'android';

    if (!currentChannel) {
        return null;
    }

    if (isExpanded) {
        return (
            <TouchableOpacity
                style={[styles.expandedContainer, position === 'bottom-left' && styles.expandedLeft]}
                onPress={onExpand}
                activeOpacity={0.9}
            >
                <View style={styles.expandedContent}>
                    <View style={styles.expandedVideo}>
                        <Text style={styles.pipPlaceholder}>📺</Text>
                    </View>
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
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={(e) => {
                            e.stopPropagation();
                            onClose();
                        }}
                    >
                        <Text style={styles.closeText}>✕</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            style={[styles.container, position === 'bottom-left' && styles.containerLeft]}
            onPress={onExpand}
            activeOpacity={0.9}
        >
            <View style={styles.content}>
                {/* Preview */}
                <View style={styles.preview}>
                    <Text style={styles.pipPlaceholder}>📺</Text>
                </View>

                {/* Status indicator */}
                <View style={styles.statusContainer}>
                    <View style={[styles.statusDot, { backgroundColor: isPlaying ? '#34C759' : '#FF3B30' }]} />
                    <Text style={styles.statusText}>
                        {isPlaying ? 'LIVE' : 'PAUSED'}
                    </Text>
                </View>
            </View>

            {/* Native PiP hint */}
            {!isNativePipSupported && (
                <View style={styles.hint}>
                    <Text style={styles.hintText}>Tap to expand</Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

/**
 * PictureInPictureController - handles native PiP activation
 */
export class PictureInPictureController {
    /**
     * Check if PiP is supported on this device
     */
    static isSupported(): boolean {
        // For Android, check if the device supports PiP
        // return PictureInPictureModule?.isSupported?.() ?? false;
        return Platform.OS === 'android';
    }

    /**
     * Check if PiP is currently active
     */
    static isActive(): boolean {
        // return PictureInPictureModule?.isActive?.() ?? false;
        return false;
    }

    /**
     * Enter PiP mode
     */
    static async enter(): Promise<boolean> {
        if (!this.isSupported()) {
            console.log('PiP: Not supported on this device');
            return false;
        }

        try {
            // In production:
            // await PictureInPictureModule.enterPictureInPicture();
            console.log('PiP: Entering picture-in-picture mode');
            return true;
        } catch (error) {
            console.error('PiP: Failed to enter', error);
            return false;
        }
    }

    /**
     * Exit PiP mode
     */
    static async exit(): Promise<boolean> {
        try {
            // In production:
            // await PictureInPictureModule.exitPictureInPicture();
            console.log('PiP: Exiting picture-in-picture mode');
            return true;
        } catch (error) {
            console.error('PiP: Failed to exit', error);
            return false;
        }
    }

    /**
     * Update the PiP UI (when video changes)
     */
    static async updateAspectRatio(width: number, height: number): Promise<void> {
        // In production, update the aspect ratio for PiP window
        console.log('PiP: Aspect ratio updated', width, height);
    }
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
    // Collapsed PiP
    container: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 180,
        height: 120,
        backgroundColor: '#000',
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        zIndex: 999,
    },
    containerLeft: {
        right: undefined,
        left: 20,
    },
    content: {
        flex: 1,
    },
    preview: {
        flex: 1,
        backgroundColor: '#1a1a1a',
        alignItems: 'center',
        justifyContent: 'center',
    },
    pipPlaceholder: {
        fontSize: 40,
    },
    statusContainer: {
        position: 'absolute',
        top: 8,
        left: 8,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    statusText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    hint: {
        backgroundColor: '#007AFF',
        paddingVertical: 4,
    },
    hintText: {
        color: '#fff',
        fontSize: 10,
        textAlign: 'center',
    },

    // Expanded PiP
    expandedContainer: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 320,
        backgroundColor: '#000',
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 10,
        zIndex: 999,
    },
    expandedLeft: {
        right: undefined,
        left: 20,
    },
    expandedContent: {
        flexDirection: 'row',
    },
    expandedVideo: {
        width: 160,
        height: 90,
        backgroundColor: '#1a1a1a',
        alignItems: 'center',
        justifyContent: 'center',
    },
    expandedInfo: {
        flex: 1,
        padding: 12,
        justifyContent: 'center',
    },
    expandedChannelName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    expandedStatus: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    closeButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255,59,48,0.9)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
});
