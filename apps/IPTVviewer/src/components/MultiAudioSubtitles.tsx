import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    FlatList,
    TouchableWithoutFeedback,
} from 'react-native';

export interface AudioTrack {
    id: string;
    language: string;
    name: string;
    type: 'audio';
    selected: boolean;
}

export interface SubtitleTrack {
    id: string;
    language: string;
    name: string;
    type: 'subtitle';
    selected: boolean;
    forced: boolean;
}

export type MediaTrack = AudioTrack | SubtitleTrack;

interface MultiAudioSubtitlesProps {
    visible: boolean;
    audioTracks: AudioTrack[];
    subtitleTracks: SubtitleTrack[];
    onSelectTrack: (track: MediaTrack) => void;
    onClose: () => void;
}

export function MultiAudioSubtitles({
    visible,
    audioTracks,
    subtitleTracks,
    onSelectTrack,
    onClose,
}: MultiAudioSubtitlesProps) {
    const [activeTab, setActiveTab] = useState<'audio' | 'subtitles'>('audio');

    const currentTracks = activeTab === 'audio' ? audioTracks : subtitleTracks;

    const renderTrack = ({ item }: { item: MediaTrack }) => (
        <TouchableOpacity
            style={[styles.trackItem, item.selected && styles.trackSelected]}
            onPress={() => onSelectTrack(item)}
        >
            <View style={styles.trackInfo}>
                <Text style={styles.trackLanguage}>{item.language.toUpperCase()}</Text>
                <Text style={styles.trackName} numberOfLines={1}>
                    {item.name}
                </Text>
                {'forced' in item && item.forced && (
                    <Text style={styles.forcedLabel}>FORCED</Text>
                )}
            </View>
            {item.selected && (
                <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
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
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={styles.container}>
                            <View style={styles.header}>
                                <Text style={styles.title}>Audio & Subtitles</Text>
                                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                    <Text style={styles.closeText}>✕</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Tabs */}
                            <View style={styles.tabs}>
                                <TouchableOpacity
                                    style={[styles.tab, activeTab === 'audio' && styles.tabActive]}
                                    onPress={() => setActiveTab('audio')}
                                >
                                    <Text
                                        style={[
                                            styles.tabText,
                                            activeTab === 'audio' && styles.tabTextActive,
                                        ]}
                                    >
                                        Audio ({audioTracks.length})
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.tab,
                                        activeTab === 'subtitles' && styles.tabActive,
                                    ]}
                                    onPress={() => setActiveTab('subtitles')}
                                >
                                    <Text
                                        style={[
                                            styles.tabText,
                                            activeTab === 'subtitles' && styles.tabTextActive,
                                        ]}
                                    >
                                        Subtitles ({subtitleTracks.length})
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* Track List */}
                            <FlatList
                                data={currentTracks}
                                renderItem={renderTrack}
                                keyExtractor={(item) => item.id}
                                contentContainerStyle={styles.listContent}
                                showsVerticalScrollIndicator={false}
                            />

                            {/* Off option for subtitles */}
                            {activeTab === 'subtitles' && (
                                <TouchableOpacity
                                    style={styles.offButton}
                                    onPress={() => {
                                        // Create a "disabled" track
                                        onSelectTrack({
                                            id: 'off',
                                            language: '',
                                            name: 'Off',
                                            type: 'subtitle',
                                            selected: false,
                                            forced: false,
                                        });
                                    }}
                                >
                                    <Text style={styles.offButtonText}>Turn Off Subtitles</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

// Demo/tracks component for testing
export function getDemoTracks(): {
    audio: AudioTrack[];
    subtitles: SubtitleTrack[];
} {
    return {
        audio: [
            { id: 'audio-en', language: 'en', name: 'English (Stereo)', type: 'audio', selected: true },
            { id: 'audio-es', language: 'es', name: 'Español (Stereo)', type: 'audio', selected: false },
            { id: 'audio-fr', language: 'fr', name: 'Français (Stereo)', type: 'audio', selected: false },
            { id: 'audio-5.1', language: 'en', name: 'English (5.1)', type: 'audio', selected: false },
        ],
        subtitles: [
            { id: 'sub-en', language: 'en', name: 'English', type: 'subtitle', selected: false, forced: false },
            { id: 'sub-es', language: 'es', name: 'Español', type: 'subtitle', selected: false, forced: false },
            { id: 'sub-fr', language: 'fr', name: 'Français', type: 'subtitle', selected: false, forced: false },
            { id: 'sub-forced', language: 'en', name: 'English (Forced)', type: 'subtitle', selected: false, forced: true },
        ],
    };
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: '#2a2a2a',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '70%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#3a3a3a',
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
    tabs: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#3a3a3a',
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    tabActive: {
        backgroundColor: '#007AFF30',
    },
    tabText: {
        color: '#888',
        fontSize: 14,
        fontWeight: '600',
    },
    tabTextActive: {
        color: '#007AFF',
    },
    listContent: {
        padding: 12,
    },
    trackItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#3a3a3a',
        borderRadius: 8,
        padding: 14,
        marginVertical: 4,
    },
    trackSelected: {
        backgroundColor: '#007AFF30',
        borderWidth: 1,
        borderColor: '#007AFF',
    },
    trackInfo: {
        flex: 1,
    },
    trackLanguage: {
        color: '#666',
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    trackName: {
        color: '#fff',
        fontSize: 14,
    },
    forcedLabel: {
        color: '#FF9500',
        fontSize: 10,
        fontWeight: 'bold',
        marginTop: 2,
    },
    checkmark: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#007AFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkmarkText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    offButton: {
        margin: 16,
        padding: 14,
        backgroundColor: '#FF3B30',
        borderRadius: 8,
        alignItems: 'center',
    },
    offButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
