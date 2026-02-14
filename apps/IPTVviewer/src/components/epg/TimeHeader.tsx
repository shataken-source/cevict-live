import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { EPGService } from '@/services/EPGService';
import { EPG_CONFIG } from '@/types';

interface TimeHeaderProps {
    viewStartTime: Date;
    hours?: number;
}

export function TimeHeader({ viewStartTime, hours = 6 }: TimeHeaderProps) {
    const timeSlots = useMemo(() => {
        return EPGService.getTimeSlots(viewStartTime, hours);
    }, [viewStartTime, hours]);

    const formatHour = (date: Date): string => {
        const hour = date.getHours();
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${displayHour}:00 ${ampm}`;
    };

    const isCurrentHour = (date: Date): boolean => {
        const now = new Date();
        return date.getHours() === now.getHours() &&
            date.getDate() === now.getDate() &&
            date.getMonth() === now.getMonth();
    };

    return (
        <View style={styles.container}>
            <View style={styles.sidebarSpacer} />
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {timeSlots.map((slot, index) => (
                    <View key={index} style={styles.timeSlot}>
                        <Text style={[
                            styles.timeText,
                            isCurrentHour(slot) && styles.currentTimeText
                        ]}>
                            {formatHour(slot)}
                        </Text>
                        {isCurrentHour(slot) && (
                            <View style={styles.currentIndicator} />
                        )}
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        height: EPG_CONFIG.headerHeight,
        backgroundColor: '#2a2a2a',
        borderBottomWidth: 1,
        borderBottomColor: '#444',
    },
    sidebarSpacer: {
        width: EPG_CONFIG.sidebarWidth,
        backgroundColor: '#2a2a2a',
        borderRightWidth: 1,
        borderRightColor: '#444',
    },
    scrollContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    timeSlot: {
        width: EPG_CONFIG.timeSlotWidth,
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
    },
    timeText: {
        color: '#aaa',
        fontSize: 14,
        fontWeight: '500',
    },
    currentTimeText: {
        color: EPG_CONFIG.currentTimeColor,
        fontWeight: 'bold',
    },
    currentIndicator: {
        position: 'absolute',
        bottom: 0,
        width: 2,
        height: 8,
        backgroundColor: EPG_CONFIG.currentTimeColor,
        borderRadius: 1,
    },
});
