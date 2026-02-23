import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { EPGProgram, EPG_GENRES } from '@/types';
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

  const now = new Date();
  const isNow = program.start <= now && program.end > now;
  const isFuture = program.start > now;
  const duration = EPGService.formatProgramDuration(program.start, program.end);
  const genreColor = program.genre ? (EPG_GENRES[program.genre] ?? EPG_GENRES['Default']) : EPG_GENRES['Default'];

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.card} activeOpacity={1}>
          {/* Genre accent bar */}
          <View style={[styles.genreBar, { backgroundColor: genreColor }]} />

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {channelName && (
              <Text style={styles.channelName}>{channelName}</Text>
            )}

            <Text style={styles.title}>{program.title}</Text>

            <View style={styles.metaRow}>
              <Text style={styles.time}>
                {formatTime(program.start)} – {formatTime(program.end)}
              </Text>
              <Text style={styles.duration}>{duration}</Text>
              {isNow && <View style={styles.liveBadge}><Text style={styles.liveText}>LIVE</Text></View>}
            </View>

            {program.genre && (
              <Text style={[styles.genre, { color: genreColor }]}>{program.genre}</Text>
            )}

            {program.episode && (
              <Text style={styles.episode}>{program.episode}</Text>
            )}

            {program.rating && (
              <Text style={styles.rating}>Rated: {program.rating}</Text>
            )}

            {program.description ? (
              <Text style={styles.description}>{program.description}</Text>
            ) : (
              <Text style={styles.noDesc}>No description available.</Text>
            )}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
            {(isNow || isFuture) && (
              <TouchableOpacity style={styles.watchBtn} onPress={() => { onClose(); onWatchChannel(); }}>
                <Text style={styles.watchBtnText}>
                  {isNow ? '▶ Watch Now' : '⏰ Set Reminder'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    width: '100%',
    maxWidth: 520,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  genreBar: {
    height: 4,
    width: '100%',
  },
  body: {
    padding: 20,
  },
  channelName: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  time: {
    color: '#aaa',
    fontSize: 14,
  },
  duration: {
    color: '#666',
    fontSize: 13,
  },
  liveBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  genre: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  episode: {
    color: '#888',
    fontSize: 13,
    marginBottom: 4,
  },
  rating: {
    color: '#888',
    fontSize: 13,
    marginBottom: 12,
  },
  description: {
    color: '#ccc',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  noDesc: {
    color: '#555',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  closeBtn: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#aaa',
    fontSize: 15,
    fontWeight: '600',
  },
  watchBtn: {
    flex: 2,
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  watchBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
