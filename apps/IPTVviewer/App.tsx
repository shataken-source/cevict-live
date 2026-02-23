import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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

const Stack = createNativeStackNavigator();

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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
