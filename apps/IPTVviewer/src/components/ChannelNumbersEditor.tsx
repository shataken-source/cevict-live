import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    FlatList,
    TextInput,
    TouchableWithoutFeedback,
} from 'react-native';
import { Channel } from '@/types';
import { useStore } from '@/store/useStore';

interface ChannelNumbersEditorProps {
    visible: boolean;
    onClose: () => void;
}

export function ChannelNumbersEditor({ visible, onClose }: ChannelNumbersEditorProps) {
    const { playlists, channelPositions, setChannelPosition } = useStore();
    const [channels, setChannels] = useState<Channel[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');

    useEffect(() => {
        // Collect all channels from playlists
        const allChannels: Channel[] = [];
        playlists.forEach((playlist) => {
            playlist.channels.forEach((channel) => {
                if (!allChannels.find((c) => c.id === channel.id)) {
                    allChannels.push(channel);
                }
            });
        });

        // Sort by current position or original order
        const sorted = allChannels.sort((a, b) => {
            const posA = channelPositions.find((p) => p.channelId === a.id)?.position ?? 999;
            const posB = channelPositions.find((p) => p.channelId === b.id)?.position ?? 999;
            return posA - posB;
        });

        setChannels(sorted);
    }, [playlists, channelPositions]);

    const getPosition = (channelId: string): number => {
        const pos = channelPositions.find((p) => p.channelId === channelId);
        return pos?.position ?? 0;
    };

    const handleStartEdit = (channelId: string, currentPosition: number) => {
        setEditingId(channelId);
        setEditValue(currentPosition > 0 ? currentPosition.toString() : '');
    };

    const handleSavePosition = () => {
        if (editingId) {
            const position = parseInt(editValue, 10) || 0;
            setChannelPosition(editingId, position);
            setEditingId(null);
            setEditValue('');
        }
    };

    const handleMoveUp = (index: number) => {
        if (index > 0) {
            const currentPos = getPosition(channels[index].id);
            const prevPos = getPosition(channels[index - 1].id);

            setChannelPosition(channels[index].id, prevPos);
            setChannelPosition(channels[index - 1].id, currentPos);
        }
    };

    const handleMoveDown = (index: number) => {
        if (index < channels.length - 1) {
            const currentPos = getPosition(channels[index].id);
            const nextPos = getPosition(channels[index + 1].id);

            setChannelPosition(channels[index].id, nextPos);
            setChannelPosition(channels[index + 1].id, currentPos);
        }
    };

    const renderChannel = ({ item, index }: { item: Channel; index: number }) => {
        const position = getPosition(item.id);
        const isEditing = editingId === item.id;

        return (
            <View style={styles.channelItem}>
                <View style={styles.channelInfo}>
                    <Text style={styles.channelNumber}>
                        {position > 0 ? `#${position}` : '—'}
                    </Text>
                    <Text style={styles.channelName} numberOfLines={1}>
                        {item.name}
                    </Text>
                </View>

                <View style={styles.channelActions}>
                    {isEditing ? (
                        <View style={styles.editContainer}>
                            <TextInput
                                style={styles.editInput}
                                value={editValue}
                                onChangeText={setEditValue}
                                keyboardType="number-pad"
                                autoFocus
                                onBlur={handleSavePosition}
                                onSubmitEditing={handleSavePosition}
                            />
                            <TouchableOpacity
                                style={styles.saveButton}
                                onPress={handleSavePosition}
                            >
                                <Text style={styles.saveButtonText}>✓</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <>
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => handleStartEdit(item.id, position)}
                            >
                                <Text style={styles.actionText}>✎</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => handleMoveUp(index)}
                                disabled={index === 0}
                            >
                                <Text style={[styles.actionText, index === 0 && styles.actionDisabled]}>
                                    ↑
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => handleMoveDown(index)}
                                disabled={index === channels.length - 1}
                            >
                                <Text style={[styles.actionText, index === channels.length - 1 && styles.actionDisabled]}>
                                    ↓
                                </Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>
        );
    };

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
                                <Text style={styles.title}>Channel Numbers</Text>
                                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                    <Text style={styles.closeText}>✕</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.hint}>
                                Tap number to edit • Use arrows to reorder
                            </Text>

                            <FlatList
                                data={channels}
                                renderItem={renderChannel}
                                keyExtractor={(item) => item.id}
                                contentContainerStyle={styles.listContent}
                            />
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
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
        maxHeight: '85%',
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
    hint: {
        color: '#666',
        fontSize: 12,
        textAlign: 'center',
        padding: 12,
    },
    listContent: {
        padding: 12,
    },
    channelItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#3a3a3a',
        borderRadius: 8,
        padding: 12,
        marginVertical: 4,
    },
    channelInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    channelNumber: {
        color: '#007AFF',
        fontSize: 14,
        fontWeight: 'bold',
        width: 40,
    },
    channelName: {
        color: '#fff',
        fontSize: 14,
        flex: 1,
    },
    channelActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#444',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 6,
    },
    actionText: {
        color: '#fff',
        fontSize: 14,
    },
    actionDisabled: {
        color: '#666',
    },
    editContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    editInput: {
        backgroundColor: '#222',
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        color: '#fff',
        fontSize: 14,
        width: 50,
        textAlign: 'center',
    },
    saveButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#34C759',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 6,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 14,
    },
});
