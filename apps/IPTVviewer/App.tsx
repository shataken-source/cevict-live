import React from 'react';
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

export type RootStackParamList = {
  TVHome: undefined;
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
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="TVHome"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen
          name="TVHome"
          component={TVHomeScreen}
        />
        <Stack.Screen
          name="Channels"
          component={ChannelsScreen}
        />
        <Stack.Screen
          name="Movies"
          component={MoviesScreen}
        />
        <Stack.Screen
          name="Series"
          component={SeriesScreen}
        />
        <Stack.Screen
          name="Player"
          component={PlayerScreen}
        />
        <Stack.Screen name="EPG" component={EPGScreen} />
        <Stack.Screen name="Favorites" component={FavoritesScreen} />
        <Stack.Screen name="History" component={ChannelHistoryScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Pricing" component={PricingScreen} />
        <Stack.Screen name="CatchUp" component={CatchUpScreen} />
        <Stack.Screen name="Recordings" component={RecordingsScreen} />
        <Stack.Screen name="QualitySettings" component={QualitySettingsScreen} />
        <Stack.Screen name="Devices" component={DevicesScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
