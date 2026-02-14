import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    Modal,
    ScrollView,
    Share,
    Clipboard,
} from 'react-native';
import { Channel } from '@/types';
import { useStore } from '@/store/useStore';
import { SmartFavoritesService, SmartFavoriteResult, FavoriteCategory } from '@/services/SmartFavoritesService';

interface FavoritesScreenProps {
    onChannelSelect: (channel: Channel) => void;
    onClose: () => void;
}

export function FavoritesScreen({ onChannelSelect, onClose }: FavoritesScreenProps) {
    const { playlists, favorites, toggleFavorite, channelHistory } = useStore();
    const [allChannels, setAllChannels] = useState<Channel[]>([]);
    const [smartMatches, setSmartMatches] = useState<SmartFavoriteResult[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [showSmartModal, setShowSmartModal] = useState(false);
    const [customKeyword, setCustomKeyword] = useState('');
    const [importUrl, setImportUrl] = useState('');

    useEffect(() => {
        // Collect all channels
        const channels: Channel[] = [];
        playlists.forEach((playlist) => {
            playlist.channels.forEach((channel) => {
                if (!channels.find((c) => c.id === channel.id)) {
                    channels.push(channel);
                }
            });
        });
        setAllChannels(channels);

        // Run smart matching
        const matches = SmartFavoritesService.smartMatch(channels);
        setSmartMatches(matches);
    }, [playlists]);

    const categories = SmartFavoritesService.getCategories();

    const getCategoryChannels = (categoryName: string): Channel[] => {
        const matches = smartMatches.filter((m) =>
            m.matchedCategories.includes(categoryName)
        );
        return matches.map((m) => m.channel);
    };

    const getFavoritesList = (): Channel[] => {
        return allChannels.filter((c) => favorites.includes(c.id));
    };

    const handleExport = async () => {
        const config = SmartFavoritesService.exportConfig();

        // Share via native share
        await Share.share({
            message: `IPTV Viewer Favorites Export\n\n${config}`,
            title: 'Export Favorites',
        });
    };

    const handleCopyImportUrl = () => {
        const url = SmartFavoritesService.generateShareUrl('https://iptv.cevict.ai', 'user123');
        Clipboard.setString(url);
    };

    const handleImport = () => {
        if (importUrl.trim()) {
            const success = SmartFavoritesService.importFromUrl(importUrl);
            if (success) {
                // Refresh smart matches
                const matches = SmartFavoritesService.smartMatch(allChannels);
                setSmartMatches(matches);
                alert('Favorites imported successfully!');
            } else {
                alert('Failed to import favorites');
            }
        }
    };

    const renderSmartMatch = ({ item }: { item: SmartFavoriteResult }) => (
        <TouchableOpacity
            style={styles.smartMatchItem}
            onPress={() => onChannelSelect(item.channel)}
        >
            <View style={styles.matchInfo}>
                <Text style={styles.channelName}>{item.channel.name}</Text>
                <Text style={styles.matchCategories}>
                    {item.matchedCategories.join(' • ')}
                </Text>
            </View>
            <TouchableOpacity
                style={[
                    styles.favoriteButton,
                    favorites.includes(item.channel.id) && styles.favoriteButtonActive,
                ]}
                onPress={() => toggleFavorite(item.channel.id)}
            >
                <Text style={styles.favoriteIcon}>
                    {favorites.includes(item.channel.id) ? '★' : '☆'}
                </Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );

    const renderCategory = ({ item }: { item: FavoriteCategory }) => {
        const channels = getCategoryChannels(item.name);
        const isSelected = selectedCategory === item.name;

        return (
            <TouchableOpacity
                style={[styles.categoryCard, { borderLeftColor: item.color }]}
                onPress={() => setSelectedCategory(isSelected ? null : item.name)}
            >
                <View style={styles.categoryHeader}>
                    <View style={[styles.categoryColor, { backgroundColor: item.color }]} />
                    <View style={styles.categoryInfo}>
                        <Text style={styles.categoryName}>{item.name}</Text>
                        <Text style={styles.categoryCount}>{channels.length} channels</Text>
                    </View>
                    <Text style={styles.expandIcon}>{isSelected ? '▼' : '▶'}</Text>
                </View>

                {isSelected && (
                    <View style={styles.categoryChannels}>
                        {channels.slice(0, 10).map((channel) => (
                            <TouchableOpacity
                                key={channel.id}
                                style={styles.channelRow}
                                onPress={() => onChannelSelect(channel)}
                            >
                                <Text style={styles.channelName} numberOfLines={1}>
                                    {channel.name}
                                </Text>
                                <TouchableOpacity
                                    style={styles.smallFavBtn}
                                    onPress={() => toggleFavorite(channel.id)}
                                >
                                    <Text style={styles.smallFavIcon}>
                                        {favorites.includes(channel.id) ? '★' : '☆'}
                                    </Text>
                                </TouchableOpacity>
                            </TouchableOpacity>
                        ))}
                        {channels.length > 10 && (
                            <Text style={styles.moreText}>+{channels.length - 10} more</Text>
                        )}
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Smart Favorites</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.headerButton} onPress={handleExport}>
                        <Text style={styles.headerButtonText}>Export</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={() => setShowSmartModal(true)}
                    >
                        <Text style={styles.headerButtonText}>Smart Add</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                        <Text style={styles.closeText}>✕</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
                <TouchableOpacity style={[styles.tab, !selectedCategory && styles.tabActive]}>
                    <Text style={styles.tabText}>All Favorites</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, selectedCategory && styles.tabActive]}
                    onPress={() => setSelectedCategory('smart')}
                >
                    <Text style={styles.tabText}>Smart Categories</Text>
                </TouchableOpacity>
            </View>

            {/* Content */}
            {selectedCategory === 'smart' ? (
                <FlatList
                    data={categories}
                    renderItem={renderCategory}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                />
            ) : (
                <FlatList
                    data={getFavoritesList()}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.favoriteItem}
                            onPress={() => onChannelSelect(item)}
                        >
                            <Text style={styles.channelName}>{item.name}</Text>
                            <TouchableOpacity
                                style={styles.removeBtn}
                                onPress={() => toggleFavorite(item.id)}
                            >
                                <Text style={styles.removeText}>✕</Text>
                            </TouchableOpacity>
                        </TouchableOpacity>
                    )}
                    keyExtractor={(item) => item.id}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyIcon}>★</Text>
                            <Text style={styles.emptyTitle}>No Favorites Yet</Text>
                            <Text style={styles.emptyText}>
                                Star channels to add them here, or use Smart Add to auto-categorize
                            </Text>
                            <TouchableOpacity
                                style={styles.smartAddBtn}
                                onPress={() => setShowSmartModal(true)}
                            >
                                <Text style={styles.smartAddBtnText}>Smart Add Channels</Text>
                            </TouchableOpacity>
                        </View>
                    }
                    contentContainerStyle={styles.listContent}
                />
            )}

            {/* Smart Add Modal */}
            <Modal visible={showSmartModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Smart Add Channels</Text>
                            <TouchableOpacity onPress={() => setShowSmartModal(false)}>
                                <Text style={styles.closeText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            {/* Recent Smart Matches */}
                            <Text style={styles.sectionTitle}>Suggested Channels</Text>
                            {smartMatches.slice(0, 20).map((match) => (
                                <View key={match.channel.id} style={styles.suggestionItem}>
                                    <View style={styles.suggestionInfo}>
                                        <Text style={styles.channelName}>{match.channel.name}</Text>
                                        <Text style={styles.matchTags}>
                                            {match.matchedCategories.map((c) => `#${c}`).join(' ')}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={[
                                            styles.addBtn,
                                            favorites.includes(match.channel.id) && styles.addBtnAdded,
                                        ]}
                                        onPress={() => toggleFavorite(match.channel.id)}
                                    >
                                        <Text style={styles.addBtnText}>
                                            {favorites.includes(match.channel.id) ? '★ Added' : '☆ Add'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            ))}

                            {/* Import Section */}
                            <Text style={styles.sectionTitle}>Import from Other TV</Text>
                            <Text style={styles.helpText}>
                                Generate an import URL to transfer your favorites to another device
                            </Text>
                            <TouchableOpacity style={styles.copyBtn} onPress={handleCopyImportUrl}>
                                <Text style={styles.copyBtnText}>Copy Import URL</Text>
                            </TouchableOpacity>

                            <Text style={styles.helpText}>Or paste an import URL:</Text>
                            <TextInput
                                style={styles.urlInput}
                                value={importUrl}
                                onChangeText={setImportUrl}
                                placeholder="Paste import URL here..."
                                placeholderTextColor="#666"
                            />
                            <TouchableOpacity style={styles.importBtn} onPress={handleImport}>
                                <Text style={styles.importBtnText}>Import</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a1a',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        paddingTop: 40,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    title: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
    },
    headerActions: {
        flexDirection: 'row',
        gap: 10,
    },
    headerButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    headerButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#333',
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeText: {
        color: '#fff',
        fontSize: 16,
    },
    tabs: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
    },
    tabActive: {
        borderBottomWidth: 2,
        borderBottomColor: '#007AFF',
    },
    tabText: {
        color: '#888',
        fontSize: 14,
        fontWeight: '600',
    },
    listContent: {
        padding: 12,
    },
    favoriteItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2a2a2a',
        borderRadius: 8,
        padding: 12,
        marginVertical: 4,
    },
    channelName: {
        flex: 1,
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    removeBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#FF3B30',
        alignItems: 'center',
        justifyContent: 'center',
    },
    removeText: {
        color: '#fff',
        fontSize: 14,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    emptyIcon: {
        fontSize: 48,
        color: '#666',
        marginBottom: 16,
    },
    emptyTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    emptyText: {
        color: '#888',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20,
    },
    smartAddBtn: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    smartAddBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    categoryCard: {
        backgroundColor: '#2a2a2a',
        borderRadius: 12,
        marginVertical: 8,
        borderLeftWidth: 4,
    },
    categoryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    categoryColor: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 12,
    },
    categoryInfo: {
        flex: 1,
    },
    categoryName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    categoryCount: {
        color: '#888',
        fontSize: 12,
        marginTop: 2,
    },
    expandIcon: {
        color: '#888',
        fontSize: 12,
    },
    categoryChannels: {
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    channelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    smallFavBtn: {
        width: 28,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    smallFavIcon: {
        color: '#FFD700',
        fontSize: 18,
    },
    moreText: {
        color: '#666',
        fontSize: 12,
        textAlign: 'center',
        marginTop: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#2a2a2a',
        borderRadius: 16,
        width: '90%',
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    modalTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    modalBody: {
        padding: 20,
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 12,
        marginTop: 16,
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#333',
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
    },
    suggestionInfo: {
        flex: 1,
    },
    matchTags: {
        color: '#007AFF',
        fontSize: 12,
        marginTop: 4,
    },
    addBtn: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    addBtnAdded: {
        backgroundColor: '#34C759',
    },
    addBtnText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    helpText: {
        color: '#888',
        fontSize: 12,
        marginBottom: 12,
    },
    copyBtn: {
        backgroundColor: '#333',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 16,
    },
    copyBtnText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    urlInput: {
        backgroundColor: '#333',
        borderRadius: 8,
        padding: 12,
        color: '#fff',
        fontSize: 14,
        marginBottom: 12,
    },
    importBtn: {
        backgroundColor: '#34C759',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    importBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    favoriteButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#333',
        alignItems: 'center',
        justifyContent: 'center',
    },
    favoriteButtonActive: {
        backgroundColor: '#FFD700',
    },
    favoriteIcon: {
        fontSize: 20,
        color: '#666',
    },
    matchInfo: {
        flex: 1,
    },
    matchCategories: {
        color: '#888',
        fontSize: 11,
        marginTop: 2,
    },
    smartMatchItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2a2a2a',
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
    },
});
