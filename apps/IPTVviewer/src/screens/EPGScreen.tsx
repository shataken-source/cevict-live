import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ScrollView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useStore } from '@/store/useStore';
import { Channel, EPGProgram, EPG_CONFIG } from '@/types';
import { EPGService } from '@/services/EPGService';
import { TimeHeader, ChannelList, ProgramCell, ProgramDetailModal } from '@/components/epg';

interface EPGScreenProps {
    navigation: any;
}

export default function EPGScreen({ navigation }: EPGScreenProps) {
    const { currentPlaylist, favorites, epgUrl, setCurrentChannel, currentChannel } = useStore();

    const [programs, setPrograms] = useState<EPGProgram[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // View state
    const [viewStartTime, setViewStartTime] = useState(() => {
        const now = new Date();
        now.setMinutes(0, 0, 0);
        return now;
    });
    const [hours] = useState(6);
    const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
    const [selectedProgram, setSelectedProgram] = useState<EPGProgram | null>(null);
    const [showModal, setShowModal] = useState(false);

    const channels = useMemo(() => currentPlaylist?.channels || [], [currentPlaylist]);

    // Fetch EPG data
    useEffect(() => {
        const fetchEPG = async () => {
            if (!epgUrl) {
                setError('No EPG URL configured. Please set XMLTV URL in Settings.');
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                const epgData = await EPGService.fetchEPG(epgUrl);
                setPrograms(epgData);
            } catch (err) {
                setError('Failed to load EPG data. Please check your XMLTV URL.');
                console.error('EPG fetch error:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchEPG();
    }, [epgUrl]);

    // Calculate view time range
    const viewEndTime = useMemo(() => {
        return new Date(viewStartTime.getTime() + hours * 3600000);
    }, [viewStartTime, hours]);

    // Get programs for each channel in view range
    // Use tvgId for EPG matching (XMLTV channel IDs), fall back to channel.id
    const channelProgramsMap = useMemo(() => {
        if (!channels.length) return new Map<string, EPGProgram[]>();
        const channelIds = channels.map(c => c.tvgId || c.id);
        return EPGService.getProgramsForChannels(programs, channelIds, viewStartTime, viewEndTime);
    }, [programs, channels, viewStartTime, viewEndTime]);

    // Get current programs for all channels
    const currentProgramMap = useMemo(() => {
        const now = new Date();
        const channelIds = channels.map(c => c.tvgId || c.id);
        return EPGService.getProgramsAtTime(programs, channelIds, now);
    }, [programs, channels]);

    // Navigate time
    const handleTimeScroll = useCallback((direction: 'prev' | 'next') => {
        const newStart = new Date(viewStartTime);
        if (direction === 'prev') {
            newStart.setHours(newStart.getHours() - hours);
        } else {
            newStart.setHours(newStart.getHours() + hours);
        }
        setViewStartTime(newStart);
    }, [viewStartTime, hours]);

    // Go to current time
    const handleGoToNow = useCallback(() => {
        const now = new Date();
        now.setMinutes(0, 0, 0);
        setViewStartTime(now);
    }, []);

    // Handle channel selection
    const handleChannelSelect = useCallback((channel: Channel) => {
        setSelectedChannel(channel);
    }, []);

    // Handle program selection
    const handleProgramPress = useCallback((program: EPGProgram) => {
        setSelectedProgram(program);
        setShowModal(true);
    }, []);

    // Watch selected channel
    const handleWatchChannel = useCallback(() => {
        if (selectedChannel) {
            // Find the actual channel from playlist
            const channel = channels.find(c => c.id === selectedChannel.id || c.tvgId === selectedProgram?.channelId);
            if (channel) {
                setCurrentChannel(channel);
                navigation.navigate('Player', { channel });
            }
        }
    }, [selectedChannel, selectedProgram, channels, setCurrentChannel, navigation]);

    // Format date header
    const formatDateHeader = (date: Date): string => {
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
        });
    };

    // Render channel row with programs
    const renderChannelRow = ({ item: channel }: { item: Channel }) => {
        const channelPrograms = channelProgramsMap.get(channel.tvgId || channel.id) || [];
        const isSelected = selectedChannel?.id === channel.id;
        const isCurrentPlaying = currentChannel?.id === channel.id;

        return (
            <View style={[styles.channelRow, isSelected && styles.selectedRow]}>
                {/* Channel info (hidden, handled by ChannelList) */}
                <View style={styles.programsContainer}>
                    {channelPrograms.map((program, index) => (
                        <ProgramCell
                            key={`${program.channelId}-${program.start.getTime()}-${index}`}
                            program={program}
                            viewStartTime={viewStartTime}
                            isSelected={selectedProgram?.title === program.title}
                            isCurrent={
                                new Date() >= program.start && new Date() < program.end
                            }
                            onPress={handleProgramPress}
                        />
                    ))}
                </View>
            </View>
        );
    };

    // Loading state
    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={EPG_CONFIG.highlightColor} />
                <Text style={styles.loadingText}>Loading Program Guide...</Text>
            </View>
        );
    }

    // Error state
    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                    style={styles.settingsButton}
                    onPress={() => navigation.navigate('Settings')}
                >
                    <Text style={styles.settingsButtonText}>Go to Settings</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.headerButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.headerButtonText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Program Guide</Text>
                <View style={styles.headerRight}>
                    <Text style={styles.dateText}>{formatDateHeader(viewStartTime)}</Text>
                </View>
            </View>

            {/* Time navigation */}
            <View style={styles.timeNav}>
                <TouchableOpacity
                    style={styles.navButton}
                    onPress={() => handleTimeScroll('prev')}
                >
                    <Text style={styles.navButtonText}>← Previous</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.nowButton}
                    onPress={handleGoToNow}
                >
                    <Text style={styles.nowButtonText}>Now</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.navButton}
                    onPress={() => handleTimeScroll('next')}
                >
                    <Text style={styles.navButtonText}>Next →</Text>
                </TouchableOpacity>
            </View>

            {/* Time Header */}
            <TimeHeader viewStartTime={viewStartTime} hours={hours} />

            {/* Main Content */}
            <View style={styles.mainContent}>
                {/* Channel Sidebar */}
                <ChannelList
                    channels={channels}
                    currentProgramMap={currentProgramMap}
                    selectedChannelId={selectedChannel?.id}
                    onChannelSelect={handleChannelSelect}
                    currentChannelId={currentChannel?.id}
                    favorites={favorites}
                />

                {/* Program Grid */}
                <FlatList
                    data={channels}
                    renderItem={renderChannelRow}
                    keyExtractor={item => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.gridContent}
                    getItemLayout={(_, index) => ({
                        length: EPG_CONFIG.channelRowHeight,
                        offset: EPG_CONFIG.channelRowHeight * index,
                        index,
                    })}
                />
            </View>

            {/* Bottom Actions */}
            <View style={styles.bottomBar}>
                {selectedChannel && (
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => {
                            const channel = channels.find(c => c.id === selectedChannel.id);
                            if (channel) {
                                setCurrentChannel(channel);
                                navigation.navigate('Player', { channel });
                            }
                        }}
                    >
                        <Text style={styles.actionButtonText}>▶ Watch {selectedChannel.name}</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Program Detail Modal */}
            <ProgramDetailModal
                program={selectedProgram}
                channelName={selectedChannel?.name}
                visible={showModal}
                onClose={() => setShowModal(false)}
                onWatchChannel={handleWatchChannel}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: EPG_CONFIG.backgroundColor,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: EPG_CONFIG.backgroundColor,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: EPG_CONFIG.textColor,
        fontSize: 16,
        marginTop: 16,
    },
    errorContainer: {
        flex: 1,
        backgroundColor: EPG_CONFIG.backgroundColor,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorIcon: {
        fontSize: 48,
        marginBottom: 16,
    },
    errorText: {
        color: '#FF6B6B',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
    },
    settingsButton: {
        backgroundColor: EPG_CONFIG.highlightColor,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        marginBottom: 12,
    },
    settingsButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    backButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
    },
    backButtonText: {
        color: '#888',
        fontSize: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#2a2a2a',
        borderBottomWidth: 1,
        borderBottomColor: '#444',
    },
    headerButton: {
        paddingVertical: 8,
        paddingRight: 16,
    },
    headerButtonText: {
        color: EPG_CONFIG.highlightColor,
        fontSize: 16,
        fontWeight: '600',
    },
    title: {
        color: EPG_CONFIG.textColor,
        fontSize: 20,
        fontWeight: 'bold',
        flex: 1,
        textAlign: 'center',
    },
    headerRight: {
        minWidth: 80,
        alignItems: 'flex-end',
    },
    dateText: {
        color: '#888',
        fontSize: 14,
    },
    timeNav: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#222',
        gap: 16,
    },
    navButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#333',
        borderRadius: 6,
    },
    navButtonText: {
        color: EPG_CONFIG.textColor,
        fontSize: 14,
    },
    nowButton: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        backgroundColor: EPG_CONFIG.highlightColor,
        borderRadius: 6,
    },
    nowButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    mainContent: {
        flex: 1,
        flexDirection: 'row',
    },
    channelRow: {
        height: EPG_CONFIG.channelRowHeight,
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    selectedRow: {
        backgroundColor: EPG_CONFIG.highlightColor + '20',
    },
    programsContainer: {
        flex: 1,
        flexDirection: 'row',
        position: 'relative',
        paddingHorizontal: 4,
    },
    gridContent: {
        flexDirection: 'column',
    },
    bottomBar: {
        flexDirection: 'row',
        justifyContent: 'center',
        padding: 16,
        backgroundColor: '#2a2a2a',
        borderTopWidth: 1,
        borderTopColor: '#444',
    },
    actionButton: {
        backgroundColor: '#34C759',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
