import React from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { EPGProgram, EPG_CONFIG } from '@/types';
import { EPGService } from '@/services/EPGService';

interface ProgramDetailModalProps {
    program: EPGProgram | null;
    channelName?: string;
    visible: boolean;
    onClose: () => void;
    onWatchChannel: () => void;
}

export function ProgramDetailModal({
    program,
    channelName,
    visible,
    onClose,
    onWatchChannel,
}: ProgramDetailModalProps) {
    if (!program) return null;

    const formatDateTime = (date: Date): string => {
        return date.toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };

    const duration = EPGService.formatProgramDuration(program.start, program.end);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    <View style={styles.header}>
                        <Text style={styles.channelName}>{channelName || program.channelId}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Text style={styles.closeText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content}>
                        <Text style={styles.title}>{program.title}</Text>

                        <View style={styles.timeInfo}>
                            <Text style={styles.timeLabel}>Start:</Text>
                            <Text style={styles.timeValue}>{formatDateTime(program.start)}</Text>
                        </View>

                        <View style={styles.timeInfo}>
                            <Text style={styles.timeLabel}>End:</Text>
                            <Text style={styles.timeValue}>{formatDateTime(program.end)}</Text>
                        </View>

                        <View style={styles.timeInfo}>
                            <Text style={styles.timeLabel}>Duration:</Text>
                            <Text style={styles.timeValue}>{duration}</Text>
                        </View>

                        {program.genre && (
                            <View style={styles.genreContainer}>
                                <Text style={styles.genreLabel}>Genre:</Text>
                                <View style={styles.genreBadge}>
                                    <Text style={styles.genreText}>{program.genre}</Text>
                                </View>
                            </View>
                        )}

                        {program.episode && (
                            <View style={styles.timeInfo}>
                                <Text style={styles.timeLabel}>Episode:</Text>
                                <Text style={styles.timeValue}>{program.episode}</Text>
                            </View>
                        )}

                        {program.rating && (
                            <View style={styles.timeInfo}>
                                <Text style={styles.timeLabel}>Rating:</Text>
                                <Text style={styles.timeValue}>{program.rating}</Text>
                            </View>
                        )}

                        {program.description && (
                            <View style={styles.descriptionContainer}>
                                <Text style={styles.descriptionLabel}>Description</Text>
                                <Text style={styles.description}>{program.description}</Text>
                            </View>
                        )}
                    </ScrollView>

                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={styles.watchButton}
                            onPress={() => {
                                onWatchChannel();
                                onClose();
                            }}
                        >
                            <Text style={styles.watchButtonText}>▶ Watch Channel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modal: {
        backgroundColor: '#2a2a2a',
        borderRadius: 12,
        width: '100%',
        maxWidth: 500,
        maxHeight: '80%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#444',
    },
    channelName: {
        color: EPG_CONFIG.highlightColor,
        fontSize: 14,
        fontWeight: '600',
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
        fontWeight: 'bold',
    },
    content: {
        padding: 16,
    },
    title: {
        color: EPG_CONFIG.textColor,
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    timeInfo: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    timeLabel: {
        color: '#888',
        fontSize: 14,
        width: 80,
    },
    timeValue: {
        color: EPG_CONFIG.textColor,
        fontSize: 14,
        flex: 1,
    },
    genreContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    genreLabel: {
        color: '#888',
        fontSize: 14,
        width: 80,
    },
    genreBadge: {
        backgroundColor: EPG_CONFIG.highlightColor,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    genreText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    descriptionContainer: {
        marginTop: 16,
    },
    descriptionLabel: {
        color: '#888',
        fontSize: 14,
        marginBottom: 8,
    },
    description: {
        color: EPG_CONFIG.textColor,
        fontSize: 14,
        lineHeight: 20,
    },
    actions: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#444',
    },
    watchButton: {
        backgroundColor: EPG_CONFIG.highlightColor,
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    watchButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
