import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { EPGProgram, EPG_CONFIG, EPG_GENRES } from '@/types';
import { EPGService } from '@/services/EPGService';

interface ProgramCellProps {
    program: EPGProgram;
    viewStartTime: Date;
    isSelected?: boolean;
    isCurrent?: boolean;
    onPress?: (program: EPGProgram) => void;
}

export function ProgramCell({
    program,
    viewStartTime,
    isSelected = false,
    isCurrent = false,
    onPress,
}: ProgramCellProps) {
    const width = EPGService.calculateProgramWidth(program.start, program.end, EPG_CONFIG.timeSlotWidth);
    const offset = EPGService.calculateProgramOffset(program.start, viewStartTime, EPG_CONFIG.timeSlotWidth);

    const genreColor = getGenreColor(program.genre || 'Default');

    const formatTime = (date: Date): string => {
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const duration = EPGService.formatProgramDuration(program.start, program.end);

    return (
        <TouchableOpacity
            style={[
                styles.container,
                {
                    width: Math.max(width, EPG_CONFIG.programMinWidth),
                    marginLeft: offset,
                },
                isSelected && styles.selected,
                isCurrent && styles.current,
                { borderLeftColor: genreColor },
            ]}
            onPress={() => onPress?.(program)}
            activeOpacity={0.7}
        >
            <Text style={styles.title} numberOfLines={2}>
                {program.title}
            </Text>
            <View style={styles.timeRow}>
                <Text style={styles.timeText}>{formatTime(program.start)}</Text>
                <Text style={styles.durationText}>{duration}</Text>
            </View>
            {isCurrent && <View style={styles.nowIndicator}><Text style={styles.nowText}>NOW</Text></View>}
        </TouchableOpacity>
    );
}

function getGenreColor(genre?: string): string {
    if (!genre) return EPG_GENRES['Default'];
    const normalizedGenre = genre.charAt(0).toUpperCase() + genre.slice(1).toLowerCase();
    return EPG_GENRES[normalizedGenre] || EPG_GENRES['Default'];
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        height: EPG_CONFIG.channelRowHeight - 8,
        backgroundColor: '#3a3a3a',
        borderRadius: 4,
        padding: 6,
        borderLeftWidth: 4,
        marginVertical: 4,
        overflow: 'hidden',
    },
    selected: {
        backgroundColor: EPG_CONFIG.highlightColor + '60',
        borderWidth: 2,
        borderColor: EPG_CONFIG.highlightColor,
    },
    current: {
        backgroundColor: '#3a4a5a',
    },
    title: {
        color: EPG_CONFIG.textColor,
        fontSize: 12,
        fontWeight: '600',
        flex: 1,
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    timeText: {
        color: '#888',
        fontSize: 10,
    },
    durationText: {
        color: '#666',
        fontSize: 10,
    },
    nowIndicator: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: EPG_CONFIG.currentTimeColor,
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 2,
    },
    nowText: {
        color: '#fff',
        fontSize: 8,
        fontWeight: 'bold',
    },
});
