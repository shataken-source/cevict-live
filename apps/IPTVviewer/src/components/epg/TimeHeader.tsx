import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { EPGService } from '@/services/EPGService';
import { EPG_CONFIG } from '@/types';

interface TimeHeaderProps {
  viewStartTime: Date;
  hours: number;
}

export function TimeHeader({ viewStartTime, hours }: TimeHeaderProps) {
  const slots = EPGService.getTimeSlots(viewStartTime, hours);

  return (
    <View style={styles.container}>
      <View style={styles.sidebar} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} scrollEnabled={false}>
        <View style={styles.slots}>
          {slots.map((slot, i) => (
            <View key={i} style={styles.slot}>
              <Text style={styles.slotText}>
                {slot.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
              </Text>
            </View>
          ))}
        </View>
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
  sidebar: {
    width: EPG_CONFIG.sidebarWidth,
    borderRightWidth: 1,
    borderRightColor: '#444',
  },
  slots: {
    flexDirection: 'row',
  },
  slot: {
    width: EPG_CONFIG.timeSlotWidth,
    justifyContent: 'center',
    paddingLeft: 8,
    borderRightWidth: 1,
    borderRightColor: '#333',
  },
  slotText: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: '600',
  },
});
