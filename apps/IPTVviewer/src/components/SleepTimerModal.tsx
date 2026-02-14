import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TouchableWithoutFeedback,
} from 'react-native';
import { useStore } from '@/store/useStore';
import { SleepTimerService } from '@/services/SleepTimerService';

interface SleepTimerModalProps {
    visible: boolean;
    onClose: () => void;
}

export function SleepTimerModal({ visible, onClose }: SleepTimerModalProps) {
    const { sleepTimer } = useStore();
    const [selectedDuration, setSelectedDuration] = useState(30);

    const durations = [15, 30, 45, 60, 90, 120];

    const handleStartTimer = () => {
        SleepTimerService.start(selectedDuration, () => {
            // Timer ended - stop playback
            useStore.getState().setPlaying(false);
        });
        onClose();
    };

    const handleStopTimer = () => {
        SleepTimerService.stop();
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={styles.container}>
                            <Text style={styles.title}>Sleep Timer</Text>

                            {sleepTimer.enabled ? (
                                // Timer is active
                                <View style={styles.activeContainer}>
                                    <Text style={styles.remainingLabel}>Time Remaining</Text>
                                    <Text style={styles.remainingTime}>
                                        {SleepTimerService.getFormattedRemaining()}
                                    </Text>

                                    <TouchableOpacity
                                        style={styles.stopButton}
                                        onPress={handleStopTimer}
                                    >
                                        <Text style={styles.stopButtonText}>Cancel Timer</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                // Timer is not active - show duration picker
                                <View style={styles.pickerContainer}>
                                    <Text style={styles.selectLabel}>Select duration</Text>

                                    <View style={styles.durationsGrid}>
                                        {durations.map((duration) => (
                                            <TouchableOpacity
                                                key={duration}
                                                style={[
                                                    styles.durationButton,
                                                    selectedDuration === duration && styles.durationButtonSelected,
                                                ]}
                                                onPress={() => setSelectedDuration(duration)}
                                            >
                                                <Text
                                                    style={[
                                                        styles.durationText,
                                                        selectedDuration === duration && styles.durationTextSelected,
                                                    ]}
                                                >
                                                    {duration}m
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>

                                    <TouchableOpacity
                                        style={styles.startButton}
                                        onPress={handleStartTimer}
                                    >
                                        <Text style={styles.startButtonText}>Start Timer</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
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
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        backgroundColor: '#2a2a2a',
        borderRadius: 16,
        padding: 24,
        width: '85%',
        maxWidth: 400,
    },
    title: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
    },
    activeContainer: {
        alignItems: 'center',
    },
    remainingLabel: {
        color: '#888',
        fontSize: 14,
        marginBottom: 8,
    },
    remainingTime: {
        color: '#fff',
        fontSize: 48,
        fontWeight: 'bold',
        marginBottom: 24,
    },
    stopButton: {
        backgroundColor: '#FF3B30',
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 8,
    },
    stopButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    pickerContainer: {
        alignItems: 'center',
    },
    selectLabel: {
        color: '#888',
        fontSize: 14,
        marginBottom: 16,
    },
    durationsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginBottom: 24,
    },
    durationButton: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: '#3a3a3a',
        margin: 6,
        minWidth: 70,
        alignItems: 'center',
    },
    durationButtonSelected: {
        backgroundColor: '#007AFF',
    },
    durationText: {
        color: '#aaa',
        fontSize: 16,
        fontWeight: '600',
    },
    durationTextSelected: {
        color: '#fff',
    },
    startButton: {
        backgroundColor: '#34C759',
        paddingHorizontal: 48,
        paddingVertical: 14,
        borderRadius: 8,
    },
    startButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
