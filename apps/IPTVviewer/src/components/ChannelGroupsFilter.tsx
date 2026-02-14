import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
} from 'react-native';

interface ChannelGroupsFilterProps {
    groups: string[];
    selectedGroup: string | null;
    onSelectGroup: (group: string | null) => void;
}

export function ChannelGroupsFilter({
    groups,
    selectedGroup,
    onSelectGroup,
}: ChannelGroupsFilterProps) {
    const allGroups = ['All', ...groups];

    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {allGroups.map((group, index) => {
                    const isSelected = group === 'All'
                        ? selectedGroup === null
                        : selectedGroup === group;

                    return (
                        <TouchableOpacity
                            key={group === 'All' ? 'all' : group}
                            style={[
                                styles.chip,
                                isSelected && styles.chipSelected,
                            ]}
                            onPress={() => onSelectGroup(group === 'All' ? null : group)}
                        >
                            <Text
                                style={[
                                    styles.chipText,
                                    isSelected && styles.chipTextSelected,
                                ]}
                                numberOfLines={1}
                            >
                                {group}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#1a1a1a',
        paddingVertical: 8,
    },
    scrollContent: {
        paddingHorizontal: 12,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#333',
        marginRight: 8,
        maxWidth: 150,
    },
    chipSelected: {
        backgroundColor: '#007AFF',
    },
    chipText: {
        color: '#aaa',
        fontSize: 13,
        fontWeight: '500',
    },
    chipTextSelected: {
        color: '#fff',
    },
});
