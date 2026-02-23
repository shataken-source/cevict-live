import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { EPGProgram, EPG_CONFIG, EPG_GENRES } from '@/types';
import { EPGService } from '@/services/EPGService';

interface ProgramCellProps {
  program: EPGProgram;
  viewStartTime: Date;
  isSelected: boolean;
  isCurrent: boolean;
  onPress: (program: EPGProgram) => void;
}

export function ProgramCell({ program, viewStartTime, isSelected, isCurrent, onPress }: ProgramCellProps) {
  const width = EPGService.calculateProgramWidth(program.start, program.end, EPG_CONFIG.timeSlotWidth);
  const left = EPGService.calculateProgramOffset(program.start, viewStartTime, EPG_CONFIG.timeSlotWidth);
  const genreColor = program.genre ? (EPG_GENRES[program.genre] ?? EPG_GENRES['Default']) : EPG_GENRES['Default'];
  const duration = EPGService.formatProgramDuration(program.start, program.end);

  return (
    <TouchableOpacity
      style={[
        styles.cell,
        { width: Math.max(width, EPG_CONFIG.programMinWidth), left },
        isCurrent && styles.currentCell,
        isSelected && styles.selectedCell,
        { borderLeftColor: genreColor },
      ]}
      onPress={() => onPress(program)}
      activeOpacity={0.75}>
      <Text style={styles.title} numberOfLines={1}>{program.title}</Text>
      <Text style={styles.duration}>{duration}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cell: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    backgroundColor: '#2d2d2d',
    borderRadius: 4,
    borderLeftWidth: 3,
    paddingHorizontal: 6,
    paddingVertical: 4,
    justifyContent: 'center',
    overflow: 'hidden',
    marginHorizontal: 1,
  },
  currentCell: {
    backgroundColor: '#1a3a5c',
  },
  selectedCell: {
    backgroundColor: '#007AFF33',
    borderColor: '#007AFF',
    borderWidth: 1,
  },
  title: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  duration: {
    color: '#888',
    fontSize: 10,
    marginTop: 2,
  },
});
