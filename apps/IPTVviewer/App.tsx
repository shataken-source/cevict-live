import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Channel } from './src/types';
import TVHomeScreen from './src/screens/TVHomeScreen';
import ChannelsScreen from './src/screens/ChannelsScreen';
import MoviesScreen from './src/screens/MoviesScreen';
import SeriesScreen from './src/screens/SeriesScreen';
import PlayerScreen from './src/screens/PlayerScreen';
import EPGScreen from './src/screens/EPGScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';
import ChannelHistoryScreen from './src/screens/ChannelHistoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import PricingScreen from './src/screens/PricingScreen';
import CatchUpScreen from './src/screens/CatchUpScreen';
import RecordingsScreen from './src/screens/RecordingsScreen';
import QualitySettingsScreen from './src/screens/QualitySettingsScreen';
import DevicesScreen from './src/screens/DevicesScreen';
import SearchScreen from './src/screens/SearchScreen';
import PlaylistManagerScreen from './src/screens/PlaylistManagerScreen';

export type RootStackParamList = {
  Main: undefined;
  Channels: undefined;
  Movies: undefined;
  Series: undefined;
  Player: { channel: Channel; fromChannel?: Channel };
  EPG: undefined;
  Favorites: undefined;
  History: undefined;
  Settings: undefined;
  Pricing: undefined;
  CatchUp: { channel: Channel };
  Recordings: undefined;
  QualitySettings: undefined;
  Devices: undefined;
  Search: undefined;
  PlaylistManager: undefined;
};

// ── Bottom Tab Bar ────────────────────────────────────────────
type TabId = 'Home' | 'Channels' | 'Guide' | 'Favorites' | 'Settings';

const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: 'Home', icon: '🏠', label: 'Home' },
  { id: 'Channels', icon: '📡', label: 'Live TV' },
  { id: 'Guide', icon: '📋', label: 'Guide' },
  { id: 'Favorites', icon: '⭐', label: 'Favs' },
  { id: 'Settings', icon: '⚙️', label: 'Settings' },
];

function MainTabScreen({ navigation }: { navigation: any }) {
  const [activeTab, setActiveTab] = useState<TabId>('Home');

  const renderScreen = () => {
    switch (activeTab) {
      case 'Home': return <TVHomeScreen navigation={navigation} />;
      case 'Channels': return <ChannelsScreen navigation={navigation} />;
      case 'Guide': return <EPGScreen navigation={navigation} />;
      case 'Favorites': return <FavoritesScreen navigation={navigation} />;
      case 'Settings': return <SettingsScreen navigation={navigation} />;
    }
  };

  return (
    <SafeAreaView style={tabStyles.container}>
      <View style={tabStyles.content}>
        {renderScreen()}
      </View>
      <View style={tabStyles.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={tabStyles.tabItem}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[tabStyles.tabIcon, activeTab === tab.id && tabStyles.tabIconActive]}>
              {tab.icon}
            </Text>
            <Text style={[tabStyles.tabLabel, activeTab === tab.id && tabStyles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const tabStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#13131a',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingBottom: 4,
    paddingTop: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 2,
    opacity: 0.45,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8b8b9e',
  },
  tabLabelActive: {
    color: '#e50000',
  },
});

// ── Root Stack ────────────────────────────────────────────────
const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Main"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Main" component={MainTabScreen} />
        <Stack.Screen name="Channels" component={ChannelsScreen} />
        <Stack.Screen name="Movies" component={MoviesScreen} />
        <Stack.Screen name="Series" component={SeriesScreen} />
        <Stack.Screen name="Player" component={PlayerScreen} />
        <Stack.Screen name="EPG" component={EPGScreen} />
        <Stack.Screen name="Favorites" component={FavoritesScreen} />
        <Stack.Screen name="History" component={ChannelHistoryScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Pricing" component={PricingScreen} />
        <Stack.Screen name="CatchUp" component={CatchUpScreen} />
        <Stack.Screen name="Recordings" component={RecordingsScreen} />
        <Stack.Screen name="QualitySettings" component={QualitySettingsScreen} />
        <Stack.Screen name="Devices" component={DevicesScreen} />
        <Stack.Screen name="Search" component={SearchScreen} />
        <Stack.Screen name="PlaylistManager" component={PlaylistManagerScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
